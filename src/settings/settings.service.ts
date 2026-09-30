import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PageEntity, SiteSettingEntity } from "@shared/entities";
import { RevalidationService } from "@shared/services/revalidation.service";
import { PageStatus } from "@shared/enums/page-status.enum";

/**
 * The shape of each setting, with **no content in it**.
 *
 * These defaults exist so a fresh database renders a structurally valid site,
 * not so the company's details live in the repository. A phone number or an
 * e-mail address written here would be a second source of truth that silently
 * disagrees with the admin the moment anyone edits it — and would keep showing
 * on the site after the client changed it. Real values are written into the
 * database by `yarn seed:site`, and edited in `/admin/site` from then on.
 *
 * Anything empty simply does not render.
 */
const DEFAULTS: Record<string, Record<string, unknown>> = {
  site: {
    /** Falls back to the `site.name` UI string when blank. */
    name: "",
    /**
     * Brand mark, as an uploaded URL. Per brand in practice: it is the one
     * thing that must differ between two tenants on a page that is
     * otherwise the same.
     */
    logo: "",
    tagline: {},
    /**
     * The persistent header button (product rule). Empty falls back to the
     * UI string, so the header never shows a blank control.
     */
    headerCta: { label: {}, href: "/contact" },
    /** Footer intro paragraph. */
    about: {},
    email: "",
    phone: "",
    address: "",

    /**
     * Company registry details. Structured rather than one free-text line: an
     * invoice, the legal pages and the footer each need a different subset, and
     * splitting a string back apart is guesswork.
     */
    company: {
      name: "",
      /** Romanian tax identification number. */
      cui: "",
      /** Trade register number (Registrul Comerțului), e.g. J26/123/2020. */
      onrc: "",
      vatPayer: false,
      /** Registered office. */
      address: "",
      city: "",
      county: "",
      country: "",
      /** Bank details, for invoices and transfers. */
      bank: "",
      iban: "",
    },

    /**
     * The four the brief names, always present so the admin shows a row for
     * each. An entry with no URL does not render.
     */
    social: [
      { network: "facebook", url: "" },
      { network: "instagram", url: "" },
      { network: "tiktok", url: "" },
      { network: "x", url: "" },
    ],
  },

  /**
   * How the yard actually operates. Not per-tour, because none of it is: the
   * same machines serve every route, so a quad out on the long tour is missing
   * from the short one too, and the fleet has to be counted in one place.
   */
  booking: {
    fleet: {
      /** Rideable ATVs. Zero means the calendar offers nothing — say so. */
      atv: 0,
      utv: 0,
    },
    /**
     * Percentage taken up front; the rest is paid at the yard. The brief asks
     * for half, but a rate that changes with the season should not need a
     * deploy.
     */
    depositPercent: 50,
    /**
     * Minutes an unpaid order keeps hold of its vehicles. Long enough to finish
     * paying, short enough that an abandoned checkout does not shut a Saturday.
     */
    holdMinutes: 30,
  },

  /** The webshop. */
  shop: {
    enabled: true,
    /** Flat postage in bani, applied once when anything needs posting. */
    shippingCost: 0,
    /** Order value in bani above which postage is waived. Zero disables it. */
    freeShippingOver: 0,
  },
};

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SiteSettingEntity)
    private readonly settings: Repository<SiteSettingEntity>,
    @InjectRepository(PageEntity)
    private readonly pages: Repository<PageEntity>,
    private readonly revalidation: RevalidationService,
  ) {}

  /** Never throws: an unset key falls back to its (empty) default shape. */
  async get(key: string): Promise<Record<string, unknown>> {
    const row = await this.settings.findOne({ where: { key } });

    // Merged rather than replaced, so a setting saved before a field existed
    // still answers with that field present.
    return deepMerge(DEFAULTS[key] ?? {}, row?.value ?? {});
  }

  async set(
    key: string,
    value: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const row = await this.settings.findOne({ where: { key } });

    if (row) {
      row.value = value;
      await this.settings.save(row);
    } else {
      await this.settings.save(this.settings.create({ key, value }));
    }

    // These appear in the chrome of every page, so every cached copy is stale.
    const published = await this.pages.find({
      where: { status: PageStatus.PUBLISHED },
      select: ["slug"],
    });
    this.revalidation.revalidate(["/", ...published.map((p) => `/${p.slug}`)]);

    return this.get(key);
  }
}

/**
 * Merges a stored value over the defaults, one plain object at a time.
 *
 * Deep because these settings nest: `company` is an object of eight fields, and
 * a row saved before one of them existed must still answer with it present.
 * Arrays are replaced wholesale rather than merged by index — the social links
 * are a list in their own right, and merging them positionally would splice two
 * unrelated accounts together.
 */
function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const existing = out[key];

    out[key] =
      isPlainObject(existing) && isPlainObject(value)
        ? deepMerge(existing, value)
        : value;
  }

  return out;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" && value !== null && !Array.isArray(value)
  );
}
