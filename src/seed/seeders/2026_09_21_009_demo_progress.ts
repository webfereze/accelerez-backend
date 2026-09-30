import type { DataSource } from "typeorm";
import { EnrollmentEntity, ProgressEntryEntity, UserEntity } from "@shared/entities";

/**
 * Six months of timeline for the demonstration client, so the progress view can
 * be seen doing what it is for: a sequence with a comparison at both ends.
 *
 * **Two entries carry photographs and four do not**, on purpose. That is what a
 * real log looks like — somebody weighs themselves most weeks and photographs
 * themselves rarely — and it is the case the comparison has to handle: the
 * "before" is the first entry *with a picture*, not the first entry.
 *
 * The photographs are Unsplash stock of people who are not this client. Like
 * every demo row, `PLAN.md` lists them for deletion before launch.
 */

const PHOTO_BEFORE =
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1000&q=80";
const PHOTO_AFTER =
  "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=1000&q=80";

export async function run(dataSource: DataSource) {
  if (process.env.APPLICATION_ENV === "production") {
    console.log("production — demo progress skipped");
    return;
  }

  const users = dataSource.getRepository(UserEntity);
  const enrollments = dataSource.getRepository(EnrollmentEntity);
  const entries = dataSource.getRepository(ProgressEntryEntity);

  const maria = await users.findOne({ where: { email: "maria@demo.accelerez.ro" } });
  if (!maria) {
    console.log("demo client missing — progress skipped");
    return;
  }

  const enrollment = await enrollments.findOne({ where: { clientId: maria.id } });
  if (!enrollment) return;

  if (await entries.count({ where: { enrollmentId: enrollment.id } })) {
    console.log("demo progress already seeded — left alone");
    return;
  }

  // Counted back from today so the timeline is always recent, whenever the
  // database happens to be created.
  const monthsAgo = (months: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    date.setDate(12);
    return date.toISOString().slice(0, 10);
  };

  await entries.save([
    entries.create({
      enrollmentId: enrollment.id,
      takenAt: monthsAgo(5),
      photos: [{ url: PHOTO_BEFORE, pose: "front" }],
      weightKg: 78.4,
      measurements: { waist: 92, hips: 104 },
      note: "Prima zi. Am făcut pozele seara, după muncă.",
      trainerNote: "Perfect. Le refacem în aceleași condiții de fiecare dată — seara, aceeași lumină.",
    }),
    entries.create({
      enrollmentId: enrollment.id,
      takenAt: monthsAgo(4),
      weightKg: 76.9,
      measurements: { waist: 90 },
      note: "Prima lună. Nu am ratat niciun antrenament.",
    }),
    entries.create({
      enrollmentId: enrollment.id,
      takenAt: monthsAgo(3),
      weightKg: 75.8,
      note: "Săptămâna cu deplasarea a ieșit din plan, dar nu am compensat.",
      trainerNote: "Exact cum am discutat. O săptămână nu strică nimic.",
    }),
    entries.create({
      enrollmentId: enrollment.id,
      takenAt: monthsAgo(2),
      weightKg: 75.1,
      measurements: { waist: 87, hips: 100 },
    }),
    entries.create({
      enrollmentId: enrollment.id,
      takenAt: monthsAgo(1),
      weightKg: 73.6,
      note: "Prima dată când mi-au venit larg pantalonii de birou.",
    }),
    entries.create({
      enrollmentId: enrollment.id,
      takenAt: monthsAgo(0),
      photos: [{ url: PHOTO_AFTER, pose: "front" }],
      weightKg: 72.4,
      measurements: { waist: 84, hips: 97 },
      note: "Șase kile în cinci luni și spatele nu m-a mai durut de două luni.",
      trainerNote: "Diferența la talie e mai mare decât cea de pe cântar. Asta contează.",
    }),
  ]);

  console.log("  · 6 puncte pe cronologia Mariei, două cu poze");
}
