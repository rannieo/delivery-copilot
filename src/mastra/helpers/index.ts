import type { Mastra } from "@mastra/core/mastra";
import { saveAgentArtifact } from "../../db/repositories/artifact-repository";
import { AgentName, DeliveryArtifact } from "../shared/schema/delivery-schema";
import { artifactPath, runDir } from "../shared/workspace-paths";

function truncateText(text: string | undefined | null, maxChars: number): string {
  if (!text) {
    return "";
  }

  if (text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, maxChars)}\n...[truncated ${text.length - maxChars} chars]`;
}

const RAW_INPUT_CONTEXT_LIMIT = 16_000;

function renderCompactArtifacts(artifacts: DeliveryArtifact[]): string {
  if (artifacts.length === 0) {
    return "No previous agent outputs yet.";
  }

  return artifacts
    .map((artifact, index) => {
      return `
## Previous Artifact ${index + 1}
Agent: ${artifact.agentName}
Type: ${artifact.artifactType}

Summary:
${artifact.summary}

Key Risks:
${artifact.risks.slice(0, 3).map((risk) => `- ${risk}`).join("\n") || "- None"}

Open Questions:
${artifact.openQuestions.slice(0, 3).map((question) => `- ${question}`).join("\n") || "- None"}
`;
    })
    .join("\n---\n");
}

export function buildArtifact(params: {
  agentName: AgentName;
  artifactType: string;
  markdown: string;
  summary?: string;
  assumptions?: string[];
  risks?: string[];
  openQuestions?: string[];
}): DeliveryArtifact {
  return {
    agentName: params.agentName,
    artifactType: params.artifactType,
    markdown: params.markdown,
    summary: params.summary ?? params.markdown.slice(0, 500),
    assumptions: params.assumptions ?? [],
    risks: params.risks ?? [],
    openQuestions: params.openQuestions ?? [],
  };
}

export function buildAgentPrompt(params: {
  role: string;
  projectId: string;
  rawInput: string;
  artifacts: DeliveryArtifact[];
  specificInstruction: string;
}): string {
  const previousArtifacts = renderCompactArtifacts(params.artifacts);

  return `
You are running inside the Delivery Copilot workflow.

Rules:
- Return only the requested structured response.
- Put the complete requested Markdown artifact in the "markdown" field.
- Be concise but complete.
- Do not repeat previous agent outputs.
- Do not invent missing information.

Project ID:
${params.projectId}

Raw Project Input:
${truncateText(params.rawInput, RAW_INPUT_CONTEXT_LIMIT)}

Previous Agent Outputs:
${previousArtifacts}

Your Role:
${params.role}

Task:
${params.specificInstruction}
`;
}

export async function persistArtifact(params: {
  projectId: string;
  workflowRunId: string;
  artifact: DeliveryArtifact;
  mastra: Mastra;
}): Promise<void> {
  const workspace = params.mastra.getWorkspace();
  if (!workspace?.filesystem) {
    throw new Error("Workspace filesystem not configured");
  }

  const path = artifactPath(params.workflowRunId, params.artifact.agentName);
  await workspace.filesystem.mkdir(runDir(params.workflowRunId), { recursive: true });
  await workspace.filesystem.writeFile(path, params.artifact.markdown);

  await saveAgentArtifact({
    projectId: params.projectId,
    workflowRunId: params.workflowRunId,
    artifact: { ...params.artifact, markdown: path },
  });
}
