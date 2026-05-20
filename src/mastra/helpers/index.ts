import { AgentName, DeliveryArtifact } from "../shared/schema/delivery-schema";

function renderArtifactsForPrompt(artifacts: DeliveryArtifact[]): string {
  if (artifacts.length === 0) {
    return "No previous agent outputs yet.";
  }

  return artifacts
    .map((artifact, index) => {
      return `
## Previous Artifact ${index + 1}

Agent: ${artifact.agentName}
Artifact Type: ${artifact.artifactType}

${artifact.markdown}
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
  return `
You are running inside the Delivery Copilot workflow.

Important workflow rule:
- Do NOT call saveAgentOutputTool.
- The workflow will capture and save your output.
- Return only the requested Markdown artifact.
- Do not include tool execution logs.
- Do not invent missing information. Put missing items under assumptions or open questions.

Project ID:
${params.projectId}

Raw Project Input:
${params.rawInput}

Previous Agent Outputs:
${renderArtifactsForPrompt(params.artifacts)}

Your Role:
${params.role}

Task:
${params.specificInstruction}
`;
}