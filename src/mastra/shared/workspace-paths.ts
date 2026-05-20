import type { AgentName } from "./schema/delivery-schema";

export function runDir(workflowRunId: string): string {
  return `/runs/${workflowRunId}`;
}

export function artifactPath(workflowRunId: string, agentName: AgentName): string {
  return `${runDir(workflowRunId)}/${agentName}.md`;
}

export function finalPlanPath(workflowRunId: string): string {
  return `${runDir(workflowRunId)}/final-plan.md`;
}
