# Fullstack Checklist

## Before Editing

- Identify the exact user flow and route.
- Write down the request and response shape.
- Confirm auth, tenant, locale, and pagination assumptions.
- Check whether compatibility with existing clients matters.

## During Implementation

- Update backend schemas, services, and route tests.
- Update frontend types, API clients, and UI state transitions.
- Handle loading, empty, success, validation failure, and general error states.
- Keep field names, enums, and nullability aligned across layers.
- Document any temporary compatibility behavior.

## Before Finishing

- Verify the changed endpoint manually or through tests.
- Confirm the UI can handle each intended response branch.
- Check that logs and errors remain diagnosable.
- Mention any migration, data backfill, or rollout dependency in the handoff.
