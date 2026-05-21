import { registerApiRoute } from "@mastra/core/server";
import { DeliveryWorkflowInputSchema } from "../shared/schema/delivery-schema.ts";
import {
  PROJECT_DOCUMENT_API_TOKEN_HEADER,
  flattenZodError,
} from "./project-documents/http.ts";

type DemoWorkflowRouteContext = {
  req: {
    param: (name: string) => string;
    header: (name: string) => string | undefined;
    json: () => Promise<unknown>;
  };
  get: (name: string) => unknown;
  json: (body: unknown, status?: number) => Response | Promise<Response>;
};

export type DemoWorkflowApiRouteAuth = {
  token?: string;
};

function resolveDemoWorkflowApiToken(auth?: DemoWorkflowApiRouteAuth): string | undefined {
  if (auth && "token" in auth) {
    return auth.token;
  }
  return process.env.PROJECT_DOCUMENT_API_TOKEN;
}

async function readJsonBody(c: DemoWorkflowRouteContext): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown workflow error";
}

function withDemoWorkflowAuth(
  auth: DemoWorkflowApiRouteAuth | undefined,
  handler: (c: DemoWorkflowRouteContext) => Promise<Response>,
) {
  return async (c: DemoWorkflowRouteContext): Promise<Response> => {
    const configuredToken = resolveDemoWorkflowApiToken(auth);
    if (!configuredToken) {
      return c.json({ error: "Project document API token is not configured" }, 503);
    }

    if (c.req.header(PROJECT_DOCUMENT_API_TOKEN_HEADER) !== configuredToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    return handler(c);
  };
}

async function runDeliveryWorkflowHandler(c: DemoWorkflowRouteContext): Promise<Response> {
  const parsed = DeliveryWorkflowInputSchema.safeParse(await readJsonBody(c));
  if (!parsed.success) {
    return c.json({ error: flattenZodError(parsed.error) }, 400);
  }

  try {
    const mastra = c.get("mastra") as {
      getWorkflow: (name: "deliveryCopilotWorkflow") => {
        createRun: () => Promise<{
          startAsync: (input: { inputData: typeof parsed.data }) => Promise<{
            runId: string;
          }>;
        }>;
      };
    };
    const workflow = mastra.getWorkflow("deliveryCopilotWorkflow");
    const run = await workflow.createRun();
    const { runId } = await run.startAsync({ inputData: parsed.data });

    return c.json({ runId, status: "running" }, 202);
  } catch (error) {
    return c.json({ error: stringifyError(error) }, 500);
  }
}

async function getDeliveryWorkflowRunHandler(c: DemoWorkflowRouteContext): Promise<Response> {
  const runId = c.req.param("runId");
  if (!runId) {
    return c.json({ error: "runId is required" }, 400);
  }

  try {
    const mastra = c.get("mastra") as {
      getWorkflow: (name: "deliveryCopilotWorkflow") => {
        getWorkflowRunById: (runId: string) => Promise<unknown>;
      };
    };
    const workflow = mastra.getWorkflow("deliveryCopilotWorkflow");
    const state = await workflow.getWorkflowRunById(runId);

    if (!state) {
      return c.json({ error: "Workflow run not found" }, 404);
    }

    return c.json({ state });
  } catch (error) {
    return c.json({ error: stringifyError(error) }, 500);
  }
}

export function createDemoWorkflowApiRoutes(auth?: DemoWorkflowApiRouteAuth) {
  return [
    registerApiRoute("/demo/workflow/run", {
      method: "POST",
      requiresAuth: false,
      handler: withDemoWorkflowAuth(auth, runDeliveryWorkflowHandler),
    }),
    registerApiRoute("/demo/workflow/run/:runId", {
      method: "GET",
      requiresAuth: false,
      handler: withDemoWorkflowAuth(auth, getDeliveryWorkflowRunHandler),
    }),
  ];
}

export const demoWorkflowApiRoutes = createDemoWorkflowApiRoutes();
