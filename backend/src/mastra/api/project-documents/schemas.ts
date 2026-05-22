import { z } from "zod";
import { ProjectDocumentSourceTypeSchema } from "../../rag/config.ts";

export const CreateProjectDocumentSchema = z.object({
  sourceName: z.string().min(1).max(200),
  sourceType: ProjectDocumentSourceTypeSchema.default("other"),
  content: z.string().min(1),
});

export const SearchProjectContextSchema = z.object({
  query: z.string().min(1),
  topK: z.number().int().min(1).max(20).optional(),
  minScore: z.number().min(0).max(1).optional(),
});
