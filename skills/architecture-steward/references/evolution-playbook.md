# Evolution Playbook

## Use This Reference For

- Breaking large refactors into phases
- Replacing legacy modules safely
- Introducing new boundaries without service interruption
- Planning documentation and ownership updates alongside code changes

## Phase Design

- Define the target boundary in one sentence.
- Identify what can change now without breaking callers.
- Add adapter layers or compatibility shims when needed.
- Move one responsibility at a time.
- Keep rollback options visible until the new path is proven.

## Good Migration Sequence

1. Document the current state and target state.
2. Add tests around existing behavior.
3. Introduce a seam or interface.
4. Move one caller or workflow to the new boundary.
5. Observe, fix, and expand.
6. Remove compatibility code only after adoption is complete.

## Anti-Patterns

- Rewriting several layers at once without a safe checkpoint
- Mixing architecture cleanup with broad feature work unless forced
- Declaring a new pattern but leaving old paths as the easier option
- Updating diagrams without updating the code or ownership model
