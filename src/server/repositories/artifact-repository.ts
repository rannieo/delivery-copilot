import { AgentName } from "../../mastra/shared/schema/delivery-schema";
import { query, queryOne } from "../db/postgres";
import type { DeliveryArtifact } from "../types/delivery";

export type AgentArtifactRecord = {
  id: string;
  project_id: string;
  workflow_run_id: string;
  agent_name: AgentName;
  artifact_type: string;
  markdown: string;
  summary: string;
  assumptions: string[];
  risks: string[];
  open_questions: string[];
  created_at: Date;
};

export async function saveAgentArtifact(params: {
  projectId: string;
  workflowRunId: string;
  artifact: DeliveryArtifact;
}): Promise<AgentArtifactRecord> {
  const saved = await queryOne<AgentArtifactRecord>(
    `
    INSERT INTO agent_artifacts (
      project_id,
      workflow_run_id,
      agent_name,
      artifact_type,
      markdown,
      summary,
      assumptions,
      risks,
      open_questions
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb)
    RETURNING *
    `,
    [
      params.projectId,
      params.workflowRunId,
      params.artifact.agentName,
      params.artifact.artifactType,
      params.artifact.markdown,
      params.artifact.summary,
      JSON.stringify(params.artifact.assumptions),
      JSON.stringify(params.artifact.risks),
      JSON.stringify(params.artifact.openQuestions),
    ],
  );

  if (!saved) {
    throw new Error("Failed to save agent artifact");
  }

  return saved;
}

export async function listArtifactsByWorkflowRun(params: {
  workflowRunId: string;
}): Promise<AgentArtifactRecord[]> {
  return query<AgentArtifactRecord>(
    `
    SELECT *
    FROM agent_artifacts
    WHERE workflow_run_id = $1
    ORDER BY created_at ASC
    `,
    [params.workflowRunId],
  );
}

export async function listLatestArtifactsByProject(params: {
  projectId: string;
}): Promise<AgentArtifactRecord[]> {
  return query<AgentArtifactRecord>(
    `
    SELECT *
    FROM agent_artifacts
    WHERE project_id = $1
    ORDER BY created_at DESC
    LIMIT 50
    `,
    [params.projectId],
  );
}