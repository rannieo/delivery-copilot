import { proxyMastraRequest } from "@/lib/mastra-api";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    projectId: string;
    documentId: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { projectId, documentId } = await context.params;

  return proxyMastraRequest(
    `/projects/${encodeURIComponent(projectId)}/documents/${encodeURIComponent(documentId)}`,
    { method: "DELETE" },
  );
}

