import type { DataSource } from "typeorm";
import * as bcrypt from "bcryptjs";
import {
  ClientVideoEntity,
  EnrollmentEntity,
  MembershipPeriodEntity,
  ResourceEntity,
  TestimonialEntity,
  TrainerEntity,
  UserEntity,
} from "@shared/entities";
import {
  ClientVideoStatus,
  EnrollmentStatus,
  MembershipStatus,
  PaymentMethod,
  ResourceType,
  ResourceVisibility,
} from "@shared/enums/accelerez.enum";
import { UserRole } from "@shared/enums/user-role.enum";
import { addDays, periodEnd, toDateString } from "@shared/utils/period";

/**
 * A working portal on the first boot: two clients, one of them paid up, with
 * material, a video awaiting an answer and a request nobody has accepted yet.
 *
 * **This is the seeder that makes the product demonstrable.** Every screen in
 * the private half — the trainer's client list, the unpaid-month warning, the
 * paywall a client hits, the video inbox — needs data that only exists once
 * somebody has enrolled and a month has been confirmed. Building that by hand
 * before each demonstration is how a feature gets shown broken.
 *
 * The two clients are deliberately in different states:
 *
 * - **Maria** is active, this month is paid, and she can see everything. She is
 *   what the product looks like when it works.
 * - **Vlad** has asked and is still `PENDING`, so the trainer's inbox has
 *   something in it and the "waiting for the trainer" screen is reachable.
 *
 * Skipped in production, like every demo seeder — see the guard.
 */

const PASSWORD = "demo1234";

export async function run(dataSource: DataSource) {
  if (process.env.APPLICATION_ENV === "production") {
    console.log("production — demo portal skipped");
    return;
  }

  const users = dataSource.getRepository(UserEntity);
  const trainers = dataSource.getRepository(TrainerEntity);
  const enrollments = dataSource.getRepository(EnrollmentEntity);
  const periods = dataSource.getRepository(MembershipPeriodEntity);
  const resources = dataSource.getRepository(ResourceEntity);
  const videos = dataSource.getRepository(ClientVideoEntity);
  const testimonials = dataSource.getRepository(TestimonialEntity);

  const trainer = await trainers.findOne({ where: { displayName: "Andrei Marin" } });
  if (!trainer) {
    console.log("demo trainer missing — portal demo skipped");
    return;
  }

  if (await users.findOne({ where: { email: "maria@demo.accelerez.ro" } })) {
    console.log("demo portal already seeded — left alone");
    return;
  }

  const hash = await bcrypt.hash(PASSWORD, 10);

  const maria = await users.save(
    users.create({
      email: "maria@demo.accelerez.ro",
      password: hash,
      firstName: "Maria",
      lastName: "Ionescu",
      phone: "",
      role: UserRole.CLIENT,
      locale: "ro",
    }),
  );

  const vlad = await users.save(
    users.create({
      email: "vlad@demo.accelerez.ro",
      password: hash,
      firstName: "Vlad",
      lastName: "Tomescu",
      role: UserRole.CLIENT,
      locale: "ro",
    }),
  );

  // --- the active one ------------------------------------------------------

  const active = await enrollments.save(
    enrollments.create({
      clientId: maria.id,
      trainerId: trainer.id,
      status: EnrollmentStatus.ACTIVE,
      goal: "Vreau să slăbesc 8 kg până în vară și să nu mă mai doară spatele când stau la birou. Am sală la 5 minute de casă, pot merge de trei ori pe săptămână.",
      trainerNote: "Genunchi drept sensibil la genuflexiuni adânci — am redus amplitudinea în săptămâna 2.",
      acceptedAt: new Date(),
    }),
  );

  // The current month, paid. This is the row the whole paywall reads — see
  // `AccessService`.
  const now = new Date();
  // Two consecutive twenty-eight-day periods — see `shared/utils/period.ts`.
  // The current one opened a week ago, so the demo client has days left on it.
  const currentStart = addDays(toDateString(now), -7);

  await periods.save(
    periods.create({
      enrollmentId: active.id,
      startsOn: currentStart,
      endsOn: periodEnd(currentStart),
      status: MembershipStatus.PAID,
      amount: trainer.monthlyPrice,
      currency: trainer.currency,
      method: PaymentMethod.TRANSFER,
      paidAt: now,
      validatedById: trainer.userId,
      validatedAt: now,
    }),
  );

  // And the one before it, so the payment history is not a single row. It ends
  // the day before the current one starts — periods never overlap.
  const previousStart = addDays(currentStart, -28);
  const previous = new Date(previousStart);
  await periods.save(
    periods.create({
      enrollmentId: active.id,
      startsOn: previousStart,
      endsOn: addDays(currentStart, -1),
      status: MembershipStatus.PAID,
      amount: trainer.monthlyPrice,
      currency: trainer.currency,
      method: PaymentMethod.TRANSFER,
      paidAt: previous,
      validatedById: trainer.userId,
      validatedAt: previous,
    }),
  );

  await resources.save([
    resources.create({
      trainerId: trainer.id,
      enrollmentId: active.id,
      visibility: ResourceVisibility.CLIENT,
      type: ResourceType.SHEET,
      title: "Programul tău — săptămânile 1-4",
      description: "Trei antrenamente pe săptămână. Completează greutățile în coloana galbenă după fiecare ședință.",
      url: "https://docs.google.com/spreadsheets/d/1exemplu-de-link-catre-program/edit",
      sortOrder: 1,
    }),
    resources.create({
      trainerId: trainer.id,
      enrollmentId: active.id,
      visibility: ResourceVisibility.CLIENT,
      type: ResourceType.DIET,
      title: "Plan alimentar — 1800 kcal",
      description: "Trei mese și o gustare. Nu e obligatoriu să respecți ordinea, doar totalul zilei.",
      body: "<h3>Mic dejun</h3><p>Omletă din 3 ouă cu spanac și o felie de pâine integrală.</p><h3>Prânz</h3><p>150 g piept de pui, o cană de orez fiert, salată cu o lingură de ulei de măsline.</p><h3>Gustare</h3><p>Iaurt grecesc 200 g cu o mână de fructe de pădure.</p><h3>Cină</h3><p>Pește la cuptor cu legume. Fără limită la legumele verzi.</p><p><em>Dacă o zi iese din plan, nu o compensa a doua zi. Continuă normal.</em></p>",
      sortOrder: 2,
    }),
    resources.create({
      trainerId: trainer.id,
      enrollmentId: active.id,
      visibility: ResourceVisibility.CLIENT,
      type: ResourceType.TIP,
      title: "Despre spate și scaunul de birou",
      description: "Citește o dată, aplică toată săptămâna.",
      body: "<p>Durerea de la birou vine mai des din statul în aceeași poziție decât din poziția în sine. Ridică-te la 45 de minute, chiar și pentru 30 de secunde.</p><p>Dacă ai doar un minut: două serii de extensii pe spate din picioare și o rotire de umeri.</p>",
      sortOrder: 3,
    }),
    // Library material — every active client of this trainer sees it.
    resources.create({
      trainerId: trainer.id,
      enrollmentId: null,
      visibility: ResourceVisibility.LIBRARY,
      type: ResourceType.VIDEO,
      title: "Genuflexiune — execuție corectă",
      description: "Trei greșeli frecvente și cum arată corect. Filmează-te din lateral când o faci prima dată.",
      url: "https://www.youtube.com/watch?v=aclHkVaku9U",
      sortOrder: 1,
    }),
    resources.create({
      trainerId: trainer.id,
      enrollmentId: null,
      visibility: ResourceVisibility.LIBRARY,
      type: ResourceType.VIDEO,
      title: "Împins la piept cu gantere",
      description: "Unghiul cotului și traseul ganterelor.",
      url: "https://www.youtube.com/watch?v=VmB1G1K7v94",
      sortOrder: 2,
    }),
  ]);

  await videos.save(
    videos.create({
      enrollmentId: active.id,
      title: "Genuflexiuni 3x8 — săptămâna 2",
      note: "Simt o presiune în genunchiul drept la ultimele două repetări. Am filmat din lateral, cum ai cerut.",
      url: "https://www.youtube.com/watch?v=aclHkVaku9U",
      status: ClientVideoStatus.PENDING,
    }),
  );

  // --- the one still waiting ----------------------------------------------

  await enrollments.save(
    enrollments.create({
      clientId: vlad.id,
      trainerId: trainer.id,
      status: EnrollmentStatus.PENDING,
      goal: "Am 34 de ani, nu am făcut sport de la liceu și vreau să încep cu ceva ce pot ține. Mă interesează mai mult condiția fizică decât masa musculară.",
    }),
  );

  // --- a quotation, attributed ---------------------------------------------

  if (!(await testimonials.count())) {
    await testimonials.save([
      testimonials.create({
        quote: {
          ro: "Am mai încercat de două ori pe cont propriu și m-am oprit după trei săptămâni. Diferența acum a fost că cineva se uita efectiv la ce trimit.",
          hu: "Kétszer próbáltam egyedül, és három hét után abbahagytam. Most az volt a különbség, hogy valaki tényleg megnézte, amit küldök.",
          en: "I tried twice on my own and stopped after three weeks. The difference this time was that somebody actually looked at what I sent.",
        },
        author: "Maria I.",
        role: "cursantă, 8 luni",
        trainerId: trainer.id,
        approved: true,
        isFeatured: true,
        sortOrder: 1,
      }),
      testimonials.create({
        quote: {
          ro: "Îmi place că văd exact ce lună e plătită și ce am primit. Înainte țineam socoteala pe WhatsApp și tot pierdeam link-urile.",
          hu: "Tetszik, hogy pontosan látom, melyik hónap van fizetve és mit kaptam. Korábban WhatsAppon tartottam számon, és folyton elvesztek a linkek.",
          en: "I like seeing exactly which month is paid and what I was given. Before, I kept track on WhatsApp and kept losing the links.",
        },
        author: "Cristian D.",
        role: "cursant, 4 luni",
        approved: true,
        isFeatured: true,
        sortOrder: 2,
      }),
    ]);
  }

  console.log(`  · maria@demo.accelerez.ro / ${PASSWORD} — activă, luna curentă plătită`);
  console.log(`  · vlad@demo.accelerez.ro / ${PASSWORD} — cerere în așteptare`);
}
