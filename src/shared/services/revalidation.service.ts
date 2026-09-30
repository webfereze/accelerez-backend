import { Injectable, Logger } from "@nestjs/common";
import { config } from "@shared/config/config";

/**
 * Tells the Next.js site to drop its cached copy of a page.
 *
 * Public pages are statically generated and cached; without this an editor's
 * save stays invisible until the ISR window expires. Every write that changes
 * what a visitor sees calls this.
 *
 * Deliberately **fire-and-forget**: the save has already succeeded by the time
 * we get here, and a slow or unreachable front end must not turn a successful
 * save into an error the editor sees. A failure is logged, and the ISR window
 * remains the backstop.
 */
@Injectable()
export class RevalidationService {
  private readonly logger = new Logger(RevalidationService.name);

  /** `paths` are locale-less, e.g. `["/", "/despre-noi"]`. */
  revalidate(paths: string[]): void {
    const secret = config.get("revalidate.secret");
    if (!secret || paths.length === 0) return;

    const url = `${config.get("base_url").replace(/\/+$/, "")}/api/revalidate`;

    void fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify({ paths }),
      // A hung front end must not hold a connection open indefinitely.
      signal: AbortSignal.timeout(5000),
    })
      .then((response) => {
        if (!response.ok) {
          this.logger.warn(`Revalidation returned ${response.status} for ${paths.join(", ")}`);
        }
      })
      .catch((error: Error) => {
        this.logger.warn(`Revalidation failed for ${paths.join(", ")}: ${error.message}`);
      });
  }
}
