# AGENTS.md

You are a TypeScript developer experienced with the Mastra framework. You build AI agents, tools, workflows, and scorers. You follow strict TypeScript practices and always consult up-to-date Mastra documentation before making changes.


## CRITICAL: Load `mastra` skill

**BEFORE doing ANYTHING with Mastra, load the `mastra` skill FIRST.** Never rely on cached knowledge as Mastra's APIs change frequently between versions. Use the skill to read up-to-date documentation from `backend/node_modules`.

## Project Overview

This is a **Mastra** project written in TypeScript. Mastra is a framework for building AI-powered applications and agents with a modern TypeScript stack. The Node.js runtime is `>=22.13.0`.

## Commands

```bash
make dev # Start backend and frontend dev servers
make dev-test # Run local dev verification
pnpm --dir backend dev # Start Mastra Studio at localhost:4111 (long-running, use a separate terminal)
pnpm --dir backend build # Build a production-ready server
pnpm --dir frontend dev # Start the Next.js demo at localhost:3000 (long-running, use a separate terminal)
pnpm --dir frontend build # Build the demo frontend
pnpm --dir frontend typecheck # Type-check the frontend without emitting
```

This project uses **pnpm** with separate backend and frontend lockfiles. Do not run `npm install` — it will create parallel `package-lock.json` files and break the lockfile contract.

## Project Structure

| Folder                 | Description                                                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/src/mastra`           | Entry point for all Mastra-related code and configuration.                                                                               |
| `backend/src/mastra/agents`    | Define and configure your agents - their behavior, goals, and tools.                                                                     |
| `backend/src/mastra/workflows` | Define multi-step workflows that orchestrate agents and tools together.                                                                  |
| `backend/src/mastra/tools`     | Create reusable tools that your agents can call                                                                                          |
| `backend/src/mastra/mcp`       | (Optional) Implement custom MCP servers to share your tools with external agents                                                         |
| `backend/src/mastra/scorers`   | (Optional) Define scorers for evaluating agent performance over time                                                                     |
| `backend/src/mastra/public`    | (Optional) Contents are copied into the `.build/output` directory during the build process, making them available for serving at runtime |
| `frontend/src/app`             | Next.js App Router pages and route handlers. Browser-facing routes live under `app/`; server-side proxies under `app/api/`.              |
| `frontend/src/app/api`         | Server-side route handlers that proxy to the Mastra backend. Inject `PROJECT_DOCUMENT_API_TOKEN` here; never expose it to the browser.   |
| `frontend/src/components`      | React components. `components/demo/` holds the demo workbench UI; `components/ui/` holds shadcn/ui primitives.                            |
| `frontend/src/lib`             | Shared client helpers, types, and the `mastra-api` proxy utility.                                                                         |

### Top-level files

Top-level files define how your Mastra project is configured, built, and connected to its environment.

| File                  | Description                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `backend/src/mastra/index.ts` | Central entry point where you configure and initialize Mastra.                                                    |
| `backend/.env.example`        | Backend environment template. Copy to `backend/.env` and add secret [model provider](/models) keys. |
| `backend/package.json`        | Backend project metadata, dependencies, and available npm scripts.                                                |
| `backend/tsconfig.json`       | Backend TypeScript options such as path aliases, compiler settings, and build output.                          |
| `frontend/.env.example`       | Frontend environment template. Copy to `frontend/.env.local`. |
| `Makefile`                    | Root shortcuts for local development and verification. |

## Frontend

The `frontend/` app is a Next.js 16 (App Router) demo using React 19, Tailwind, shadcn/ui, and `next-themes`. It is intentionally thin — every backend call goes through a server-side route handler under `frontend/src/app/api/*` that injects `PROJECT_DOCUMENT_API_TOKEN` and proxies to `MASTRA_API_BASE_URL`.

### Always do (frontend)

- Add a new server-side route handler in `frontend/src/app/api/` whenever you need to call a new backend route — never call the backend directly from the browser.
- Keep `PROJECT_DOCUMENT_API_TOKEN` server-side. It must never appear in client components, `"use client"` files, or `NEXT_PUBLIC_*` env vars.
- Use shadcn/ui primitives from `frontend/src/components/ui/` for new UI. Reach for the existing primitive before adding a new dependency.
- Run `pnpm --dir frontend typecheck` and `pnpm --dir frontend build` after non-trivial frontend changes.

### Never do (frontend)

- Never expose `MASTRA_API_BASE_URL` or `PROJECT_DOCUMENT_API_TOKEN` to the browser.
- Never call the Mastra backend directly from a client component — go through a server route handler.
- Never add a sibling `package-lock.json` to `frontend/`; the project uses pnpm.

## Boundaries

### Always do

- Load the `mastra` skill before any Mastra-related work
- Register new agents, tools, workflows, and scorers in `backend/src/mastra/index.ts`
- Use schemas for tool inputs and outputs
- Run `make dev-test` for local verification while developing
- Run `pnpm --dir backend build` to verify backend changes compile

### Never do

- Never commit `.env` files or secrets
- Never modify `node_modules` or Mastra's database files directly
- Never hardcode API keys (always use environment variables)
## Resources

- [Mastra Documentation](https://mastra.ai/llms.txt)
- [Mastra .well-known skills discovery](https://mastra.ai/.well-known/skills/index.json)
