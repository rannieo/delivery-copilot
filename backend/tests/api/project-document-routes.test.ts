import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createProjectDocumentApiRoutes,
  type ProjectDocumentApiRouteDeps,
} from "../../src/mastra/api/project-documents-routes.ts";

type Method = "GET" | "POST" | "DELETE";

function createDeps(overrides: Partial<ProjectDocumentApiRouteDeps> = {}): ProjectDocumentApiRouteDeps {
  return {
    getProjectById: async (projectId: string) => ({
      id: projectId,
      name: "QueueLite",
      description: null,
      createdAt: new Date("2026-05-21T00:00:00Z"),
      updatedAt: new Date("2026-05-21T00:00:00Z"),
    }),
    listProjectDocuments: async ({ projectId }: { projectId: string }) => [
      {
        id: "doc-1",
        projectId,
        sourceName: "QueueLite PRD",
        sourceType: "prd",
        contentHash: "hash",
        status: "indexed",
        chunkCount: 2,
        errorMessage: null,
        createdAt: new Date("2026-05-21T00:00:00Z"),
        updatedAt: new Date("2026-05-21T00:00:00Z"),
      },
    ],
    getProjectDocumentById: async ({ documentId }: { documentId: string }) => ({
      id: documentId,
      projectId: "project-1",
      sourceName: "QueueLite PRD",
      sourceType: "prd",
      contentHash: "hash",
      status: "indexed",
      chunkCount: 2,
      errorMessage: null,
      createdAt: new Date("2026-05-21T00:00:00Z"),
      updatedAt: new Date("2026-05-21T00:00:00Z"),
    }),
    ingestProjectDocument: async (input) => ({
      id: "doc-created",
      projectId: input.projectId,
      sourceName: input.sourceName,
      sourceType: input.sourceType,
      contentHash: "created-hash",
      status: "indexed",
      chunkCount: 1,
      errorMessage: null,
      createdAt: new Date("2026-05-21T00:00:00Z"),
      updatedAt: new Date("2026-05-21T00:00:00Z"),
    }),
    deindexProjectDocument: async () => undefined,
    retrieveProjectContext: async () => [
      {
        text: "Customers scan a QR code to join the queue.",
        sourceName: "QueueLite PRD",
        sourceType: "prd",
        score: 0.91,
        documentId: "doc-1",
        chunkIndex: 0,
      },
    ],
    renderRetrievedContext: (chunks) => `rendered:${chunks.length}`,
    ragConfig: {
      enabled: true,
      indexName: "project_documents",
      embeddingModel: "openai/text-embedding-3-small",
      embeddingDimension: 1536,
      chunkSize: 800,
      chunkOverlap: 120,
      topK: 6,
      minScore: 0.55,
    },
    ...overrides,
  } as ProjectDocumentApiRouteDeps;
}

function getRoute(
  deps: ProjectDocumentApiRouteDeps,
  method: Method,
  path: string,
): { handler: (context: ReturnType<typeof createContext>) => Promise<Response> } {
  const route = createProjectDocumentApiRoutes(deps, { token: "test-token" }).find(
    (candidate) => candidate.method === method && candidate.path === path,
  );

  assert.ok(route && "handler" in route && route.handler, `${method} ${path} route exists`);
  return route as unknown as { handler: (context: ReturnType<typeof createContext>) => Promise<Response> };
}

function createContext(input: {
  params?: Record<string, string>;
  body?: unknown;
  invalidJson?: boolean;
  headers?: Record<string, string>;
}) {
  const headers = new Map(
    Object.entries({
      "x-delivery-copilot-token": "test-token",
      ...input.headers,
    }).map(([key, value]) => [key.toLowerCase(), value]),
  );

  return {
    req: {
      param: (name: string) => input.params?.[name] ?? "",
      header: (name: string) => headers.get(name.toLowerCase()),
      json: async () => {
        if (input.invalidJson) {
          throw new Error("invalid json");
        }
        return input.body;
      },
    },
    json: (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
    body: (body: BodyInit | null, status = 200) => new Response(body, { status }),
  };
}

async function readJson(response: Response): Promise<unknown> {
  return response.json();
}

test("project document routes reject missing shared secret token", async () => {
  const deps = createDeps();
  const route = getRoute(deps, "GET", "/projects/:projectId/documents");

  const response = await route.handler(
    createContext({
      params: { projectId: "project-1" },
      headers: { "x-delivery-copilot-token": "" },
    }),
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await readJson(response), { error: "Unauthorized" });
});

test("project document routes reject incorrect shared secret token", async () => {
  const deps = createDeps();
  const route = getRoute(deps, "GET", "/projects/:projectId/documents");

  const response = await route.handler(
    createContext({
      params: { projectId: "project-1" },
      headers: { "x-delivery-copilot-token": "wrong-token" },
    }),
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await readJson(response), { error: "Unauthorized" });
});

test("project document routes fail closed when shared secret token is not configured", async () => {
  const deps = createDeps();
  const route = createProjectDocumentApiRoutes(deps, { token: undefined }).find(
    (candidate) => candidate.method === "GET" && candidate.path === "/projects/:projectId/documents",
  );

  assert.ok(route && "handler" in route && route.handler);
  const response = await (route as unknown as { handler: (context: ReturnType<typeof createContext>) => Promise<Response> })
    .handler(createContext({ params: { projectId: "project-1" } }));

  assert.equal(response.status, 503);
  assert.deepEqual(await readJson(response), {
    error: "Project document API token is not configured",
  });
});

test("GET /projects/:projectId/documents returns indexed documents", async () => {
  const deps = createDeps();
  const route = getRoute(deps, "GET", "/projects/:projectId/documents");

  const response = await route.handler(createContext({ params: { projectId: "project-1" } }));
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    documents: [
      {
        id: "doc-1",
        projectId: "project-1",
        sourceName: "QueueLite PRD",
        sourceType: "prd",
        contentHash: "hash",
        status: "indexed",
        chunkCount: 2,
        errorMessage: null,
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      },
    ],
  });
});

test("GET /projects/:projectId/documents returns 404 for unknown project", async () => {
  const deps = createDeps({ getProjectById: async () => null });
  const route = getRoute(deps, "GET", "/projects/:projectId/documents");

  const response = await route.handler(createContext({ params: { projectId: "missing" } }));

  assert.equal(response.status, 404);
  assert.deepEqual(await readJson(response), { error: "Project not found" });
});

test("POST /projects/:projectId/documents validates and ingests content", async () => {
  let ingested: unknown;
  const deps = createDeps({
    ingestProjectDocument: async (input) => {
      ingested = input;
      return {
        id: "doc-created",
        projectId: input.projectId,
        sourceName: input.sourceName,
        sourceType: input.sourceType,
        contentHash: "created-hash",
        status: "indexed",
        chunkCount: 1,
        errorMessage: null,
        createdAt: new Date("2026-05-21T00:00:00Z"),
        updatedAt: new Date("2026-05-21T00:00:00Z"),
      };
    },
    getProjectDocumentById: async () => null,
  });
  const route = getRoute(deps, "POST", "/projects/:projectId/documents");

  const response = await route.handler(
    createContext({
      params: { projectId: "project-1" },
      body: {
        sourceName: "QueueLite PRD",
        sourceType: "prd",
        content: "# QueueLite\nCustomers scan QR codes.",
      },
    }),
  );
  const body = await readJson(response);

  assert.equal(response.status, 201);
  assert.deepEqual(ingested, {
    projectId: "project-1",
    sourceName: "QueueLite PRD",
    sourceType: "prd",
    content: "# QueueLite\nCustomers scan QR codes.",
  });
  assert.equal((body as { document: { id: string } }).document.id, "doc-created");
});

test("POST /projects/:projectId/documents returns a structured error when RAG is disabled", async () => {
  const deps = createDeps({
    ingestProjectDocument: async () => {
      throw new Error("Project RAG is disabled");
    },
  });
  const route = getRoute(deps, "POST", "/projects/:projectId/documents");

  const response = await route.handler(
    createContext({
      params: { projectId: "project-1" },
      body: {
        sourceName: "QueueLite PRD",
        sourceType: "prd",
        content: "# QueueLite\nCustomers scan QR codes.",
      },
    }),
  );

  assert.equal(response.status, 503);
  assert.deepEqual(await readJson(response), {
    error: "Project RAG is disabled. Configure RAG_EMBEDDING_MODEL and set RAG_ENABLED=true before indexing documents.",
  });
});

test("POST /projects/:projectId/documents rejects invalid JSON body", async () => {
  const deps = createDeps();
  const route = getRoute(deps, "POST", "/projects/:projectId/documents");

  const response = await route.handler(
    createContext({ params: { projectId: "project-1" }, invalidJson: true }),
  );
  const body = await readJson(response);

  assert.equal(response.status, 400);
  assert.match((body as { error: string }).error, /body/);
});

test("DELETE /projects/:projectId/documents/:documentId deindexes document", async () => {
  let deindexedDocumentId: string | undefined;
  const deps = createDeps({
    deindexProjectDocument: async ({ documentId }) => {
      deindexedDocumentId = documentId;
    },
  });
  const route = getRoute(deps, "DELETE", "/projects/:projectId/documents/:documentId");

  const response = await route.handler(
    createContext({ params: { projectId: "project-1", documentId: "doc-1" } }),
  );

  assert.equal(response.status, 204);
  assert.equal(deindexedDocumentId, "doc-1");
});

test("POST /projects/:projectId/context/search returns chunks and rendered context", async () => {
  let searchInput: unknown;
  const deps = createDeps({
    retrieveProjectContext: async (input) => {
      searchInput = input;
      return [
        {
          text: "Customers scan a QR code to join the queue.",
          sourceName: "QueueLite PRD",
          sourceType: "prd",
          score: 0.91,
        },
      ];
    },
  });
  const route = getRoute(deps, "POST", "/projects/:projectId/context/search");

  const response = await route.handler(
    createContext({
      params: { projectId: "project-1" },
      body: { query: "QR join", topK: 3, minScore: 0.7 },
    }),
  );
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assert.deepEqual(searchInput, {
    projectId: "project-1",
    query: "QR join",
    topK: 3,
    minScore: 0.7,
  });
  assert.deepEqual(body, {
    chunks: [
      {
        text: "Customers scan a QR code to join the queue.",
        sourceName: "QueueLite PRD",
        sourceType: "prd",
        score: 0.91,
      },
    ],
    context: "rendered:1",
    config: {
      enabled: true,
      indexName: "project_documents",
      topK: 3,
      minScore: 0.7,
    },
  });
});
