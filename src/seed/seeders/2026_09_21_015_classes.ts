import type { DataSource } from "typeorm";
import { TrainerEntity, TrainingClassEntity } from "@shared/entities";
import { PageStatus } from "@shared/enums/page-status.enum";
import { SessionLocation } from "@shared/enums/accelerez.enum";

/**
 * Four classes, so the teaser row on the home page and the classes page have
 * something to show on the first boot.
 *
 * **The copy is real enough to publish and the prices are invented.** A class
 * is a thing the platform sells, so the wording describes what each one is
 * honestly; the figures are placeholders and `PLAN.md` lists them among what
 * must be confirmed before launch.
 *
 * Every class is attached to whichever trainers exist, so the cards show a
 * coach rather than an empty row. With no trainers published they simply show
 * none — a class outlives the person who teaches it.
 */

const CLASSES = [
  {
    slug: { ro: "antrenament-de-intensitate-mare", hu: "nagy-intenzitasu-edzes", en: "high-intensity-training" },
    title: {
      ro: "Antrenament de intensitate mare",
      hu: "Nagy intenzitású edzés",
      en: "High-intensity training",
    },
    excerpt: {
      ro: "Dacă îți place să te antrenezi afară și vrei o oră care te lasă fără aer, HIIT e clasa ta. Intervale scurte, pauze scurte, tot corpul.",
      hu: "Ha szeretsz szabadban edzeni, és olyan órát akarsz, ami kifullaszt, a HIIT a te órád. Rövid intervallumok, rövid szünetek, egész test.",
      en: "If you like training outdoors and want an hour that leaves you breathless, HIIT is your class. Short intervals, short breaks, the whole body.",
    },
    image: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1000&q=80",
    scheduleText: {
      ro: "Luni, miercuri, vineri · 19:00",
      hu: "Hétfő, szerda, péntek · 19:00",
      en: "Monday, Wednesday, Friday · 7pm",
    },
    durationMinutes: 50,
    pricePerSession: 60,
    pricePerMonth: 450,
    ribbon: { ro: "30% prima lună", hu: "30% az első hónapban", en: "30% first month" },
    location: SessionLocation.OUTDOOR,
    city: "Târgu Mureș",
    capacity: 14,
    specializations: ["conditioning", "weight_loss"],
    isFeatured: true,
  },
  {
    slug: { ro: "crossfit", hu: "crossfit", en: "crossfit" },
    title: { ro: "CrossFit", hu: "CrossFit", en: "CrossFit" },
    excerpt: {
      ro: "Magia stă în mișcare. Antrenamentele sunt diferite în fiecare zi și se ajustează după nivelul fiecăruia — de la prima ședință până la competiție.",
      hu: "A varázslat a mozgásban van. Az edzések minden nap mások, és mindenki szintjéhez igazodnak — az első alkalomtól a versenyig.",
      en: "The magic is in the movement. Workouts are different every day and scale to each athlete — from the first session to competition.",
    },
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1000&q=80",
    scheduleText: {
      ro: "Marți și joi · 18:00 și 20:00",
      hu: "Kedd és csütörtök · 18:00 és 20:00",
      en: "Tuesday and Thursday · 6pm and 8pm",
    },
    durationMinutes: 60,
    pricePerSession: 70,
    pricePerMonth: 520,
    location: SessionLocation.GYM,
    city: "Târgu Mureș",
    capacity: 12,
    specializations: ["strength", "conditioning", "competition"],
    isFeatured: true,
  },
  {
    slug: { ro: "box", hu: "boksz", en: "boxing" },
    title: { ro: "Box", hu: "Boksz", en: "Boxing" },
    excerpt: {
      ro: "Tehnică, coordonare și condiție fizică, fără să iei vreo lovitură în prima lună. Se începe de la gardă și deplasare, nu de la sac.",
      hu: "Technika, koordináció és állóképesség — az első hónapban ütést sem kapsz. Az alapállással és a lábmunkával kezdünk, nem a zsákkal.",
      en: "Technique, coordination and conditioning, without taking a punch in the first month. It starts with the guard and footwork, not the bag.",
    },
    image: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1000&q=80",
    scheduleText: {
      ro: "Luni și joi · 20:00",
      hu: "Hétfő és csütörtök · 20:00",
      en: "Monday and Thursday · 8pm",
    },
    durationMinutes: 75,
    pricePerSession: 65,
    pricePerMonth: 480,
    location: SessionLocation.GYM,
    city: "Târgu Mureș",
    capacity: 16,
    specializations: ["conditioning", "competition"],
    isFeatured: true,
  },
  {
    slug: { ro: "yoga-si-pilates", hu: "jóga-es-pilates", en: "yoga-and-pilates" },
    title: { ro: "Yoga & Pilates", hu: "Jóga és pilates", en: "Yoga & Pilates" },
    excerpt: {
      ro: "Amândouă sunt cu impact mic și se fac pe saltea, dar lucrează lucruri diferite: yoga mobilitatea și respirația, pilates centrul și controlul.",
      hu: "Mindkettő kíméletes és matracon zajlik, de mást fejleszt: a jóga a mobilitást és a légzést, a pilates a törzset és a kontrollt.",
      en: "Both are low-impact and done on a mat, but they train different things: yoga mobility and breathing, Pilates the core and control.",
    },
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1000&q=80",
    scheduleText: {
      ro: "Marți, joi, sâmbătă · 09:00",
      hu: "Kedd, csütörtök, szombat · 09:00",
      en: "Tuesday, Thursday, Saturday · 9am",
    },
    durationMinutes: 60,
    pricePerSession: 50,
    pricePerMonth: 380,
    location: SessionLocation.GYM,
    city: "Târgu Mureș",
    capacity: 18,
    specializations: ["mobility", "rehab", "seniors"],
    isFeatured: true,
  },
];

export async function run(dataSource: DataSource) {
  const classes = dataSource.getRepository(TrainingClassEntity);
  const trainers = dataSource.getRepository(TrainerEntity);

  if (await classes.count()) {
    console.log("classes already present — left alone");
    return;
  }

  const published = await trainers.find({
    where: { status: PageStatus.PUBLISHED },
    select: ["id"],
  });
  const trainerIds = published.map((row) => row.id);

  let order = 0;

  for (const row of CLASSES) {
    order += 1;

    await classes.save(
      classes.create({
        ...row,
        trainerIds,
        currency: "RON",
        status: PageStatus.PUBLISHED,
        publishedLocales: ["ro", "hu", "en"],
        sortOrder: order,
        content: [
          {
            id: `${row.slug.ro}-body`,
            type: "richText",
            data: {
              background: "none",
              html: {
                ro: `<p>${row.excerpt.ro}</p><p>Prima ședință este o evaluare: vedem de unde pleci și ce ajustăm. Vino cu zece minute mai devreme.</p>`,
                hu: `<p>${row.excerpt.hu}</p><p>Az első alkalom felmérés: megnézzük, honnan indulsz és mit igazítunk. Gyere tíz perccel korábban.</p>`,
                en: `<p>${row.excerpt.en}</p><p>The first session is an assessment: we see where you are starting from and what to adjust. Come ten minutes early.</p>`,
              },
            },
          },
        ],
      } as never),
    );
    console.log(`  · ${row.title.ro}`);
  }
}
