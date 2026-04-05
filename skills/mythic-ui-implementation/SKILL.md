---
name: mythic-ui-implementation
description: Build, refactor, and repair MythicCode UI and UX while preserving the project's dark fantasy theme, token system, shared layout primitives, and responsive behavior. Use when Codex needs to create or revise route pages, cards, dialogs, filters, workspaces, dashboards, or shared UI components in `src/app`, `src/features`, or `src/styles`, especially when readability, overflow, surface styling, text placement, or action hierarchy may break.
---

# Mythic UI Implementation

Treat MythicCode as a dark fantasy learning product with a consistent shell, not as a generic Tailwind or shadcn app. Start from the existing theme and layout primitives, remove drift from older hard-coded colors, and ship the smallest clean UI that stays readable on mobile and desktop.

## Workflow

1. Map the screen before editing.
- Identify the route page or feature entry point.
- Find the shell: `src/app/components/Layout.tsx` for normal pages or `src/features/workspace/LearningWorkspace.tsx` for multi-pane lesson and practice flows.
- List loading, empty, error, success, disabled, and generating states before changing markup.

2. Pick the right structural primitive.
- Use `LearningWorkspace` for lesson, practice, or any "rail + briefing + workspace" experience.
- Use stacked sections and responsive grids for normal route pages.
- Reuse shared `ui/*` primitives before inventing custom buttons, cards, badges, inputs, or sheets.

3. Normalize styling toward theme tokens.
- Prefer `bg-background`, `bg-card`, `bg-secondary`, `text-foreground`, `text-muted-foreground`, `border-border`, and `text-primary`.
- Use raw palette classes only for explicit semantic states or editor-like surfaces.
- When touching older files that mix `text-white`, `text-slate-*`, `bg-black/20`, or `bg-indigo-*`, move the touched area toward theme-token surfaces instead of adding more raw colors.

4. Make it responsive before polishing.
- Add `min-w-0` to flex children with titles or metadata.
- Add `min-h-0` to any flex column that contains scrollable children.
- Let toolbars wrap.
- Prefer grid or wrapped flex rows over brittle fixed multi-column layouts.
- Keep one element responsible for scrolling inside each pane.

5. Fix hierarchy and readability.
- Give each section one obvious primary action.
- Keep secondary actions visually lighter and grouped nearby.
- Make headings, metadata, badges, and helper copy visually distinct.
- Never allow muted text to become the only readable text on a dark or tinted surface.

6. Verify.
- Search touched files for raw `slate`, `white`, `black`, `indigo`, or `purple` classes that may have reintroduced drift.
- Run `pnpm exec tsc --noEmit`.
- Run `pnpm lint`.

## Read The References You Need

- Read [references/theme-patterns.md](./references/theme-patterns.md) before changing colors, typography, badges, buttons, cards, or panel surfaces.
- Read [references/layout-patterns.md](./references/layout-patterns.md) before changing page shells, workspaces, filters, dialogs, sheets, or overflow behavior.
- Read [references/known-drift.md](./references/known-drift.md) when refactoring older screens or debugging unreadable text, clashing surfaces, or mixed styling systems.

## Non-Negotiables

- Preserve the current dark fantasy direction; refine it instead of replacing it with default SaaS styling.
- Keep fantasy emphasis in headings and accents, but keep body copy and controls readable first.
- Do not mix multiple unrelated accent systems in the same section.
- Do not hard-code desktop widths without a mobile fallback.
- Do not introduce absolute positioning to solve ordinary alignment problems.
- Do not create a new local pattern if the repo already has a reusable one.

## Typical Requests This Skill Should Handle

- "Refactor this page so it matches the MythicCode theme."
- "Fix the unreadable text and background contrast on this panel."
- "Make this toolbar wrap correctly on mobile."
- "Build a new dashboard page using the existing fantasy visual language."
- "Repair a dialog, sheet, or workspace layout that overflows or hides text."
- "Normalize an older page that mixes raw `slate/white/indigo` classes with theme tokens."
