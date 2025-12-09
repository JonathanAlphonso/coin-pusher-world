# Coin Pusher World – Long-Running Agent Rules

This document defines consistent rules for any long-running Claude agent working on this repo
(e.g., using the Autonomous Coding quickstart).

The agent should treat these rules as **project-wide constraints** in addition to the prompts.

## 1. Overall Mission

- Evolve Coin Pusher World into the roguelite described in `docs/design-spec.md`.
- Preserve and improve:
  - Mobile performance on low-end Android phones.
  - Code quality and modularity of the new `src/` architecture.
  - Test coverage and reliability.
- Make incremental, production-quality progress each session; leave the game playable.

## 2. Files to Read Early in Each Session

At the beginning of a session (after basic `ls` / `git log`), always read:

1. `README.md`
2. `docs/design-spec.md`
3. `plan.md`
4. `docs/autonomous-agent/app_spec.txt`
5. `docs/autonomous-agent/agent-rules.md`
6. `claude-progress.txt` (if present)
7. `feature_list.json` (if present)

Re-skim these before making major architectural or gameplay changes.

## 3. Coding Style and Architecture

- Use **vanilla JavaScript ES modules**; keep everything under `src/` unless there is a strong reason not to.
- Follow existing patterns in:
  - `src/main.js` for wiring systems.
  - `src/core/Game.js`, `src/core/Physics.js`, `src/core/Utils.js`.
  - `src/world/Board.js`, `src/world/Background.js`, `src/world/themes/*`.
  - `src/systems/*` for game systems.
- Prefer:
  - Small, focused modules over giant files.
  - Clear function names over clever abstractions.
  - Keeping public APIs stable (e.g., `Game.init`, `Board.init`, `Coins.init`).
- Treat `js/*.js` as legacy:
  - Do not delete them unless instructed.
  - Prefer bringing fixes and new behavior into `src/` modules.

## 4. Performance Rules

- Assume the game must run at **30–60 FPS on older Android devices**.
- Keep:
  - Geometry counts modest; reuse meshes/materials where possible.
  - Texture resolutions small; prefer procedural textures where appropriate.
  - Allocation in the main loop minimal (avoid per-frame object creation).
- When adding features:
  - Consider the cost of each new Three.js object, listener, and update.
  - Prefer batching work and reusing objects.
- If you add a potentially expensive feature:
  - Gate it behind options or lower-quality modes where possible.
  - Document any known performance tradeoffs in `claude-progress.txt`.

## 5. Testing and Safety

- Never remove tests (e.g., `test-*.js`, `*.cjs`) without explicit human instruction.
- When you change a system, run:
  - The most relevant targeted test file(s).
  - A quick manual sanity check in the browser (core loop, dropping coins, scoring, no obvious errors).
- Only mark a feature in `feature_list.json` as `"passes": true` after:
  - You have exercised its steps through the UI or test harness.
  - There are no new console errors or obvious regressions.

## 6. Roguelite Design Alignment

- Use `docs/design-spec.md` as the **gameplay north star**.
- When adding or modifying:
  - Boards – ensure they fit the board system concepts (lane layouts, passives, actives, upgrades).
  - Coins – treat them as deckbuilding elements with tags and costs.
  - Relics – design them to amplify synergies (heavy coins, cascades, defense/growth, economy, etc.).
- Prefer features that:
  - Increase build diversity and meaningful choices.
  - Reward good planning and coin placement skill.
  - Maintain clarity and readability—no opaque or overly random effects.

## 7. Git and Progress Hygiene

- Keep commits focused and descriptive.
- Always update `claude-progress.txt` at the end of a session with:
  - What you changed.
  - Which tests you ran.
  - Any known issues or TODOs for future agents.
- Do not rewrite history (`git rebase`, `git reset --hard`, force pushes) unless explicitly instructed.

## 8. When in Doubt

- If a change risks:
  - Breaking performance guarantees,
  - Making the game unplayable,
  - Or invalidating a large portion of tests,
  - Prefer leaving a TODO in `claude-progress.txt` and implementing a smaller, safer improvement instead.
- Defer sweeping architectural rewrites unless:
  - They are clearly justified by `docs/design-spec.md` or `plan.md`, and
  - You can complete them in a way that keeps the game running and tests passing.

