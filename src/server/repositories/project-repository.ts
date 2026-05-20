import { queryOne } from "../db/postgres";

export type ProjectRecord = {
  id: string;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
};

export async function createProject(params: {
  name: string;
  description?: string;
}): Promise<ProjectRecord> {
  const project = await queryOne<ProjectRecord>(
    `
    INSERT INTO projects (name, description)
    VALUES ($1, $2)
    RETURNING *
    `,
    [params.name, params.description ?? null],
  );

  if (!project) {
    throw new Error("Failed to create project");
  }

  return project;
}

export async function getProjectById(
  projectId: string,
): Promise<ProjectRecord | null> {
  return queryOne<ProjectRecord>(
    `
    SELECT *
    FROM projects
    WHERE id = $1
    `,
    [projectId],
  );
}