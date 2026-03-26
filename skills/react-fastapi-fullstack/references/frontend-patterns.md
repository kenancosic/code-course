# Frontend Patterns

## Use This Reference For

- React component and page changes
- Form handling and validation
- Hook design and async state
- API client integration
- Performance and UX hardening

## Component Strategy

- Keep pages responsible for orchestration, data loading, and route-aware decisions.
- Keep reusable components focused on rendering and interaction contracts.
- Prefer controlled inputs when validation or serialization matters.
- Avoid prop drilling by lifting state only to the nearest stable owner or using the project's existing context or store pattern.
- Keep conditional rendering explicit for loading, empty, success, and error branches.

## State Guidelines

- Separate server state from ephemeral UI state.
- Derive booleans and filtered collections instead of duplicating them in state.
- Reset local state intentionally when route params or identity keys change.
- Prefer a single source of truth for filters, pagination, and sort order.
- Guard against stale async responses when requests can overlap.

## Forms

- Match field names and coercion rules to backend request models.
- Validate required fields, ranges, enums, and string trimming before submit when the UX benefits from immediate feedback.
- Preserve backend validation as the authority even when client validation exists.
- Decide how empty strings, null, undefined, and omitted fields should serialize before coding.

## API Consumption

- Centralize transport details in API clients or service hooks instead of scattering fetch logic.
- Normalize response parsing and error handling once per transport pattern.
- Keep loading and retry behavior consistent across similar views.
- Handle unauthorized, forbidden, not found, and validation failures as distinct UI cases.

## Rendering And UX

- Maintain accessible labels, focus behavior, keyboard paths, and semantic markup.
- Use optimistic updates only when rollback behavior is clear.
- Favor incremental skeletons or placeholders over full-page flicker on small refetches.
- Keep destructive actions explicit and reversible where possible.

## Testing Focus

- Component tests: visible states and user interactions
- Form tests: validation, serialization, and submit behavior
- Route or page tests: loaders, guards, and empty or error branches
- Integration tests: client-server contract assumptions where feasible
