import type { DataSource } from "typeorm";
import { PageEntity } from "@shared/entities";
import type { Block } from "@shared/types/blocks";

/**
 * Before and after, on the front page — the proof in pictures, placed directly
 * above the proof in words.
 *
 * Appended rather than written over, and skipped if the page already carries a
 * block of this type: same contract as seeder 018.
 *
 * **The pair seeded here is demonstration content and the photographs are
 * stock.** They are the two Unsplash pictures seeder 009 already uses for the
 * demo client's progress, and the names are the two demo testimonials — no new
 * invented person is introduced by this seeder. A before-and-after is a claim
 * about a real body, so `PLAN.md` lists this block first among what must be
 * replaced or deleted: every published pair needs the written consent of the
 * person in it.
 */

const BLOCK: Block = {
  id: "home-transformations",
  type: "transformations",
  data: {
    background: "none",
    eyebrow: { ro: "Rezultate", hu: "Eredmények", en: "Results" },
    title: {
      ro: "Ce s-a schimbat, în poze",
      hu: "Ami megváltozott, képekben",
      en: "What changed, in pictures",
    },
    lead: {
      ro: "Trage de cursor peste fotografie: poza de acum vine peste cea de la început. Aceleași luni, același antrenor, aceeași cameră.",
      hu: "Húzd el a csúszkát a képen: a mostani fénykép a kezdeti fölé kerül. Ugyanazok a hónapok, ugyanaz az edző, ugyanaz a szoba.",
      en: "Drag the handle across the photograph: the picture from today comes over the one from the start. The same months, the same coach, the same room.",
    },
    beforeLabel: { ro: "Înainte", hu: "Előtte", en: "Before" },
    afterLabel: { ro: "Acum", hu: "Most", en: "Now" },
    items: [
      {
        id: "transformation-maria",
        before: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1000&q=80",
        beforeAlt: "Fotografie de început",
        after: "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=1000&q=80",
        afterAlt: "Fotografie de acum",
        name: "Maria I.",
        meta: { ro: "6 luni", hu: "6 hónap", en: "6 months" },
        quote: {
          ro: "Am început fără să știu nimic despre sală. Primul lucru pe care l-am primit a fost un program pe care chiar îl puteam face în cele trei zile pe care le aveam.",
          hu: "Úgy kezdtem, hogy semmit nem tudtam a konditeremről. Az első, amit kaptam, egy olyan program volt, amit tényleg meg tudtam csinálni a három szabad napomon.",
          en: "I started knowing nothing about a gym. The first thing I got was a programme I could actually do in the three days I had.",
        },
      },
      {
        id: "transformation-cristian",
        before: "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=1000&q=80",
        beforeAlt: "Fotografie de început",
        after: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1000&q=80",
        afterAlt: "Fotografie de acum",
        name: "Cristian D.",
        meta: { ro: "4 luni", hu: "4 hónap", en: "4 months" },
        quote: {
          ro: "Trimit filmări în fiecare săptămână și primesc corecturi pe ele. Asta a schimbat totul — nu mai ghicesc dacă fac bine exercițiul.",
          hu: "Minden héten küldök felvételeket, és javításokat kapok rájuk. Ez változtatott meg mindent — már nem találgatom, jól csinálom-e a gyakorlatot.",
          en: "I send footage every week and get corrections on it. That changed everything — I am no longer guessing whether I am doing the movement right.",
        },
      },
    ],
  },
};

export async function run(dataSource: DataSource) {
  const pages = dataSource.getRepository(PageEntity);

  const home = await pages.findOne({ where: { slug: "home" } });
  if (!home) {
    console.log("home page missing — nothing to add to");
    return;
  }

  const content: Block[] = [...(home.content ?? [])];
  if (content.length === 0) {
    console.log("home page is empty — seeder 012 fills it; nothing to add to");
    return;
  }

  if (content.some((existing) => existing.type === BLOCK.type)) {
    console.log("transformations already on the page — left alone");
    return;
  }

  // Directly above the quotations: the pictures make the claim, the words say
  // what it felt like. If an editor has removed that block, before the closing
  // call to action instead, and at the end if there is none.
  const quotes = content.findIndex((existing) => existing.type === "testimonials");
  const closing = content.findIndex((existing) => existing.type === "cta");
  const at = quotes !== -1 ? quotes : closing !== -1 ? closing : content.length;

  content.splice(at, 0, BLOCK);
  home.content = content;
  await pages.save(home);

  console.log("home page: transformations added");
}
