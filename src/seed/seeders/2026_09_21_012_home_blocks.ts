import type { DataSource } from "typeorm";
import { PageEntity } from "@shared/entities";

/**
 * The front page, assembled out of blocks.
 *
 * Seeder 003 created the page deliberately empty, on the assumption that the
 * home page would be rendered in code. That was the wrong call: the pitch is
 * marketing copy, it changes, and it has to be editable in three languages
 * without a deploy. This fills it with the sections that were in code, as real
 * blocks — every one of which can now be reordered, rewritten or removed at
 * `/admin/pages`.
 *
 * **Three of the blocks carry no content and that is the point.** The trainer
 * grid, the testimonials and the questions read from their collections, so the
 * home page cannot claim a coach is available after they have closed their
 * list, or quote somebody whose testimonial was withdrawn.
 *
 * Runs only while the page is still empty: once an editor has touched it, this
 * must never overwrite their work.
 */
export async function run(dataSource: DataSource) {
  const pages = dataSource.getRepository(PageEntity);

  const home = await pages.findOne({ where: { slug: "home" } });
  if (!home) {
    console.log("home page missing — nothing to fill");
    return;
  }

  if ((home.content?.length ?? 0) > 0) {
    console.log("home page already has blocks — left alone");
    return;
  }

  home.content = [
    {
      id: "home-hero",
      type: "homeHero",
      data: {
        background: "none",
        // Deliberately empty: the claim belongs on the about page, where it is
        // explained, not as a badge over the headline where it is only asserted.
        badge: { ro: "", hu: "", en: "" },
        // The accent comes first here: the two names *are* the proposition,
        // and putting them in the neon is the whole headline's argument.
        titleLead: { ro: "", hu: "", en: "" },
        titleAccent: { ro: "Evelyn și Barni,", hu: "Evelyn és Barni,", en: "Evelyn and Barni," },
        titleRest: {
          ro: "antrenorii care te duc până la capăt.",
          hu: "az edzők, akik elvisznek a célig.",
          en: "the trainers who get you all the way.",
        },
        lead: {
          ro: "Îți construiesc programul, ți-l trimit în cont și îți corectează execuția din videoclipurile pe care le filmezi. Nu primești un PDF și un succes — primești un antrenor care se uită la ce faci, în fiecare săptămână.",
          hu: "Felépítik a programod, elküldik a fiókodba, és az általad küldött videók alapján javítják a kivitelezésed. Nem egy PDF-et és sok sikert kapsz — hanem edzőt, aki hétről hétre megnézi, mit csinálsz.",
          en: "They build your programme, send it to your account and correct your form from the videos you film. You do not get a PDF and good luck — you get a coach who looks at what you are doing, every week.",
        },
        primaryLabel: { ro: "Alege antrenorul tău", hu: "Válaszd ki az edződ", en: "Choose your trainer" },
        primaryHref: "/antrenori",
        secondaryLabel: { ro: "Vezi cum lucrăm", hu: "Nézd meg, hogyan dolgozunk", en: "See how we work" },
        secondaryHref: "/cum-functioneaza",
        showProof: true,
        proofLabel: {
          ro: "{{count}} antrenori pe platformă, fiecare verificat înainte de listare",
          hu: "{{count}} edző a platformon, mindegyik ellenőrizve",
          en: "{{count}} trainers listed, each one checked first",
        },
        cardTitle: {
          ro: "Contul tău, luna curentă",
          hu: "A fiókod, aktuális hónap",
          en: "Your account, this month",
        },
        cardBadge: { ro: "Plătită", hu: "Fizetve", en: "Paid" },
        cardItems: [
          {
            id: "c1",
            text: {
              ro: "Programul săptămânii, în Google Sheets",
              hu: "A heti program Google Sheetsben",
              en: "This week's programme, in Google Sheets",
            },
          },
          {
            id: "c2",
            text: {
              ro: "Planul alimentar, scris de antrenorul tău",
              hu: "Az edződ által írt étrend",
              en: "Your diet, written by your trainer",
            },
          },
          {
            id: "c3",
            text: {
              ro: "Videoclipuri cu execuția corectă",
              hu: "Videók a helyes kivitelezésről",
              en: "Videos of the correct form",
            },
          },
          {
            id: "c4",
            text: {
              ro: "Răspuns la filmările pe care le trimiți",
              hu: "Válasz a beküldött felvételeidre",
              en: "An answer to the footage you send",
            },
          },
        ],
        cardNote: {
          ro: "Când luna nu e confirmată ca plătită, materialele se închid. Contul, istoricul și pozele tale rămân.",
          hu: "Ha a hónap nincs fizetettként megerősítve, az anyagok bezárulnak. A fiókod, az előzményeid és a képeid megmaradnak.",
          en: "When the month is not confirmed as paid, the material closes. Your account, your history and your photographs stay.",
        },
      },
    },
    {
      id: "home-steps",
      type: "steps",
      data: {
        background: "none",
        eyebrow: { ro: "Cum funcționează", hu: "Hogyan működik", en: "How it works" },
        title: {
          ro: "Patru pași, fără abonamente ascunse",
          hu: "Négy lépés, rejtett előfizetés nélkül",
          en: "Four steps, no hidden subscriptions",
        },
        lead: {
          ro: "Platforma nu antrenează pe nimeni — antrenorii o fac. Noi arătăm cine sunt și ținem la un loc tot ce îți dau.",
          hu: "A platform senkit nem edz — az edzők teszik. Mi megmutatjuk, kik ők, és egy helyen tartjuk, amit adnak.",
          en: "The platform trains nobody — the trainers do. We show you who they are and keep everything they give you in one place.",
        },
        items: [
          {
            id: "s1",
            icon: "userPlus",
            title: { ro: "Alegi antrenorul", hu: "Kiválasztod az edzőt", en: "Choose a trainer" },
            text: {
              ro: "Filtrezi după obiectiv, oraș și format. Vezi experiența, certificările și prețul lunar înainte să scrii cuiva.",
              hu: "Cél, város és formátum szerint szűrsz. Látod a tapasztalatot, a képesítéseket és a havi árat, mielőtt írnál.",
              en: "Filter by goal, city and format. You see the experience, the certifications and the monthly price before writing to anyone.",
            },
          },
          {
            id: "s2",
            icon: "chat",
            title: { ro: "Trimiți cererea", hu: "Elküldöd a kérést", en: "Send your request" },
            text: {
              ro: "Îți faci cont și scrii în câteva rânduri ce vrei să obții. Antrenorul acceptă sau nu — nimeni nu îți cere bani înainte.",
              hu: "Létrehozol egy fiókot, és pár sorban leírod a célodat. Az edző elfogadja vagy nem — előtte senki nem kér pénzt.",
              en: "You create an account and write a few lines about your goal. The trainer accepts or declines — nobody asks for money first.",
            },
          },
          {
            id: "s3",
            icon: "card",
            title: { ro: "Confirmi luna", hu: "Megerősíted a hónapot", en: "Confirm the month" },
            text: {
              ro: "Plătești direct antrenorului, iar el marchează luna ca plătită. Din acel moment contul tău se deschide.",
              hu: "Közvetlenül az edzőnek fizetsz, ő fizetettként jelöli a hónapot. Ettől kezdve megnyílik a fiókod.",
              en: "You pay the trainer directly and they mark the month as paid. From that moment your account opens.",
            },
          },
          {
            id: "s4",
            icon: "chart",
            title: { ro: "Te antrenezi", hu: "Edzel", en: "You train" },
            text: {
              ro: "Urmărești materialele, îți notezi progresul și trimiți filmări. El răspunde pe fiecare, acolo unde ai întrebat.",
              hu: "Követed az anyagokat, rögzíted a haladásod és felvételeket küldesz. Ő mindegyikre ott válaszol.",
              en: "You follow the material, log your progress and send footage. They answer on each one, where you asked.",
            },
          },
        ],
      },
    },
    {
      id: "home-trainers",
      type: "trainerGrid",
      data: {
        background: "none",
        eyebrow: { ro: "Antrenori", hu: "Edzők", en: "Trainers" },
        title: {
          ro: "Cine te poate antrena",
          hu: "Ki tud edzeni téged",
          en: "Who can train you",
        },
        lead: {
          ro: "Fiecare profil este adăugat manual, după verificarea certificărilor.",
          hu: "Minden profilt kézzel adunk hozzá, a képesítések ellenőrzése után.",
          en: "Every profile is added by hand, after certifications are checked.",
        },
        linkLabel: {
          ro: "Vezi toți antrenorii",
          hu: "Összes edző",
          en: "See all trainers",
        },
        count: 4,
      },
    },
    {
      id: "home-account",
      type: "cardGrid",
      data: {
        background: "soft",
        columns: 3,
        showImages: false,
        title: {
          ro: "Ce primești pentru luna plătită",
          hu: "Mit kapsz a fizetett hónapért",
          en: "What a paid month gives you",
        },
        items: [
          {
            id: "a1",
            heading: {
              ro: "Videoclipuri cu execuția",
              hu: "Videók a kivitelezésről",
              en: "Videos of the movements",
            },
            text: {
              ro: "Linkuri YouTube atașate de antrenor, grupate pe exerciții.",
              hu: "Az edző által csatolt YouTube-linkek, gyakorlatonként rendezve.",
              en: "YouTube links your trainer attaches, grouped by exercise.",
            },
          },
          {
            id: "a2",
            heading: {
              ro: "Programul în Google Sheets",
              hu: "A program Google Sheetsben",
              en: "Your programme in Google Sheets",
            },
            text: {
              ro: "Foaia pe care antrenorul o actualizează și în care îți notezi greutățile.",
              hu: "A táblázat, amelyet az edző frissít, és amelybe a súlyaidat írod.",
              en: "The sheet your trainer updates and where you log your weights.",
            },
          },
          {
            id: "a3",
            heading: { ro: "Plan alimentar", hu: "Étrend", en: "Diet plan" },
            text: {
              ro: "Scris pentru tine, citit direct în cont, nu într-un PDF pierdut pe WhatsApp.",
              hu: "Neked írva, a fiókban olvasva, nem egy WhatsAppon elveszett PDF-ben.",
              en: "Written for you and read in your account, not in a PDF lost on WhatsApp.",
            },
          },
          {
            id: "a4",
            heading: {
              ro: "Îți filmezi execuția",
              hu: "Felveszed a kivitelezésed",
              en: "You film your form",
            },
            text: {
              ro: "Încarci videoclipul sau lipești un link. Îl vede doar antrenorul tău.",
              hu: "Feltöltöd a videót vagy beilleszted a linket. Csak az edződ látja.",
              en: "Upload the video or paste a link. Only your trainer sees it.",
            },
          },
          {
            id: "a5",
            heading: {
              ro: "Primești răspuns punctual",
              hu: "Pontos választ kapsz",
              en: "You get a specific answer",
            },
            text: {
              ro: "Corecția stă atașată de filmarea la care se referă, nu se pierde într-un chat.",
              hu: "A javítás a felvételhez tartozik, nem vész el egy chatben.",
              en: "The correction stays attached to the clip it refers to, instead of getting lost in a chat.",
            },
          },
          {
            id: "a6",
            heading: { ro: "Regula, pe față", hu: "A szabály, nyíltan", en: "The rule, stated plainly" },
            text: {
              ro: "Materialele antrenorului sunt vizibile cât timp luna curentă e confirmată ca plătită. Pozele, măsurătorile și istoricul tău rămân ale tale oricând.",
              hu: "Az edző anyagai addig láthatók, amíg az aktuális hónap fizetettként meg van erősítve. A képeid, méreteid és előzményeid mindig a tieid maradnak.",
              en: "Your trainer's material is visible while the current month is confirmed as paid. Your photographs, measurements and history stay yours regardless.",
            },
          },
        ],
      },
    },
    {
      id: "home-testimonials",
      type: "testimonials",
      data: {
        background: "none",
        eyebrow: { ro: "Testimoniale", hu: "Vélemények", en: "What people said" },
        title: {
          ro: "Ce spun cursanții",
          hu: "Mit mondanak a sportolók",
          en: "What clients say",
        },
        count: 3,
      },
    },
    {
      id: "home-faq",
      type: "faqList",
      data: {
        background: "none",
        eyebrow: { ro: "Întrebări", hu: "Kérdések", en: "Questions" },
        title: {
          ro: "Ce întreabă toată lumea",
          hu: "Amit mindenki kérdez",
          en: "What everybody asks",
        },
        lead: {
          ro: "Inclusiv întrebările incomode: cine ține banii, ce se întâmplă dacă nu plătești, cine vede pozele tale.",
          hu: "Beleértve a kényelmetlen kérdéseket is: kinél a pénz, mi történik, ha nem fizetsz, ki látja a képeidet.",
          en: "Including the awkward ones: who holds the money, what happens if you stop paying, who sees your photographs.",
        },
        topic: "",
      },
    },
    {
      id: "home-cta",
      type: "cta",
      data: {
        background: "neon",
        title: {
          ro: "Alege un antrenor și începe luna asta",
          hu: "Válassz edzőt, és kezdd el ebben a hónapban",
          en: "Choose a trainer and start this month",
        },
        text: {
          ro: "Îți faci cont în două minute. Plătești abia după ce antrenorul îți acceptă cererea.",
          hu: "Két perc alatt létrehozod a fiókod. Csak akkor fizetsz, ha az edző elfogadta a kérésed.",
          en: "Your account takes two minutes. You pay only after a trainer accepts you.",
        },
        label: { ro: "Vezi antrenorii", hu: "Edzők megtekintése", en: "See the trainers" },
        href: "/antrenori",
      },
    },
  ] as never;

  await pages.save(home);
  console.log(`  · home page filled with ${home.content.length} blocks`);
}
