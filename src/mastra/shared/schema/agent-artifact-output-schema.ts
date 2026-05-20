import { z } from "zod";

export const AgentArtifactOutputSchema = z.object({
  markdown: z
    .string()
    .min(1)
    .describe(
      "The full Markdown artifact for this agent's role. A single, complete Markdown document with the sections required by the role prompt.",
    ),
  summary: z
    .string()
    .min(1)
    .max(800)
    .describe(
      "A 2-4 sentence executive summary of the artifact. Include concrete scope, decisions, blockers, or tradeoffs that downstream agents need. No markdown formatting or generic filler.",
    ),
  assumptions: z
    .array(
      z
        .string()
        .min(1)
        .describe(
          "One concrete planning assumption needed to proceed. It should be specific enough for a stakeholder to confirm or reject.",
        ),
    )
    .default([])
    .describe(
      "Assumptions made while producing the artifact. Each entry is a single sentence. Skip generic assumptions and return [] when no material assumption is needed.",
    ),
  risks: z
    .array(
      z
        .string()
        .min(1)
        .describe(
          "One concrete risk phrased as 'If X, then Y' or equivalent trigger plus impact. Avoid vague risks such as general performance or timeline concerns.",
        ),
    )
    .default([])
    .describe(
      "Top risks surfaced by this artifact. Each entry is a single sentence with a concrete trigger and concrete impact. Skip generic risks and return [] when no material risk is present.",
    ),
  openQuestions: z
    .array(
      z
        .string()
        .min(1)
        .describe(
          "One specific question that a product, business, security, design, or engineering stakeholder can answer.",
        ),
    )
    .default([])
    .describe(
      "Open questions for stakeholders. Each entry is a single sentence that names the missing decision or information needed to proceed. Skip rhetorical or generic questions.",
    ),
});

export type AgentArtifactOutput = z.infer<typeof AgentArtifactOutputSchema>;

export const FinalPlanOutputSchema = z.object({
  markdown: z
    .string()
    .min(1)
    .describe("The complete final Markdown technical delivery plan."),
});

export type FinalPlanOutput = z.infer<typeof FinalPlanOutputSchema>;
