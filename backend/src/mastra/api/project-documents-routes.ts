// These routes use route-local shared-secret auth. `requiresAuth` remains false
// because global Mastra auth is not configured for this frontend API surface.

import { registerApiRoute } from "@mastra/core/server";
import {
  createProjectDocumentHandler,
  deleteProjectDocumentHandler,
  listProjectDocumentsHandler,
  searchProjectContextHandler,
} from "./project-documents/handlers.ts";
import {
  PROJECT_DOCUMENT_API_TOKEN_HEADER,
  type ProjectDocumentRouteContext,
} from "./project-documents/http.ts";
import { defaultProjectDocumentApiRouteDeps } from "./project-documents/deps.ts";
import type { ProjectDocumentApiRouteDeps } from "./project-documents/types.ts";

export type { ProjectDocumentApiRouteDeps } from "./project-documents/types.ts";

export type ProjectDocumentApiRouteAuth = {
  token?: string;
};

function resolveProjectDocumentApiToken(auth?: ProjectDocumentApiRouteAuth): string | undefined {
  if (auth && "token" in auth) {
    return auth.token;
  }
  return process.env.PROJECT_DOCUMENT_API_TOKEN;
}

function withProjectDocumentApiAuth(
  auth: ProjectDocumentApiRouteAuth | undefined,
  handler: (c: ProjectDocumentRouteContext) => Promise<Response>,
) {
  return async (c: ProjectDocumentRouteContext): Promise<Response> => {
    const configuredToken = resolveProjectDocumentApiToken(auth);
    if (!configuredToken) {
      return c.json({ error: "Project document API token is not configured" }, 503);
    }

    if (c.req.header(PROJECT_DOCUMENT_API_TOKEN_HEADER) !== configuredToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    return handler(c);
  };
}

export function createProjectDocumentApiRoutes(
  deps: ProjectDocumentApiRouteDeps,
  auth?: ProjectDocumentApiRouteAuth,
) {
  return [
    registerApiRoute("/projects/:projectId/documents", {
      method: "GET",
      requiresAuth: false,
      handler: withProjectDocumentApiAuth(auth, async (c) => listProjectDocumentsHandler(deps, c)),
    }),

    registerApiRoute("/projects/:projectId/documents", {
      method: "POST",
      requiresAuth: false,
      handler: withProjectDocumentApiAuth(auth, async (c) => createProjectDocumentHandler(deps, c)),
    }),

    registerApiRoute("/projects/:projectId/documents/:documentId", {
      method: "DELETE",
      requiresAuth: false,
      handler: withProjectDocumentApiAuth(auth, async (c) => deleteProjectDocumentHandler(deps, c)),
    }),

    registerApiRoute("/projects/:projectId/context/search", {
      method: "POST",
      requiresAuth: false,
      handler: withProjectDocumentApiAuth(auth, async (c) => searchProjectContextHandler(deps, c)),
    }),
  ];
}

export const projectDocumentApiRoutes = createProjectDocumentApiRoutes(
  defaultProjectDocumentApiRouteDeps,
);
