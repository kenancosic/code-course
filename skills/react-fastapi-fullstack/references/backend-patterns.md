# Backend Patterns

## Use This Reference For

- FastAPI route and dependency changes
- Pydantic model design
- Service and repository boundaries
- Auth, validation, and error handling
- Persistence and async workflow updates

## Route Design

- Keep routers thin: parse input, call service logic, map output.
- Make status codes intentional and stable.
- Use dependencies for cross-cutting concerns such as auth, tenancy, and database access.
- Avoid embedding business rules directly in route handlers when they will be reused or grow.

## Schema Design

- Distinguish request, domain, and response models when their responsibilities differ.
- Use explicit defaults instead of relying on ambiguous optional behavior.
- Be careful with aliases, field renames, and backward compatibility.
- Treat response models as contracts; do not leak internal persistence fields by accident.

## Service Boundaries

- Put business decisions, branching rules, and orchestration in services.
- Keep repository or data-access code focused on persistence concerns.
- Make side effects visible: background jobs, notifications, external calls, and cache writes should be easy to trace.
- When a workflow spans several steps, keep transaction and rollback behavior deliberate.

## Validation And Errors

- Validate syntax and shape at the API boundary.
- Re-check domain invariants where persistence or concurrency can violate assumptions.
- Return structured errors the frontend can interpret predictably.
- Standardize not found, conflict, unauthorized, forbidden, and validation responses across endpoints.

## Performance And Operations

- Avoid N+1 queries and repeated dependency work in hot paths.
- Paginate collection endpoints that can grow without bound.
- Keep expensive synchronous work out of request-response paths when possible.
- Log identifiers and context needed for debugging, but avoid leaking secrets or sensitive payloads.

## Testing Focus

- Schema validation and coercion
- Success and edge-case route tests
- Auth and authorization paths
- Service-level business rule tests
- Repository behavior around filtering, sorting, and pagination
