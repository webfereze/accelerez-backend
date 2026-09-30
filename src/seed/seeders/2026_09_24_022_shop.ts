import type { DataSource } from "typeorm";
import { MenuItemEntity, PageEntity, ProductEntity } from "@shared/entities";
import type { ProductVariant } from "@shared/entities/product.entity";
import { PageStatus } from "@shared/enums/page-status.enum";
import { ProductCategory } from "@shared/enums/accelerez.enum";
import { MenuKey, MenuLinkType, SystemSection } from "@shared/enums/menu.enum";
import type { Translated } from "@shared/types/translated";
import type { Block } from "@shared/types/blocks";
import { slugify } from "@shared/utils/slugify";

/**
 * The shop: its place in the header, the products the client listed, and the
 * home page's products section reading from it instead of carrying its own.
 *
 * **No prices.** The client named the products and the variants — a diet for
 * one month and for three, a training programme in variations — but not what
 * they cost, and a price is the one thing on a shop page that must never be
 * guessed. Every variant is "preț la cerere" until an editor fills it in, and
 * `PLAN.md` lists it. The products are published so the shop is visible, and
 * because an order today is a reservation, "preț la cerere" is still a thing a
 * visitor can order.
 *
 * Products are inserted only into an empty table, the menu entry only if there
 * is none, and the home section is converted only while it is still the one
 * seeder 021 wrote (it carries `items`; the collection version does not).
 */

const t = (ro: string, hu: string, en: string): Translated => ({ ro, hu, en });

const slugs = (title: Translated): Translated =>
  t(slugify(title.ro), slugify(title.hu ?? ""), slugify(title.en ?? ""));

const variant = (id: string, label: Translated): ProductVariant => ({
  id,
  label,
  price: null,
  compareAtPrice: null,
});

const ONE_MONTH = t("1 lună", "1 hónap", "1 month");
const THREE_MONTHS = t("3 luni", "3 hónap", "3 months");

const DELIVERY = t(
  "Planul îl primești pe adresa de e-mail din comandă, după confirmarea plății.",
  "A tervet a rendelésben megadott e-mail-címre küldjük, a fizetés visszaigazolása után.",
  "The plan is sent to the e-mail address in your order, once payment is confirmed.",
);

type Seed = Omit<Partial<ProductEntity>, "slug"> & { title: Translated };

const PRODUCTS: Seed[] = [
  {
    title: t("Plan alimentar personalizat", "Személyre szabott étrend", "Personal meal plan"),
    category: ProductCategory.MEAL_PLAN,
    excerpt: t(
      "Calorii și macronutrienți calculați pentru tine, cu mâncare pe care o găsești în orice supermarket și ajustări pe parcurs.",
      "Rád számolt kalória és makrotápanyagok, bármelyik boltban kapható ételekkel, menet közbeni igazításokkal.",
      "Calories and macros worked out for you, with food from any supermarket and adjustments along the way.",
    ),
    image: "/img/dieta3.jpeg",
    imageAlt: "Piept de pui la grătar cu spanac, roșii, castraveți și dovlecei",
    variants: [variant("1-luna", ONE_MONTH), variant("3-luni", THREE_MONTHS)],
  },
  {
    title: t(
      "Program de antrenament personalizat",
      "Személyre szabott edzésprogram",
      "Personal training programme",
    ),
    category: ProductCategory.TRAINING_PLAN,
    excerpt: t(
      "Program pe săptămâni, făcut după nivelul, obiectivul și timpul tău — pentru sală sau pentru acasă.",
      "Hetekre bontott program a szintedhez, célodhoz és idődhöz igazítva — teremre vagy otthonra.",
      "A week-by-week programme set to your level, goal and time — for the gym or for home.",
    ),
    image: "/img/barni-evelyn-tractiuni.jpeg",
    imageAlt: "Barni și Evelyn atârnând la bara de tracțiuni",
    variants: [
      variant("sala-1-luna", t("Sală · 1 lună", "Terem · 1 hónap", "Gym · 1 month")),
      variant("sala-3-luni", t("Sală · 3 luni", "Terem · 3 hónap", "Gym · 3 months")),
      variant("acasa-1-luna", t("Acasă · 1 lună", "Otthon · 1 hónap", "Home · 1 month")),
      variant("acasa-3-luni", t("Acasă · 3 luni", "Otthon · 3 hónap", "Home · 3 months")),
    ],
  },
  {
    title: t(
      "Pachet antrenament + alimentație",
      "Csomag: edzés + étrend",
      "Training + nutrition bundle",
    ),
    category: ProductCategory.BUNDLE,
    excerpt: t(
      "Programul de antrenament și planul alimentar, gândite împreună, pentru rezultate mai rapide.",
      "Az edzésprogram és az étrend együtt megtervezve, a gyorsabb eredményért.",
      "The training programme and the meal plan, designed together, for faster results.",
    ),
    image: "/img/barni-evelyn-fata.jpeg",
    imageAlt: "Barni și Evelyn în sală, zâmbind",
    variants: [variant("1-luna", ONE_MONTH), variant("3-luni", THREE_MONTHS)],
  },
  {
    title: t("Rețete fit", "Fitt receptek", "Fit recipes"),
    category: ProductCategory.RECIPES,
    excerpt: t(
      "Mic-dejunuri, prânzuri și gustări rapide, cu cantitățile și valorile nutriționale trecute.",
      "Gyors reggelik, ebédek és nassolnivalók, mennyiségekkel és tápértékkel.",
      "Quick breakfasts, lunches and snacks, with the amounts and nutrition values written down.",
    ),
    image: "/img/dieta1.jpeg",
    imageAlt: "Castron cu ovăz, fructe de pădure și semințe de chia",
    variants: [variant("standard", t("Colecția de rețete", "Receptgyűjtemény", "Recipe collection"))],
  },
  {
    title: t("Meniuri săptămânale", "Heti menük", "Weekly menus"),
    category: ProductCategory.MENU,
    excerpt: t(
      "Meniul pentru o săptămână întreagă, cu lista de cumpărături gata făcută.",
      "Egy teljes hét menüje, kész bevásárlólistával.",
      "A whole week of meals, with the shopping list already made.",
    ),
    image: "/img/dieta5.jpeg",
    imageAlt: "Piept de pui cu boia și cartofi la cuptor cu ierburi",
    variants: [
      variant("1-saptamana", t("1 săptămână", "1 hét", "1 week")),
      variant("4-saptamani", t("4 săptămâni", "4 hét", "4 weeks")),
    ],
  },
];

/** The home section, as a window onto the shop rather than a list of its own. */
const HOME_SECTION = {
  background: "soft",
  eyebrow: t("Magazin", "Webshop", "Shop"),
  title: t(
    "Tot ce ai nevoie ca să începi",
    "Minden, ami az induláshoz kell",
    "Everything you need to start",
  ),
  lead: t(
    "Planuri făcute de Barni și Evelyn: antrenament, alimentație, rețete și meniuri pe care le gătești acasă.",
    "Barni és Evelyn tervei: edzés, étrend, receptek és menük, amiket otthon is elkészíthetsz.",
    "Plans by Barni and Evelyn: training, nutrition, recipes and menus you can cook at home.",
  ),
  count: 4,
  featuredOnly: true,
  linkLabel: t("Vezi tot magazinul", "Az egész webshop", "See the whole shop"),
  note: t(
    "Comanda e o rezervare: îți trimitem detaliile de plată pe e-mail. Plata online cu cardul vine în curând.",
    "A rendelés egy foglalás: a fizetési adatokat e-mailben küldjük. A bankkártyás online fizetés hamarosan érkezik.",
    "An order is a reservation: we send you the payment details by e-mail. Online card payment is coming soon.",
  ),
};

export async function run(dataSource: DataSource) {
  // --- the header ----------------------------------------------------------
  const menu = dataSource.getRepository(MenuItemEntity);
  const inMenu = await menu.findOne({
    where: { menu: MenuKey.MAIN, systemKey: SystemSection.SHOP },
  });

  if (inMenu) {
    console.log("  · shop already in the header");
  } else {
    await menu.save(
      menu.create({
        menu: MenuKey.MAIN,
        linkType: MenuLinkType.SYSTEM,
        systemKey: SystemSection.SHOP,
        label: null,
        // First: the client wants what is for sale in front.
        sortOrder: -3 as never,
        isVisible: true,
      } as never),
    );
    console.log("  · header: shop");
  }

  // --- the products --------------------------------------------------------
  const products = dataSource.getRepository(ProductEntity);

  if ((await products.count()) > 0) {
    console.log("  · products already exist — none added");
  } else {
    for (const [index, seed] of PRODUCTS.entries()) {
      await products.save(
        products.create({
          ...seed,
          slug: slugs(seed.title),
          currency: "RON",
          deliveryNote: DELIVERY,
          status: PageStatus.PUBLISHED,
          isFeatured: true,
          publishedLocales: ["ro", "hu", "en"],
          sortOrder: index,
        } as Partial<ProductEntity>),
      );
    }
    console.log(`  · ${PRODUCTS.length} products, no prices`);
  }

  // --- the home page -------------------------------------------------------
  const pages = dataSource.getRepository(PageEntity);
  const home = await pages.findOne({ where: { slug: "home" } });
  const content: Block[] = [...(home?.content ?? [])];
  const block = content.find((item) => item.type === "productGrid");

  if (!home || !block) {
    console.log("  · no products section on the home page — left alone");
    return;
  }
  if (!Array.isArray((block.data as { items?: unknown }).items)) {
    console.log("  · home products section already reads from the shop");
    return;
  }

  block.data = HOME_SECTION;
  home.content = content;
  await pages.save(home);
  console.log("  · home products section now reads from the shop");
}
