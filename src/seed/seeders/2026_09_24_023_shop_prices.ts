import type { DataSource } from "typeorm";
import { ProductEntity } from "@shared/entities";

/**
 * **Placeholder prices** for the five products seeder 022 created without any.
 *
 * Asked for so the shop and the cart can be seen working with figures in them.
 * They are ours, not the client's — round numbers of the order such plans sell
 * for — and `PLAN.md` lists them first among what must be confirmed before
 * launch. Every variant with an offer shows the undiscounted multiple of the
 * one-month price as the struck-through figure, which is arithmetic, not a
 * claimed former price.
 *
 * Applied only to a product whose variants are **all** still unpriced: the
 * moment an editor types one price into a product, this seeder has nothing to
 * say about it.
 */
const PRICES: Record<string, Record<string, { price: number; compareAtPrice?: number }>> = {
  "plan-alimentar-personalizat": {
    "1-luna": { price: 199 },
    "3-luni": { price: 499, compareAtPrice: 597 },
  },
  "program-de-antrenament-personalizat": {
    "sala-1-luna": { price: 249 },
    "sala-3-luni": { price: 599, compareAtPrice: 747 },
    "acasa-1-luna": { price: 199 },
    "acasa-3-luni": { price: 499, compareAtPrice: 597 },
  },
  "pachet-antrenament-alimentatie": {
    "1-luna": { price: 399 },
    "3-luni": { price: 999, compareAtPrice: 1197 },
  },
  "retete-fit": {
    standard: { price: 79 },
  },
  "meniuri-saptamanale": {
    "1-saptamana": { price: 49 },
    "4-saptamani": { price: 149, compareAtPrice: 196 },
  },
};

export async function run(dataSource: DataSource) {
  const products = dataSource.getRepository(ProductEntity);

  for (const product of await products.find()) {
    const prices = PRICES[product.slug?.ro ?? ""];
    if (!prices) continue;

    if ((product.variants ?? []).some((variant) => variant.price != null)) {
      console.log(`  · ${product.slug.ro} already priced — left alone`);
      continue;
    }

    product.variants = product.variants.map((variant) => ({
      ...variant,
      price: prices[variant.id]?.price ?? null,
      compareAtPrice: prices[variant.id]?.compareAtPrice ?? null,
    }));
    await products.save(product);
    console.log(`  · ${product.slug.ro}: placeholder prices`);
  }
}
