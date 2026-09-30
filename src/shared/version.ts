import { readFileSync } from "fs";
import { join } from "path";
import { Logger } from "@nestjs/common";

/**
 * Build identity served by `GET /api/version`.
 *
 * Answers the only question that matters after a deploy: *is the code I just
 * pushed the code that is actually running?* A version alone can't answer it —
 * two deploys of the same version differ — so the commit SHA travels with it.
 */
export type BuildInfo = {
  /** Semver from `package.json`, bumped by every commit (see the `versioned-commit` skill). */
  version: string;
  name: string;
  /** Full commit SHA, or "unknown" outside a Railway/CI build. */
  commit: string;
  /** First 7 characters of `commit` — what you compare against `git log` by eye. */
  commitShort: string;
  branch: string;
  /** ISO timestamp baked into the image at build time, or null for a local run. */
  builtAt: string | null;
  env: string;
  /** ISO timestamp of the current process start — changes on every restart. */
  startedAt: string;
  uptime: number;
};

/**
 * `package.json` is read from disk rather than imported: `resolveJsonModule`
 * would place a copy under `dist/`, and the Dockerfile copies the real manifest
 * to the working directory. Both locally and in the image the file sits at
 * `<cwd>/package.json`, which is the same lookup `app.module.ts` uses for
 * `uploads`.
 */
function readManifest(): { name: string; version: string } {
  try {
    const raw = readFileSync(join(process.cwd(), "package.json"), "utf8");
    const parsed = JSON.parse(raw) as { name?: string; version?: string };
    return {
      name: parsed.name ?? "quadventures-backend",
      version: parsed.version ?? "0.0.0",
    };
  } catch {
    // Never fail boot over this — an unreadable manifest degrades the endpoint,
    // it does not take the API down.
    new Logger("Version").warn(
      "package.json could not be read; /api/version will report 0.0.0",
    );
    return { name: "quadventures-backend", version: "0.0.0" };
  }
}

/** Read once: the manifest cannot change under a running process. */
const manifest = readManifest();

/**
 * Just the version, for callers that want to stamp a build onto something —
 * Stripe metadata, an outgoing webhook — without assembling the whole
 * `BuildInfo` (which needs the environment passed in, and they have no reason
 * to know it).
 */
export const appVersion = manifest.version;

const startedAt = new Date().toISOString();

/**
 * Railway injects `RAILWAY_GIT_*` into the running container for every deploy,
 * so the SHA needs no build argument there. `GIT_COMMIT` / `GIT_BRANCH` /
 * `APP_BUILD_TIME` are the manual fallback for `docker build` elsewhere.
 */
const commit =
  process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT ?? "unknown";
const branch =
  process.env.RAILWAY_GIT_BRANCH ?? process.env.GIT_BRANCH ?? "unknown";
const builtAt = process.env.APP_BUILD_TIME || null;

export function buildInfo(env: string): BuildInfo {
  return {
    version: manifest.version,
    name: manifest.name,
    commit,
    commitShort: commit === "unknown" ? "unknown" : commit.slice(0, 7),
    branch,
    builtAt,
    env,
    startedAt,
    uptime: Math.round(process.uptime()),
  };
}
