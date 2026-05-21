import type { z } from "zod";

export type ProjectDocumentRouteContext = {
  req: {
    param: (name: string) => string;
    header: (name: string) => string | undefined;
    json: () => Promise<unknown>;
  };
  json: (body: unknown, status?: number) => Response | Promise<Response>;
  body: (body: BodyInit | null, status?: number) => Response | Promise<Response>;
};

export const PROJECT_DOCUMENT_API_TOKEN_HEADER = "x-delivery-copilot-token";

export function flattenZodError(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`).join("; ");
}

export async function readJsonBody(c: ProjectDocumentRouteContext): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}
