import type { DataSource } from "typeorm";
import { SiteSettingEntity } from "@shared/entities";

/**
 * The `site` settings row.
 *
 * **Only what the logo already states is filled in.** The name and the mark are
 * facts this project was handed; the telephone number, the address and the
 * registry data are facts about a real company, and inventing them here means
 * they end up on a live page, in an e-mail footer and eventually on a document
 * nobody checked. An empty field renders as nothing, which is visible and gets
 * filled in — a plausible invention is not.
 *
 * Fill the rest at /admin/settings.
 */
export async function run(dataSource: DataSource) {
  const settings = dataSource.getRepository(SiteSettingEntity);

  const existing = await settings.findOne({ where: { key: "site" } });
  if (existing) {
    console.log("site settings already present — left alone");
    return;
  }

  await settings.save(
    settings.create({
      key: "site",
      value: {
        name: "Acceleratorul de Rezultate",
        logo: "/brand/logo-accelerez.png",
        tagline: {
          ro: "Antrenori personali verificați, într-un singur loc",
          hu: "Ellenőrzött személyi edzők, egy helyen",
          en: "Vetted personal trainers, in one place",
        },
        about: {
          ro: "Platforma care leagă cursanții de antrenori personali: îți alegi antrenorul, el îți construiește programul, iar tu îl urmărești din contul tău.",
          hu: "A platform, amely összeköti a sportolókat a személyi edzőkkel: kiválasztod az edződ, ő felépíti a programod, te pedig a fiókodból követed.",
          en: "The platform that connects people with personal trainers: you choose your coach, they build your plan, and you follow it from your account.",
        },
        phone: "",
        email: "",
        address: "",
        company: { name: "", cui: "", onrc: "" },
        social: [],
        shareImage: "",
        shareImageAlt: "",
      },
    }),
  );
  console.log("Created site settings — fill the contact details at /admin/settings");
}
