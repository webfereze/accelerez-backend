import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";

import { SharedModule } from "@shared/shared.module";
import { ConfigurationModule } from "@shared/modules/configuration.module";
import { AuthModule } from "@auth/auth.module";
import { PageModule } from "./page/page.module";
import { MenuModule } from "./menu/menu.module";
import { SettingsModule } from "./settings/settings.module";
import { UploadModule } from "./upload/upload.module";
import { BlogModule } from "./blog/blog.module";
import { NewsletterModule } from "./newsletter/newsletter.module";
import { ContactModule } from "./contact/contact.module";
import { TrainerModule } from "./trainer/trainer.module";
import { TrainingClassModule } from "./training-class/training-class.module";
import { PortalModule } from "./portal/portal.module";
import { ShopModule } from "./shop/shop.module";
import { ContentModule } from "./content/content.module";
import { SeedModule } from "./seed/seed.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

@Module({
  imports: [
    SharedModule,
    ConfigurationModule,
    // A generous ceiling; the endpoints where abuse actually matters tighten it
    // themselves.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    // Serves the local upload fallback used when object storage is not
    // configured — see UploadService.
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), "uploads"),
      serveRoot: "/uploads",
    }),
    AuthModule,
    PageModule,
    MenuModule,
    SettingsModule,
    UploadModule,
    BlogModule,
    NewsletterModule,
    ContactModule,
    ContentModule,
    // The product itself: the directory, and the private area behind it.
    TrainerModule,
    TrainingClassModule,
    PortalModule,
    // Plans and recipes for sale, and the orders for them.
    ShopModule,
    // Last: it seeds on boot, once the schema and every other module are up.
    SeedModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
