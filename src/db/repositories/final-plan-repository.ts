import { eq, sql } from "drizzle-orm";
import { getDb } from "../client.ts";
import { finalPlans } from "../schema.ts";

export type FinalPlan = typeof finalPlans.$inferSelect;

export async function saveFinalPlan(input: {
  projectId: string;
  workflowRunId: string;
  title: string;
  markdown: string;
}): Promise<FinalPlan> {
  const nextVersion = sql<number>`(
    SELECT COALESCE(MAX(${finalPlans.version}), 0) + 1
    FROM ${finalPlans}
    WHERE ${eq(finalPlans.projectId, input.projectId)}
  )`;

  const [row] = await getDb()
    .insert(finalPlans)
    .values({
      projectId: input.projectId,
      workflowRunId: input.workflowRunId,
      title: input.title,
      markdown: input.markdown,
      version: nextVersion,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to save final plan");
  }
  return row;
}
