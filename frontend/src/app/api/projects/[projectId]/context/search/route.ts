import { proxyMastraRequest } from "@/lib/mastra-api";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { projectId } = await context.params;

  return proxyMastraRequest(`/projects/${encodeURIComponent(projectId)}/context/search`, {
    method: "POST",
    request,
  });
}
