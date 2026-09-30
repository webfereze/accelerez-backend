import { Controller, Get } from "@nestjs/common";
import { AppService, Health, SiteConfig } from "./app.service";
import { BuildInfo } from "@shared/version";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("health")
  health(): Promise<Health> {
    return this.appService.health();
  }

  /** The deployed version and commit — how you confirm what is actually running. */
  @Get("api/version")
  version(): BuildInfo {
    return this.appService.version();
  }

  /** Canonical origin and the indexing switch, so the front end needs no config of its own. */
  @Get("site-config")
  siteConfig(): SiteConfig {
    return this.appService.siteConfig();
  }
}
