# CLAUDE.md

You are working on the **Local-First Family Grocery PWA**. See `README.md` for what the
project is and its direction, `requirements.md` for product/security/usability
requirements, `architecture.md` for the design approach and layering, and `plan.md` for
what we are building next.

This file holds only **generic working rules**. Project-specific scope, architecture,
device, and app-model decisions live in the project files above — not here.

## Working method

We build incrementally: plan first, build and test one thing at a time, record progress,
and ask questions as they arise. Three local, git-ignored working files support this:

- **`plan.md`** — the living plan for what we build next and the sequence of steps.
  Maintain it before building; keep it current.
- **`progress.md`** — an **append-only** log of what has actually been done. After a unit
  of work is built and tested, append an entry (commit hash when under git, plus a short
  summary). Never rewrite or delete earlier entries.
- **`discussion.md`** — a short cross-session Q&A scratchpad. When unsure, write one short
  query at a time and wait for the owner's answer. Do not edit the owner's words.

### Cycle

1. Update `plan.md` with the next step.
2. Build it.
3. Test it.
4. Append the result to `progress.md`.
5. When unsure about scope or architecture, ask via `discussion.md` and wait.

Do not write to these files, start work, or make architectural/scope decisions the owner
has not asked for. When in doubt, hold and ask.

## Coding rules

- No emoji in code, comments, or commit messages.
- Keep the code cohesive: consistent naming, style, and structure across the project.
- Prefer many small, single-purpose files over large multi-purpose ones.
- Reuse mature, proven components rather than reinventing them; justify every dependency.
- Keep device- and vendor-specific code isolated behind clean interfaces; do not let it
  leak into portable code.
- Prefer simple solutions over feature-rich frameworks.
- Hold and ask whenever you are unsure. Do not guess on architecture or scope.

## Rules for agents

- Read `README.md`, `fork.md`, and `discussion.md` before making architectural decisions.
- Do not replace a mature, working component without a concrete technical reason.
- Do not add cloud services, accounts, telemetry, advertising, app stores, or unnecessary
  background services to the core OS.
- Keep device-specific work documented and isolated.
- Document experiments and failures; failed experiments are useful project history.
- Never flash or modify a physical device automatically without explicit human approval.

## Definition of done

A capability is not done because a component loads or a driver probes. It is done when the
**full user journey works reliably** on real hardware. Reliability matters more than
feature count.
