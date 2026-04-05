# MythicCode UI Guidelines

## Theme

- Preserve the current dark fantasy direction from `src/styles/theme.css`, `src/app/components/Layout.tsx`, and `src/features/workspace/LearningWorkspace.tsx`.
- Prefer theme tokens: `bg-background`, `bg-card`, `bg-secondary`, `text-foreground`, `text-muted-foreground`, `border-border`, and `text-primary`.
- Use `primary` for active states and main actions, `chart-1` for rewards and highlights, `chart-2` for success and progress, `chart-3` for discovery and info, and `destructive` for danger.
- Avoid raw `slate`, `white`, `black`, `indigo`, `purple`, and `violet` classes in ordinary panels. Use them only for isolated editor surfaces or tightly scoped semantic callouts.

## Layout

- Prefer responsive grids and wrapped flex rows over rigid toolbars.
- Add `min-w-0` to flex children with titles or metadata.
- Add `min-h-0` to flex columns with scrollable children.
- Let one element own scrolling inside a panel.
- Use `LearningWorkspace` for rail + briefing + workspace experiences.

## Typography And Hierarchy

- Use serif emphasis for page titles and important fantasy labels; keep body copy straightforward and readable.
- Give each section one clear primary action. Keep secondary actions lighter and nearby.
- Do not rely on muted text for primary information.

## States

- Every touched screen should cover loading, empty, error, and in-progress or generating states.
- Empty and error states should remain on-theme and easy to scan.

## Refactors

- When touching older UI that mixes token classes with raw colors, normalize the touched area toward theme tokens instead of extending the older palette.
- Reuse existing `ui/*` primitives before creating new local variants.
- For implementation work, prefer `skills/mythic-ui-implementation`.
- For review or cleanup work, prefer `skills/responsive-ui-audit`.
