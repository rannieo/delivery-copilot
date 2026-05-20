import { LocalFilesystem, Workspace } from "@mastra/core/workspace";

export type MastraFilesystemDriver = "local" | "s3" | "gcs" | "azure";

export function createMastraWorkspace() {
  const driver = (process.env.MASTRA_FILESYSTEM_DRIVER ?? "local") as MastraFilesystemDriver;

  if (driver === "local") {
    const basePath = process.env.WORKSPACE_BASE_PATH ?? "./workspace";
    return new Workspace({ filesystem: new LocalFilesystem({ basePath }) });
  }

  if (driver === "s3" || driver === "gcs" || driver === "azure") {
    throw new Error(
      `MASTRA_FILESYSTEM_DRIVER=${driver} is not yet wired. ` +
        `Install @mastra/${driver} and add the case to createMastraWorkspace().`,
    );
  }

  throw new Error(`Unknown MASTRA_FILESYSTEM_DRIVER: ${driver}`);
}
