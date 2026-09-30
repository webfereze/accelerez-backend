import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { TrainerService } from "./trainer.service";
import { TrainerQueryDto } from "./dto/trainer.dto";

/**
 * The public directory.
 *
 * Everything here is anonymous and cacheable: no guard, no token, no personal
 * data. The parts of a trainer that belong to their clients live under
 * `/portal`, behind a token, and never leak into these responses.
 */
@Controller("trainers")
export class TrainerController {
  constructor(private readonly trainers: TrainerService) {}

  @Get()
  list(@Query() query: TrainerQueryDto) {
    return this.trainers.listPublished({ ...query, acceptingOnly: query.acceptingOnly });
  }

  /** Declared before `:slug`, or "slugs" is read as somebody's slug. */
  @Get("slugs")
  slugs() {
    return this.trainers.listPublishedSlugs();
  }

  /** Same reason — the filter's options, not a profile called "cities". */
  @Get("cities")
  cities() {
    return this.trainers.listCities();
  }

  @Get(":slug")
  detail(@Param("slug") slug: string, @Query("locale") locale = "ro") {
    return this.trainers.findBySlug(slug, locale);
  }

  /** How many places are left — counted live, see `occupancy`. */
  @Get(":id/occupancy")
  occupancy(@Param("id", ParseIntPipe) id: number) {
    return this.trainers.occupancy(id);
  }
}
