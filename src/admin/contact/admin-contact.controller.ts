import {
  Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Query, UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { StaffGuard } from "@auth/guards/staff.guard";
import { ContactService } from "../../contact/contact.service";
import {
  ContactRequestQueryDto,
  UpdateContactRequestDto,
} from "../../contact/dto/contact.dto";

@UseGuards(JwtAuthGuard, StaffGuard)
@Controller("admin/contact-requests")
export class AdminContactController {
  constructor(private readonly contact: ContactService) {}

  @Get()
  list(@Query() query: ContactRequestQueryDto) {
    return this.contact.list(query);
  }

  /** Declared before `:id`, or "count" is read as one. */
  @Get("count")
  async count() {
    return { new: await this.contact.countNew() };
  }

  @Get(":id")
  detail(@Param("id", ParseIntPipe) id: number) {
    return this.contact.findById(id);
  }

  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateContactRequestDto) {
    return this.contact.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.contact.remove(id);
  }
}
