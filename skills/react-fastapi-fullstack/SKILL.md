---
name: react-fastapi-fullstack
description: End-to-end development and maintenance for React frontends and FastAPI backends, including feature implementation, debugging, API integration, data flow design, validation, testing, performance, and deployment-minded refactors. Use when Codex needs to work on a React app, a FastAPI service, or their contract together across files such as components, hooks, routes, schemas, models, services, tests, API clients, or environment/configuration.
---

# React Fastapi Fullstack

## Overview

Build and maintain React and FastAPI applications as one system, not two disconnected codebases. Start by locating the request's impact on UI behavior, API contract, validation, persistence, and tests, then make the smallest coherent change that keeps frontend and backend aligned.

## Workflow

1. Inspect the current stack before editing.
2. Decide whether the task is frontend-only, backend-only, or contract-spanning.
3. Trace the user-facing behavior from entry point to persistence boundary.
4. Change code in vertical slices so request and response shapes stay consistent.
5. Verify behavior with focused tests or lint and type checks on every touched layer.
6. Summarize the contract, risks, and follow-up work in delivery notes.

## Start By Mapping The Slice

For each request, identify:

- User action or triggering event
- React route, page, component tree, and state owner
- API client call and transport format
- FastAPI router, dependency chain, service layer, and data access point
- Validation boundary on both client and server
- Tests that should fail before the fix and pass after it

Prefer reading just enough code to draw the full request path. Do not change a component in isolation if the real issue lives in schema drift, stale API typing, or missing backend validation.

## Choose The Change Shape

### Frontend-heavy work

Use this path when the API contract already exists and the task is mainly UI behavior, rendering, interaction, routing, accessibility, or client-side state.

- Preserve existing app structure and design system patterns.
- Keep state close to the components that own it; lift only when multiple consumers truly need it.
- Derive view state instead of duplicating server state where possible.
- Prefer predictable async flows: loading, success, empty, and error states should all be explicit.
- Add or update component tests for rendering branches and user interactions.

Read [references/frontend-patterns.md](./references/frontend-patterns.md) when touching components, hooks, forms, routing, async data, or client-side performance.

### Backend-heavy work

Use this path when the change is mostly in FastAPI routes, dependencies, services, authentication, data validation, or persistence.

- Keep request parsing, business logic, and persistence separated.
- Use Pydantic models deliberately for inbound and outbound shapes.
- Validate at the API boundary, then operate on trusted data internally.
- Keep route handlers thin; move branching logic into services.
- Return stable status codes and error bodies that the frontend can handle deterministically.
- Add focused API tests for success, validation failure, auth failure, and edge cases.

Read [references/backend-patterns.md](./references/backend-patterns.md) when changing routers, dependencies, models, services, repositories, background tasks, or configuration.

### Contract-spanning work

Use this path when frontend and backend must evolve together: new features, renamed fields, auth changes, pagination, filtering, uploads, websocket events, or error-format changes.

- Establish the contract first: endpoint, method, params, body, response, and failure modes.
- Update backend schemas before wiring frontend usage, unless the repo uses explicit contract generation.
- Change API clients and UI state transitions in the same pass.
- Avoid partial compatibility unless the rollout truly requires it.
- If a migration period is required, preserve backward compatibility intentionally and document the removal plan.

Read [references/fullstack-checklist.md](./references/fullstack-checklist.md) before implementing changes that cross the API boundary.

## Implementation Rules

- Confirm existing conventions before introducing new patterns or libraries.
- Keep types and schema names consistent across client and server.
- Treat forms and filters as contract surfaces; validate defaults, empty states, and serialization rules.
- Normalize errors into actionable UI states instead of exposing raw backend failures.
- Prefer additive refactors when behavior is uncertain; split invasive rewrites into separate steps.
- Keep secrets, environment-specific URLs, and deployment config out of code paths unless the task explicitly requires them.

## Verification

Run the smallest meaningful checks that cover the touched slice:

- Frontend: lint, typecheck, component tests, route or page tests, targeted build checks
- Backend: unit tests, API tests, schema validation tests, dependency and auth tests
- Full stack: contract tests, integration tests, manual request and response spot checks, smoke tests through the UI when possible

If a check cannot run, state what was skipped and what risk remains.

## Common Failure Patterns

- React form shape does not match FastAPI request model.
- Backend returns nullable or renamed fields the UI does not guard against.
- UI optimistic updates ignore server-side validation or normalization.
- FastAPI dependency injection hides auth or tenant context changes.
- Pagination, sorting, or filtering semantics diverge between client assumptions and backend implementation.
- Error payloads are inconsistent across endpoints, so the UI cannot render reliable failures.

## Delivery Notes

When reporting results:

- Name the user-visible behavior that changed.
- Name the API contract or schema changes explicitly.
- List validation and tests that ran.
- Call out migrations, compatibility windows, or follow-up cleanup.
