import { registerApiRoute } from "@mastra/core/server";
import { z } from "zod";
import { getProjectById } from "../../db/repositories/project-repository";
import {
  getProjectDocumentById,
  listProjectDocuments,
} from "../../db/repositories/project-document-repository.ts";
import { ingestProjectDocument } from "../rag/document-service.ts";
import { ProjectDocumentSourceTypeSchema, ragConfig } from "../rag/config.ts";
import { renderRetrievedContext, retrieveProjectContext } from "../rag/retrieval-service.ts";

const CreateProjectDocumentSchema = z.object({
  sourceName: z.string().min(1).max(200),
  sourceType: ProjectDocumentSourceTypeSchema.default("other"),
  content: z.string().min(1),
});

const SearchProjectContextSchema = z.object({
  query: z.string().min(1),
  topK: z.number().int().min(1).max(20).optional(),
  minScore: z.number().min(0).max(1).optional(),
});

function flattenZodError(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`).join("; ");
}

async function readJsonBody(c: { req: { json: () => Promise<unknown> } }): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

export const projectDocumentApiRoutes = [
  registerApiRoute("/projects/:projectId/documents", {
    method: "GET",
    requiresAuth: false,
    handler: async (c) => {
      const projectId = c.req.param("projectId");
      const project = await getProjectById(projectId);

      if (!project) {
        return c.json({ error: "Project not found" }, 404);
      }

      const documents = await listProjectDocuments({ projectId });
      return c.json({ documents });
    },
  }),

  registerApiRoute("/projects/:projectId/documents", {
    method: "POST",
    requiresAuth: false,
    handler: async (c) => {
      const projectId = c.req.param("projectId");
      const project = await getProjectById(projectId);

      if (!project) {
        return c.json({ error: "Project not found" }, 404);
      }

      const parsed = CreateProjectDocumentSchema.safeParse(await readJsonBody(c));
      if (!parsed.success) {
        return c.json({ error: flattenZodError(parsed.error) }, 400);
      }

      const document = await ingestProjectDocument({
        projectId,
        sourceName: parsed.data.sourceName,
        sourceType: parsed.data.sourceType,
        content: parsed.data.content,
      });

      const storedDocument = await getProjectDocumentById({ documentId: document.id });
      return c.json({ document: storedDocument ?? document }, 201);
    },
  }),

  registerApiRoute("/projects/:projectId/context/search", {
    method: "POST",
    requiresAuth: false,
    handler: async (c) => {
      const projectId = c.req.param("projectId");
      const project = await getProjectById(projectId);

      if (!project) {
        return c.json({ error: "Project not found" }, 404);
      }

      const parsed = SearchProjectContextSchema.safeParse(await readJsonBody(c));
      if (!parsed.success) {
        return c.json({ error: flattenZodError(parsed.error) }, 400);
      }

      const chunks = await retrieveProjectContext({
        projectId,
        query: parsed.data.query,
        topK: parsed.data.topK,
        minScore: parsed.data.minScore,
      });

      return c.json({
        chunks,
        context: renderRetrievedContext(chunks),
        config: {
          enabled: ragConfig.enabled,
          indexName: ragConfig.indexName,
          topK: parsed.data.topK ?? ragConfig.topK,
          minScore: parsed.data.minScore ?? ragConfig.minScore,
        },
      });
    },
  }),
];
