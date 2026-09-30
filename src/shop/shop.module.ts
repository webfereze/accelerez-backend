import { Module } from "@nestjs/common";
import { SharedModule } from "@shared/shared.module";
import { AuthModule } from "@auth/auth.module";
import { ProductService } from "./product.service";
import { OrderService } from "./order.service";
import { ShopController } from "./shop.controller";
import { AdminProductController } from "../admin/shop/admin-product.controller";
import { AdminOrderController } from "../admin/shop/admin-order.controller";

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [ShopController, AdminProductController, AdminOrderController],
  providers: [ProductService, OrderService],
  exports: [ProductService, OrderService],
})
export class ShopModule {}
