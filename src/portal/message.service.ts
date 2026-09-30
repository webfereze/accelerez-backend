import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Not, Repository } from "typeorm";
import { EnrollmentEntity, MessageEntity } from "@shared/entities";
import type { MessageAttachment } from "@shared/entities/message.entity";
import { EnrollmentStatus } from "@shared/enums/accelerez.enum";
import type { SendMessageDto } from "./dto/portal.dto";

/**
 * The thread between a client and their trainer.
 *
 * **Deliberately not behind the paid month** — see `MessageEntity`. Everything
 * a trainer produces is; talking is how the two of them sort out the month in
 * the first place.
 *
 * Ordered oldest-first, which is the only order a conversation reads in. The
 * caller asks for a page from the end when the thread is long; it never
 * reverses, because a reversed conversation is one nobody can follow.
 */
@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(MessageEntity)
    private readonly messages: Repository<MessageEntity>,
    @InjectRepository(EnrollmentEntity)
    private readonly enrollments: Repository<EnrollmentEntity>,
  ) {}

  /** The whole thread, oldest first, with the sender joined for the name. */
  list(enrollmentId: number, limit = 200): Promise<MessageEntity[]> {
    return this.messages.find({
      where: { enrollmentId },
      relations: ["sender"],
      order: { createdAt: "ASC", id: "ASC" },
      take: limit,
    });
  }

  /**
   * A message has to *say* something.
   *
   * Checked here rather than in the DTO because the rule is "text or at least
   * one attachment", which class-validator can only express as a pile of
   * conditionals — and an empty message is a row in a thread that reads as a
   * glitch.
   */
  async send(
    enrollment: EnrollmentEntity,
    senderId: number,
    dto: SendMessageDto,
  ): Promise<MessageEntity> {
    const body = dto.body?.trim() || null;
    const attachments = dto.attachments ?? [];

    if (!body && attachments.length === 0) {
      throw new BadRequestException("Scrie un mesaj sau atașează un fișier.");
    }

    const row = this.messages.create({
      enrollmentId: enrollment.id,
      senderId,
      body,
      attachments: attachments as MessageAttachment[],
    });

    const saved = await this.messages.save(row);

    // Re-read with the sender joined: the thread renders a name beside every
    // message, and the caller would otherwise have to guess at one.
    return this.messages.findOne({ where: { id: saved.id }, relations: ["sender"] });
  }

  /**
   * Marks everything the *other* side sent as read.
   *
   * Reading your own message is not an event, so the sender is excluded — and
   * without that exclusion a thread would mark itself read the moment somebody
   * wrote into it, and the unread badge would never appear.
   */
  async markRead(enrollmentId: number, readerId: number): Promise<void> {
    await this.messages.update(
      { enrollmentId, senderId: Not(readerId), readAt: IsNull() },
      { readAt: new Date() },
    );
  }

  /** How many messages this person has not read, on one enrolment. */
  unreadFor(enrollmentId: number, readerId: number): Promise<number> {
    return this.messages.count({
      where: { enrollmentId, senderId: Not(readerId), readAt: IsNull() },
    });
  }

  /**
   * Unread counts for a whole set of enrolments, in one query.
   *
   * The trainer's client list shows a badge per row; asking per row would be
   * one query per client, which is the classic list that gets slower the more
   * successful the coach becomes.
   */
  async unreadByEnrollment(
    enrollmentIds: number[],
    readerId: number,
  ): Promise<Record<number, number>> {
    if (!enrollmentIds.length) return {};

    const rows = await this.messages
      .createQueryBuilder("m")
      .select("m.enrollmentId", "enrollmentId")
      .addSelect("COUNT(*)", "count")
      .where("m.enrollmentId IN (:...ids)", { ids: enrollmentIds })
      .andWhere("m.senderId != :readerId", { readerId })
      .andWhere("m.readAt IS NULL")
      .groupBy("m.enrollmentId")
      .getRawMany<{ enrollmentId: number; count: string }>();

    return Object.fromEntries(rows.map((row) => [row.enrollmentId, Number(row.count)]));
  }

  /** Everything unread across a trainer's active clients — the dashboard badge. */
  async unreadForTrainer(trainerId: number, readerId: number): Promise<number> {
    const ids = (
      await this.enrollments.find({
        where: { trainerId, status: In([EnrollmentStatus.ACTIVE, EnrollmentStatus.PENDING]) },
        select: ["id"],
      })
    ).map((row) => row.id);

    if (!ids.length) return 0;

    return this.messages.count({
      where: { enrollmentId: In(ids), senderId: Not(readerId), readAt: IsNull() },
    });
  }
}
