import {
  Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Query, UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { StaffGuard } from "@auth/guards/staff.guard";
import { OrderService } from "../../shop/order.service";
import { OrderQueryDto, UpdateOrderDto } from "../../shop/dto/order.dto";

/** The orders inbox. Same shape as the contact requests: a worklist. */
@UseGuards(JwtAuthGuard, StaffGuard)
@Controller("admin/orders")
export class AdminOrderController {
  constructor(private readonly orders: OrderService) {}

  @Get()
  list(@Query() query: OrderQueryDto) {
    return this.orders.list(query);
  }

  /** Declared before `:id`, or "count" is read as one. */
  @Get("count")
  async count() {
    return { new: await this.orders.countNew() };
  }

  @Get(":id")
  detail(@Param("id", ParseIntPipe) id: number) {
    return this.orders.findById(id);
  }

  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateOrderDto) {
    return this.orders.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.orders.remove(id);
  }
}
