import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MenuItemEntity, PageEntity } from "@shared/entities";
import { MenuKey, MenuLinkType, SYSTEM_SECTIONS } from "@shared/enums/menu.enum";
import { PageStatus } from "@shared/enums/page-status.enum";
import { normalize, SOURCE_LOCALE } from "@shared/types/translated";
import type { Translated } from "@shared/types/translated";
import { RevalidationService } from "@shared/services/revalidation.service";
import {
  CreateMenuItemDto,
  ReorderMenuDto,
  UpdateMenuItemDto,
} from "./dto/menu-item.dto";

/** A menu entry as the public site consumes it. */
export type ResolvedMenuItem = {
  id: number;
  label: Translated;
  href: string | null;
  linkType: MenuLinkType;
  openInNewTab: boolean;
  children: ResolvedMenuItem[];
};

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuItemEntity)
    private readonly items: Repository<MenuItemEntity>,
    @InjectRepository(PageEntity)
    private readonly pages: Repository<PageEntity>,
    private readonly revalidation: RevalidationService,
  ) {}

  /**
   * The header renders on every page, so a menu change invalidates all of them.
   * The list is small — dozens of pages, not thousands — so dropping the lot is
   * cheaper than working out which ones actually reference the entry.
   */
  private async revalidateEverything(): Promise<void> {
    const published = await this.pages.find({
      where: { status: PageStatus.PUBLISHED },
      select: ["slug"],
    });
    this.revalidation.revalidate(["/", ...published.map((p) => `/${p.slug}`)]);
  }

  /** Every entry in one menu, for the admin builder (hidden ones included). */
  findAll(menu: MenuKey): Promise<MenuItemEntity[]> {
    return this.items.find({
      where: { menu },
      relations: { page: true },
      order: { sortOrder: "ASC", id: "ASC" },
    });
  }

  async findOne(id: number): Promise<MenuItemEntity> {
    const item = await this.items.findOne({
      where: { id },
      relations: { page: true },
    });
    if (!item) throw new NotFoundException("A menüelem nem található.");
    return item;
  }

  /**
   * The public menu tree: visible entries only, with each `href` already
   * resolved and labels falling back to the linked page's title.
   *
   * Entries pointing at an unpublished page are dropped — a menu link to a
   * draft is a dead end for the visitor.
   */
  async findPublicTree(menu: MenuKey): Promise<ResolvedMenuItem[]> {
    const items = await this.items.find({
      where: { menu, isVisible: true },
      relations: { page: { parent: true } },
      order: { sortOrder: "ASC", id: "ASC" },
    });

    const usable = items.filter((item) => {
      if (item.linkType === MenuLinkType.PAGE) {
        return item.page?.status === PageStatus.PUBLISHED;
      }
      if (item.linkType === MenuLinkType.URL) return !!item.url;
      if (item.linkType === MenuLinkType.SYSTEM) return !!item.systemKey;
      return true; // heading
    });

    const resolve = (item: MenuItemEntity): ResolvedMenuItem => ({
      id: item.id,
      label: this.labelFor(item),
      href: this.hrefFor(item),
      linkType: item.linkType,
      openInNewTab: item.openInNewTab,
      children: usable.filter((child) => child.parentId === item.id).map(resolve),
    });

    return usable.filter((item) => !item.parentId).map(resolve);
  }

  async create(dto: CreateMenuItemDto): Promise<MenuItemEntity> {
    await this.assertParentAllowed(dto.parentId, dto.menu);
    this.assertTargetGiven(dto);

    const item = this.items.create({
      ...dto,
      label: normalize(dto.label as Translated),
      sortOrder: dto.sortOrder ?? (await this.nextSortOrder(dto.menu, dto.parentId)),
    });

    const saved = await this.items.save(item);
    await this.revalidateEverything();
    return saved;
  }

  async update(id: number, dto: UpdateMenuItemDto): Promise<MenuItemEntity> {
    const item = await this.findOne(id);

    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new BadRequestException("Egy menüelem nem lehet önmaga szülője.");
      }
      await this.assertParentAllowed(dto.parentId, dto.menu ?? item.menu);
      await this.assertHasNoChildren(id, dto.parentId);
    }

    Object.assign(item, dto);
    if (dto.label !== undefined) item.label = normalize(dto.label as Translated);

    // Clear the fields that don't belong to the chosen link type, so a stale
    // pageId can't resurrect when the type is switched back.
    if (dto.linkType) {
      if (dto.linkType !== MenuLinkType.PAGE) item.pageId = null;
      if (dto.linkType !== MenuLinkType.URL) item.url = null;
      if (dto.linkType !== MenuLinkType.SYSTEM) item.systemKey = null;
    }

    this.assertTargetGiven(item);
    const saved = await this.items.save(item);
    await this.revalidateEverything();
    return saved;
  }

  async remove(id: number): Promise<void> {
    const item = await this.findOne(id);

    // Children cascade at the DB level; warn instead of silently deleting them.
    const children = await this.items.count({ where: { parentId: id } });
    if (children > 0) {
      throw new BadRequestException(
        `A menüelemnek ${children} aleleme van. Előbb helyezd át vagy töröld őket.`,
      );
    }

    await this.items.remove(item);
    await this.revalidateEverything();
  }

  /** Persists a whole drag-and-drop rearrangement in one call. */
  async reorder(dto: ReorderMenuDto): Promise<{ updated: number }> {
    for (const entry of dto.items) {
      const item = await this.findOne(entry.id);
      const parentId = entry.parentId ?? null;

      if (parentId) {
        await this.assertParentAllowed(parentId, item.menu);
        await this.assertHasNoChildren(entry.id, parentId);
      }

      await this.items.update({ id: entry.id }, { parentId, sortOrder: entry.sortOrder });
    }

    await this.revalidateEverything();
    return { updated: dto.items.length };
  }

  // --- internals ---------------------------------------------------------

  private labelFor(item: MenuItemEntity): Translated {
    if (item.label?.[SOURCE_LOCALE]?.trim()) return item.label;
    if (item.page?.title) return item.page.title;
    if (item.systemKey) return SYSTEM_SECTIONS[item.systemKey].label;
    return { ro: "" };
  }

  private hrefFor(item: MenuItemEntity): string | null {
    switch (item.linkType) {
      case MenuLinkType.PAGE:
        if (!item.page) return null;
        // Two levels max, so a child page's path is parent/child.
        return item.page.parent
          ? `/${item.page.parent.slug}/${item.page.slug}`
          : `/${item.page.slug}`;
      case MenuLinkType.URL:
        return item.url || null;
      case MenuLinkType.SYSTEM:
        return item.systemKey ? SYSTEM_SECTIONS[item.systemKey].href : null;
      case MenuLinkType.HEADING:
      default:
        return null;
    }
  }

  private async nextSortOrder(menu: MenuKey, parentId?: number): Promise<number> {
    const last = await this.items.findOne({
      where: { menu, parentId: parentId ?? null },
      order: { sortOrder: "DESC" },
    });
    return (last?.sortOrder ?? -10) + 10;
  }

  /** Every link type except a heading needs somewhere to point. */
  private assertTargetGiven(item: {
    linkType?: MenuLinkType;
    pageId?: number;
    url?: string;
    systemKey?: string;
  }): void {
    if (item.linkType === MenuLinkType.PAGE && !item.pageId) {
      throw new BadRequestException("Válaszd ki, melyik oldalra mutasson a link.");
    }
    if (item.linkType === MenuLinkType.URL && !item.url?.trim()) {
      throw new BadRequestException("Add meg a link címét.");
    }
    if (item.linkType === MenuLinkType.SYSTEM && !item.systemKey) {
      throw new BadRequestException("Válaszd ki az oldal szakaszát.");
    }
  }

  /**
   * Three levels of navigation, e.g. `Túrák → Egész napos → Bekecs irány`. An
   * entry may sit under a root or under a second-level entry, but no deeper —
   * past that a menu stops being navigable on a phone.
   */
  private async assertParentAllowed(
    parentId: number | null | undefined,
    menu: MenuKey,
  ): Promise<void> {
    if (parentId === undefined || parentId === null) return;

    const parent = await this.items.findOne({
      where: { id: parentId },
      select: ["id", "parentId", "menu"],
    });

    if (!parent) throw new BadRequestException("A szülő menüelem nem létezik.");
    if (parent.menu !== menu) {
      throw new BadRequestException("A szülő menüelem másik menühöz tartozik.");
    }

    // The parent already being a child makes this a third level — allowed.
    // A parent that is itself a grandchild would make a fourth — refused.
    if (parent.parentId) {
      const grandparent = await this.items.findOne({
        where: { id: parent.parentId },
        select: ["id", "parentId"],
      });
      if (grandparent?.parentId) {
        throw new BadRequestException("A menü legfeljebb három szintű lehet.");
      }
    }
  }

  /**
   * Moving a branch must not push its deepest entry past level three, so an
   * entry that already has children can only be nested under a **root**.
   */
  private async assertHasNoChildren(
    id: number,
    parentId?: number | null,
  ): Promise<void> {
    if (!parentId) return;

    const children = await this.items.count({ where: { parentId: id } });
    if (children === 0) return;

    const parent = await this.items.findOne({
      where: { id: parentId },
      select: ["id", "parentId"],
    });

    if (parent?.parentId) {
      throw new BadRequestException(
        "A menüelemnek alelemei vannak — ide helyezve túllépné a három szintet.",
      );
    }
  }
}
