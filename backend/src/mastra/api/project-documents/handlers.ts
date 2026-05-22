import type { ProjectDocumentApiRouteDeps } from "./types.ts";
import type { ProjectDocumentRouteContext } from "./http.ts";
import { flattenZodError, readJsonBody } from "./http.ts";
import { CreateProjectDocumentSchema, SearchProjectContextSchema } from "./schemas.ts";

function stringifyError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown document indexing error";
}

export async function listProjectDocumentsHandler(
  deps: ProjectDocumentApiRouteDeps,
  c: ProjectDocumentRouteContext,
): Promise<Response> {
  const projectId = c.req.param("projectId");
  const project = await deps.getProjectById(projectId);

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  const documents = await deps.listProjectDocuments({ projectId });
  return c.json({ documents });
}

export async function createProjectDocumentHandler(
  deps: ProjectDocumentApiRouteDeps,
  c: ProjectDocumentRouteContext,
): Promise<Response> {
  const projectId = c.req.param("projectId");
  const project = await deps.getProjectById(projectId);

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  const parsed = CreateProjectDocumentSchema.safeParse(await readJsonBody(c));
  if (!parsed.success) {
    return c.json({ error: flattenZodError(parsed.error) }, 400);
  }

  let document;
  try {
    document = await deps.ingestProjectDocument({
      projectId,
      sourceName: parsed.data.sourceName,
      sourceType: parsed.data.sourceType,
      content: parsed.data.content,
    });
  } catch (error) {
    const message = stringifyError(error);
    if (message === "Project RAG is disabled") {
      return c.json(
        {
          error:
            "Project RAG is disabled. Configure RAG_EMBEDDING_MODEL and set RAG_ENABLED=true before indexing documents.",
        },
        503,
      );
    }

    return c.json({ error: `Document indexing failed: ${message}` }, 500);
  }

  const storedDocument = await deps.getProjectDocumentById({ documentId: document.id });
  return c.json({ document: storedDocument ?? document }, 201);
}

export async function deleteProjectDocumentHandler(
  deps: ProjectDocumentApiRouteDeps,
  c: ProjectDocumentRouteContext,
): Promise<Response> {
  const projectId = c.req.param("projectId");
  const documentId = c.req.param("documentId");

  const project = await deps.getProjectById(projectId);
  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  const document = await deps.getProjectDocumentById({ documentId });
  if (!document || document.projectId !== projectId) {
    return c.json({ error: "Document not found" }, 404);
  }

  await deps.deindexProjectDocument({ documentId });
  return c.body(null, 204);
}

export async function searchProjectContextHandler(
  deps: ProjectDocumentApiRouteDeps,
  c: ProjectDocumentRouteContext,
): Promise<Response> {
  const projectId = c.req.param("projectId");
  const project = await deps.getProjectById(projectId);

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  const parsed = SearchProjectContextSchema.safeParse(await readJsonBody(c));
  if (!parsed.success) {
    return c.json({ error: flattenZodError(parsed.error) }, 400);
  }

  const chunks = await deps.retrieveProjectContext({
    projectId,
    query: parsed.data.query,
    topK: parsed.data.topK,
    minScore: parsed.data.minScore,
  });

  return c.json({
    chunks,
    context: deps.renderRetrievedContext(chunks),
    config: {
      enabled: deps.ragConfig.enabled,
      indexName: deps.ragConfig.indexName,
      topK: parsed.data.topK ?? deps.ragConfig.topK,
      minScore: parsed.data.minScore ?? deps.ragConfig.minScore,
    },
  });
}
