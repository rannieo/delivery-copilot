export type SourceType = "prd" | "meeting_notes" | "technical_notes" | "other";

export type DeliveryArtifact = {
  agentName: string;
  artifactType: string;
  markdown: string;
  summary: string;
  assumptions: string[];
  risks: string[];
  openQuestions: string[];
};

export type DeliveryWorkflowResult = {
  projectId: string;
  workflowRunId: string;
  planTitle: string;
  finalMarkdown: string;
  artifacts: DeliveryArtifact[];
};

export type ProjectDocument = {
  id: string;
  projectId: string;
  sourceName: string;
  sourceType: SourceType;
  status: "pending" | "indexed" | "failed";
  chunkCount: number;
  errorMessage?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type RetrievedContextChunk = {
  text: string;
  sourceName: string;
  sourceType: string;
  score: number;
  documentId?: string;
  chunkIndex?: number;
};

export type SearchProjectContextResponse = {
  chunks: RetrievedContextChunk[];
  context: string;
  config: {
    enabled: boolean;
    indexName: string;
    topK: number;
    minScore: number;
  };
};

