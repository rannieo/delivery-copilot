import { createTool } from "@mastra/core/tools";
import { z } from 'zod'

export const securityChecklistTool = createTool({
  id: "security-checklist",
  description:
    "Creates a security checklist based on detected project features and risks.",

  inputSchema: z.object({
    projectId: z.string(),
    hasAuth: z.boolean().default(false),
    hasFileUpload: z.boolean().default(false),
    hasAI: z.boolean().default(false),
    hasExternalIntegrations: z.boolean().default(false),
    handlesSensitiveData: z.boolean().default(false),
  }),

  outputSchema: z.object({
    projectId: z.string(),
    checklist: z.array(
      z.object({
        category: z.string(),
        risk: z.string(),
        control: z.string(),
        priority: z.enum(["critical", "high", "medium", "low"]),
        testRequired: z.boolean(),
      }),
    ),
  }),

  execute: async (inputData) => {
    const checklist = [];

    if (inputData.hasAuth) {
      checklist.push({
        category: "Authentication",
        risk: "Weak session or token handling",
        control:
          "Use secure token expiration, refresh strategy, revocation, and protected routes.",
        priority: "high" as const,
        testRequired: true,
      });

      checklist.push({
        category: "Authorization",
        risk: "Users may access resources owned by other users or projects",
        control:
          "Apply object-level authorization checks on every project, document, and plan access.",
        priority: "critical" as const,
        testRequired: true,
      });
    }

    if (inputData.hasFileUpload) {
      checklist.push({
        category: "File Upload",
        risk: "Malicious or oversized files may be uploaded",
        control:
          "Enforce file type allowlist, file size limit, private storage, and malware scanning later.",
        priority: "high" as const,
        testRequired: true,
      });
    }

    if (inputData.hasAI) {
      checklist.push({
        category: "AI / RAG Security",
        risk: "Prompt injection or malicious document content may influence agent output",
        control:
          "Treat uploaded content as untrusted, isolate project retrieval, log retrieved sources, and avoid unsafe tool execution.",
        priority: "high" as const,
        testRequired: true,
      });
    }

    if (inputData.hasExternalIntegrations) {
      checklist.push({
        category: "Integrations",
        risk: "Third-party secrets or scopes may be overexposed",
        control:
          "Use least-privilege API scopes, secret manager, webhook validation, and retry limits.",
        priority: "medium" as const,
        testRequired: true,
      });
    }

    if (inputData.handlesSensitiveData) {
      checklist.push({
        category: "Sensitive Data",
        risk: "Sensitive data may leak through logs, exports, or AI responses",
        control:
          "Apply data minimization, masking, encryption at rest/in transit, and logging restrictions.",
        priority: "critical" as const,
        testRequired: true,
      });
    }

    return {
      projectId: inputData.projectId,
      checklist,
    };
  },
});