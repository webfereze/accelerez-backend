import { NestFactory } from "@nestjs/core";
import { Logger, ValidationPipe } from "@nestjs/common";
import * as express from "express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { config } from "@shared/config/config";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  /**
   * Security headers, and the server's own identity out of them.
   *
   * `x-powered-by: Express` told every caller what to look up known
   * vulnerabilities for, in exchange for nothing.
   *
   * Two departures from helmet's defaults, both deliberate:
   *
   * - **CSP off.** This process serves JSON, not documents; a content policy
   *   here protects nothing. The front end sets its own, where it matters.
   * - **`crossOriginResourcePolicy: cross-origin`.** With no object storage
   *   configured, uploads fall back to local disk served from `/uploads`, and
   *   the default `same-origin` would stop the front end loading those images —
   *   a self-inflicted outage in exactly the setup used to develop.
   */
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  /**
   * A production deploy must not run on the placeholder signing secret.
   *
   * The default is in this repository. Anyone who can read it can mint an admin
   * token for a deployment that never set the variable, and nothing about the
   * running site would look wrong — which is why this refuses to boot rather
   * than logging a warning somebody scrolls past. A short secret is refused for
   * the same reason: it is brute-forceable offline, and the token it signs is
   * the whole admin.
   *
   * It says *which* of the two it is. "Unset" and "set, but too short" are a
   * different fix, and a crashed container will not hand the variable back to
   * be inspected.
   */
  const jwtSecret = config.get("auth.jwtSecret");
  if (config.get("env") === "production") {
    const reason =
      jwtSecret === "change-me-in-env"
        ? "is still the placeholder from the repository"
        : jwtSecret.length < 32
          ? `is only ${jwtSecret.length} characters long; 32 is the minimum`
          : null;

    if (reason) {
      logger.error(
        `JWT_SIGNING_SECRET ${reason}. Set a long random value ` +
          "(openssl rand -hex 32) before deploying — refusing to start.",
      );
      process.exit(1);
    }
  } else if (jwtSecret === "change-me-in-env") {
    logger.warn("JWT_SIGNING_SECRET is the default. Fine locally, never in production.");
  }

  /**
   * `www.` and the bare domain are the same site, and a browser treats them as
   * two different origins.
   *
   * Whichever one is configured, the other is accepted too. Without this,
   * adding a domain means remembering to list it twice, and the half that was
   * forgotten fails only when somebody tries to sign in — as a CORS error,
   * which names nothing useful about the cause.
   */
  const withWwwVariant = (origin: string): string[] => {
    const trimmed = origin.replace(/\/+$/, "");
    if (!trimmed) return [];
    try {
      const url = new URL(trimmed);
      const other = new URL(trimmed);
      other.hostname = url.hostname.startsWith("www.")
        ? url.hostname.slice(4)
        : `www.${url.hostname}`;
      return [trimmed, other.origin];
    } catch {
      return [trimmed];
    }
  };

  const extraOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
    : [];

  const allowedOrigins = [
    ...new Set(
      [
        "http://localhost:4006",
        config.get("base_url").replace(/\/+$/, ""),
        ...extraOrigins,
      ].flatMap(withWwwVariant),
    ),
  ].filter(Boolean);
  logger.log(`CORS origins: ${allowedOrigins.join(", ")}`);

  /**
   * A rejected origin throws here, which Nest turns into a **500**, not a CORS
   * error. A 500 on every browser call while server-rendered pages are fine
   * means an origin is missing from this list — including every preview
   * deployment, which gets a new hostname per branch.
   */
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  /**
   * How large a request body may be.
   *
   * Express defaults to 100kb, which a long page of rich text in several
   * languages passes easily — and the save then fails with `413 Request entity
   * too large`, a message that says nothing about which limit or why.
   *
   * **Two limits, not one.** Admin writes whole pages and sits behind a staff
   * token, so it gets room to work. Everything else is orders of magnitude
   * smaller, and a generous limit on a public, unauthenticated route is an
   * invitation to make the server parse megabytes for nothing.
   *
   * These run before the parser Nest registers itself, so that one never sees a
   * body these have not already read.
   */
  app.use("/admin", express.json({ limit: "4mb" }));
  app.use(express.json({ limit: "256kb" }));

  const port = config.get("server.port");
  await app.listen(port, "0.0.0.0");
  logger.log(`Accelerez API listening on :${port}`);
}

void bootstrap();
