---
name: responsive-ui-audit
description: Audit and refactor MythicCode UI for responsiveness, contrast, theme-token drift, container sizing, action hierarchy, and page-level layout consistency. Use when reviewing or repairing route pages, components, dialogs, sheets, or workspaces in `src/app` or `src/features`, especially when text becomes unreadable, surfaces clash, controls overflow, or mobile behavior breaks.
---

# Responsive UI Audit

Audit MythicCode screens against the current implementation rules instead of generic responsiveness advice. Find the smallest high-impact fixes that restore readability, theme consistency, and container behavior without rewriting a working page from scratch.

## Start With Shared Rules

Before auditing a screen, read:

- [../mythic-ui-implementation/references/theme-patterns.md](../mythic-ui-implementation/references/theme-patterns.md)
- [../mythic-ui-implementation/references/layout-patterns.md](../mythic-ui-implementation/references/layout-patterns.md)
- [../mythic-ui-implementation/references/known-drift.md](../mythic-ui-implementation/references/known-drift.md)

## Audit Workflow

1. Map the page or feature first.
- entry route or component
- outer shell
- main panels and action zones
- dialogs, sheets, scroll areas, fixed controls

2. Find the highest-risk issues first.
- unreadable text and background pairs
- raw color drift inside token-based pages
- missing `min-w-0` or `min-h-0`
- toolbars and cards that do not wrap on narrow widths
- too many equally strong actions in the same section

3. Check contrast and visibility.
- important text should read as `text-foreground` or a clearly paired status color
- helper copy may be muted, but not if it carries primary meaning
- tinted panels need text and borders from the same color family
- avoid extending `text-white`, `text-slate-*`, `bg-black/20`, or `border-white/10` patterns into normal product surfaces

4. Check structure and overflow.
- use `LearningWorkspace` for multi-pane lesson or practice experiences when the existing page is fighting its own layout
- keep one vertical scroll owner per pane
- make controls wrap before shrinking text into unreadability
- clamp long descriptions and truncate only true single-line labels

5. Check action hierarchy.
- one clear primary action per section
- secondary actions grouped and quieter
- setup tools kept near the feature they configure

6. Check state coverage.
- loading
- empty
- error
- disabled
- generating or in-progress

## Verification

- Search touched files for raw color drift:
  - `rg -n "text-white|text-slate|bg-slate|bg-black/|border-white/10|bg-indigo|text-indigo|from-purple|to-purple" src`
- Run `pnpm exec tsc --noEmit`
- Run `pnpm lint`
