# Delivery Copilot

A multi-agent [Mastra](https://mastra.ai/) application that turns a raw product brief or PRD into a complete technical delivery plan. Seven specialist agents collaborate in sequence — product analysis, solution architecture, security review, backend design, QA strategy, delivery planning, and a final aggregation pass — to produce a single Markdown plan ready for engineering kickoff.

## How it works

Given `{ projectId, rawInput, planTitle? }`, the `deliveryCopilotWorkflow` runs the input through the pipeline below. Each step writes a structured `DeliveryArtifact` (summary, assumptions, risks, open questions, Markdown body) into the shared workflow context, and the final aggregator stitches the artifacts into a unified delivery document.

```
rawInput
  → Product Analyst       (clarifies scope, user stories, acceptance criteria)
  → Solution Architect    (system design, components, data flow)
  → Security Manager      (threat model, controls, compliance checks)
  → Backend Lead          (API/data layer, implementation breakdown)
  → QA Engineer           (test strategy, coverage, automation plan)
  → Delivery Manager      (milestones, sequencing, risks)
  → Final Plan Aggregator (consolidates everything into finalMarkdown)
```

## Project structure

| Path                            | Purpose                                                                 |
| ------------------------------- | ----------------------------------------------------------------------- |
| `src/mastra/index.ts`           | Mastra entry point — registers agents, workflow, scorers, storage, observability |
| `src/mastra/agents/`            | Seven specialist agents that make up the pipeline                       |
| `src/mastra/workflows/`         | `deliveryCopilotWorkflow` and its per-agent step wrappers in `steps/`   |
| `src/mastra/tools/`             | Reusable tools (parse input, save artifacts, generate/export Markdown, ticket drafts, security checklist, project context) |
| `src/mastra/shared/`            | Cross-cutting code — Zod schemas, prompts, shared rules, workspace paths |

## Requirements

- Node.js `>=22.13.0`
- A configured model provider key (see `.env.example`)

## Getting started

```shell
pnpm install
cp .env.example .env   # add your model provider key(s)
pnpm dev
```

Open [http://localhost:4111](http://localhost:4111) to use [Mastra Studio](https://mastra.ai/docs/studio/overview) — an interactive UI for invoking the `deliveryCopilotWorkflow`, inspecting per-agent artifacts, and reviewing traces.

## Scripts

| Command          | What it does                                |
| ---------------- | ------------------------------------------- |
| `pnpm dev`       | Start Mastra Studio at `localhost:4111`     |
| `pnpm build`     | Build a production-ready server bundle      |
| `pnpm start`     | Run the built server                        |
| `pnpm db:generate` | Generate a Drizzle migration from `src/db/schema.ts` |
| `pnpm db:migrate`  | Apply pending migrations to `DATABASE_URL`           |
| `pnpm db:studio`   | Open Drizzle Studio against `DATABASE_URL`           |

## Storage & observability

- **Storage**: `MastraCompositeStore` with `LibSQLStore` (`mastra.db`) as the default and `DuckDBStore` for the observability domain.
- **Observability**: `MastraStorageExporter` persists spans locally; `MastraPlatformExporter` ships them to the Mastra Platform when `MASTRA_PLATFORM_ACCESS_TOKEN` is set. A `SensitiveDataFilter` redacts secrets before export.

## Learn more

- [Mastra documentation](https://mastra.ai/docs/)
- [Agents overview](https://mastra.ai/docs/agents/overview) · [Workflows](https://mastra.ai/docs/workflows/overview) · [Tools](https://mastra.ai/docs/agents/using-tools) · [Scorers](https://mastra.ai/docs/evals/overview)
- [Mastra Platform](https://projects.mastra.ai) for hosted Studio and production deployment
