import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import {
  ClassMemberEntity,
  EnrollmentEntity,
  TrainingClassEntity,
} from "@shared/entities";
import { EnrollmentStatus, SessionLocation } from "@shared/enums/accelerez.enum";
import { PageStatus } from "@shared/enums/page-status.enum";
import type { Translated } from "@shared/types/translated";
import { occurrencesBetween, toDateString } from "@shared/utils/period";

/** One person expected at one occurrence. */
export type AgendaAttendee = {
  memberId: number;
  clientId: number;
  name: string;
  /** Whether this coach has accepted them — an unaccepted member has no link. */
  accepted: boolean;
};

/** One time a class runs. */
export type AgendaOccurrence = {
  classId: number;
  slug: Translated;
  title: Translated;
  /** Local wall-clock ISO, no zone — see the note on `at` below. */
  at: string;
  day: string;
  time: string;
  durationMinutes: number | null;
  location: SessionLocation;
  place: string | null;
  city: string | null;
  meetingUrl: string | null;
  status: PageStatus;
  capacity: number | null;
  attendees: AgendaAttendee[];
  /** How many of them the coach has accepted — the number who can actually come. */
  acceptedCount: number;
};

/**
 * The trainer's calendar.
 *
 * **Occurrences are computed, never stored.** A weekly class is a rule —
 * these weekdays, this hour, from this date — and the calendar is that rule
 * unrolled over the next fortnight. Writing a row per occurrence would mean a
 * generator job, a horizon to extend, and two sources of truth the first time a
 * coach moves a class from Tuesday to Wednesday: the rule would say Wednesday
 * and three hundred stored rows would still say Tuesday.
 *
 * What a stored occurrence *would* buy is per-date edits — cancelling the 14th,
 * moving one week's class an hour later, marking who actually turned up. That
 * is what `TrainingSessionEntity` and `SessionAttendeeEntity` are for, and when
 * it is built it becomes an overlay on this list rather than a replacement:
 * the rule generates the dates, and a stored row overrides the one it matches.
 *
 * `at` is a **local wall-clock string** (`2026-09-23T18:00`) rather than a UTC
 * instant. A class at six in the evening is at six in the evening; serialising
 * it through `toISOString` sends `16:00Z`, and any consumer that formats it in
 * another zone — or a browser whose zone is not the gym's — prints the wrong
 * hour. The front end parses it as local, which is what it means.
 */
@Injectable()
export class AgendaService {
  constructor(
    @InjectRepository(TrainingClassEntity)
    private readonly classes: Repository<TrainingClassEntity>,
    @InjectRepository(ClassMemberEntity)
    private readonly members: Repository<ClassMemberEntity>,
    @InjectRepository(EnrollmentEntity)
    private readonly enrollments: Repository<EnrollmentEntity>,
  ) {}

  /**
   * Everything this coach has on, in date order, for the next `days` days.
   *
   * Drafts are included and carry their status: a coach preparing next month's
   * class wants to see it in place before publishing it, and the badge says why
   * nobody has joined.
   */
  async forTrainer(trainerId: number, days = 14): Promise<AgendaOccurrence[]> {
    const all = await this.classes.find({ order: { id: "ASC" } });
    const mine = all.filter((row) => (row.trainerIds ?? []).includes(trainerId));
    if (!mine.length) return [];

    const attendees = await this.attendeesByClass(
      mine.map((row) => row.id),
      trainerId,
    );

    const from = new Date();
    const out: AgendaOccurrence[] = [];

    for (const row of mine) {
      const people = attendees[row.id] ?? [];

      for (const at of occurrencesBetween(row.weekdays, row.startTime, {
        from,
        days,
        notBefore: row.startsOn,
      })) {
        out.push({
          classId: row.id,
          slug: row.slug,
          title: row.title,
          at: `${toDateString(at)}T${pad(at.getHours())}:${pad(at.getMinutes())}`,
          day: toDateString(at),
          time: `${pad(at.getHours())}:${pad(at.getMinutes())}`,
          durationMinutes: row.durationMinutes,
          location: row.location,
          place: row.place,
          city: row.city,
          meetingUrl: row.meetingUrl,
          status: row.status,
          capacity: row.capacity,
          attendees: people,
          acceptedCount: people.filter((person) => person.accepted).length,
        });
      }
    }

    return out.sort((a, b) => a.at.localeCompare(b.at));
  }

  /**
   * Who is in each of these classes, marked with whether this coach has
   * accepted them.
   *
   * Two queries for the whole calendar rather than two per occurrence — the
   * same class appears on the agenda four times in a fortnight and its members
   * do not change between Tuesdays.
   */
  private async attendeesByClass(
    classIds: number[],
    trainerId: number,
  ): Promise<Record<number, AgendaAttendee[]>> {
    const rows = await this.members.find({
      where: { classId: In(classIds), status: "active" },
      relations: ["client"],
      order: { joinedAt: "ASC" },
    });

    if (!rows.length) return {};

    const accepted = await this.enrollments.find({
      where: {
        clientId: In(rows.map((row) => row.clientId)),
        trainerId,
        status: EnrollmentStatus.ACTIVE,
      },
      select: ["clientId"],
    });

    const acceptedClients = new Set(accepted.map((row) => row.clientId));
    const out: Record<number, AgendaAttendee[]> = {};

    for (const row of rows) {
      const name = [row.client?.firstName, row.client?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

      (out[row.classId] ??= []).push({
        memberId: row.id,
        clientId: row.clientId,
        name: name || row.client?.email || "—",
        accepted: acceptedClients.has(row.clientId),
      });
    }

    return out;
  }
}

const pad = (value: number) => String(value).padStart(2, "0");
