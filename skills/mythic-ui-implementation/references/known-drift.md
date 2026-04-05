# Known Styling Drift In The Current Project

Use this file as a caution list when refactoring older UI. Do not rewrite everything at once; normalize the touched area toward the token-based system.

## Shared Primitives

- `src/app/components/ui/card.tsx` still hard-codes `slate` colors instead of theme tokens.
- `src/app/components/ui/progress.tsx` still hard-codes a `slate` track and an emerald gradient.

If you touch those primitives, normalize them carefully and check downstream screens for readability.

## Older Screens With Mixed Systems

- `src/app/pages/RoadmapDetail.tsx` mixes token-based page structure with heavy raw `slate`, `white`, `amber`, `blue`, `violet`, and `indigo` styling.
- `src/app/pages/Profile.tsx` mixes token-based cards with indigo and purple gradients and several raw progress colors.
- `src/app/pages/CourseView.tsx` and `src/app/pages/PracticeRoom.tsx` use intentional editor-like dark workspace panels, but raw black and slate colors should stay isolated to the workspace zone rather than leak into the rest of the page.

## Theme Notes

- `src/styles/theme.css` is the shared source of truth for tokens.
- Some older page styling predates the current token usage, so visual consistency depends on normalizing touched sections back toward token surfaces.
- The project imports `Cinzel` and `Lora`, but some shared tokens still point to generic sans stacks. Prefer explicit `font-serif` for fantasy emphasis instead of assuming the whole app body should become decorative.

## Practical Rule

When fixing a page:

1. preserve the established structure if it already works
2. remove the most obvious readability and overflow issues first
3. replace newly touched raw color drift with token-based surfaces where practical
4. leave broad visual rewrites for dedicated design work
