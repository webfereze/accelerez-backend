import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { promises as fs } from "fs";
import { join } from "path";
import { AppModule } from "../app.module";
import { UploadService } from "../upload/upload.service";
import { config } from "@shared/config/config";

/**
 * Moves files written to the local `uploads/` folder into object storage, and
 * rewrites every reference to them in the database.
 *
 * **This exists because the fallback is silent.** `UploadService` writes to
 * disk whenever R2 is not configured, which is exactly right for a fresh
 * checkout — and it means everything uploaded before the credentials arrived
 * lives on one machine's disk and disappears the first time the app is
 * deployed. The images do not break here; they break in production, later,
 * with no error pointing at the cause.
 *
 * Idempotent: a URL that already points at object storage is skipped, so this
 * can be run again after anybody uploads while the credentials are missing.
 *
 *   yarn migrate:uploads
 */
async function main() {
  const logger = new Logger("MigrateUploads");

  if (!config.get("r2.publicBaseUrl")) {
    logger.error("R2 is not configured — there is nowhere to move the files to.");
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const uploads = app.get(UploadService);
  const dataSource = app.get(DataSource);

  const apiBase = config.get("api_base_url").replace(/\/+$/, "");
  const localPrefix = `${apiBase}/uploads/`;

  /**
   * Every column that can hold an uploaded URL.
   *
   * Listed by hand rather than discovered, because a JSON column holding block
   * data can carry a URL anywhere inside it and a generic walk would rewrite
   * strings that merely look like one.
   */
  const COLUMNS: Array<{ table: string; column: string; json?: boolean }> = [
    { table: "trainers", column: "photo" },
    { table: "trainers", column: "coverImage" },
    { table: "trainers", column: "content", json: true },
    { table: "pages", column: "content", json: true },
    { table: "posts", column: "coverImage" },
    { table: "posts", column: "content", json: true },
    { table: "resources", column: "filePath" },
    { table: "client_videos", column: "filePath" },
    { table: "progress_entries", column: "photos", json: true },
    { table: "messages", column: "attachments", json: true },
    { table: "testimonials", column: "avatar" },
  ];

  /** `<api>/uploads/blocks/x.png` → the object storage URL, uploading it first. */
  const moved = new Map<string, string>();

  async function moveOne(url: string): Promise<string | null> {
    if (moved.has(url)) return moved.get(url) ?? null;

    const key = url.slice(localPrefix.length);
    const path = join(process.cwd(), "uploads", key);

    let buffer: Buffer;
    try {
      buffer = await fs.readFile(path);
    } catch {
      logger.warn(`missing on disk, left alone: ${key}`);
      return null;
    }

    const name = key.split("/").pop() ?? "file";
    const folder = key.split("/").slice(0, -1).join("/") || "blocks";

    const result = await uploads.upload(
      {
        originalname: name,
        buffer,
        size: buffer.length,
        mimetype: mimeFor(name),
      } as Express.Multer.File,
      folder,
      kindFor(name),
    );

    moved.set(url, result.url);
    logger.log(`${key} → ${result.url}`);
    return result.url;
  }

  let rewritten = 0;

  for (const { table, column, json } of COLUMNS) {
    const rows: Array<Record<string, unknown>> = await dataSource
      .query(`SELECT id, \`${column}\` AS value FROM \`${table}\` WHERE \`${column}\` IS NOT NULL`)
      .catch(() => []);

    for (const row of rows) {
      const raw = json ? JSON.stringify(row.value) : String(row.value ?? "");
      if (!raw.includes(localPrefix)) continue;

      let next = raw;
      for (const url of new Set(raw.match(/https?:\/\/[^"'\s\\]+/g) ?? [])) {
        if (!url.startsWith(localPrefix)) continue;
        const replacement = await moveOne(url);
        if (replacement) next = next.split(url).join(replacement);
      }

      if (next === raw) continue;

      await dataSource.query(
        `UPDATE \`${table}\` SET \`${column}\` = ? WHERE id = ?`,
        [json ? next : next.replace(/^"|"$/g, ""), row.id],
      );
      rewritten += 1;
    }
  }

  logger.log(`Moved ${moved.size} file(s); rewrote ${rewritten} row(s).`);
  await app.close();
}

/** Enough to satisfy the upload allow-list; the extension is what decides. */
function mimeFor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const types: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    avif: "image/avif",
    gif: "image/gif",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    pdf: "application/pdf",
  };
  return types[ext] ?? "application/octet-stream";
}

function kindFor(name: string): "image" | "video" | "document" {
  const mime = mimeFor(name);
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("image/")) return "image";
  return "document";
}

void main();
