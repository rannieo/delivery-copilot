import { AgentName } from "../../mastra/shared/schema/delivery-schema";

export type DeliveryArtifact = {
  agentName: AgentName;
  artifactType: string;
  markdown: string;
  summary: string;
  assumptions: string[];
  risks: string[];
  openQuestions: string[];
};