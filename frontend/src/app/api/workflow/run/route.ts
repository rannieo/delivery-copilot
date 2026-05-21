import { proxyMastraRequest } from "@/lib/mastra-api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return proxyMastraRequest("/demo/workflow/run", {
    method: "POST",
    request,
  });
}

