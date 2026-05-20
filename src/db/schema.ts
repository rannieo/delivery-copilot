import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const projectDocumentSourceTypes = ["prd", "meeting_notes", "technical_notes", "other"] as const;
export const projectDocumentStatusTypes = ["pending", "indexed", "failed"] as const;

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectDocuments = pgTable(
  "project_documents",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    sourceName: text("source_name").notNull(),
    sourceType: text("source_type", { enum: projectDocumentSourceTypes }).notNull().default("other"),
    contentHash: text("content_hash").notNull(),
    status: text("status", { enum: projectDocumentStatusTypes }).notNull().default("pending"),
    chunkCount: integer("chunk_count").notNull().default(0),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_project_documents_project_id").on(t.projectId),
    index("idx_project_documents_content_hash").on(t.contentHash),
  ],
);

export const projectDocumentChunks = pgTable(
  "project_document_chunks",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => projectDocuments.id, { onDelete: "cascade" }),
    vectorId: text("vector_id").notNull().unique(),
    chunkIndex: integer("chunk_index").notNull(),
    text: text("text").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_project_document_chunks_project_id").on(t.projectId),
    index("idx_project_document_chunks_document_id").on(t.documentId),
  ],
);

export const workflowRuns = pgTable(
  "workflow_runs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    mastraRunId: text("mastra_run_id").notNull().unique(),
    status: text("status", { enum: ["running", "completed", "failed"] })
      .notNull()
      .default("running"),
    inputText: text("input_text").notNull(),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("idx_workflow_runs_project_id").on(t.projectId)],
);

export const agentArtifacts = pgTable(
  "agent_artifacts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    workflowRunId: uuid("workflow_run_id")
      .notNull()
      .references(() => workflowRuns.id, { onDelete: "cascade" }),
    agentName: text("agent_name").notNull(),
    artifactType: text("artifact_type").notNull(),
    markdown: text("markdown").notNull(),
    summary: text("summary").notNull(),
    assumptions: jsonb("assumptions").$type<string[]>().notNull().default([]),
    risks: jsonb("risks").$type<string[]>().notNull().default([]),
    openQuestions: jsonb("open_questions").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_agent_artifacts_project_id").on(t.projectId),
    index("idx_agent_artifacts_workflow_run_id").on(t.workflowRunId),
  ],
);

export const finalPlans = pgTable(
  "final_plans",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    workflowRunId: uuid("workflow_run_id")
      .notNull()
      .references(() => workflowRuns.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    markdown: text("markdown").notNull(),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_final_plans_project_id").on(t.projectId)],
);
