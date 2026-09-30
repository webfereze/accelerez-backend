import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { TrainingClassService } from "./training-class.service";
import { ClassMemberService } from "./class-member.service";
import { TrainingClassQueryDto } from "./dto/training-class.dto";

/** The public class listing. Anonymous and cacheable, like the directory. */
@Controller("classes")
export class TrainingClassController {
  constructor(
    private readonly classes: TrainingClassService,
    private readonly members: ClassMemberService,
  ) {}

  @Get()
  list(@Query() query: TrainingClassQueryDto) {
    return this.classes.listPublished(query);
  }

  /** Declared before `:slug`, or "slugs" is read as somebody's slug. */
  @Get("slugs")
  slugs() {
    return this.classes.listPublishedSlugs();
  }

  /** The classes one trainer runs — the strip on their profile. */
  @Get("by-trainer/:trainerId")
  byTrainer(
    @Param("trainerId", ParseIntPipe) trainerId: number,
    @Query("locale") locale = "ro",
  ) {
    return this.classes.listForTrainer(trainerId, locale);
  }

  @Get(":slug")
  async detail(@Param("slug") slug: string, @Query("locale") locale = "ro") {
    const item = await this.classes.findBySlug(slug, locale);
    const counts = await this.members.countByClass([item.id]);
    const taken = counts[item.id] ?? 0;

    return {
      ...item,
      // Counted live. A cached number shows "2 locuri libere" on a page that
      // then refuses the join, which is the one thing this page must not do.
      memberCount: taken,
      freePlaces: item.capacity == null ? null : Math.max(item.capacity - taken, 0),
      // The meeting link belongs to the people who joined — see the entity.
      meetingUrl: undefined,
    };
  }
}
