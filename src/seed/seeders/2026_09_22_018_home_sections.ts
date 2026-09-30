import type { DataSource } from "typeorm";
import { PageEntity } from "@shared/entities";
import type { Block } from "@shared/types/blocks";

/**
 * Three sections the front page was missing: the fork in the road, the blog
 * and the mailing list.
 *
 * **Appended to the page an editor already owns, never a rewrite of it.**
 * Seeder 012 filled the home page and refuses to touch it a second time, which
 * is right — but it also means new sections have to arrive as their own
 * seeder. Each block here is inserted only if the page does not already carry
 * one of its type, so an editor who added a newsletter by hand keeps theirs and
 * gets no second copy.
 *
 * Where each one goes, and why:
 *
 * - **The split call to action sits after the classes.** By then a visitor has
 *   read who the coaches are and what they run, and the two questions they are
 *   left with are "do I want a plan of my own" and "do I want to talk to
 *   somebody first". Two panels, two answers, no ranking between them.
 * - **The articles sit after the questions.** The FAQ answers what the product
 *   is; the blog is the evidence that the people behind it know the subject.
 *   It renders nothing at all while nothing has been written, so it is safe to
 *   place before there are articles.
 * - **The newsletter sits last before the neon band.** It is the smaller ask
 *   for somebody who is not ready to choose a coach today — and it is the one
 *   thing on the page that still works if they leave.
 *
 * The photographs are Unsplash, like the rest of the demonstration imagery, and
 * `PLAN.md` lists them among what has to be replaced with the real thing.
 */

/** Each new section, and the block it belongs after. */
const SECTIONS: Array<{ after: string; block: Block }> = [
  {
    after: "home-classes",
    block: {
      id: "home-split-cta",
      type: "splitCta",
      data: {
        items: [
          {
            id: "split-plan",
            image:
              "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1600&q=80",
            alt: "Farfurie cu legume, ou fiert și avocado, pe o masă de lemn",
            eyebrow: { ro: "Începe azi", hu: "Kezdd el ma", en: "Start today" },
            title: {
              ro: "Ești gata să începi transformarea?",
              hu: "Készen állsz a változásra?",
              en: "Ready to start the transformation?",
            },
            ctaLabel: {
              ro: "Alege un antrenor",
              hu: "Válassz edzőt",
              en: "Choose a trainer",
            },
            ctaHref: "/antrenori",
          },
          {
            id: "split-programme",
            image:
              "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=1600&q=80",
            alt: "Bărbat ridicând o halteră într-o sală de forță",
            eyebrow: {
              ro: "Antrenamente online",
              hu: "Online edzések",
              en: "Online training",
            },
            title: {
              ro: "Vrei un program personalizat?",
              hu: "Személyre szabott programot szeretnél?",
              en: "Want a programme of your own?",
            },
            ctaLabel: { ro: "Scrie-ne", hu: "Írj nekünk", en: "Write to us" },
            ctaHref: "/contact",
          },
        ],
      },
    },
  },
  {
    after: "home-faq",
    block: {
      id: "home-posts",
      type: "latestPosts",
      data: {
        background: "none",
        eyebrow: { ro: "Blog", hu: "Blog", en: "Blog" },
        title: {
          ro: "Ce scriu antrenorii noștri",
          hu: "Amit az edzőink írnak",
          en: "What our trainers write",
        },
        text: {
          ro: "Antrenament, mâncare și odihnă, explicate de oamenii care lucrează cu clienți în fiecare zi. Fără suplimente minune și fără diete de trei zile.",
          hu: "Edzés, étkezés és pihenés, azoktól elmagyarázva, akik nap mint nap klienseikkel dolgoznak. Csodaszerek és háromnapos diéták nélkül.",
          en: "Training, food and rest, explained by the people who work with clients every day. No miracle supplements and no three-day diets.",
        },
        linkLabel: {
          ro: "Vezi toate articolele",
          hu: "Összes cikk",
          en: "See every article",
        },
        count: 3,
      },
    },
  },
  {
    after: "home-posts",
    block: {
      id: "home-newsletter",
      type: "newsletter",
      data: {
        background: "soft",
        eyebrow: { ro: "Newsletter", hu: "Hírlevél", en: "Newsletter" },
        title: {
          ro: "Un e-mail pe lună. Unul singur.",
          hu: "Havonta egy e-mail. Egyetlenegy.",
          en: "One e-mail a month. Just the one.",
        },
        text: {
          ro: "Un antrenament de încercat, o rețetă care se face în douăzeci de minute și articolele publicate în ultimele patru săptămâni. Te dezabonezi dintr-un singur clic, din orice e-mail.",
          hu: "Egy edzés, amit kipróbálhatsz, egy húsz perc alatt elkészülő recept, és az elmúlt négy hét cikkei. Egyetlen kattintással leiratkozhatsz, bármelyik levélből.",
          en: "One workout to try, one recipe that takes twenty minutes, and whatever we published in the last four weeks. You can unsubscribe from any of them in one click.",
        },
        placeholder: { ro: "adresa@exemplu.ro", hu: "cim@pelda.hu", en: "you@example.com" },
        buttonLabel: { ro: "Abonează-mă", hu: "Feliratkozom", en: "Subscribe" },
        termsLabel: {
          ro: "Am citit politica de confidențialitate și sunt de acord.",
          hu: "Elolvastam az adatvédelmi tájékoztatót, és elfogadom.",
          en: "I have read the privacy policy and I agree.",
        },
        termsHref: "/confidentialitate",
        success: {
          ro: "Gata. Primul e-mail vine la începutul lunii viitoare.",
          hu: "Kész. Az első levél a jövő hónap elején érkezik.",
          en: "Done. The first e-mail arrives at the start of next month.",
        },
        askName: false,
      },
    },
  },
];

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

  let added = 0;

  for (const { after, block } of SECTIONS) {
    // By type, not by id: an editor who added their own newsletter section gave
    // it a different id, and a second one underneath theirs is the failure this
    // guard exists for.
    if (content.some((existing) => existing.type === block.type)) {
      console.log(`  · ${block.type} already on the page — left alone`);
      continue;
    }

    // `after` may itself be a block this seeder just inserted, so the position
    // is read from the live array rather than from the original page.
    const index = content.findIndex((existing) => existing.id === after);
    if (index === -1) {
      // The anchor was removed or renamed by an editor. Before the closing call
      // to action if there is one, at the end otherwise — never in the middle
      // of somebody's arrangement.
      const closing = content.findIndex((existing) => existing.type === "cta");
      content.splice(closing === -1 ? content.length : closing, 0, block);
    } else {
      content.splice(index + 1, 0, block);
    }

    added += 1;
    console.log(`  · added ${block.type}`);
  }

  if (added === 0) return;

  home.content = content;
  await pages.save(home);
  console.log(`home page: ${added} section(s) added`);
}
