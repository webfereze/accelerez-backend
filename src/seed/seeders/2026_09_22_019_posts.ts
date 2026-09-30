import type { DataSource } from "typeorm";
import { PostEntity } from "@shared/entities";
import { PageStatus } from "@shared/enums/page-status.enum";
import { BlogCategory, Specialization } from "@shared/enums/accelerez.enum";

/**
 * Three articles, so the blog and the section on the front page have something
 * to show on a first boot.
 *
 * **Starter copy, not the editorial line.** Every claim in them is the ordinary
 * advice a coach gives in a first session and none of it is invented science —
 * but nobody at the association has said these words either, so `PLAN.md` lists
 * them among the demonstration content to rewrite or delete before launch.
 *
 * They are signed by the platform rather than by a person. Attributing a piece
 * nobody wrote to a named coach is the one thing here that could not be undone
 * by deleting a row: their name would have been on it.
 *
 * Published in all three languages, because an article that exists only in
 * Romanian is invisible on the Hungarian blog — there is no silent fallback —
 * and a blank listing is the failure this seeder exists to prevent.
 */

const POSTS = [
  {
    slug: {
      ro: "de-ce-nu-slabesti-desi-te-antrenezi",
      hu: "miert-nem-fogysz-pedig-edzel",
      en: "why-you-are-not-losing-weight-although-you-train",
    },
    title: {
      ro: "De ce nu slăbești, deși te antrenezi de trei ori pe săptămână",
      hu: "Miért nem fogysz, pedig hetente háromszor edzel",
      en: "Why you are not losing weight although you train three times a week",
    },
    excerpt: {
      ro: "Antrenamentul consumă mai puține calorii decât crezi, iar ce mănânci după el le pune la loc. Cum arată, de fapt, un deficit care ține.",
      hu: "Az edzés kevesebb kalóriát éget, mint hinnéd, és amit utána megeszel, visszateszi. Hogyan néz ki valójában egy tartható deficit.",
      en: "Training burns fewer calories than you think, and what you eat afterwards puts them back. What a deficit you can hold actually looks like.",
    },
    cover: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1400&q=80",
    coverAlt: {
      ro: "Bol cu legume proaspete, avocado și năut",
      hu: "Tál friss zöldséggel, avokádóval és csicseriborsóval",
      en: "A bowl of fresh vegetables, avocado and chickpeas",
    },
    category: BlogCategory.NUTRITION,
    specializations: [Specialization.WEIGHT_LOSS, Specialization.NUTRITION],
    tags: ["nutritie", "slabit"],
    readingMinutes: 5,
    isFeatured: true,
    publishedAt: "2026-09-08T09:00:00Z",
    body: {
      ro: `<p>O oră de antrenament de forță consumă, pentru majoritatea oamenilor, între 250 și 400 de calorii. Un croissant și o cafea cu lapte, luate în drum spre casă, le pun la loc pe toate. Asta nu înseamnă că antrenamentul nu contează — înseamnă că nu el face diferența pe cântar.</p>
<p>Ce o face este deficitul: mănânci ceva mai puțin decât consumi, în fiecare zi, destul de mult timp cât să se vadă. Un deficit care ține este mic și plictisitor. Dacă în prima săptămână ți-e foame tot timpul, nu ai găsit deficitul, ai găsit o dietă pe care o vei abandona în trei săptămâni.</p>
<p>Trei lucruri care schimbă mai mult decât orice program de antrenament:</p>
<ul>
<li><strong>Proteina la fiecare masă.</strong> Te ține sătul mai mult și e singura parte din alimentație care îți protejează mușchiul cât timp slăbești.</li>
<li><strong>Băuturile.</strong> Sucurile, berea și cafeaua cu sirop sunt calorii pe care nu le observi pentru că nu le mesteci.</li>
<li><strong>Weekendul.</strong> Cinci zile impecabile și două de vacanță se anulează reciproc. Media pe șapte zile e singura care contează.</li>
</ul>
<p>Antrenamentul rămâne în program pentru altceva: pentru ca greutatea pe care o pierzi să fie grăsime, nu mușchi, și pentru ca la finalul perioadei să arăți diferit, nu doar să cântărești mai puțin.</p>`,
      hu: `<p>Egy óra erőedzés a legtöbb embernél 250 és 400 kalória között éget. Egy croissant és egy tejeskávé hazafelé menet mindet visszateszi. Ez nem azt jelenti, hogy az edzés nem számít — azt jelenti, hogy nem az dönti el, mit mutat a mérleg.</p>
<p>Azt a deficit dönti el: valamivel kevesebbet eszel, mint amennyit elhasználsz, minden nap, elég hosszú ideig ahhoz, hogy látszódjon. A tartható deficit kicsi és unalmas. Ha az első héten folyamatosan éhes vagy, nem deficitet találtál, hanem egy diétát, amit három hét múlva abbahagysz.</p>
<p>Három dolog, ami többet változtat, mint bármelyik edzésterv:</p>
<ul>
<li><strong>Fehérje minden étkezésnél.</strong> Tovább tart jól, és ez az egyetlen része az étrendnek, ami fogyás közben megvédi az izmaidat.</li>
<li><strong>Az italok.</strong> Az üdítő, a sör és a szirupos kávé olyan kalória, amit nem veszel észre, mert nem rágod meg.</li>
<li><strong>A hétvége.</strong> Öt hibátlan nap és két szabadnap kioltják egymást. Csak a hét napra vett átlag számít.</li>
</ul>
<p>Az edzés másért marad a programban: azért, hogy amit leadsz, zsír legyen és ne izom, és hogy az időszak végén másképp nézz ki, ne csak kevesebbet nyomj.</p>`,
      en: `<p>An hour of strength training burns between 250 and 400 calories for most people. A croissant and a latte on the way home put all of them back. That does not mean training does not matter — it means training is not what moves the scale.</p>
<p>The deficit is. You eat a little less than you spend, every day, for long enough to show. A deficit you can hold is small and boring. If you are hungry all the time in the first week, you have not found a deficit, you have found a diet you will abandon in three weeks.</p>
<p>Three things that change more than any training programme:</p>
<ul>
<li><strong>Protein at every meal.</strong> It keeps you full for longer, and it is the one part of your food that protects your muscle while you lose weight.</li>
<li><strong>What you drink.</strong> Soft drinks, beer and syrup coffees are calories you do not notice, because you do not chew them.</li>
<li><strong>The weekend.</strong> Five impeccable days and two days off cancel each other out. The seven-day average is the only one that counts.</li>
</ul>
<p>Training stays in the programme for something else: so that what you lose is fat rather than muscle, and so that at the end of the period you look different rather than only weighing less.</p>`,
    },
    ctaLabel: {
      ro: "Alege un antrenor care îți scrie planul",
      hu: "Válassz edzőt, aki megírja a terved",
      en: "Choose a trainer who writes your plan",
    },
    ctaHref: "/antrenori",
  },
  {
    slug: {
      ro: "cat-de-des-sa-te-antrenezi",
      hu: "milyen-gyakran-edzz",
      en: "how-often-to-train",
    },
    title: {
      ro: "Cât de des trebuie să te antrenezi ca să vezi rezultate",
      hu: "Milyen gyakran kell edzened, hogy eredményt láss",
      en: "How often you need to train to see results",
    },
    excerpt: {
      ro: "Trei antrenamente pe săptămână, ținute un an, bat șase pe săptămână ținute o lună. Ce contează de fapt: frecvența pe care o poți repeta.",
      hu: "Heti három edzés egy évig többet ér, mint heti hat egy hónapig. Ami igazán számít: az a gyakoriság, amit meg tudsz ismételni.",
      en: "Three sessions a week for a year beat six a week for a month. What matters is the frequency you can repeat.",
    },
    cover: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1400&q=80",
    coverAlt: {
      ro: "Sportiv ridicând o bară cu discuri într-o sală",
      hu: "Sportoló súlyzót emel egy edzőteremben",
      en: "An athlete lifting a loaded barbell in a gym",
    },
    category: BlogCategory.TRAINING,
    specializations: [Specialization.MUSCLE_GAIN, Specialization.STRENGTH],
    tags: ["antrenament", "program"],
    readingMinutes: 4,
    isFeatured: false,
    publishedAt: "2026-09-15T09:00:00Z",
    body: {
      ro: `<p>Întrebarea vine în prima discuție cu aproape fiecare client: de câte ori pe săptămână. Răspunsul onest este „de câte ori poți să repeți timp de un an”, iar pentru majoritatea oamenilor cu serviciu și copii asta înseamnă trei.</p>
<p>Trei antrenamente pe săptămână sunt suficiente pentru a construi mușchi și forță, cu condiția ca fiecare să fie plin: exerciții pentru tot corpul, greutăți care devin mai mari de la o lună la alta și ultimele repetări chiar grele. Un antrenament de o oră în care te odihnești patruzeci de minute nu este un antrenament de o oră.</p>
<p>Ce se întâmplă cu cei care încep cu șase: primele două săptămâni merg extraordinar, a treia doare, a patra e ratată, iar în a cincea programul nu mai există. Nu lipsa de voință e problema — e faptul că un program care nu are loc în viața ta nu se ține de tine.</p>
<p>Dacă ai doar două zile libere, folosește-le. Două antrenamente pe săptămână, ținute constant, aduc rezultate vizibile în câteva luni. Zero antrenamente, pentru că nu ai reușit să faci patru, nu aduc nimic.</p>`,
      hu: `<p>A kérdés szinte minden klienssel az első beszélgetésen előkerül: hetente hányszor. Az őszinte válasz az, hogy „ahányszor egy éven át meg tudod ismételni”, és a legtöbb dolgozó, gyereket nevelő embernél ez hármat jelent.</p>
<p>Heti három edzés elég az izom- és erőépítéshez, feltéve, hogy mindegyik tartalmas: egész testre kiterjedő gyakorlatok, hónapról hónapra növekvő súlyok, és az utolsó ismétlések tényleg nehezek. Egy egyórás edzés, amiből negyven percet pihensz, nem egyórás edzés.</p>
<p>Ami azokkal történik, akik hattal kezdenek: az első két hét remekül megy, a harmadik fáj, a negyedik kimarad, az ötödikben pedig már nincs is program. Nem az akaraterő a gond — hanem az, hogy egy terv, ami nem fér bele az életedbe, nem tart ki melletted.</p>
<p>Ha csak két szabad napod van, használd azokat. Heti két edzés, következetesen tartva, pár hónap alatt látható eredményt hoz. A nulla edzés, mert négyet nem sikerült, semmit nem hoz.</p>`,
      en: `<p>The question comes up in the first conversation with almost every client: how many times a week. The honest answer is "as many as you can repeat for a year", and for most people with a job and children that means three.</p>
<p>Three sessions a week are enough to build muscle and strength, provided each one is full: exercises for the whole body, weights that go up from month to month, and last repetitions that are genuinely hard. An hour in the gym where you rest for forty minutes of it is not an hour of training.</p>
<p>What happens to the people who start with six: the first fortnight goes wonderfully, the third week hurts, the fourth is missed, and by the fifth the programme no longer exists. Willpower is not the problem — a plan that does not fit your life does not stay with you.</p>
<p>If you only have two free days, use those. Two sessions a week, held consistently, show in a few months. Zero sessions, because you could not manage four, show nothing.</p>`,
    },
    ctaLabel: {
      ro: "Vezi clasele și orarul lor",
      hu: "Nézd meg az órákat és az időpontjaikat",
      en: "See the classes and their schedule",
    },
    ctaHref: "/clase",
  },
  {
    slug: {
      ro: "somnul-partea-din-program-pe-care-o-sari",
      hu: "az-alvas-amit-kihagysz-a-programbol",
      en: "sleep-the-part-of-the-programme-you-skip",
    },
    title: {
      ro: "Somnul e partea din program pe care o sari",
      hu: "Az alvás az a része a programnak, amit kihagysz",
      en: "Sleep is the part of the programme you skip",
    },
    excerpt: {
      ro: "Mușchiul nu crește în sală, ci după. Ce se întâmplă cu antrenamentele tale când dormi șase ore în loc de opt.",
      hu: "Az izom nem az edzőteremben nő, hanem utána. Mi történik az edzéseiddel, ha nyolc helyett hat órát alszol.",
      en: "Muscle does not grow in the gym, it grows afterwards. What happens to your training when you sleep six hours instead of eight.",
    },
    cover: "https://images.unsplash.com/photo-1520206183501-b80df61043c2?w=1400&q=80",
    coverAlt: {
      ro: "Persoană dormind, cu capul pe pernă",
      hu: "Alvó ember, feje a párnán",
      en: "A person asleep, their head on a pillow",
    },
    category: BlogCategory.RECOVERY,
    specializations: [Specialization.CONDITIONING, Specialization.MOBILITY],
    tags: ["odihna", "somn"],
    readingMinutes: 4,
    isFeatured: false,
    publishedAt: "2026-09-19T09:00:00Z",
    body: {
      ro: `<p>Antrenamentul este stimulul; adaptarea se întâmplă între antrenamente. Dacă partea a doua lipsește, prima nu are unde să se transforme în rezultat — și partea a doua înseamnă, în cea mai mare măsură, somn.</p>
<p>Ce se vede la un om care doarme șase ore în loc de opt, câteva săptămâni la rând: greutățile stagnează, recuperarea între serii durează mai mult, iar foamea de seară devine greu de controlat. Nimic din toate astea nu se repară cu un preantrenament mai tare.</p>
<p>Trei lucruri, în ordinea în care merită încercate:</p>
<ul>
<li><strong>Ora de culcare, nu ora de trezire.</strong> Trezirea ți-o impune serviciul; singura variabilă pe care o controlezi este când te culci.</li>
<li><strong>Ultima cafea, înainte de ora 14.</strong> Cofeina are un timp de înjumătățire de aproximativ cinci ore — cea de la 17 e încă în tine la miezul nopții.</li>
<li><strong>Antrenamentul mutat mai devreme,</strong> dacă te culci greu după el. Pentru unii oameni ora 21 în sală înseamnă ora 1 treaz în pat.</li>
</ul>
<p>Dacă ai o săptămână grea și trebuie să tai ceva, taie un antrenament, nu două ore de somn. Antrenamentul se recuperează săptămâna viitoare; somnul pierdut nu se recuperează niciodată complet.</p>`,
      hu: `<p>Az edzés az inger; az alkalmazkodás az edzések között történik. Ha a második rész hiányzik, az elsőnek nincs hol eredménnyé válnia — a második rész pedig javarészt alvást jelent.</p>
<p>Ami azon látszik, aki hetekig nyolc helyett hat órát alszik: a súlyok megállnak, a sorozatok közti regeneráció tovább tart, az esti éhség pedig nehezen kezelhető lesz. Ezek közül semmit nem javít meg egy erősebb edzés előtti ital.</p>
<p>Három dolog, abban a sorrendben, ahogy érdemes megpróbálni:</p>
<ul>
<li><strong>A lefekvés ideje, nem az ébresztőé.</strong> Az ébredést a munkád szabja meg; az egyetlen változó, amit te irányítasz, az, hogy mikor fekszel le.</li>
<li><strong>Az utolsó kávé 14 óra előtt.</strong> A koffein felezési ideje nagyjából öt óra — az ötórai még éjfélkor is benned van.</li>
<li><strong>Korábbra tett edzés,</strong> ha utána nehezen alszol el. Egyeseknél a kilencórai edzés hajnali egyig tartó ébrenlétet jelent.</li>
</ul>
<p>Ha nehéz heted van, és le kell valamit faragnod, egy edzést hagyj ki, ne két óra alvást. Az edzést jövő héten bepótolod; az elvesztett alvást soha nem teljesen.</p>`,
      en: `<p>Training is the stimulus; the adaptation happens between sessions. If the second half is missing, the first has nowhere to turn into a result — and the second half is, for the most part, sleep.</p>
<p>What you see in someone sleeping six hours instead of eight, week after week: the weights stall, recovery between sets takes longer, and the evening hunger becomes hard to manage. None of it is fixed by a stronger pre-workout.</p>
<p>Three things, in the order worth trying them:</p>
<ul>
<li><strong>Bedtime, not wake-up time.</strong> Your job sets the alarm; the only variable you control is when you go to bed.</li>
<li><strong>The last coffee before 2pm.</strong> Caffeine has a half-life of about five hours — the one at 5pm is still in you at midnight.</li>
<li><strong>Training earlier,</strong> if you struggle to fall asleep afterwards. For some people 9pm in the gym means 1am awake in bed.</li>
</ul>
<p>If you have a hard week and something has to go, cut a session rather than two hours of sleep. The session comes back next week; lost sleep never entirely does.</p>`,
    },
    ctaLabel: {
      ro: "Vorbește cu un antrenor",
      hu: "Beszélj egy edzővel",
      en: "Talk to a trainer",
    },
    ctaHref: "/antrenori",
  },
];

export async function run(dataSource: DataSource) {
  const posts = dataSource.getRepository(PostEntity);

  // One article of our own is enough to mean somebody has started writing;
  // this seeder must not drop three demonstration pieces underneath it.
  const existing = await posts.count();
  if (existing > 0) {
    console.log(`blog already has ${existing} article(s) — left alone`);
    return;
  }

  for (const post of POSTS) {
    await posts.save(
      posts.create({
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: [
          {
            id: `${post.slug.ro}-body`,
            type: "richText",
            data: { html: post.body },
          },
        ],
        coverImage: post.cover,
        // Stored as one string: the column is a plain varchar, and alternative
        // text belongs to the photograph rather than to the reader's language
        // — but the reader still has to understand it, so the Romanian is what
        // goes in until the column is translated.
        coverAlt: post.coverAlt.ro,
        author: "Echipa Accelerez",
        authorRole: {
          ro: "Redacția platformei",
          hu: "A platform szerkesztősége",
          en: "The platform's editors",
        },
        category: post.category,
        specializations: post.specializations,
        tags: post.tags,
        isFeatured: post.isFeatured,
        readingMinutes: post.readingMinutes,
        status: PageStatus.PUBLISHED,
        publishedAt: new Date(post.publishedAt),
        publishedLocales: ["ro", "hu", "en"],
        ctaLabel: post.ctaLabel,
        ctaHref: post.ctaHref,
        seoTitle: post.title,
        seoDescription: post.excerpt,
      }),
    );

    console.log(`  · ${post.slug.ro}`);
  }

  console.log(`blog: ${POSTS.length} articles published`);
}
