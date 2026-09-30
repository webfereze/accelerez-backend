import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { promises as fs } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";
import { config } from "@shared/config/config";
import { slugify } from "@shared/utils/slugify";

/**
 * What each kind of upload accepts.
 *
 * Two allow-lists rather than one, because the two have different risks. An
 * image slot that accepted a PDF would render a broken frame; a document slot
 * that accepted an SVG would be serving a file that can carry script from the
 * site's own origin. Neither list is "everything the browser will send".
 */
const ALLOWED = {
  image: new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
    "image/gif",
    "image/svg+xml",
  ]),
  video: new Set([
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-matroska",
    "video/3gpp",
  ]),
  document: new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
  ]),
} as const;

export type UploadKind = keyof typeof ALLOWED;

/**
 * Three ceilings, because the three are not the same kind of file.
 *
 * **The video limit is the interesting one.** A phone films a set of squats at
 * 1080p60 and produces 200 MB a minute, so a limit low enough to protect the
 * disk would reject the normal case, and one high enough to accept everything
 * would let a single client fill the volume. 512 MB takes a two-minute clip
 * from any phone made in the last decade; above it the client is told to paste
 * an unlisted link instead, which the form offers next to the file picker.
 *
 * The express body limit in `main.ts` does not apply here — multipart is
 * streamed by multer, not parsed as JSON — so this number is the real one.
 */
const MAX_BYTES: Record<UploadKind, number> = {
  image: 10 * 1024 * 1024,
  video: 512 * 1024 * 1024,
  document: 25 * 1024 * 1024,
};

export type UploadResult = {
  url: string;
  key: string;
  /** Echoed back so a caller can store them without re-reading the file. */
  name: string;
  size: number;
  mimeType: string;
};

/**
 * Stores uploaded media.
 *
 * Cloudflare R2 when it is configured; otherwise the local `uploads/` folder,
 * served by `ServeStaticModule`. The fallback is what makes the block editor
 * usable on a fresh checkout — nobody should need cloud credentials to add an
 * image to a page in development.
 */
@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly client: S3Client | null;

  constructor() {
    this.client = this.isR2Configured() ? this.buildClient() : null;
    if (!this.client) {
      this.logger.warn(
        "R2 is not configured — uploads are written to ./uploads and served from /uploads.",
      );
    }
  }

  async upload(
    file: Express.Multer.File,
    folder = "blocks",
    kind: UploadKind = "image",
  ): Promise<UploadResult> {
    if (!file) throw new BadRequestException("Nu a fost primit niciun fișier.");

    if (!ALLOWED[kind].has(file.mimetype)) {
      throw new BadRequestException(`Tip de fișier neacceptat: ${file.mimetype}`);
    }

    // `image/svg+xml` is on the image list because the CMS needs logos, and a
    // client's profile picture is not the place to accept a file format that
    // can carry script from this origin.
    if (kind === "image" && folder.startsWith("portal") && file.mimetype === "image/svg+xml") {
      throw new BadRequestException("SVG nu este acceptat aici.");
    }

    const limit = MAX_BYTES[kind];
    if (file.size > limit) {
      throw new BadRequestException(
        `Fișierul poate avea cel mult ${Math.round(limit / (1024 * 1024))} MB.`,
      );
    }

    // Everything lives under the configured prefix: the bucket is shared with
    // another site, so this project's media stays in its own namespace.
    const prefix = config.get("r2.keyPrefix").replace(/^\/+|\/+$/g, "");
    const key = [prefix, folder, this.buildFileName(file.originalname)]
      .filter(Boolean)
      .join("/");

    const stored = this.client
      ? await this.putToR2(file, key)
      : await this.putToDisk(file, key);

    return {
      ...stored,
      // The name the visitor is offered, not the storage key — which carries a
      // random suffix and would read as gibberish in a download dialog.
      name: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  // --- internals ---------------------------------------------------------

  private async putToR2(
    file: Express.Multer.File,
    key: string,
  ): Promise<{ url: string; key: string }> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: config.get("r2.bucket"),
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    const base = config.get("r2.publicBaseUrl").replace(/\/+$/, "");
    return { key, url: `${base}/${key}` };
  }

  private async putToDisk(
    file: Express.Multer.File,
    key: string,
  ): Promise<{ url: string; key: string }> {
    const target = join(process.cwd(), "uploads", key);
    await fs.mkdir(join(target, ".."), { recursive: true });
    await fs.writeFile(target, file.buffer);

    const base = config.get("api_base_url").replace(/\/+$/, "");
    return { key, url: `${base}/uploads/${key}` };
  }

  /**
   * `sunset-túra.JPG` → `sunset-tura-a1b2c3d4.jpg`. The random suffix means a
   * re-upload never overwrites an image an older page revision still points at.
   */
  private buildFileName(originalName: string): string {
    const dot = originalName.lastIndexOf(".");
    const stem = dot > 0 ? originalName.slice(0, dot) : originalName;
    const extension = dot > 0 ? originalName.slice(dot + 1).toLowerCase() : "bin";

    return `${slugify(stem) || "file"}-${randomBytes(4).toString("hex")}.${extension}`;
  }

  private isR2Configured(): boolean {
    return Boolean(
      config.get("r2.accountId") &&
        config.get("r2.accessKeyId") &&
        config.get("r2.secretAccessKey") &&
        config.get("r2.publicBaseUrl"),
    );
  }

  private buildClient(): S3Client {
    return new S3Client({
      region: "auto",
      endpoint: `https://${config.get("r2.accountId")}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.get("r2.accessKeyId"),
        secretAccessKey: config.get("r2.secretAccessKey"),
      },
    });
  }
}
