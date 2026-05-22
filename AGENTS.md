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
| `frontend`             | Next.js demo app that proxies to the Mastra backend.                                                                                      |

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
