---
name: architecture-steward
description: Architecture design, review, refactoring guidance, and ongoing system stewardship for software applications and platforms. Use when Codex needs to shape or maintain system structure, module boundaries, service interactions, scaling plans, architecture decision records, dependency direction, integration seams, or technical debt control across code, diagrams, ADRs, and architecture documentation.
---

# Architecture Steward

## Overview

Design architecture that can survive change, then keep it honest as the codebase evolves. Start from business and operational constraints, map the current system, choose the smallest architecture move that improves clarity, and update the documentation and decision trail with the code.

## Workflow

1. Clarify the system goal, constraints, and failure costs.
2. Map the current architecture before prescribing a target shape.
3. Identify the most important architectural pressure: scale, delivery speed, reliability, security, ownership, or complexity.
4. Propose a bounded change with explicit tradeoffs.
5. Align code boundaries, interfaces, and documentation.
6. Leave behind an artifact another engineer can use: ADR, architecture note, diagram, or migration plan.

## Start With Context, Not Solutions

Capture:

- Main capabilities and user journeys
- Key constraints: latency, throughput, compliance, team size, release cadence, tenancy, data sensitivity
- Current architecture and pain points
- Planned growth or change vectors
- What must remain stable during the change

Do not jump to microservices, event buses, or large modularization efforts unless the current pain actually demands them.

## Pick The Right Kind Of Architecture Work

### Greenfield construction

Use when designing a new system, subsystem, or major capability.

- Define the minimum viable set of components and responsibilities.
- Choose a small number of explicit boundaries: UI, application, domain, infrastructure, integration, data.
- Optimize for understandable change paths over theoretical purity.
- Document assumptions and expected future stressors.

### Incremental restructuring

Use when the system already exists and architecture must improve without a rewrite.

- Map current coupling, circular dependencies, duplicated logic, and ownership confusion.
- Isolate one seam at a time: interface extraction, service boundary, module split, queue insertion, cache boundary, or data ownership clarification.
- Prefer strangler-style migration paths over flag-day replacements.
- Keep behavior stable while moving responsibilities.

### Architecture review and maintenance

Use when reviewing the health of an existing system or keeping architecture docs aligned.

- Compare intended boundaries with actual imports, calls, and dependencies.
- Check whether architecture documents still match the code and runtime behavior.
- Refresh ADRs when decisions have changed or expired.
- Surface technical debt as concrete risks, not vague dissatisfaction.

Read [references/architecture-review-checklist.md](./references/architecture-review-checklist.md) for review prompts and smell detection.

## Core Heuristics

- Favor clear dependency direction and stable interfaces.
- Keep business rules away from transport and framework code.
- Let data ownership follow domain responsibility, not convenience.
- Make operational concerns first-class when they materially affect the design.
- Avoid introducing distributed-system complexity to solve team-local code organization problems.
- Preserve optionality where requirements are uncertain; commit where ambiguity causes churn.

## Architecture Artifacts To Leave Behind

- ADR for meaningful design decisions
- Module or service boundary description
- Diagram or topology note
- Migration plan with phases and rollback points
- Updated architecture documentation tied to the actual code paths

Use [references/adr-template.md](./references/adr-template.md) when recording decisions. Use [references/evolution-playbook.md](./references/evolution-playbook.md) when planning staged changes.

## Typical Smells

- Architecture docs describe layers that the code does not respect.
- Shared modules accumulate unrelated responsibilities because ownership is unclear.
- Domain logic is trapped in controllers, routes, views, or ORM models.
- Integration contracts are implicit and break during unrelated releases.
- Teams coordinate by tribal knowledge instead of explicit interfaces and decisions.
- Scaling plans assume future decomposition without current observability or operational guardrails.

## How To Communicate Recommendations

- Describe the problem in terms of change cost, failure risk, or ownership drag.
- Name the proposed boundary or decision clearly.
- State tradeoffs and rejected alternatives.
- Separate immediate refactors from longer-term evolution steps.
- Tie every recommendation to a concrete code or runtime consequence.

## Verification

Validate architecture recommendations against:

- Current code structure and dependency graph
- Operational constraints and deployment model
- Team ownership and likely adoption cost
- Migration safety and rollback options
