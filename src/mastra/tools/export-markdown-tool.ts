import { createTool } from "@mastra/core/tools";
import { z } from 'zod'

export const exportMarkdownTool = createTool({
  id: "export-markdown",
  description:
    "Prepares a markdown export payload for the final technical delivery plan.",

  inputSchema: z.object({
    projectId: z.string(),
    filename: z.string().default("technical-delivery-plan.md"),
    markdown: z.string(),
  }),

  outputSchema: z.object({
    projectId: z.string(),
    filename: z.string(),
    content: z.string(),
    mimeType: z.literal("text/markdown"),
  }),

  execute: async (inputData) => {
    const safeFilename = inputData.filename?.endsWith(".md")
      ? inputData.filename
      : `${inputData.filename}.md`;

    return {
      projectId: inputData.projectId,
      filename: safeFilename,
      content: inputData.markdown,
      mimeType: "text/markdown" as const,
    };
  },
});