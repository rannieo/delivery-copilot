import assert from "node:assert/strict";
import { test } from "node:test";
import { createDemoWorkflowApiRoutes } from "../../src/mastra/api/demo-workflow-routes.ts";

function getRunRoute() {
  const route = createDemoWorkflowApiRoutes({ token: "test-token" }).find(
    (candidate) => candidate.method === "POST" && candidate.path === "/demo/workflow/run",
  );

  assert.ok(route && "handler" in route && route.handler, "POST /demo/workflow/run route exists");
  return route as unknown as { handler: (context: ReturnType<typeof createContext>) => Promise<Response> };
}

function getRunStateRoute() {
  const route = createDemoWorkflowApiRoutes({ token: "test-token" }).find(
    (candidate) => candidate.method === "GET" && candidate.path === "/demo/workflow/run/:runId",
  );

  assert.ok(route && "handler" in route && route.handler, "GET /demo/workflow/run/:runId route exists");
  return route as unknown as { handler: (context: ReturnType<typeof createContext>) => Promise<Response> };
}

function createContext(input: {
  body?: unknown;
  invalidJson?: boolean;
  token?: string;
  workflowResult?: unknown;
  runId?: string;
  workflowState?: unknown;
  startError?: Error;
  routeParams?: Record<string, string>;
}) {
  const startedWith: unknown[] = [];
  const workflow = {
    createRun: async () => ({
      startAsync: async (args: unknown) => {
        startedWith.push(args);
        if (input.startError) {
          throw input.startError;
        }
        return { runId: input.runId ?? "run-123" };
      },
    }),
    getWorkflowRunById: async (runId: string) => {
      startedWith.push({ getWorkflowRunById: runId });
      return input.workflowState ?? null;
    },
  };

  return {
    startedWith,
    routeParams: input.routeParams ?? {},
    req: {
      param: (name: string) => input.routeParams?.[name] ?? "",
      header: (name: string) =>
        name.toLowerCase() === "x-delivery-copilot-token"
          ? (input.token ?? "test-token")
          : undefined,
      json: async () => {
        if (input.invalidJson) {
          throw new Error("invalid json");
        }
        return input.body;
      },
    },
    get: (name: string) => {
      if (name === "mastra") {
        return {
          getWorkflow: (workflowName: string) => {
            assert.equal(workflowName, "deliveryCopilotWorkflow");
            return workflow;
          },
        };
      }
      return undefined;
    },
    json: (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
  };
}

async function readJson(response: Response): Promise<unknown> {
  return response.json();
}

test("POST /demo/workflow/run rejects missing shared secret token", async () => {
  const route = getRunRoute();
  const response = await route.handler(
    createContext({
      token: "",
      body: {
        projectName: "QueueLite",
        rawInput: "Customers scan QR codes to join a queue.",
      },
    }),
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await readJson(response), { error: "Unauthorized" });
});

test("POST /demo/workflow/run validates workflow input", async () => {
  const route = getRunRoute();
  const response = await route.handler(createContext({ body: { projectName: "" } }));

  assert.equal(response.status, 400);
  assert.match((await readJson(response) as { error: string }).error, /projectName/);
});

test("POST /demo/workflow/run starts the registered workflow and returns the result", async () => {
  const route = getRunRoute();
  const context = createContext({
    body: {
      projectName: "QueueLite",
      projectDescription: "Small retail queue demo",
      rawInput: "Customers scan QR codes to join a queue.",
      planTitle: "QueueLite Delivery Plan",
      useRag: false,
    },
    runId: "run-abc",
  });

  const response = await route.handler(context);

  assert.equal(response.status, 202);
  assert.deepEqual(await readJson(response), {
    runId: "run-abc",
    status: "running",
  });
  assert.deepEqual(context.startedWith, [
    {
      inputData: {
        projectName: "QueueLite",
        projectDescription: "Small retail queue demo",
        rawInput: "Customers scan QR codes to join a queue.",
        planTitle: "QueueLite Delivery Plan",
        useRag: false,
      },
    },
  ]);
});

test("GET /demo/workflow/run/:runId returns persisted workflow state", async () => {
  const route = getRunStateRoute();
  const response = await route.handler(
    createContext({
      routeParams: { runId: "run-abc" },
      workflowState: {
        runId: "run-abc",
        workflowName: "delivery-copilot-workflow",
        status: "running",
      },
    }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await readJson(response), {
    state: {
      runId: "run-abc",
      workflowName: "delivery-copilot-workflow",
      status: "running",
    },
  });
});

test("POST /demo/workflow/run normalizes workflow errors", async () => {
  const route = getRunRoute();
  const response = await route.handler(
    createContext({
      body: {
        projectName: "QueueLite",
        rawInput: "Customers scan QR codes to join a queue.",
      },
      startError: new Error("model unavailable"),
    }),
  );

  assert.equal(response.status, 500);
  assert.deepEqual(await readJson(response), { error: "model unavailable" });
});
