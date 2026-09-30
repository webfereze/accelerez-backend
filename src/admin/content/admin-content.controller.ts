import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { StaffGuard } from "@auth/guards/staff.guard";
import { ContentService } from "../../content/content.service";
import { UpsertFaqDto, UpsertTestimonialDto } from "../../content/dto/content.dto";

/** Editors may manage both — these are marketing copy, not accounts. */
@UseGuards(JwtAuthGuard, StaffGuard)
@Controller("admin")
export class AdminContentController {
  constructor(private readonly content: ContentService) {}

  // --- FAQ -----------------------------------------------------------------

  @Get("faqs")
  faqs() {
    return this.content.listAllFaqs();
  }

  @Get("faqs/:id")
  faq(@Param("id", ParseIntPipe) id: number) {
    return this.content.findFaq(id);
  }

  @Post("faqs")
  createFaq(@Body() dto: UpsertFaqDto) {
    return this.content.createFaq(dto);
  }

  @Put("faqs/:id")
  updateFaq(@Param("id", ParseIntPipe) id: number, @Body() dto: UpsertFaqDto) {
    return this.content.updateFaq(id, dto);
  }

  @Delete("faqs/:id")
  @HttpCode(204)
  removeFaq(@Param("id", ParseIntPipe) id: number) {
    return this.content.removeFaq(id);
  }

  // --- testimonials --------------------------------------------------------

  @Get("testimonials")
  testimonials() {
    return this.content.listAllTestimonials();
  }

  @Get("testimonials/:id")
  testimonial(@Param("id", ParseIntPipe) id: number) {
    return this.content.findTestimonial(id);
  }

  @Post("testimonials")
  createTestimonial(@Body() dto: UpsertTestimonialDto) {
    return this.content.createTestimonial(dto);
  }

  @Put("testimonials/:id")
  updateTestimonial(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpsertTestimonialDto,
  ) {
    return this.content.updateTestimonial(id, dto);
  }

  @Delete("testimonials/:id")
  @HttpCode(204)
  removeTestimonial(@Param("id", ParseIntPipe) id: number) {
    return this.content.removeTestimonial(id);
  }
}
