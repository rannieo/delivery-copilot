import { proxyMastraRequest } from "@/lib/mastra-api";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    runId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { runId } = await context.params;

  return proxyMastraRequest(`/demo/workflow/run/${encodeURIComponent(runId)}`, {
    method: "GET",
  });
}
