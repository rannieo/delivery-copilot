import type { ragConfig, ProjectDocumentSourceType } from "../../rag/config.ts";
import type { RetrievedContextChunk } from "../../rag/retrieval-service.ts";

export type ProjectDocumentApiRouteDeps = {
  getProjectById: (projectId: string) => Promise<{ id: string } | null>;
  getProjectDocumentById: (
    input: { documentId: string },
  ) => Promise<({ id: string; projectId: string } & Record<string, unknown>) | null>;
  listProjectDocuments: (input: { projectId: string }) => Promise<Array<Record<string, unknown>>>;
  ingestProjectDocument: (input: {
    projectId: string;
    sourceName: string;
    sourceType: ProjectDocumentSourceType;
    content: string;
  }) => Promise<{ id: string } & Record<string, unknown>>;
  deindexProjectDocument: (input: { documentId: string }) => Promise<void>;
  retrieveProjectContext: (input: {
    projectId: string;
    query: string;
    topK?: number;
    minScore?: number;
  }) => Promise<RetrievedContextChunk[]>;
  renderRetrievedContext: (chunks: RetrievedContextChunk[]) => string;
  ragConfig: typeof ragConfig;
};
