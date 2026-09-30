import type { Seeder } from "./runner";
import { run as admin } from "./seeders/2026_09_21_001_admin";
import { run as site } from "./seeders/2026_09_21_002_site";
import { run as pages } from "./seeders/2026_09_21_003_pages";
import { run as legal } from "./seeders/2026_09_21_004_legal";
import { run as menu } from "./seeders/2026_09_21_005_menu";
import { run as trainers } from "./seeders/2026_09_21_006_trainers";
import { run as faqs } from "./seeders/2026_09_21_007_faqs";
import { run as demoPortal } from "./seeders/2026_09_21_008_demo_portal";
import { run as demoProgress } from "./seeders/2026_09_21_009_demo_progress";
import { run as menuSystem } from "./seeders/2026_09_21_010_menu_system";
import { run as fixDemoPhoto } from "./seeders/2026_09_21_011_fix_demo_photo";
import { run as homeBlocks } from "./seeders/2026_09_21_012_home_blocks";
import { run as periodRanges } from "./seeders/2026_09_21_013_periods_to_ranges";
import { run as userSlugs } from "./seeders/2026_09_21_014_user_slugs";
import { run as classes } from "./seeders/2026_09_21_015_classes";
import { run as menuClasses } from "./seeders/2026_09_21_016_menu_classes";
import { run as classSchedule } from "./seeders/2026_09_21_017_class_schedule";
import { run as homeSections } from "./seeders/2026_09_22_018_home_sections";
import { run as posts } from "./seeders/2026_09_22_019_posts";
import { run as homeTransformations } from "./seeders/2026_09_22_020_home_transformations";
import { run as homeDuo } from "./seeders/2026_09_24_021_home_duo";
import { run as shop } from "./seeders/2026_09_24_022_shop";
import { run as shopPrices } from "./seeders/2026_09_24_023_shop_prices";

/**
 * Every seeder, **in dependency order** — this array is the order of execution,
 * not a set. The menu needs the pages; the portal demo needs the trainers.
 *
 * The names are permanent: each is the key in `seed_history`, so renaming one
 * makes it run again everywhere it has already been applied. The date prefix
 * keeps the list readable once it is long; the array is still what decides.
 *
 * Adding content later means appending a new entry with a new date. Editing an
 * existing seeder will not re-run it — it has already been recorded as done.
 */
export const SEEDERS: Seeder[] = [
  {
    name: "2026_09_21_001_admin",
    description: "The first admin account — the only one that can create a trainer",
    run: admin,
  },
  {
    name: "2026_09_21_002_site",
    description: "Site settings: the name and the mark filled in, the contact details left empty",
    run: site,
  },
  {
    name: "2026_09_21_003_pages",
    description: "Home, how it works, about and contact",
    run: pages,
  },
  {
    name: "2026_09_21_004_legal",
    description: "Terms, privacy and cookies — drafts for a lawyer, marked as such",
    run: legal,
  },
  {
    name: "2026_09_21_005_menu",
    description: "The header and footer menus",
    run: menu,
  },
  {
    name: "2026_09_21_006_trainers",
    description: "Four demonstration trainers — invented, and listed in PLAN.md for deletion",
    run: trainers,
  },
  {
    name: "2026_09_21_007_faqs",
    description: "The seven questions the home page answers",
    run: faqs,
  },
  {
    name: "2026_09_21_008_demo_portal",
    description: "A paid-up client, a pending request, material, a video and two quotations",
    run: demoPortal,
  },
  {
    name: "2026_09_21_009_demo_progress",
    description: "Five months of timeline for the demo client, two entries with photographs",
    run: demoProgress,
  },
  {
    name: "2026_09_21_010_menu_system",
    description: "The directory and the blog in the header — 005 wrote the wrong column",
    run: menuSystem,
  },
  {
    name: "2026_09_21_011_fix_demo_photo",
    description: "One demo portrait's URL 404s — replaces it if it is still there",
    run: fixDemoPhoto,
  },
  {
    name: "2026_09_21_012_home_blocks",
    description: "The front page, assembled out of blocks — 003 left it empty on purpose",
    run: homeBlocks,
  },
  {
    name: "2026_09_21_013_periods_to_ranges",
    description: "Calendar-month periods become 28-day ranges — see shared/utils/period.ts",
    run: periodRanges,
  },
  {
    name: "2026_09_21_014_user_slugs",
    description: "A URL handle for every account — the portal stops using ids",
    run: userSlugs,
  },
  {
    name: "2026_09_21_015_classes",
    description: "Four classes — copy is real, prices are placeholders (see PLAN.md)",
    run: classes,
  },
  {
    name: "2026_09_21_016_menu_classes",
    description: "Classes in the header, beside the trainers",
    run: menuClasses,
  },
  {
    name: "2026_09_21_017_class_schedule",
    description: "Structured weekdays and times, so \"next training\" can be computed",
    run: classSchedule,
  },
  {
    name: "2026_09_22_018_home_sections",
    description: "The split call to action, the latest articles and the newsletter, appended to the home page",
    run: homeSections,
  },
  {
    name: "2026_09_22_019_posts",
    description: "Three starter articles so the blog is not empty — listed in PLAN.md for review",
    run: posts,
  },
  {
    name: "2026_09_22_020_home_transformations",
    description: "Before-and-after on the home page — stock photographs, listed in PLAN.md for replacement",
    run: homeTransformations,
  },
  {
    name: "2026_09_24_021_home_duo",
    description: "Barni & Evelyn at the top: the two-photo opening, for men / for women, and the products",
    run: homeDuo,
  },
  {
    name: "2026_09_24_022_shop",
    description: "The shop in the header, five products without prices, and the home section reading from it",
    run: shop,
  },
  {
    name: "2026_09_24_023_shop_prices",
    description: "Placeholder prices for the five products — ours, listed in PLAN.md for the client to confirm",
    run: shopPrices,
  },
];
