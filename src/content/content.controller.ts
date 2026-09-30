import { Controller, Get, Query } from "@nestjs/common";
import { ContentService } from "./content.service";

/** Public reads: visible questions, approved quotes. No token, cacheable. */
@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get("faqs")
  faqs(@Query("topic") topic?: string) {
    return this.content.listFaqs(topic);
  }

  @Get("testimonials")
  testimonials(
    @Query("trainerId") trainerId?: string,
    @Query("featured") featured?: string,
  ) {
    return this.content.listTestimonials({
      trainerId: trainerId ? Number(trainerId) : undefined,
      featuredOnly: featured === "1" || featured === "true",
    });
  }
}
