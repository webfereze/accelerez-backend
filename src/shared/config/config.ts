import { Logger } from "@nestjs/common";
import convict from "convict";
import * as yaml from "js-yaml";
import * as fs from "fs";

/**
 * Every setting this service takes, in one place.
 *
 * `convict` over a gitignored `.env.yml`, with environment variables
 * overriding — so a deployment sets variables and a laptop edits a file. No
 * bare `process.env` reads outside this module: a variable read in two places
 * is a variable documented in none.
 */
export interface Config {
  env: string;
  server: { port: number; debugMode: boolean; logLevel: string };
  db: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
  auth: { jwtSecret: string; jwtExpiresIn: string };
  r2: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    keyPrefix: string;
    publicBaseUrl: string;
  };
  seo: { allowIndexing: boolean };
  revalidate: { secret: string };
  base_url: string;
  api_base_url: string;
}

export const config = convict<Config>({
  env: {
    doc: "Which environment this process is running in.",
    format: ["production", "development", "stage"],
    default: "development",
    env: "APPLICATION_ENV",
  },
  server: {
    port: { doc: "Port to bind", format: "Number", default: 8006, env: "PORT" },
    debugMode: {
      doc: "Verbose logging.",
      format: Boolean,
      default: false,
      env: "DEBUG_MODE",
    },
    logLevel: {
      doc: "Log severity.",
      format: ["debug", "info", "warn", "error"],
      default: "info",
      env: "LOG_SEVERITY",
    },
  },
  db: {
    host: { doc: "Database host", format: "String", default: "127.0.0.1", env: "MARIADB_HOST", sensitive: true },
    port: { doc: "Database port", format: "Number", default: 3306, env: "MARIADB_PORT", sensitive: true },
    username: { doc: "Database user", format: "String", default: null, env: "MARIADB_USERNAME", sensitive: true },
    password: { doc: "Database password", format: "String", default: null, env: "MARIADB_PASSWORD", sensitive: true },
    database: { doc: "Database name", format: "String", default: null, env: "MARIADB_DATABASE_NAME", sensitive: true },
  },
  auth: {
    jwtSecret: {
      doc: "Signs every admin token. Production refuses to boot on the default — see main.ts.",
      format: String,
      default: "change-me-in-env",
      env: "JWT_SIGNING_SECRET",
      sensitive: true,
    },
    jwtExpiresIn: { doc: "Token lifetime", format: String, default: "7d", env: "JWT_EXPIRES_IN" },
  },
  // Object storage for uploaded media. Left blank, `UploadService` falls back to
  // writing ./uploads and serving /uploads — which is what lets the block editor
  // work on a fresh checkout with no cloud credentials.
  r2: {
    accountId: { doc: "Cloudflare account that owns the bucket", format: String, default: "", env: "R2_ACCOUNT_ID", sensitive: true },
    accessKeyId: { doc: "S3 API access key id", format: String, default: "", env: "R2_ACCESS_KEY_ID", sensitive: true },
    secretAccessKey: { doc: "S3 API secret", format: String, default: "", env: "R2_SECRET_ACCESS_KEY", sensitive: true },
    bucket: { doc: "Bucket name", format: String, default: "omd", env: "R2_BUCKET" },
    keyPrefix: { doc: "Folder every object is stored under, if the bucket is shared", format: String, default: "", env: "R2_KEY_PREFIX" },
    publicBaseUrl: {
      doc: "Public base URL for served objects. Every bucket has its own — reusing another one's returns 404 for every key.",
      format: String,
      default: "",
      env: "R2_PUBLIC_BASE_URL",
    },
  },
  seo: {
    allowIndexing: {
      doc:
        "Whether the public site may be indexed. Off everywhere but production — " +
        "a staging build that gets indexed takes weeks to undo, and its duplicate " +
        "content can outrank the real site meanwhile.",
      format: Boolean,
      default: false,
      env: "ALLOW_INDEXING",
    },
  },
  // Shared with the front end's REVALIDATE_SECRET. Set it on both sides or an
  // editor's save stays invisible until the ISR window expires.
  revalidate: {
    secret: {
      doc: "Must match REVALIDATE_SECRET on the front end. Empty disables on-demand revalidation.",
      format: String,
      default: "",
      env: "REVALIDATE_SECRET",
      sensitive: true,
    },
  },
  base_url: { doc: "Public front-end origin", format: String, default: "http://localhost:4006", env: "BASE_URL" },
  api_base_url: { doc: "This service's own origin", format: String, default: "http://localhost:8006", env: "API_BASE_URL" },
});

convict.addParser({ extension: ["yml", "yaml"], parse: yaml.load });

const envFilePath = "./.env.yml";
if (fs.existsSync(envFilePath)) {
  config.loadFile(envFilePath);
}

config.validate({ allowed: "strict" });

new Logger("Environment").log(`Loaded environment: ${config.get("env")}`);
