import type { DataSource } from "typeorm";
import { PageEntity } from "@shared/entities";
import type { Block } from "@shared/types/blocks";

/**
 * The front page the client asked for: the two of them, the site's two halves,
 * and what is for sale — in that order, at the top.
 *
 * - **The opening is Barni and Evelyn**, front and back, under "Accelerează
 *   rezultatele alături de noi!". It **replaces** the seeded `homeHero` — but
 *   only that one, recognised by its id. An opening an editor put there
 *   themselves is left alone and the new one goes above it.
 * - **"Pentru bărbați" / "Pentru femei"** sits directly under it: the site is
 *   shared, so which half is yours is the first question.
 * - **The products come third**, because the client wants them in front. There
 *   is no card payment yet, so every button leads to the contact form and the
 *   note under the grid says so; no price is filled in, because none was
 *   given — an invented price is the one thing on this page that could cost
 *   somebody money.
 *
 * The anchors (`pentru-cine`, `programe`) are the block ids, which is what the
 * two buttons in the opening point at.
 *
 * The photographs are the client's own, in the front end's `public/img`. The
 * wording is ours, written from the client's brief, and is listed in
 * `PLAN.md` for them to read over.
 */

const HERO: Block = {
  id: "home-duo",
  type: "duoHero",
  data: {
    left: {
      image: "/img/barni-evelyn-fata.jpeg",
      alt: "Barni și Evelyn în sală, zâmbind, cu abdomenul la vedere",
    },
    right: {
      image: "/img/barni-evelyn-spate.jpeg",
      alt: "Barni și Evelyn din spate, arătând musculatura spatelui",
    },
    eyebrow: {
      ro: "Barni & Evelyn · antrenori personali",
      hu: "Barni & Evelyn · személyi edzők",
      en: "Barni & Evelyn · personal trainers",
    },
    titleLead: { ro: "Accelerează", hu: "Gyorsítsd fel", en: "Accelerate" },
    titleAccent: { ro: "rezultatele", hu: "az eredményeidet", en: "your results" },
    titleRest: { ro: "alături de noi!", hu: "velünk!", en: "with us!" },
    lead: {
      ro: "Antrenament și alimentație gândite pentru tine, cu un antrenor care îți urmărește progresul săptămână de săptămână.",
      hu: "Neked szabott edzés és étrend, egy edzővel, aki hétről hétre követi a fejlődésedet.",
      en: "Training and nutrition built around you, with a coach who follows your progress week by week.",
    },
    primaryLabel: { ro: "Vezi programele", hu: "Programok", en: "See the programmes" },
    primaryHref: "#programe",
    secondaryLabel: {
      ro: "Pentru el / pentru ea",
      hu: "Neki / neki",
      en: "For him / for her",
    },
    secondaryHref: "#pentru-cine",
  },
};

const AUDIENCE: Block = {
  id: "pentru-cine",
  type: "audienceSplit",
  data: {
    eyebrow: { ro: "Un site, doi antrenori", hu: "Egy oldal, két edző", en: "One site, two coaches" },
    title: { ro: "Alege-ți antrenorul", hu: "Válaszd ki az edződ", en: "Choose your coach" },
    lead: {
      ro: "Barni lucrează cu bărbații, Evelyn cu femeile. Același sistem, obiective diferite.",
      hu: "Barni a férfiakkal dolgozik, Evelyn a nőkkel. Ugyanaz a rendszer, más célok.",
      en: "Barni works with men, Evelyn with women. The same system, different goals.",
    },
    items: [
      {
        id: "audience-men",
        image: "/img/barni.jpeg",
        alt: "Barni în sală, ridicând maieul și arătându-și abdomenul",
        audience: { ro: "Pentru bărbați", hu: "Férfiaknak", en: "For men" },
        name: "Barni",
        text: {
          ro: "Barni lucrează cu bărbați care vor să scape de burtă, să se tonifieze sau să pună masă musculară. Program de antrenament făcut pe tine, plan alimentar pe care îl poți ține și corecturi pe fiecare filmare.",
          hu: "Barni olyan férfiakkal dolgozik, akik le akarnak adni a hasukról, feszesebbek szeretnének lenni vagy izmot építenének. Rád szabott edzésterv, betartható étrend és javítás minden felvételedre.",
          en: "Barni works with men who want to lose the belly, get toned or put on muscle. A training plan built for you, a meal plan you can stick to and corrections on every video you send.",
        },
        results: {
          ro: "Burtă dată jos, fără diete de foame\nCorp tonifiat, aspect atletic\nMasă musculară pusă corect\nMai multă forță și energie",
          hu: "Leadott hasi zsír, éhezés nélkül\nFeszes, atletikus alkat\nTudatosan felépített izomtömeg\nTöbb erő és energia",
          en: "Belly fat gone, without starving\nA toned, athletic build\nMuscle mass, built properly\nMore strength and energy",
        },
        ctaLabel: { ro: "Antrenează-te cu Barni", hu: "Edzés Barnival", en: "Train with Barni" },
        ctaHref: "/antrenori/csanyi-barni",
        accent: "acid",
      },
      {
        id: "audience-women",
        image: "/img/evelyn-spate.jpeg",
        alt: "Evelyn din spate, arătând musculatura spatelui și a fesierilor",
        audience: { ro: "Pentru femei", hu: "Nőknek", en: "For women" },
        name: "Evelyn",
        text: {
          ro: "Evelyn lucrează cu femei care vor un corp tonifiat și puternic: fesieri dezvoltați, talie mai subțire și încredere în sală. Antrenamente clare, alimentație fără înfometare și cineva care te ține pe drum.",
          hu: "Evelyn olyan nőkkel dolgozik, akik feszes, erős testet szeretnének: formás farizmokat, karcsúbb derekat és magabiztosságot a teremben. Világos edzések, éhezés nélküli étkezés és valaki, aki melletted marad.",
          en: "Evelyn works with women who want a toned, strong body: developed glutes, a slimmer waist and confidence in the gym. Clear workouts, eating without starving and someone who keeps you on track.",
        },
        results: {
          ro: "Fesieri tonifiați și dezvoltați\nTalie mai subțire, abdomen mai ferm\nPicioare și brațe tonifiate\nPostură mai bună și mai multă încredere",
          hu: "Feszes, fejlett farizmok\nKarcsúbb derék, feszesebb has\nFormás láb és kar\nJobb testtartás, több önbizalom",
          en: "Toned, developed glutes\nA slimmer waist, a firmer stomach\nToned legs and arms\nBetter posture and more confidence",
        },
        ctaLabel: { ro: "Antrenează-te cu Evelyn", hu: "Edzés Evelynnel", en: "Train with Evelyn" },
        ctaHref: "/antrenori/evelyn",
        accent: "flare",
      },
    ],
  },
};

const ORDER = { ro: "Comandă", hu: "Megrendelem", en: "Order" };

const PRODUCTS: Block = {
  id: "programe",
  type: "productGrid",
  data: {
    background: "soft",
    eyebrow: { ro: "Programe și planuri", hu: "Programok és tervek", en: "Programmes and plans" },
    title: {
      ro: "Tot ce ai nevoie ca să începi",
      hu: "Minden, ami az induláshoz kell",
      en: "Everything you need to start",
    },
    lead: {
      ro: "Planuri făcute de Barni și Evelyn: antrenament, alimentație, rețete și meniuri pe care le gătești acasă.",
      hu: "Barni és Evelyn tervei: edzés, étrend, receptek és menük, amiket otthon is elkészíthetsz.",
      en: "Plans by Barni and Evelyn: training, nutrition, recipes and menus you can cook at home.",
    },
    items: [
      {
        id: "product-training",
        image: "/img/barni-evelyn-tractiuni.jpeg",
        alt: "Barni și Evelyn atârnând la bara de tracțiuni",
        category: { ro: "Antrenament", hu: "Edzés", en: "Training" },
        title: {
          ro: "Plan de antrenament personalizat",
          hu: "Személyre szabott edzésterv",
          en: "Personal training plan",
        },
        text: {
          ro: "Program pe săptămâni, după nivelul, obiectivul și timpul tău — pentru sală sau acasă.",
          hu: "Hetekre bontott program a szintedhez, célodhoz és idődhöz igazítva — teremben vagy otthon.",
          en: "A week-by-week programme set to your level, goal and time — for the gym or at home.",
        },
        price: { ro: "", hu: "", en: "" },
        ctaLabel: ORDER,
        ctaHref: "/contact",
      },
      {
        id: "product-nutrition",
        image: "/img/dieta3.jpeg",
        alt: "Piept de pui la grătar cu spanac, roșii, castraveți și dovlecei",
        category: { ro: "Alimentație", hu: "Étkezés", en: "Nutrition" },
        title: {
          ro: "Plan alimentar personalizat",
          hu: "Személyre szabott étrend",
          en: "Personal meal plan",
        },
        text: {
          ro: "Calorii și macronutrienți calculați pentru tine, cu mâncare pe care o găsești în orice supermarket.",
          hu: "Rád számolt kalória és makrotápanyagok, olyan ételekkel, amiket bármelyik boltban megtalálsz.",
          en: "Calories and macros worked out for you, with food you can find in any supermarket.",
        },
        price: { ro: "", hu: "", en: "" },
        ctaLabel: ORDER,
        ctaHref: "/contact",
      },
      {
        id: "product-recipes",
        image: "/img/dieta1.jpeg",
        alt: "Castron cu ovăz, fructe de pădure și semințe de chia",
        category: { ro: "Rețete", hu: "Receptek", en: "Recipes" },
        title: { ro: "Rețete fit", hu: "Fitt receptek", en: "Fit recipes" },
        text: {
          ro: "Mic-dejunuri, prânzuri și gustări rapide, cu cantitățile și valorile nutriționale trecute.",
          hu: "Gyors reggelik, ebédek és nassolnivalók, mennyiségekkel és tápértékkel.",
          en: "Quick breakfasts, lunches and snacks, with the amounts and the nutrition values written down.",
        },
        price: { ro: "", hu: "", en: "" },
        ctaLabel: ORDER,
        ctaHref: "/contact",
      },
      {
        id: "product-menus",
        image: "/img/dieta5.jpeg",
        alt: "Piept de pui cu boia și cartofi la cuptor cu ierburi",
        category: { ro: "Meniuri", hu: "Menük", en: "Menus" },
        title: { ro: "Meniuri săptămânale", hu: "Heti menük", en: "Weekly menus" },
        text: {
          ro: "Meniul pentru o săptămână întreagă, cu lista de cumpărături gata făcută.",
          hu: "Egy teljes hét menüje, kész bevásárlólistával.",
          en: "A whole week of meals, with the shopping list already made.",
        },
        price: { ro: "", hu: "", en: "" },
        ctaLabel: ORDER,
        ctaHref: "/contact",
      },
    ],
    note: {
      ro: "Plata online cu cardul vine în curând. Până atunci, scrie-ne ce produs vrei și îți trimitem detaliile de plată.",
      hu: "A bankkártyás online fizetés hamarosan érkezik. Addig írd meg, melyik terméket szeretnéd, és elküldjük a fizetési adatokat.",
      en: "Online card payment is coming soon. Until then, tell us which product you want and we will send you the payment details.",
    },
  },
};

export async function run(dataSource: DataSource) {
  const pages = dataSource.getRepository(PageEntity);

  const home = await pages.findOne({ where: { slug: "home" } });
  if (!home) {
    console.log("home page missing — nothing to add to");
    return;
  }

  let content: Block[] = [...(home.content ?? [])];
  if (content.length === 0) {
    console.log("home page is empty — seeder 012 fills it; nothing to add to");
    return;
  }

  // Only the opening seeder 012 wrote. One an editor made has another id.
  const seededHero = content.findIndex(
    (block) => block.id === "home-hero" && block.type === "homeHero",
  );
  if (seededHero !== -1 && !content.some((block) => block.type === HERO.type)) {
    content = content.filter((_, index) => index !== seededHero);
    console.log("  · removed the seeded homeHero");
  }

  // Same contract as 018: by type, so an editor's own copy is never doubled.
  // Each goes after the one before it, so the three stay together at the top.
  let at = 0;
  let added = 0;
  for (const block of [HERO, AUDIENCE, PRODUCTS]) {
    const existing = content.findIndex((b) => b.type === block.type);
    if (existing !== -1) {
      console.log(`  · ${block.type} already on the page — left alone`);
      at = existing + 1;
      continue;
    }
    content.splice(at, 0, block);
    at += 1;
    added += 1;
    console.log(`  · added ${block.type}`);
  }

  home.content = content;
  await pages.save(home);
  console.log(`home page: ${added} section(s) added at the top`);
}
