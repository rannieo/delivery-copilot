import { deindexProjectDocument, ingestProjectDocument } from "../../rag/document-service.ts";
import { ragConfig } from "../../rag/config.ts";
import { renderRetrievedContext, retrieveProjectContext } from "../../rag/retrieval-service.ts";
import type { ProjectDocumentApiRouteDeps } from "./types.ts";

export const defaultProjectDocumentApiRouteDeps: ProjectDocumentApiRouteDeps = {
  getProjectById: async (projectId) => {
    const repository = await import("../../../db/repositories/project-repository.ts");
    return repository.getProjectById(projectId);
  },
  getProjectDocumentById: async (input) => {
    const repository = await import("../../../db/repositories/project-document-repository.ts");
    return repository.getProjectDocumentById(input);
  },
  listProjectDocuments: async (input) => {
    const repository = await import("../../../db/repositories/project-document-repository.ts");
    return repository.listProjectDocuments(input);
  },
  ingestProjectDocument,
  deindexProjectDocument,
  retrieveProjectContext,
  renderRetrievedContext,
  ragConfig,
};
