import type { DataSource } from "typeorm";
import { PageEntity } from "@shared/entities";
import { PageStatus } from "@shared/enums/page-status.enum";

/**
 * The site's content pages.
 *
 * **The home page is deliberately thin.** Its hero, the way it works, the
 * directory teaser, the testimonials and the questions are rendered by
 * `pages/index.tsx` from live data — how many trainers there are, which of them
 * are taking clients, what people actually said. None of that can be an editor's
 * copy without going stale the first week.
 *
 * What the CMS home page *is* for is the band between the directory and the
 * questions: a campaign, an announcement, a seasonal offer. Whatever blocks it
 * carries are rendered there, so marketing can add a section without a deploy,
 * and an empty home page simply renders nothing extra.
 *
 * Every page is idempotent by slug: run again and an editor's work is left
 * alone rather than overwritten.
 */

const PAGES = [
  {
    slug: "home",
    isHomepage: true,
    title: { ro: "Acasă", hu: "Főoldal", en: "Home" },
    excerpt: {
      ro: "Găsește un antrenor personal verificat, urmărește-ți programul și trimite-i videoclipuri cu execuția ta — dintr-un singur cont.",
      hu: "Találj ellenőrzött személyi edzőt, kövesd a programodat, és küldj neki videót a gyakorlataidról — egyetlen fiókból.",
      en: "Find a vetted personal trainer, follow your plan and send them video of your form — from a single account.",
    },
    seoTitle: {
      ro: "Antrenori personali verificați | Acceleratorul de Rezultate",
      hu: "Ellenőrzött személyi edzők | Acceleratorul de Rezultate",
      en: "Vetted personal trainers | Acceleratorul de Rezultate",
    },
    content: [] as unknown[],
  },
  {
    slug: "cum-functioneaza",
    title: {
      ro: "Cum funcționează",
      hu: "Hogyan működik",
      en: "How it works",
    },
    excerpt: {
      ro: "De la alegerea antrenorului până la primul antrenament: patru pași și ce se întâmplă la fiecare.",
      hu: "Az edző kiválasztásától az első edzésig: négy lépés, és mi történik mindegyiknél.",
      en: "From choosing a trainer to your first session: four steps and what happens at each.",
    },
    content: [
      {
        id: "how-intro",
        type: "richText",
        data: {
          background: "none",
          html: {
            ro: "<h2>Patru pași, fără abonamente ascunse</h2><p>Platforma nu antrenează pe nimeni. Antrenorii o fac. Rolul nostru este să îți arate cine sunt, ce fac și cât costă — și apoi să țină într-un singur loc tot ce îți dă antrenorul tău.</p>",
            hu: "<h2>Négy lépés, rejtett előfizetések nélkül</h2><p>A platform senkit sem edz. Az edzők teszik. A mi szerepünk megmutatni, kik ők, mit csinálnak és mennyibe kerül — aztán egy helyen tartani mindent, amit az edződtől kapsz.</p>",
            en: "<h2>Four steps, no hidden subscriptions</h2><p>The platform trains nobody. The trainers do. Our job is to show you who they are, what they do and what it costs — and then to keep everything your trainer gives you in one place.</p>",
          },
        },
      },
      {
        id: "how-steps",
        type: "cardGrid",
        data: {
          background: "soft",
          columns: 4,
          showImages: false,
          title: {
            ro: "Pas cu pas",
            hu: "Lépésről lépésre",
            en: "Step by step",
          },
          items: [
            {
              id: "s1",
              heading: { ro: "1. Alegi antrenorul", hu: "1. Kiválasztod az edzőt", en: "1. Choose a trainer" },
              text: {
                ro: "Filtrezi după obiectiv, oraș și format — online, la sală sau ambele. Vezi experiența, certificările și prețul lunar înainte să scrii cuiva.",
                hu: "Célra, városra és formátumra szűrsz — online, teremben vagy mindkettő. Látod a tapasztalatot, a képesítéseket és a havi árat, mielőtt bárkinek írnál.",
                en: "Filter by goal, city and format — online, in a gym or both. You see the experience, the certifications and the monthly price before you write to anyone.",
              },
            },
            {
              id: "s2",
              heading: { ro: "2. Trimiți cererea", hu: "2. Elküldöd a kérést", en: "2. Send your request" },
              text: {
                ro: "Îți faci cont și scrii în câteva rânduri ce vrei să obții. Antrenorul citește cererea și o acceptă sau nu — nimeni nu îți ia bani înainte ca el să spună da.",
                hu: "Létrehozol egy fiókot, és pár sorban leírod, mit szeretnél elérni. Az edző elolvassa a kérést, és elfogadja vagy nem — senki nem kér pénzt, mielőtt ő igent mondana.",
                en: "You create an account and write a few lines about what you want to achieve. The trainer reads it and accepts or declines — nobody takes money before they say yes.",
              },
            },
            {
              id: "s3",
              heading: { ro: "3. Confirmi luna", hu: "3. Megerősíted a hónapot", en: "3. Confirm the month" },
              text: {
                ro: "Plătești antrenorului direct, iar el marchează luna ca plătită. Din acel moment contul tău se deschide: program, videoclipuri, dietă, sfaturi.",
                hu: "Közvetlenül az edzőnek fizetsz, ő pedig fizetettként jelöli a hónapot. Ettől kezdve megnyílik a fiókod: program, videók, étrend, tanácsok.",
                en: "You pay the trainer directly and they mark the month as paid. From that moment your account opens: the plan, the videos, the diet, the advice.",
              },
            },
            {
              id: "s4",
              heading: { ro: "4. Te antrenezi", hu: "4. Edzel", en: "4. You train" },
              text: {
                ro: "Urmărești materialele din cont și îi trimiți videoclipuri cu execuția ta. El îți răspunde pe fiecare, acolo unde l-ai întrebat.",
                hu: "Követed a fiókban lévő anyagokat, és videót küldesz a gyakorlataidról. Ő mindegyikre ott válaszol, ahol kérdezted.",
                en: "You follow the material in your account and send videos of your form. They answer on each one, where you asked.",
              },
            },
          ],
        },
      },
      {
        id: "how-payment",
        type: "notice",
        data: {
          background: "soft",
          tone: "info",
          title: {
            ro: "Despre plată, pe scurt",
            hu: "A fizetésről röviden",
            en: "About payment, briefly",
          },
          body: {
            ro: "<p>Deocamdată plata se face direct către antrenor — transfer sau numerar — iar el confirmă luna în contul lui. Plata cu cardul în platformă urmează; până atunci nu îți cerem datele cardului nicăieri.</p>",
            hu: "<p>Egyelőre a fizetés közvetlenül az edzőnek történik — átutalással vagy készpénzben —, és ő erősíti meg a hónapot a saját fiókjában. A kártyás fizetés a platformon hamarosan jön; addig sehol nem kérjük a kártyaadataidat.</p>",
            en: "<p>For now you pay the trainer directly — transfer or cash — and they confirm the month from their own account. Card payment inside the platform is coming; until then we never ask for your card details anywhere.</p>",
          },
        },
      },
      {
        id: "how-cta",
        type: "cta",
        data: {
          background: "neon",
          title: { ro: "Vezi antrenorii disponibili", hu: "Nézd meg az elérhető edzőket", en: "See the available trainers" },
          text: {
            ro: "Filtrează după obiectivul tău și vezi cine mai are locuri libere luna asta.",
            hu: "Szűrj a célod szerint, és nézd meg, kinek van még szabad helye ebben a hónapban.",
            en: "Filter by your goal and see who still has places this month.",
          },
          label: { ro: "Caută antrenor", hu: "Edző keresése", en: "Find a trainer" },
          href: "/antrenori",
        },
      },
    ],
  },
  {
    slug: "despre-noi",
    title: { ro: "Despre noi", hu: "Rólunk", en: "About us" },
    excerpt: {
      ro: "De ce există platforma și ce înseamnă „antrenor verificat”.",
      hu: "Miért létezik a platform, és mit jelent az „ellenőrzött edző”.",
      en: "Why the platform exists, and what a vetted trainer means.",
    },
    content: [
      {
        id: "about-body",
        type: "richText",
        data: {
          background: "none",
          html: {
            ro: "<h2>Un antrenor bun este greu de găsit, nu greu de recunoscut</h2><p>Oricine își poate spune antrenor personal. Diferența se vede în certificări, în ani de lucru și în ce se întâmplă după prima lună — iar niciuna dintre acestea nu încape într-o postare pe rețelele sociale.</p><p>Pe platformă nu se înscrie nimeni singur ca antrenor. Fiecare profil este adăugat de administrator, după ce documentele au fost văzute. Este un filtru simplu și este singurul motiv pentru care un cursant poate avea încredere în listă.</p><h3>Ce facem și ce nu facem</h3><p>Nu vindem programe de antrenament și nu ne substituim antrenorului. Ținem într-un singur loc ce îți dă el — videoclipuri, planuri, diete, sfaturi — și îi dăm lui un loc unde să vadă cine a plătit luna și cine i-a trimis un video la care nu a răspuns încă.</p>",
            hu: "<h2>A jó edzőt nehéz megtalálni, nem nehéz felismerni</h2><p>Bárki nevezheti magát személyi edzőnek. A különbség a képesítésekben, az évek munkájában és abban látszik, mi történik az első hónap után — és ezek közül egyik sem fér bele egy közösségi bejegyzésbe.</p><p>A platformon senki nem regisztrálhat edzőként saját maga. Minden profilt az adminisztrátor ad hozzá, miután látta a dokumentumokat. Egyszerű szűrő, és ez az egyetlen ok, amiért egy sportoló megbízhat a listában.</p><h3>Mit csinálunk és mit nem</h3><p>Nem árulunk edzésterveket, és nem helyettesítjük az edzőt. Egy helyen tartjuk, amit ő ad neked — videókat, terveket, étrendet, tanácsokat —, neki pedig helyet adunk, ahol látja, ki fizette a hónapot, és ki küldött videót, amire még nem válaszolt.</p>",
            en: "<h2>A good trainer is hard to find, not hard to recognise</h2><p>Anyone can call themselves a personal trainer. The difference shows in certifications, in years of work and in what happens after the first month — and none of that fits in a social media post.</p><p>Nobody signs themselves up here as a trainer. Every profile is added by an administrator after the documents have been seen. It is a simple filter, and it is the only reason a client can trust the list.</p><h3>What we do and what we do not</h3><p>We do not sell training programmes and we do not stand in for the trainer. We keep what they give you in one place — videos, plans, diets, advice — and we give them somewhere to see who has paid for the month and who sent a video they have not answered yet.</p>",
          },
        },
      },
      {
        id: "about-cta",
        type: "cta",
        data: {
          background: "neon",
          title: { ro: "Ești antrenor personal?", hu: "Személyi edző vagy?", en: "Are you a personal trainer?" },
          text: {
            ro: "Profilurile se adaugă manual, după verificarea certificărilor. Scrie-ne și îți spunem ce documente sunt necesare.",
            hu: "A profilokat kézzel adjuk hozzá, a képesítések ellenőrzése után. Írj nekünk, és elmondjuk, milyen dokumentumok kellenek.",
            en: "Profiles are added by hand, after certifications are checked. Write to us and we will tell you which documents are needed.",
          },
          label: { ro: "Scrie-ne", hu: "Írj nekünk", en: "Write to us" },
          href: "/contact",
        },
      },
    ],
  },
  {
    slug: "contact",
    title: { ro: "Contact", hu: "Kapcsolat", en: "Contact" },
    excerpt: {
      ro: "Scrie-ne dacă ești antrenor și vrei un profil, sau dacă ai o întrebare despre cont.",
      hu: "Írj, ha edző vagy és profilt szeretnél, vagy ha kérdésed van a fiókkal kapcsolatban.",
      en: "Write to us if you are a trainer wanting a profile, or if you have a question about your account.",
    },
    content: [
      {
        id: "contact-panel",
        type: "contactPanel",
        data: {
          background: "none",
          eyebrow: { ro: "Contact", hu: "Kapcsolat", en: "Contact" },
          title: {
            ro: "Spune-ne ce ai nevoie",
            hu: "Mondd el, mire van szükséged",
            en: "Tell us what you need",
          },
          text: {
            ro: "Răspundem în aceeași zi lucrătoare. Dacă ești cursant și ai o problemă cu luna plătită, scrie-i întâi antrenorului tău — el este cel care o confirmă.",
            hu: "Ugyanazon a munkanapon válaszolunk. Ha sportoló vagy és gond van a fizetett hónappal, előbb az edződnek írj — ő erősíti meg.",
            en: "We answer the same working day. If you are a client and something is wrong with your paid month, write to your trainer first — they are the one who confirms it.",
          },
          buttonLabel: { ro: "Trimite mesajul", hu: "Üzenet küldése", en: "Send the message" },
          success: {
            ro: "Mulțumim. Ți-am primit mesajul și revenim cât putem de repede.",
            hu: "Köszönjük. Megkaptuk az üzeneted, és amint tudunk, visszajelzünk.",
            en: "Thank you. We have your message and will come back as soon as we can.",
          },
        },
      },
    ],
  },
];

export async function run(dataSource: DataSource) {
  const pages = dataSource.getRepository(PageEntity);

  for (const page of PAGES) {
    if (await pages.findOne({ where: { slug: page.slug } })) {
      console.log(`  · /${page.slug} already exists — left alone`);
      continue;
    }

    await pages.save(
      pages.create({
        ...page,
        status: PageStatus.PUBLISHED,
        publishedAt: new Date(),
      } as never),
    );
    console.log(`  · created /${page.slug}`);
  }
}
