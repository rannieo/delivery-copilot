.DEFAULT_GOAL := help

.PHONY: help install dev dev-backend dev-frontend docker-config test typecheck dev-test build

help:
	@echo "Available targets:"
	@echo "  make install       Install backend and frontend dependencies"
	@echo "  make dev           Start backend and frontend dev servers"
	@echo "  make dev-backend   Start Mastra Studio at localhost:4111"
	@echo "  make dev-frontend  Start the Next.js frontend at localhost:3000"
	@echo "  make docker-config Validate docker-compose.yml"
	@echo "  make test          Run backend tests"
	@echo "  make typecheck     Typecheck backend and frontend"
	@echo "  make dev-test      Run local dev verification"
	@echo "  make build         Build backend and frontend"

install:
	pnpm --dir backend install
	pnpm --dir frontend install

dev:
	@trap 'kill $$backend_pid $$frontend_pid 2>/dev/null' INT TERM EXIT; \
	pnpm --dir backend dev & backend_pid=$$!; \
	pnpm --dir frontend dev & frontend_pid=$$!; \
	wait $$backend_pid $$frontend_pid

dev-backend:
	pnpm --dir backend dev

dev-frontend:
	pnpm --dir frontend dev

docker-config:
	docker compose config >/dev/null

test:
	pnpm --dir backend test

typecheck:
	pnpm --dir backend exec tsc --noEmit
	pnpm --dir frontend typecheck

dev-test: docker-config test typecheck

build:
	pnpm --dir backend build
	pnpm --dir frontend build
