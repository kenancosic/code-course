# MythicCode Theme Patterns

## Source Of Truth

- Shared tokens live in `src/styles/theme.css`.
- The normal page shell lives in `src/app/components/Layout.tsx`.
- The multi-pane lesson and practice shell lives in `src/features/workspace/LearningWorkspace.tsx`.
- Shared controls already exist in `src/app/components/ui/*`.

Start from those files before inventing new local styling rules.

## Token-First Surfaces

Use theme tokens for normal product surfaces:

- app shell: `bg-background text-foreground`
- major panels: `rounded-2xl border border-border/70 bg-card/35` or `bg-card/50 backdrop-blur-md`
- inset stat blocks: `rounded-xl border border-border bg-background/60` or `bg-background/70`
- empty and error states: `rounded-2xl border border-border/70 bg-card/35 p-8 text-center`

Inputs, selects, textareas, buttons, badges, sheets, and dialogs should inherit from shared primitives first. Override them only for a clear local reason.

## Accent Meanings

Use the palette consistently:

- `primary`: main CTA, active state, magical navigation emphasis
- `chart-1`: rewards, trophies, notable highlights
- `chart-2`: success, completion, positive progress
- `chart-3`: discovery, info, search, exploration
- `chart-4`: secondary magical accent, use sparingly
- `destructive`: danger, hard failures, destructive actions

If you need a raw palette family for a status card or badge, keep background, border, and text in the same family.

## Typography

- Use `font-serif` for page titles, major section anchors, and deliberate fantasy emphasis.
- Keep long body copy, filters, helper text, and metadata straightforward and highly legible.
- Reserve wide uppercase tracking for small labels, panel headings, and badges.

Do not force every label into decorative styling. Readability is the priority.

## Contrast Rules

- Default important text to `text-foreground`.
- Use `text-muted-foreground` only for secondary information.
- If a surface is tinted, ensure the text and border are paired to that tint family.
- Avoid muted text as the only readable text inside overlays, translucent cards, or status panels.
- Avoid `text-white` for ordinary UI surfaces; prefer token colors unless the surface is an intentionally isolated editor or code workspace.

## Raw Colors: Use Narrowly

Raw `amber`, `emerald`, `blue`, `violet`, `rose`, `black`, and `slate` classes are acceptable only when:

- expressing a specific semantic status
- styling an isolated editor or console surface
- matching an existing, clearly intentional local pattern

Do not start new ordinary panels with `bg-slate-*`, `text-slate-*`, `border-white/10`, or `bg-black/20`.

## Useful Class Recipes

- page shell card: `rounded-2xl border border-border/70 bg-card/50 shadow-[0_0_50px_rgba(0,0,0,0.18)] backdrop-blur-md`
- inset stat card: `rounded-xl border border-border bg-background/70 p-4`
- token-based workspace shell: `rounded-2xl border border-border/70 bg-card/35 shadow-[0_0_100px_rgba(0,0,0,0.22)] backdrop-blur-xl`
- soft empty state: `rounded-2xl border border-border/70 bg-card/35 p-10 text-center text-muted-foreground`
