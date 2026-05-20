import { eq, sql } from "drizzle-orm";
import { getDb } from "../client";
import { workflowRuns } from "../schema";

export type WorkflowRun = typeof workflowRuns.$inferSelect;

export async function createWorkflowRun(input: {
  projectId: string;
  mastraRunId: string;
  inputText: string;
}): Promise<WorkflowRun> {
  const [row] = await getDb()
    .insert(workflowRuns)
    .values({
      projectId: input.projectId,
      mastraRunId: input.mastraRunId,
      inputText: input.inputText,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create workflow run");
  }
  return row;
}

export async function completeWorkflowRun(input: { workflowRunId: string }): Promise<void> {
  await getDb()
    .update(workflowRuns)
    .set({ status: "completed", completedAt: sql`now()` })
    .where(eq(workflowRuns.id, input.workflowRunId));
}

export async function failWorkflowRunByMastraRunId(input: {
  mastraRunId: string;
  errorMessage: string;
}): Promise<void> {
  await getDb()
    .update(workflowRuns)
    .set({
      status: "failed",
      errorMessage: input.errorMessage,
      completedAt: sql`now()`,
    })
    .where(eq(workflowRuns.mastraRunId, input.mastraRunId));
}
