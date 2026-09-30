import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { config } from "@shared/config/config";
import { BuildInfo, buildInfo } from "@shared/version";

/**
 * Deploy-level configuration the front end needs but cannot know on its own.
 *
 * Served from here rather than compiled into the front end's bundle: the app is
 * configured by one variable (the API URL) and everything else comes from this,
 * so changing the canonical origin is a variable and a restart rather than a
 * rebuild.
 */
export type SiteConfig = {
  /** Canonical public origin of the front end, no trailing slash. */
  baseUrl: string;
  allowIndexing: boolean;
};

export type Health = {
  status: "ok" | "degraded";
  env: string;
  database: "up" | "down";
  uptime: number;
};

@Injectable()
export class AppService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async health(): Promise<Health> {
    let database: Health["database"] = "down";
    try {
      await this.dataSource.query("SELECT 1");
      database = "up";
    } catch {
      // Reported as "down"; the endpoint itself must still answer so a load
      // balancer gets a body rather than a connection error.
    }

    return {
      status: database === "up" ? "ok" : "degraded",
      env: config.get("env"),
      database,
      uptime: Math.round(process.uptime()),
    };
  }

  /**
   * Build identity of the running instance. Unauthenticated and database-free
   * on purpose: it has to answer while the database is down, because "which
   * commit is deployed?" is exactly the question asked during an incident.
   */
  version(): BuildInfo {
    return buildInfo(config.get("env"));
  }

  siteConfig(): SiteConfig {
    return {
      baseUrl: config.get("base_url").replace(/\/+$/, ""),
      allowIndexing: config.get("seo.allowIndexing"),
    };
  }
}
