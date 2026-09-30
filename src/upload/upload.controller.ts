import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { StaffGuard } from "@auth/guards/staff.guard";
import { PortalGuard } from "@auth/guards/portal.guard";
import { CurrentUser } from "@auth/decorators/current-user.decorator";
import { UserEntity } from "@shared/entities";
import { UploadService } from "./upload.service";

@UseGuards(JwtAuthGuard, StaffGuard)
@Controller("admin/upload")
export class UploadController {
  constructor(private readonly uploads: UploadService) {}

  /**
   * POST /admin/upload/image → { url, key }
   *
   * Its own endpoint rather than multipart on the page PUT: the editor uploads
   * one image at a time and stores the returned URL on the block, so a page
   * save stays a small JSON request.
   *
   * The multipart field is **`file`** — what `ImageField` sends. Multer rejects
   * any other field name with a bare "Unexpected field", so the two have to
   * agree; the route already says `image`, the field need not repeat it.
   */
  @Post("image")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage() }))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return this.uploads.upload(file, "blocks", "image");
  }

  /**
   * POST /admin/upload/document → { url, key, name, size, mimeType }
   *
   * Separate from the image route because the two accept different types and
   * different sizes, and an image slot must never accept a PDF.
   *
   * The size and type come back with the URL so an editor can store them
   * without re-reading the file.
   */
  @Post("document")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage() }))
  uploadDocument(@UploadedFile() file: Express.Multer.File) {
    return this.uploads.upload(file, "documents", "document");
  }
}

/**
 * Uploads from inside the portal — a client's exercise video, a trainer's PDF
 * plan, either one's photograph.
 *
 * A separate controller behind `PortalGuard` rather than a role added to the
 * admin one: these two sets of routes differ in who may call them, what they
 * accept and where the files land, and the only thing they share is the
 * service. Every file goes under `portal/`, so the platform's own media and
 * people's personal recordings are never mixed in one folder — which matters
 * the first time somebody has to delete an account's files.
 *
 * **Not throttled harder than the default on purpose.** A client uploading four
 * videos in a session is the behaviour the product wants; the ceiling that
 * matters is the size of each, which `UploadService` enforces.
 */
@UseGuards(JwtAuthGuard, PortalGuard)
@Controller("upload")
export class PortalUploadController {
  constructor(private readonly uploads: UploadService) {}

  /**
   * POST /upload/video → { url, key, name, size, mimeType }
   *
   * The size and type come back so the client's form can store them on the
   * record without reading the file again — that is what lets the trainer's
   * inbox print "94 MB, mp4" without a request per row.
   */
  @Post("video")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage() }))
  uploadVideo(@CurrentUser() user: UserEntity, @UploadedFile() file: Express.Multer.File) {
    // Foldered per account: one person's recordings stay together, and removing
    // an account is a prefix rather than a search.
    return this.uploads.upload(file, `portal/videos/${user.id}`, "video");
  }

  /** A PDF plan, a scanned analysis. */
  @Post("document")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage() }))
  uploadDocument(@CurrentUser() user: UserEntity, @UploadedFile() file: Express.Multer.File) {
    return this.uploads.upload(file, `portal/documents/${user.id}`, "document");
  }

  /** A profile photograph. SVG is refused here — see `UploadService`. */
  @Post("image")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage() }))
  uploadImage(@CurrentUser() user: UserEntity, @UploadedFile() file: Express.Multer.File) {
    return this.uploads.upload(file, `portal/images/${user.id}`, "image");
  }
}
