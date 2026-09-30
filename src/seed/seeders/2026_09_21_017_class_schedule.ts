import type { DataSource } from "typeorm";
import { TrainingClassEntity } from "@shared/entities";

/**
 * Gives the seeded classes a structured schedule, so the product can answer
 * "when is my next training".
 *
 * The classes were written with `scheduleText` alone — a sentence a reader
 * understands and nothing can compute with. These are the same days and times,
 * as ISO weekdays and a clock time; the sentence stays, because it carries the
 * nuance ("18:00 și 20:00") that two fields cannot.
 *
 * One of them becomes an online class, since that is a real case and the
 * product should show at least one.
 *
 * Idempotent: a class that already has weekdays is left alone.
 */
const SCHEDULES: Record<string, { weekdays: number[]; startTime: string; online?: boolean }> = {
  "antrenament-de-intensitate-mare": { weekdays: [1, 3, 5], startTime: "19:00" },
  crossfit: { weekdays: [2, 4], startTime: "18:00" },
  box: { weekdays: [1, 4], startTime: "20:00" },
  "yoga-si-pilates": { weekdays: [2, 4, 6], startTime: "09:00", online: true },
};

export async function run(dataSource: DataSource) {
  const classes = dataSource.getRepository(TrainingClassEntity);
  const rows = await classes.find();

  for (const row of rows) {
    if (row.weekdays?.length) continue;

    const slug = (row.slug as Record<string, string> | null)?.ro ?? "";
    const schedule = SCHEDULES[slug];
    if (!schedule) continue;

    await classes.update(row.id, {
      weekdays: schedule.weekdays,
      startTime: schedule.startTime,
      ...(schedule.online
        ? {
            location: "online" as never,
            // A placeholder anybody can see is wrong; the real link goes in
            // from the admin. Left empty rather than invented.
            meetingUrl: null,
          }
        : {}),
    });

    console.log(`  · ${slug}: ${schedule.weekdays.join(",")} la ${schedule.startTime}`);
  }
}
