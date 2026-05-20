import { queryOne } from "../db/postgres";

export type WorkflowRunRecord = {
  id: string;
  project_id: string;
  status: "running" | "completed" | "failed";
  input_text: string;
  error_message: string | null;
  started_at: Date;
  completed_at: Date | null;
};

export async function createWorkflowRun(params: {
  projectId: string;
  inputText: string;
}): Promise<WorkflowRunRecord> {
  const run = await queryOne<WorkflowRunRecord>(
    `
    INSERT INTO workflow_runs (project_id, input_text, status)
    VALUES ($1, $2, 'running')
    RETURNING *
    `,
    [params.projectId, params.inputText],
  );

  if (!run) {
    throw new Error("Failed to create workflow run");
  }

  return run;
}

export async function completeWorkflowRun(params: {
  workflowRunId: string;
}): Promise<void> {
  await queryOne(
    `
    UPDATE workflow_runs
    SET status = 'completed',
        completed_at = now()
    WHERE id = $1
    RETURNING id
    `,
    [params.workflowRunId],
  );
}

export async function failWorkflowRun(params: {
  workflowRunId: string;
  errorMessage: string;
}): Promise<void> {
  await queryOne(
    `
    UPDATE workflow_runs
    SET status = 'failed',
        error_message = $2,
        completed_at = now()
    WHERE id = $1
    RETURNING id
    `,
    [params.workflowRunId, params.errorMessage],
  );
}