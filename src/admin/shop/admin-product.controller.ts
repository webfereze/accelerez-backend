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
import { ProductService } from "../../shop/product.service";
import { ProductQueryDto, UpsertProductDto } from "../../shop/dto/product.dto";

/** Admin CRUD for the shop's products — drafts included. Editors may manage them. */
@UseGuards(JwtAuthGuard, StaffGuard)
@Controller("admin/products")
export class AdminProductController {
  constructor(private readonly products: ProductService) {}

  @Get()
  list(@Query() query: ProductQueryDto) {
    return this.products.list(query);
  }

  @Get(":id")
  detail(@Param("id", ParseIntPipe) id: number) {
    return this.products.findById(id);
  }

  @Post()
  create(@Body() dto: UpsertProductDto) {
    return this.products.create(dto);
  }

  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpsertProductDto) {
    return this.products.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.products.remove(id);
  }
}
