// SECURITY: all routes below use requiresAuth: false. Fine for local dev.
// Before exposing this surface to any non-trusted origin, wire real auth
// (e.g., a header check against a server-only secret, or integrate with
// whatever frontend session you adopt).

import { registerApiRoute } from "@mastra/core/server";
import {
  createProjectDocumentHandler,
  deleteProjectDocumentHandler,
  listProjectDocumentsHandler,
  searchProjectContextHandler,
} from "./project-documents/handlers.ts";
import { defaultProjectDocumentApiRouteDeps } from "./project-documents/deps.ts";
import type { ProjectDocumentApiRouteDeps } from "./project-documents/types.ts";

export type { ProjectDocumentApiRouteDeps } from "./project-documents/types.ts";

export function createProjectDocumentApiRoutes(deps: ProjectDocumentApiRouteDeps) {
  return [
    registerApiRoute("/projects/:projectId/documents", {
      method: "GET",
      requiresAuth: false,
      handler: async (c) => listProjectDocumentsHandler(deps, c),
    }),

    registerApiRoute("/projects/:projectId/documents", {
      method: "POST",
      requiresAuth: false,
      handler: async (c) => createProjectDocumentHandler(deps, c),
    }),

    registerApiRoute("/projects/:projectId/documents/:documentId", {
      method: "DELETE",
      requiresAuth: false,
      handler: async (c) => deleteProjectDocumentHandler(deps, c),
    }),

    registerApiRoute("/projects/:projectId/context/search", {
      method: "POST",
      requiresAuth: false,
      handler: async (c) => searchProjectContextHandler(deps, c),
    }),
  ];
}

export const projectDocumentApiRoutes = createProjectDocumentApiRoutes(
  defaultProjectDocumentApiRouteDeps,
);
