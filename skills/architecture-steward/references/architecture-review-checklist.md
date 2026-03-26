# Architecture Review Checklist

## System Shape

- What are the main components, modules, or services?
- Which boundaries are intentional and which are accidental?
- Where does business logic live today?
- Which dependencies point in the wrong direction?

## Changeability

- What changes are hard right now and why?
- Which modules change together too often?
- Where do teams need coordination for routine work?
- What part of the system lacks safe extension points?

## Reliability And Operations

- What failures are expected and how are they contained?
- Which components are critical paths for latency or uptime?
- Are observability, retries, timeouts, and backpressure aligned with the design?
- Does the architecture create single points of failure without clear justification?

## Data And Integration

- Who owns each important data domain?
- Are contracts versioned, explicit, and testable?
- Do caches, queues, and events have clear consistency expectations?
- Where is data duplicated, and is the duplication intentional?

## Documentation Health

- Does the architecture documentation describe the system that actually exists?
- Are old ADRs still active, superseded, or ignored?
- Can a new engineer identify the right place for a change without tribal knowledge?
