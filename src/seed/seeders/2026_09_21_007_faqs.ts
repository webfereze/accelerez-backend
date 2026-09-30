import type { DataSource } from "typeorm";
import { FaqEntity } from "@shared/entities";

/**
 * The questions the home page answers.
 *
 * Every one of them is a question the product genuinely raises — who the
 * trainers are, who holds the money, what happens when a month is not paid,
 * who can see an uploaded video. A FAQ that only asks flattering questions is
 * read as marketing and skipped; these are the ones a visitor would otherwise
 * have to e-mail to ask.
 */

const FAQS = [
  {
    topic: "general",
    question: {
      ro: "Cine sunt antrenorii de pe platformă?",
      hu: "Kik a platform edzői?",
      en: "Who are the trainers on the platform?",
    },
    answer: {
      ro: "<p>Antrenori personali adăugați manual de administrator, după verificarea certificărilor. Nimeni nu se poate înscrie singur ca antrenor — înregistrarea publică creează doar conturi de cursant.</p>",
      hu: "<p>Személyi edzők, akiket az adminisztrátor kézzel ad hozzá, a képesítések ellenőrzése után. Senki nem regisztrálhat magától edzőként — a nyilvános regisztráció csak sportolói fiókot hoz létre.</p>",
      en: "<p>Personal trainers added by hand by an administrator, after their certifications are checked. Nobody can sign themselves up as a trainer — public registration creates client accounts only.</p>",
    },
  },
  {
    topic: "payment",
    question: {
      ro: "Cum se plătește și cine ține banii?",
      hu: "Hogyan történik a fizetés, és kinél van a pénz?",
      en: "How does payment work and who holds the money?",
    },
    answer: {
      ro: "<p>Plătești direct antrenorului, lunar. Platforma nu încasează nimic și nu ia comision din plata ta. Antrenorul marchează luna ca plătită în contul lui, iar asta îți deschide accesul la materiale.</p><p>Plata cu cardul direct în platformă este în lucru. Până atunci nu îți cerem datele cardului nicăieri.</p>",
      hu: "<p>Közvetlenül az edzőnek fizetsz, havonta. A platform semmit nem szed be, és nem von le jutalékot a fizetésedből. Az edző fizetettként jelöli a hónapot a saját fiókjában, és ez nyitja meg a hozzáférésed az anyagokhoz.</p><p>A platformon belüli kártyás fizetés fejlesztés alatt áll. Addig sehol nem kérjük a kártyaadataidat.</p>",
      en: "<p>You pay the trainer directly, monthly. The platform collects nothing and takes no commission from what you pay. The trainer marks the month as paid from their own account, and that opens your access to the material.</p><p>Card payment inside the platform is being built. Until then we never ask for your card details anywhere.</p>",
    },
  },
  {
    topic: "payment",
    question: {
      ro: "Ce se întâmplă dacă nu plătesc o lună?",
      hu: "Mi történik, ha egy hónapot nem fizetek?",
      en: "What happens if I do not pay for a month?",
    },
    answer: {
      ro: "<p>Contul rămâne al tău, dar materialele antrenorului nu mai sunt vizibile până când luna curentă este confirmată. Istoricul, lunile plătite anterior și videoclipurile tale rămân la locul lor.</p>",
      hu: "<p>A fiók a tiéd marad, de az edző anyagai nem láthatók, amíg az aktuális hónapot meg nem erősítik. Az előzmények, a korábban fizetett hónapok és a videóid a helyükön maradnak.</p>",
      en: "<p>The account stays yours, but your trainer's material is hidden until the current month is confirmed. Your history, the months you already paid for and your own videos stay where they are.</p>",
    },
  },
  {
    topic: "account",
    question: {
      ro: "Cine poate vedea videoclipurile pe care le încarc?",
      hu: "Ki láthatja a feltöltött videóimat?",
      en: "Who can see the videos I upload?",
    },
    answer: {
      ro: "<p>Doar antrenorul la care ești înscris. Alți cursanți nu au acces, iar alți antrenori de pe platformă nu au acces. Îți poți șterge oricând propriile înregistrări.</p>",
      hu: "<p>Csak az az edző, akihez beiratkoztál. Más sportolók nem férnek hozzá, és a platform más edzői sem. A saját felvételeidet bármikor törölheted.</p>",
      en: "<p>Only the trainer you are enrolled with. Other clients have no access, and neither do other trainers on the platform. You can delete your own recordings at any time.</p>",
    },
  },
  {
    topic: "account",
    question: {
      ro: "Pot schimba antrenorul?",
      hu: "Válthatok edzőt?",
      en: "Can I change trainer?",
    },
    answer: {
      ro: "<p>Da. Poți trimite oricând o cerere altui antrenor. Înscrierea veche rămâne în istoric cu lunile ei, iar materialele primite de la antrenorul anterior nu mai sunt vizibile după ce colaborarea se încheie.</p>",
      hu: "<p>Igen. Bármikor küldhetsz kérést másik edzőnek. A korábbi beiratkozás az előzményekben marad a hónapjaival, és az előző edzőtől kapott anyagok az együttműködés lezárása után már nem láthatók.</p>",
      en: "<p>Yes. You can send a request to another trainer at any time. The old enrolment stays in your history with its months, and the material from the previous trainer is no longer visible once that collaboration ends.</p>",
    },
  },
  {
    topic: "general",
    question: {
      ro: "Trebuie să merg la sală?",
      hu: "Kell terembe járnom?",
      en: "Do I have to go to a gym?",
    },
    answer: {
      ro: "<p>Depinde de antrenor. Fiecare profil spune dacă lucrează online, la sală sau în ambele feluri, iar directorul se poate filtra exact după asta.</p>",
      hu: "<p>Az edzőtől függ. Minden profil megmondja, hogy online, teremben vagy mindkét módon dolgozik, és a lista pontosan erre szűrhető.</p>",
      en: "<p>It depends on the trainer. Every profile says whether they work online, in a gym or both, and the directory filters on exactly that.</p>",
    },
  },
  {
    topic: "trainers",
    question: {
      ro: "Sunt antrenor. Cum ajung pe platformă?",
      hu: "Edző vagyok. Hogyan kerülök fel a platformra?",
      en: "I am a trainer. How do I get listed?",
    },
    answer: {
      ro: "<p>Ne scrii prin formularul de contact și trimiți certificările. Dacă profilul este aprobat, primești un cont de antrenor cu care îți administrezi cursanții, lunile plătite și materialele.</p>",
      hu: "<p>Írj a kapcsolatfelvételi űrlapon, és küldd el a képesítéseidet. Ha a profilt jóváhagyjuk, edzői fiókot kapsz, amellyel kezeled a sportolóidat, a fizetett hónapokat és az anyagokat.</p>",
      en: "<p>Write to us through the contact form and send your certifications. If the profile is approved you get a trainer account for managing your clients, their paid months and your material.</p>",
    },
  },
];

export async function run(dataSource: DataSource) {
  const faqs = dataSource.getRepository(FaqEntity);

  if (await faqs.count()) {
    console.log("faqs already present — left alone");
    return;
  }

  let order = 0;
  for (const faq of FAQS) {
    await faqs.save(faqs.create({ ...faq, sortOrder: order++, isVisible: true } as never));
  }
  console.log(`  · ${order} questions`);
}
