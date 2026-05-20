import { createTool } from "@mastra/core/tools";
import { z } from 'zod'

export const generateMarkdownPlanTool = createTool({
  id: "generate-markdown-plan",
  description:
    "Combines agent outputs into one final technical delivery plan markdown document.",

  inputSchema: z.object({
    projectId: z.string(),
    title: z.string().optional(),
    sections: z.array(
      z.object({
        heading: z.string(),
        content: z.string(),
      }),
    ),
  }),

  outputSchema: z.object({
    projectId: z.string(),
    title: z.string().optional(),
    markdown: z.string(),
    includedSections: z.array(z.string()),
  }),

  execute: async (inputData) => {
    const title = inputData.title ?? "Technical Delivery Plan";
    const markdown = [
      `# ${title}`,
      "",
      ...inputData.sections.flatMap((section) => [
        `## ${section?.heading}`,
        "",
        section?.content,
        "",
      ]),
    ].join("\n");

    return {
      projectId: inputData.projectId,
      title: inputData?.title,
      markdown,
      includedSections: inputData.sections.map((section) => section?.heading),
    };
  },
});