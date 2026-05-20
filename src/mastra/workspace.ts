import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LocalFilesystem, Workspace } from "@mastra/core/workspace";

export type MastraFilesystemDriver = "local" | "s3" | "gcs" | "azure";

// Resolve the default workspace location relative to this module (src/mastra/),
// not to process.cwd(). Mastra dev's CWD can vary (e.g. landing inside
// src/mastra/public/ on some runs); a module-relative default puts run
// artifacts at <repo-root>/workspace regardless.
const moduleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(moduleDir, "..", "..");
const defaultLocalBasePath = resolve(repoRoot, "workspace");

function buildMastraWorkspace() {
  const driver = (process.env.MASTRA_FILESYSTEM_DRIVER ?? "local") as MastraFilesystemDriver;

  if (driver === "local") {
    const basePath = process.env.WORKSPACE_BASE_PATH
      ? resolve(process.cwd(), process.env.WORKSPACE_BASE_PATH)
      : defaultLocalBasePath;
    return new Workspace({ filesystem: new LocalFilesystem({ basePath }) });
  }

  if (driver === "s3" || driver === "gcs" || driver === "azure") {
    throw new Error(
      `MASTRA_FILESYSTEM_DRIVER=${driver} is not yet wired. ` +
        `Install @mastra/${driver} and add the case to buildMastraWorkspace().`,
    );
  }

  throw new Error(`Unknown MASTRA_FILESYSTEM_DRIVER: ${driver}`);
}

// Singleton mirroring `mastraStorage`. Importing this (instead of constructing
// per-call) keeps the workspace lifecycle aligned with the storage lifecycle.
export const mastraWorkspace = buildMastraWorkspace();
