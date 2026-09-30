import type { DataSource } from "typeorm";
import * as bcrypt from "bcryptjs";
import { TrainerEntity, UserEntity } from "@shared/entities";
import { PageStatus } from "@shared/enums/page-status.enum";
import { UserRole } from "@shared/enums/user-role.enum";

/**
 * Four demonstration trainers, so the directory, the filters and the home page
 * can be seen working before a single real coach is admitted.
 *
 * **Every one of them is invented, and deliberately obviously so.** The names
 * are fictional, the photographs are Unsplash portraits of people who are not
 * trainers, and the certifications are plausible rather than real. They exist
 * to show the product, and `PLAN.md` lists each one as something that must be
 * deleted before launch.
 *
 * The line this does not cross: none of them carries a telephone number, an
 * e-mail address a visitor could write to, or a social profile that belongs to
 * somebody. A fake person is a demo; a fake person with a real contact detail
 * is a complaint.
 *
 * Their accounts share one password so the portal can be demonstrated from any
 * of them. That is also why this seeder must not run in production — see the
 * guard at the top of `run`.
 */

const PASSWORD = "demo1234";

const TRAINERS = [
  {
    email: "andrei@demo.accelerez.ro",
    firstName: "Andrei",
    lastName: "Marin",
    displayName: "Andrei Marin",
    slug: { ro: "andrei-marin", hu: "andrei-marin", en: "andrei-marin" },
    photo: "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=800&q=80",
    coverImage: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=80",
    city: "Cluj-Napoca",
    county: "Cluj",
    formats: ["hybrid", "online"],
    specializations: ["weight_loss", "conditioning", "nutrition"],
    yearsExperience: 6,
    monthlyPrice: 450,
    capacity: 20,
    isFeatured: true,
    headline: {
      ro: "Slăbire fără dietă de foame, pentru oameni care lucrează la birou",
      hu: "Fogyás éhezés nélkül, irodában dolgozóknak",
      en: "Weight loss without starving, for people with desk jobs",
    },
    excerpt: {
      ro: "Lucrez cu oameni care stau opt ore pe scaun și au două ore pe săptămână. Programul se construiește în jurul vieții tale, nu invers.",
      hu: "Olyanokkal dolgozom, akik napi nyolc órát ülnek, és heti két órájuk van. A program az életed köré épül, nem fordítva.",
      en: "I work with people who sit for eight hours and have two a week. The programme is built around your life, not the other way round.",
    },
    body: {
      ro: "<p>Am început să antrenez după ce am slăbit 22 de kilograme și mi-am dat seama că partea grea nu a fost sala, ci cele trei mese pe care le luam în fugă. De atunci lucrez aproape exclusiv cu oameni care au un program fix și puțin timp liber.</p><p>Primele patru săptămâni sunt despre obișnuință, nu despre performanță: trei antrenamente pe săptămână, o listă scurtă de alimente și un raport săptămânal. Abia după ce ritmul se ține singur adăugăm volum.</p>",
      hu: "<p>Azután kezdtem edzeni, hogy lefogytam 22 kilót, és rájöttem: nem a terem volt a nehéz, hanem a három kapkodva elfogyasztott étkezés. Azóta szinte kizárólag olyanokkal dolgozom, akiknek kötött a napirendjük és kevés a szabadidejük.</p><p>Az első négy hét a szokásról szól, nem a teljesítményről: heti három edzés, rövid élelmiszerlista és heti jelentés. Csak amikor a ritmus magától megy, adunk hozzá volument.</p>",
      en: "<p>I started coaching after losing 22 kilos myself, and realising the hard part was never the gym — it was three meals eaten in a hurry. Since then I have worked almost entirely with people on a fixed schedule and little spare time.</p><p>The first four weeks are about habit, not performance: three sessions a week, a short list of foods and a weekly report. Only once the rhythm holds by itself do we add volume.</p>",
    },
    certifications: [
      { name: "Antrenor personal acreditat", issuer: "ANC", year: 2019 },
      { name: "Nutriție sportivă — nivel 1", issuer: "ISSN", year: 2021 },
    ],
  },
  {
    email: "ioana@demo.accelerez.ro",
    firstName: "Ioana",
    lastName: "Petrescu",
    displayName: "Ioana Petrescu",
    slug: { ro: "ioana-petrescu", hu: "ioana-petrescu", en: "ioana-petrescu" },
    photo: "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=800&q=80",
    coverImage: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1600&q=80",
    city: "Online",
    county: null,
    formats: ["online"],
    specializations: ["nutrition", "weight_loss", "prenatal"],
    yearsExperience: 9,
    monthlyPrice: 400,
    capacity: 30,
    isFeatured: true,
    headline: {
      ro: "Nutriție și antrenament online, inclusiv în sarcină și după naștere",
      hu: "Online táplálkozás és edzés, terhesség alatt és szülés után is",
      en: "Online nutrition and training, including during and after pregnancy",
    },
    excerpt: {
      ro: "Nouă ani de lucru online, din care patru dedicate perioadei pre și postnatale. Planul se ajustează lunar, pe baza a ce raportezi.",
      hu: "Kilenc év online munka, ebből négy a szülés előtti és utáni időszakra. A terv havonta igazodik ahhoz, amit visszajelzel.",
      en: "Nine years working online, four of them on the pre- and postnatal period. The plan is adjusted monthly, from what you report.",
    },
    body: {
      ro: "<p>Lucrez exclusiv online, cu cursante din toată țara și din diasporă. Asta înseamnă că nu îți corectez execuția pe loc — o corectez din videoclipurile pe care mi le trimiți, ceea ce funcționează surprinzător de bine dacă filmezi din unghiul cerut.</p><p>Pentru perioada prenatală și postnatală lucrez doar cu acordul medicului curant. Nu este o formalitate: este singurul mod în care pot ajusta în siguranță.</p>",
      hu: "<p>Kizárólag online dolgozom, az ország egész területéről és külföldről érkező kliensekkel. Ez azt jelenti, hogy nem helyben javítom a kivitelezést, hanem az általad küldött videókból — ami meglepően jól működik, ha a kért szögből filmezel.</p><p>A szülés előtti és utáni időszakban csak a kezelőorvos hozzájárulásával dolgozom. Ez nem formaság: csak így tudok biztonságosan módosítani.</p>",
      en: "<p>I work entirely online, with clients across the country and abroad. That means I do not correct your form on the spot — I correct it from the videos you send, which works surprisingly well when you film from the angle I ask for.</p><p>For the pre- and postnatal period I work only with your doctor's agreement. That is not a formality: it is the only way I can adjust safely.</p>",
    },
    certifications: [
      { name: "Tehnician nutriționist", issuer: "ANC", year: 2016 },
      { name: "Pre & Postnatal Coaching", issuer: "GGS", year: 2020 },
    ],
  },
  {
    email: "robert@demo.accelerez.ro",
    firstName: "Robert",
    lastName: "Dincă",
    displayName: "Robert Dincă",
    slug: { ro: "robert-dinca", hu: "robert-dinca", en: "robert-dinca" },
    photo: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80",
    coverImage: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1600&q=80",
    city: "București",
    county: "București",
    formats: ["in_person"],
    specializations: ["strength", "muscle_gain", "competition"],
    yearsExperience: 12,
    monthlyPrice: 600,
    capacity: 12,
    isFeatured: false,
    headline: {
      ro: "Forță și masă musculară, cu program scris pe hârtie și verificat săptămânal",
      hu: "Erő és izomtömeg, papíron leírt és hetente ellenőrzött programmal",
      en: "Strength and muscle, on a written programme checked every week",
    },
    excerpt: {
      ro: "Powerlifting și hipertrofie, în sală, în București. Dacă vrei rezultate rapide fără să ridici greu, nu sunt antrenorul potrivit.",
      hu: "Erőemelés és hipertrófia, teremben, Bukarestben. Ha gyors eredményt akarsz nehéz emelés nélkül, nem én vagyok a megfelelő edző.",
      en: "Powerlifting and hypertrophy, in the gym, in Bucharest. If you want fast results without lifting heavy, I am not your coach.",
    },
    body: {
      ro: "<p>Doisprezece ani în sală, din care ultimii șase aproape numai cu sportivi care concurează. Lucrez cu blocuri de patru săptămâni, cu încărcături calculate, și nu improvizez antrenamentul în ziua respectivă.</p><p>Preiau maximum doisprezece cursanți odată. Nu este marketing — peste numărul ăsta nu mai pot urmări fiecare serie filmată, iar programul devine o foaie de hârtie pe care o primești lunar.</p>",
      hu: "<p>Tizenkét év a teremben, ebből az utolsó hat szinte kizárólag versenyzőkkel. Négyhetes blokkokban dolgozom, számolt terhelésekkel, és nem az adott napon improvizálom az edzést.</p><p>Egyszerre legfeljebb tizenkét klienst vállalok. Ez nem marketing — e fölött már nem tudom minden filmezett sorozatot végignézni, és a program csak egy havonta kapott papírlap lenne.</p>",
      en: "<p>Twelve years on the gym floor, the last six almost entirely with competing athletes. I work in four-week blocks with calculated loads, and I do not improvise the session on the day.</p><p>I take twelve clients at most. That is not marketing — beyond that number I can no longer watch every filmed set, and the programme becomes a sheet of paper you receive once a month.</p>",
    },
    certifications: [
      { name: "Antrenor de haltere și powerlifting", issuer: "FRH", year: 2015 },
      { name: "Strength & Conditioning Specialist", issuer: "NSCA", year: 2018 },
    ],
  },
  {
    email: "alina@demo.accelerez.ro",
    firstName: "Alina",
    lastName: "Cosma",
    displayName: "Alina Cosma",
    slug: { ro: "alina-cosma", hu: "alina-cosma", en: "alina-cosma" },
    photo: "https://images.unsplash.com/photo-1609899537878-88d5ba429bdf?w=800&q=80",
    coverImage: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1600&q=80",
    city: "Brașov",
    county: "Brașov",
    formats: ["hybrid"],
    specializations: ["mobility", "rehab", "seniors"],
    yearsExperience: 7,
    monthlyPrice: 380,
    capacity: 18,
    isFeatured: true,
    headline: {
      ro: "Mobilitate și revenire după accidentări, pentru cine s-a oprit din mișcare",
      hu: "Mobilitás és sérülés utáni visszatérés azoknak, akik abbahagyták a mozgást",
      en: "Mobility and return after injury, for people who stopped moving",
    },
    excerpt: {
      ro: "Lucrez cu oameni care au o durere veche și cu cei care nu au făcut sport de zece ani. Începem de la ce poți azi, nu de la ce ai putut cândva.",
      hu: "Régi fájdalommal élőkkel és olyanokkal dolgozom, akik tíz éve nem sportoltak. Onnan indulunk, amit ma tudsz, nem abból, amit valaha.",
      en: "I work with people carrying an old pain and with people who have not trained in ten years. We start from what you can do today, not what you once could.",
    },
    body: {
      ro: "<p>Am ajuns aici dinspre kinetoterapie, iar asta se vede în cum arată primele ședințe: multă evaluare, mișcări mici, foarte puțină greutate. Nu este spectaculos și nu se filmează bine, dar este partea care face diferența la șase luni.</p><p>Colaborez cu medicul sau kinetoterapeutul tău ori de câte ori există un diagnostic. Nu dau indicații care contrazic o recomandare medicală.</p>",
      hu: "<p>A gyógytorna felől érkeztem, és ez látszik az első alkalmakon: sok felmérés, apró mozdulatok, nagyon kevés súly. Nem látványos és rosszul filmezhető, de ez az a rész, ami fél év múlva számít.</p><p>Ha van diagnózis, együttműködöm az orvosoddal vagy a gyógytornászoddal. Nem adok olyan utasítást, ami ellentmond egy orvosi javaslatnak.</p>",
      en: "<p>I came to this from physiotherapy, and it shows in the first sessions: a lot of assessment, small movements, very little weight. It is not spectacular and it films badly, but it is the part that makes the difference at six months.</p><p>Where there is a diagnosis I work with your doctor or physiotherapist. I do not give instructions that contradict a medical recommendation.</p>",
    },
    certifications: [
      { name: "Kinetoterapeut", issuer: "UMF", year: 2016 },
      { name: "Functional Range Conditioning", issuer: "FRC", year: 2021 },
    ],
  },
];

export async function run(dataSource: DataSource) {
  // A demo trainer is a person who does not exist, with a password printed in
  // a public repository. Never on a live site.
  if (process.env.APPLICATION_ENV === "production") {
    console.log("production — demo trainers skipped");
    return;
  }

  const users = dataSource.getRepository(UserEntity);
  const trainers = dataSource.getRepository(TrainerEntity);
  const hash = await bcrypt.hash(PASSWORD, 10);

  let order = 0;

  for (const demo of TRAINERS) {
    order += 1;

    if (await users.findOne({ where: { email: demo.email } })) {
      console.log(`  · ${demo.displayName} already exists — left alone`);
      continue;
    }

    const user = await users.save(
      users.create({
        email: demo.email,
        password: hash,
        firstName: demo.firstName,
        lastName: demo.lastName,
        role: UserRole.TRAINER,
        locale: "ro",
      }),
    );

    await trainers.save(
      trainers.create({
        userId: user.id,
        slug: demo.slug,
        displayName: demo.displayName,
        headline: demo.headline,
        excerpt: demo.excerpt,
        photo: demo.photo,
        coverImage: demo.coverImage,
        city: demo.city,
        county: demo.county,
        formats: demo.formats,
        specializations: demo.specializations,
        yearsExperience: demo.yearsExperience,
        certifications: demo.certifications,
        monthlyPrice: demo.monthlyPrice,
        currency: "RON",
        capacity: demo.capacity,
        isAcceptingClients: true,
        isFeatured: demo.isFeatured,
        // No telephone, no e-mail, no social profiles — see the class note.
        social: {},
        status: PageStatus.PUBLISHED,
        publishedLocales: ["ro", "hu", "en"],
        sortOrder: order,
        content: [
          {
            id: `${demo.slug.ro}-body`,
            type: "richText",
            data: { background: "none", html: demo.body },
          },
        ],
      } as never),
    );

    console.log(`  · created ${demo.displayName} (${demo.email} / ${PASSWORD})`);
  }
}
