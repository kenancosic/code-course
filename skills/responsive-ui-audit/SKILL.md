---
name: responsive-ui-audit
description: Use when auditing or refactoring MythicCode UI for responsiveness, constrained-container sizing, contrast, action hierarchy, or page-level layout consistency across route pages such as Home, Roadmap, Practice, and Profile.
---

# Responsive UI Audit

Use this skill for MythicCode route-level UI cleanup when the goal is to make the interface feel tighter, more responsive, and easier to scan without breaking the existing fantasy visual language.

## Workflow

1. Map the page first:
- route page
- main layout container
- primary cards or panels
- scroll areas, dialogs, sheets, and sticky or fixed controls

2. Check constrained-container behavior:
- look for fixed widths inside flexible parents
- look for missing `min-w-0` or `min-h-0`
- verify cards, buttons, badges, and headers wrap cleanly on smaller widths
- prefer grid or wrapped flex layouts over long single-row toolbars

3. Check contrast and readability:
- ensure text is legible against card and panel backgrounds
- avoid low-contrast helper text on dark surfaces for important information
- keep semantic emphasis clear between headings, metadata, and secondary notes

4. Check interaction hierarchy:
- one clear primary action per section
- secondary actions grouped together and visually lighter
- move setup tools closer to the feature they control instead of keeping them on unrelated pages

5. For roadmap pages specifically:
- do not hard-block advanced exploration unless the backend truly requires it
- prefer “recommended order” over “locked” when users may intentionally deep dive
- keep search, path discovery, and path generation in the roadmap experience

6. For practice pages specifically:
- make top controls wrap or grid cleanly
- ensure challenge pickers and filters collapse well on narrow widths
- keep editor, output, and description panels usable without horizontal overflow

## Verification

- Run `pnpm exec tsc --noEmit`
- Run `pnpm lint`
- Manually inspect class names for overflow risks after edits:
  - long titles
  - wrapped action rows
  - dialog filters
  - cards in 1-column and 2-column states
