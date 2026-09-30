import { Module } from "@nestjs/common";
import { SharedModule } from "@shared/shared.module";
import { AuthModule } from "@auth/auth.module";
import { BlogService } from "./blog.service";
import { BlogController } from "./blog.controller";
import { AdminBlogController } from "../admin/blog/admin-blog.controller";

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [BlogController, AdminBlogController],
  providers: [BlogService],
  exports: [BlogService],
})
export class BlogModule {}
