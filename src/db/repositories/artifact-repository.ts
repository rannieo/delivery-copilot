import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "../client";
import { agentArtifacts } from "../schema";
import type { DeliveryArtifact } from "../../mastra/shared/schema/delivery-schema";

export type AgentArtifact = typeof agentArtifacts.$inferSelect;

export async function saveAgentArtifact(input: {
  projectId: string;
  workflowRunId: string;
  artifact: DeliveryArtifact;
}): Promise<AgentArtifact> {
  const [row] = await getDb()
    .insert(agentArtifacts)
    .values({
      projectId: input.projectId,
      workflowRunId: input.workflowRunId,
      agentName: input.artifact.agentName,
      artifactType: input.artifact.artifactType,
      markdown: input.artifact.markdown,
      summary: input.artifact.summary,
      assumptions: input.artifact.assumptions,
      risks: input.artifact.risks,
      openQuestions: input.artifact.openQuestions,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to save agent artifact");
  }
  return row;
}

export async function listArtifactsByWorkflowRun(input: {
  workflowRunId: string;
}): Promise<AgentArtifact[]> {
  return getDb()
    .select()
    .from(agentArtifacts)
    .where(eq(agentArtifacts.workflowRunId, input.workflowRunId))
    .orderBy(asc(agentArtifacts.createdAt));
}

export async function listLatestArtifactsByProject(input: {
  projectId: string;
}): Promise<AgentArtifact[]> {
  return getDb()
    .select()
    .from(agentArtifacts)
    .where(eq(agentArtifacts.projectId, input.projectId))
    .orderBy(desc(agentArtifacts.createdAt))
    .limit(50);
}
