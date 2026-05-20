import { queryOne } from "../db/postgres";

export type FinalPlanRecord = {
  id: string;
  project_id: string;
  workflow_run_id: string;
  title: string;
  markdown: string;
  version: number;
  created_at: Date;
};

export async function saveFinalPlan(params: {
  projectId: string;
  workflowRunId: string;
  title: string;
  markdown: string;
}): Promise<FinalPlanRecord> {
  const current = await queryOne<{ max_version: number | null }>(
    `
    SELECT MAX(version) AS max_version
    FROM final_plans
    WHERE project_id = $1
    `,
    [params.projectId],
  );

  const nextVersion = (current?.max_version ?? 0) + 1;

  const saved = await queryOne<FinalPlanRecord>(
    `
    INSERT INTO final_plans (
      project_id,
      workflow_run_id,
      title,
      markdown,
      version
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [
      params.projectId,
      params.workflowRunId,
      params.title,
      params.markdown,
      nextVersion,
    ],
  );

  if (!saved) {
    throw new Error("Failed to save final plan");
  }

  return saved;
}