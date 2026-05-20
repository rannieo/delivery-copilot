import { eq } from "drizzle-orm";
import { getDb } from "../client.ts";
import { projects } from "../schema.ts";

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export async function createProject(input: {
  name: string;
  description?: string;
}): Promise<Project> {
  const [row] = await getDb()
    .insert(projects)
    .values({ name: input.name, description: input.description })
    .returning();

  if (!row) {
    throw new Error("Failed to create project");
  }
  return row;
}

export async function getProjectById(projectId: string): Promise<Project | null> {
  const [row] = await getDb().select().from(projects).where(eq(projects.id, projectId));
  return row ?? null;
}
