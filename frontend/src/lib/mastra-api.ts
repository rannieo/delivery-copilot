import { NextResponse } from "next/server";

const TOKEN_HEADER = "x-delivery-copilot-token";

type ProxyInit = {
  method: "GET" | "POST" | "DELETE";
  request?: Request;
};

function getMastraBaseUrl(): string {
  return (process.env.MASTRA_API_BASE_URL ?? "http://localhost:4111").replace(/\/+$/, "");
}

function getMastraToken(): string | undefined {
  return process.env.PROJECT_DOCUMENT_API_TOKEN;
}

function buildMastraUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getMastraBaseUrl()}${normalizedPath}`;
}

function proxyError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function proxyMastraRequest(path: string, init: ProxyInit): Promise<Response> {
  const token = getMastraToken();
  if (!token) {
    return proxyError("PROJECT_DOCUMENT_API_TOKEN is not configured for the frontend server.", 503);
  }

  const headers = new Headers({
    accept: "application/json",
    [TOKEN_HEADER]: token,
  });

  let body: BodyInit | undefined;
  if (init.request && init.method !== "GET" && init.method !== "DELETE") {
    const contentType = init.request.headers.get("content-type") ?? "application/json";
    const requestBody = await init.request.text();
    if (requestBody.length > 0) {
      headers.set("content-type", contentType);
      body = requestBody;
    }
  }

  try {
    const response = await fetch(buildMastraUrl(path), {
      method: init.method,
      headers,
      body,
      cache: "no-store",
    });

    if (response.status === 204) {
      return new Response(null, { status: 204 });
    }

    return new Response(response.body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Mastra API error";
    return proxyError(`Mastra API request failed: ${message}`, 502);
  }
}
