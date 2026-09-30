import type { ValueTransformer } from "typeorm";

/**
 * MySQL hands `DECIMAL` back as a **string**, so `price * 12` silently becomes
 * string repetition and a total shows up as "120120120". This transformer keeps
 * the column exact in the database and a number in TypeScript.
 *
 * `null` stays `null` — a price nobody set is not zero.
 */
export const decimalToNumber: ValueTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) =>
    value === null || value === undefined ? null : Number(value),
};
