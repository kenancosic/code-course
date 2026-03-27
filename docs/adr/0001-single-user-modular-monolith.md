# ADR 0001: Keep MythicCode As A Single-User Modular Monolith

## Status

Accepted

## Context

- MythicCode currently ships as one React frontend and one FastAPI backend in the same repo.
- The application is local-first and single-user for this milestone.
- The main risk is contract drift between frontend hooks and types, backend responses, and markdown docs.
- The project does not currently have operational pressure that justifies service decomposition.
- Delivery speed and clarity matter more than theoretical scalability right now.

## Decision

Keep MythicCode as a single-user modular monolith built from:

- React route pages and feature hooks on the frontend
- FastAPI routers, services, models, and schemas on the backend
- SQLite for persistence

Adopt these boundaries:

- Frontend flow: route page -> feature hook -> `/api` endpoint
- Backend flow: router -> service -> model or LLM integration
- Shared progression logic lives in one backend domain module
- Public contract documentation lives in `docs/api.md`

Do not introduce microservices, background workers, or a separate frontend/backend repo for this milestone.

## Consequences

- The codebase stays easy to run locally and reason about end-to-end.
- Contract changes can be implemented in one pass across UI, API, and tests.
- Operational complexity stays low.
- We accept that some modules may continue to grow inside the monolith and must be kept disciplined with clear boundaries.

## Alternatives Considered

### Split frontend and backend into separate repos

Rejected because the current problem is not deployment independence. It would increase coordination overhead without solving contract drift.

### Move course generation or practice into separate services

Rejected because the app does not yet need distributed infrastructure, queueing, or independent scaling.

### Keep parallel frontend client/type layers for compatibility

Rejected because the duplicated layers were a direct cause of type and contract drift.

## Follow-up

- Keep frontend data access centralized in `src/hooks`
- Keep backend business rules out of routers
- Expand contract tests before introducing larger features
- Revisit this ADR only if the app adds multi-user auth, long-running background work, or deployment constraints that the monolith cannot absorb cleanly
