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
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { StaffGuard } from "@auth/guards/staff.guard";
import { BlogService } from "../../blog/blog.service";
import { PostQueryDto, UpsertPostDto } from "../../blog/dto/post.dto";

/** Admin CRUD. Drafts included — unlike the public API. */
@UseGuards(JwtAuthGuard, StaffGuard)
@Controller("admin/posts")
export class AdminBlogController {
  constructor(private readonly blog: BlogService) {}

  @Get()
  list(@Query() query: PostQueryDto) {
    return this.blog.list(query);
  }

  @Get(":id")
  detail(@Param("id", ParseIntPipe) id: number) {
    return this.blog.findById(id);
  }

  @Post()
  create(@Body() dto: UpsertPostDto) {
    return this.blog.create(dto);
  }

  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpsertPostDto) {
    return this.blog.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.blog.remove(id);
  }
}
