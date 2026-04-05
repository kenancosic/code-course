# MythicCode Layout Patterns

## Page Structure

Normal route pages usually work best as:

1. a top header block with title, subtitle, and one primary action
2. one or two major content grids
3. lower sections for collections, recent activity, or empty states

Prefer `space-y-6` or `space-y-8` over deeply nested wrappers.

## Shared Shells

- Use `src/app/components/Layout.tsx` as the outer page shell.
- Use `src/features/workspace/LearningWorkspace.tsx` for rail + briefing + workspace flows such as courses and practice rooms.
- Do not rebuild custom three-pane layouts unless the request truly needs a new interaction model.

## Responsive Rules

- Prefer `grid` or wrapped `flex` layouts over rigid row toolbars.
- Put search first in filter bars, then selects or secondary controls.
- Use breakpoint-specific widths only when the layout still stacks cleanly without them.
- Add `min-w-0` anywhere long titles, badges, or metadata sit inside flex rows.
- Use `line-clamp-*` for descriptions and `truncate` only for single-line labels.

## Overflow Rules

- Add `min-h-0` to flex columns that contain scrolling children.
- Let exactly one element own vertical scrolling within a pane.
- Avoid nested `overflow-y-auto` unless the inner scroller is clearly intentional.
- Keep sticky or fixed controls rare and deliberate.

## Dialog And Sheet Rules

- Keep width responsive, for example `w-[min(96vw,52rem)]` or `w-[90vw] max-w-md`.
- Cap height against the viewport and make the body scrollable.
- Keep the footer actions visible and aligned with the body purpose.
- Do not let long forms or long lists overflow off-screen without an internal scroll container.

## Action Hierarchy

- Give each card or section one clear primary action.
- Keep secondary actions in `outline` or `ghost` variants.
- Avoid multiple equally loud buttons competing in the same small area.
- Keep setup tools near the feature they control.

## Where Existing Good Patterns Live

- `src/app/pages/Home.tsx`: dashboard-like stacked page sections
- `src/app/pages/RoadmapList.tsx`: filter/search plus card grid
- `src/app/pages/Practice.tsx`: filter bar and expandable floor cards
- `src/features/workspace/LearningWorkspace.tsx`: desktop/mobile multi-pane shell
