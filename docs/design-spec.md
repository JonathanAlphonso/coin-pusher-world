```txt
# Coin Pusher World – Game Design Specification

Version: 0.3
Status: Draft – implementation source of truth
Rendering: three.js (WebGL1 compatible, runs on old Android devices)

============================================================
1. HIGH-LEVEL OVERVIEW
============================================================

Coin Pusher World is a single-player 3D coin pusher game focused entirely on:

- Dropping coins onto dynamic 3D boards.
- Routing coins through a **pyramid of themed boards**.
- Building an engine of **board synergies + prizes** to maximize score.
- Reaching and exploiting a full **8-board pyramid** in a single run.

There are no separate layers beyond this: no map, no combat screens, no deck of actions. All meaningful decisions revolve around:

- Which **boards/themes** you unlock and where they sit in the pyramid.
- Which **prizes** (relic-style passives) you select from a rotating counter.
- How precisely and intelligently you drop coins.


============================================================
2. CORE FANTASY & SKILL EXPRESSION
============================================================

### 2.1 Core Fantasy

You are effectively the owner and master of a fantastical multi-tier arcade machine:

- Each board is a themed machine (Neon Arcade, Dino Land, Alien Invasion, etc.).
- Boards can be stacked into a **downward-branching pyramid**.
- Coins cascade from the top into deeper layers, picking up multipliers and queue bonuses as they go.
- When coins finally exit the **bottom row**, their accumulated value is converted into score.

### 2.2 Skill Target

Difficulty and skill expression:

- **More skillful than a standard coin pusher**:
  - Random drops will work, but will underperform compared to smart routing.
  - Players must understand and exploit theme synergies and prize choices.
- **Less cognitively heavy than dense strategy games**:
  - Fewer distinct systems: boards, coins, queue, prizes, score.
  - Decisions are impactful but readable.

Primary sources of skill expression:

1. **Board Selection**
   - Choosing themes (queue, value, jackpots, combo, etc.).
   - Deciding which branch of the pyramid to strengthen (left vs right vs middle).

2. **Prize Selection**
   - Picking passives from a rotating **6-option prize counter**.
   - Combining prizes with chosen boards to form engines (queue engines, jackpot builds, combo builds, hybrid builds).

3. **Physical Play**
   - Lane selection and drop timing to:
     - Hit key obstacles.
     - Direct flow toward strong child boards.
     - Sustain combo chains and jackpots.


============================================================
3. CORE LOOP & RUN STRUCTURE
============================================================

### 3.1 Core Loop

One session (a “run”) looks like this:

1. Start with a **single top board** (starter theme).
2. Drop coins on that board:
   - Coins slide, bounce, and are pushed forward.
   - When coins reach the front, they fall into **exits**.
3. Exits route coins:
   - To **child boards** below (if those positions in the pyramid are filled), or
   - Directly to the **final scoring tray** if the board is on the bottom row.
4. Coins pick up numeric effects along their path:
   - Value multipliers from some themes.
   - Queue gain from others.
   - Jackpot enhancements, combo bonuses, routing biases, etc.
5. As score and milestones improve, the game periodically:
   - Offers a **new board** to add to the pyramid.
   - Opens the **Prize Counter** with 6 prize options; you choose 1.
6. The pyramid grows up to a maximum of **8 boards**.
7. The run is considered “complete” when:
   - The pyramid has 8 boards, and
   - The player’s active coins and queue eventually deplete (or the player manually cashes out / restarts).

### 3.2 Resources in a Run

- **Score** – Global scalar; total value of all scored coins.
- **Coins** – Individual entities with base value and path data.
- **Global Modifiers**
  - `globalValueMultiplier`
  - Global jackpot / queue / combo modifiers.
- **Coin Queue**
  - Integer count: number of coins to be auto-dropped.
  - Max capacity: modifiable by boards and prizes.
- **Pyramid State**
  - Up to 8 boards.
  - Each board has a theme, position, and link to its parent/children.
- **Prize Slots**
  - Fixed number of active prizes (e.g., up to 8).
  - Each prize is a passive effect.


============================================================
4. GAME OBJECTS
============================================================

### 4.1 Coins

Representation:

- `baseValue: number` – starting coin value.
- `size: number` – affects collision and how many can stack.
- `mass: number` – affects push strength.
- `visualVariant: string` – gold, silver, gem, etc.
- `pathBoards: BoardId[]` – IDs of boards the coin has traversed.
- `pathEvents: { boardId, focus, eventType }[]` – key events (e.g., obstacle hits, jackpots).

Coins are **purely numeric + physical** objects; they do not contain textual abilities.

### 4.2 Boards

Boards are instantiated from themes (see section 5). Each board includes:

- `boardId`
- `themeIndex`, `themeName`, `powerupFocus`
- Pyramid position: `row`, `column`
- Child references: `childLeft`, `childRight` (BoardId or null)
- Geometry & obstacles:
  - 3D meshes for base, walls, pusher(s), obstacles.
  - A fixed number of exit zones along the front edge.
- Local state:
  - Gauges (e.g., charge for multi-drop).
  - Per-board counters (e.g., how many stomps, lasers, jackpots triggered).

### 4.3 Themes (tierThemes)

Themes are defined in a config module similar to:

- `tierThemes: Theme[]`
- `getThemeOptions(excludeIndices)`
- `getThemeByFocus(focus)`

Each theme entry (e.g., Neon Arcade, Dino Land, Alien Invasion, Pirate Cove, Candy Kingdom, Space Station, Jungle Safari, Robot Factory) defines:

- Visual palette:
  - `shelf`, `wall`, `pusher`, `accent`, `glow`
  - `particleColor`, `ambientGlow`
  - `textureType`, `textureScale`
  - `ledColor1`, `ledColor2`
- Identity:
  - `name`, `icon`, `description`, `focusLabel`
- Mechanics:
  - `powerupFocus` – mechanical identity string.
  - `elements` – set of obstacle types to instantiate.
  - `coinMover` – style of the main pusher/mover (e.g., `wavePusher`, `stomper`, `tractorBeam`, `cannonPusher`, etc.).

Themes are **data**, not logic. Logic maps `powerupFocus` → mechanical effects.

### 4.4 Prizes (Relic-Style Passives)

Prizes are passive run-long modifiers selected from the **Prize Counter**.

Each prize has:

- `id`
- `name`
- `summary` – short description.
- `tags: string[]` – e.g., `["queue", "value", "jackpot", "combo", "routing"]`.
- `affinities` – references to:
  - `powerupFocus` values (e.g., `queueSpeed`, `coinValue`).
  - Or specific `themeName`s if needed.
- `effects` – data describing how it changes:
  - Base values (e.g., +1 to baseValue).
  - Multipliers (e.g., +10% to jackpot).
  - Chances (e.g., +5% chance for lucky coins).
  - Caps or thresholds.

Implementation detail: prizes are applied via a generalized modifier/event system rather than custom `if` chains in random places.


============================================================
5. BOARD THEMES & POWERUP FOCUS SEMANTICS
============================================================

Each theme’s `powerupFocus` defines how it contributes to the overall engine. The code must centralize these rules (e.g., `themeEffects.ts`).

Below is the intended meaning of each focus, which guides both board behavior and synergy with prizes.

### 5.1 queueSpeed (Neon Arcade)

- Modifies **auto-drop interval**:
  - Base auto interval: e.g., 1500ms.
  - Neon-related events can reduce interval by small steps, down to a minimum cap.
- Typically interacts with:
  - Queue size / queue gain.
  - Combo systems (more frequent drops create more opportunities).

### 5.2 coinValue (Dino Land)

- Creates **persistent increases in coin value**:
  - Dino events add to `globalValueMultiplier`.
  - Possible base value tweaks on coins routed through these boards.

### 5.3 luckyCoins (Alien Invasion)

- Introduces **occasionally super-valuable coins**:
  - Chance for coins to become “lucky” and get large value multipliers.
  - Can also spawn special lucky coins into the queue.

### 5.4 multiDrop (Pirate Cove)

- Enhances **multi-coin drops**:
  - Boards may charge a gauge; when full, you can press a Multi-Drop button.
  - Multi-Drop may:
    - Drop extra coins.
    - Add a bonus multiplier to coins dropped this way.

### 5.5 queueCapacity (Candy Kingdom)

- Increases **maximum queue size** and sometimes queue gain:
  - Boards boost `maxQueueSize`.
  - They can also increase queue gain from obstacle hits across the whole pyramid.

### 5.6 widerPusher (Space Station)

- Improves **pusher coverage** and push strength:
  - Slightly wider pusher mesh or additional side pushers.
  - Special timed impulses that move more coins than usual.

### 5.7 comboTime (Jungle Safari)

- Extends and rewards **combo windows**:
  - Longer windows during which multiple coin scores count as a single “combo.”
  - Stronger scaling for combo chains.

### 5.8 jackpotChance (Robot Factory)

- Modulates **jackpot probability and payout**:
  - Jackpot exits that occasionally yield huge multipliers.
  - Boards can tweak the tradeoff between jackpot frequency and size.


============================================================
6. PYRAMID STRUCTURE & ROUTING
============================================================

### 6.1 Pyramid Layout

- The pyramid is a set of board slots arranged in rows.
- Max boards: 8.
- Example layout:
  - Row 0: 1 board (top).
  - Row 1: up to 2 boards.
  - Row 2: up to 3 boards.
  - Row 3: remaining boards (depending on configuration), total ≤ 8.

Internally, each board has:

- `row: number`
- `col: number`
- `childLeft: BoardId | null`
- `childRight: BoardId | null`

### 6.2 Board Unlock Flow

- Player starts with a top board (starter theme).
- When thresholds are met (usually score-based, possibly also board-specific milestones), the game prompts:
  - “Add a new board.”
  - Player is given **3 theme options** via `getThemeOptions(excludeIndices)`.
  - Player chooses a theme; the new board is created in the next available slot.
- The pyramid fills from top to bottom, row by row, left to right (exact rule documented in code).

### 6.3 Routing Coins Between Boards

- Each board has a number of **exit zones** on its front edge.
- Each exit zone is mapped to a target route:
  - Left child board.
  - Right child board.
  - Direct-to-final scoring tray, if this is a bottom row board or by design.
- Physical layout must roughly align with routing:
  - Board geometry is positioned in 3D so that coins falling off an exit will land onto the child board or into the scoring tray.
- Some exits are special:
  - Jackpot exits.
  - Lucky exits.
  - Combo exits.

### 6.4 Final Scoring Tray

- The final scoring tray is a virtual or physical area where coins are considered “scored.”
- When a coin enters this area:
  - Its path is finalized.
  - Score is computed and added.
  - The coin is then despawned and returned to a pool for performance.


============================================================
7. SCORING SYSTEM
============================================================

### 7.1 Coin Path Tracking

Each coin tracks:

- The sequence of boards visited.
- Key events it triggered (e.g., “hit volcano obstacle,” “entered jackpot slot,” “became lucky”).

These are used to compute a combined multiplier.

### 7.2 Scoring Formula

When a coin reaches the final scoring tray:

1. Start with `baseValue`.
2. Compute `pathMultiplier`:
   - Per-board contributions.
   - Per-theme contributions (e.g., each Dino Land board adds small value).
3. Apply global modifiers:
   - `globalValueMultiplier`.
   - Jackpot multipliers (Robot Factory, lucky coins).
   - Combo multipliers (Jungle Safari, prizes).
4. Final:

   `coinScore = baseValue * pathMultiplier * globalValueMultiplier * jackpotMultiplier * comboMultiplier`

5. Add `coinScore` to `Score`.

### 7.3 Score Feedback

- Big score events:
  - Larger text popups.
  - Stronger VFX/sound.
- Combo chains:
  - On-screen combo counter.
  - Fading meter showing remaining combo window time.


============================================================
8. PRIZE SYSTEM (ROTATING COUNTER)
============================================================

### 8.1 Prize Counter Overview

The **Prize Counter** is a rotating carousel that offers **6 possible prizes** at a time, drawn from a **global pool of ~30 prizes**.

- Visual:
  - A small rotating bar or carousel showing 6 prize icons and brief summaries.
- Interaction:
  - Player selects exactly **1** prize from the 6.
  - The selected prize is added to the player’s active prize slots (up to max).
  - Other prizes go back into the pool or a “seen” pool, depending on implementation.

### 8.2 When the Prize Counter Appears

Recommended triggers (can be tuned):

- On each **new board unlock**.
- On crossing key **score thresholds**.
- On special path/achievement events (optional, later).

Initially, keep it simple and reliable:

- **Every time the player adds a new board**, guarantee a prize roll.

### 8.3 Prize Slots & Limits

- The player can hold up to a set number of active prizes (e.g., 8).
- If capacity is full:
  - Option A (simple): newer prizes are unavailable until next run.
  - Option B (more advanced): allow the player to **replace** an existing prize with a new one.

### 8.4 Prize Effects

Prizes modify the same numeric systems that boards do:

- Queue size, queue speed, queue gain.
- Global value multipliers.
- Lucky coin frequency and behavior.
- Multi-drop behavior.
- Combo windows and rewards.
- Routing probabilities (left/right bias, board specialization).
- Jackpots.

They often interact with themes via `powerupFocus`:

- Example: “If a coin passes through any `queueSpeed` board, gain +1 queue.”
- Example: “Coins exiting `jackpotChance` boards get an additional +10% jackpot multiplier.”

### 8.5 Example Prize Categories (From the 30-Prize Pool)

(Exact numbers are tuning targets, not final.)

- **Queue Engine Prizes**
  - Faster auto-drop.
  - Bigger max queue.
  - Queue gain from combos.
- **Value & Luck Prizes**
  - Flat base value increases.
  - Global multipliers from cumulative coins.
  - Lucky coin chance and lucky coin synergies.
- **Multi-Drop & Pusher Prizes**
  - More coins per Multi-Drop.
  - Stronger push strength in certain situations.
- **Combo & Timing Prizes**
  - Longer combo windows.
  - Extra queue gain from combo chains.
  - Rewards for rhythmic manual dropping.
- **Routing & Path Specialization**
  - Bonuses for diverse paths (many themes).
  - Bonuses for specialized paths (only one powerupFocus).
  - Biasing left/right routes or central “backbone” routes.
- **Safety & Control**
  - Protection against despawned coins.
  - Soft handling of overcrowded boards.
  - Slight smoothing of extreme variance.

The full 30-prize pool lives as data in a dedicated config (e.g., `prizes.ts`) and is used by the Prize Engine.


============================================================
9. COIN QUEUE & AUTO DROP
============================================================

### 9.1 Queue State

- `coinQueue: number` – number of queued coins.
- `maxQueueSize: number` – maximum queue size; increased by certain boards/prizes.
- `autoDropIntervalMs: number` – base interval between automatic drops; affected by queueSpeed boards/prizes.

### 9.2 Manual Drop

- Player taps/clicks the **Drop Coin** button or a specific lane.
- A coin is spawned above the current focus board, in the chosen lane.

### 9.3 Auto Drop

- When Auto is ON:
  - Every `autoDropIntervalMs`, if `coinQueue > 0`, spawn a coin and decrement queue.
- Lane selection:
  - Initial: simple round-robin distribution over available lanes.
  - Later: could be weighted based on lane load or board focus.

### 9.4 Queue Gain

- Certain obstacle hits and exits add to `coinQueue`.
- Some boards and prizes amplify queue gain.
- If queue would exceed `maxQueueSize`:
  - Handle overflow via specific rules (e.g., convert excess into immediate score for certain prizes).


============================================================
10. UX / UI & OLD ANDROID SUPPORT
============================================================

### 10.1 HUD Layout

Core screens:

- **Main 3D view:**
  - Shows the pyramid from an angle that makes flows understandable.
  - Camera can pan/zoom but defaults to a whole-pyramid view once all 8 boards are unlocked.

- **Top HUD:**
  - Score.
  - Global multiplier summary.
  - Board count (e.g., `Boards: 5 / 8`).
  - Queue state (e.g., `Queue: 12 / 40`).

- **Bottom HUD:**
  - Drop button.
  - Auto toggle.
  - Multi-Drop action (if unlocked/charged).
  - Board focus selector (cycle through boards).

- **Side HUD:**
  - Current board’s theme icon, name, and focusLabel.
  - Access to the **Prize Counter** when active.

### 10.2 Prize Counter UI

- Appears as an overlay panel with 6 prize options.
- Each option:
  - Icon.
  - Name.
  - Short summary text.
- Player selects one; selection immediately applies.

### 10.3 UI Testability

All UI elements (labels, text, buttons) must:

- Be known to a central layout system that provides:
  - `id`, `x`, `y`, `width`, `height` (in screen or logical coordinates).
- Be accessible to test code for:
  - Overlap detection.
  - Minimum size checks (tap target size).

### 10.4 Old Android Constraints

The game must run on older Android devices (weak CPU/GPU, WebView/Chrome).

Guidelines:

- Use **WebGL1-compatible** code paths in three.js.
- Geometry:
  - Low-poly meshes for coins and obstacles.
  - Limited number of simultaneously active coins; strong pooling and re-use.
- Textures:
  - Moderate sizes (512×512, 1024×1024 at most).
  - Use texture atlases to reduce draw calls.
- Materials & Effects:
  - Prefer `MeshLambertMaterial` / `MeshBasicMaterial` where acceptable.
  - Limit dynamic shadows and heavy shaders.
  - Provide a “Low Performance Mode”:
    - Fewer coins.
    - Reduced particle effects.
    - No expensive post-processing.
- Frame target:
  - 30 FPS on low-end Android devices.

Touch support:

- All buttons at least ~48 CSS pixels in their smallest dimension on mobile.
- Layout tested at small resolutions (e.g., 800×480).


============================================================
11. TESTING & AUTOMATION REQUIREMENTS
============================================================

All of the following suites must pass before any commit:

### 11.1 Full Playthrough to 8 Boards

Goal: ensure the game is structurally sound and a full pyramid is reachable.

Test:

- Start a new run with a **fixed RNG seed**.
- Use a deterministic policy for:
  - Manual/auto drops.
  - Board choices.
  - Prize choices (e.g., always pick index 0).
- Simulate until:
  - The pyramid reaches **8 boards**.
  - The run ends in a stable way (queue and active coins eventually drain or max simulation time is reached).

Assertions:

- Exactly 8 boards exist in the pyramid.
- No deadlocks (e.g., no new boards possible but pyramid not full due to logic bugs).
- No NaN or infinite values for score or multipliers.
- No unhandled exceptions.

### 11.2 Coin Flow to Final Boards

Goal: ensure board geometry and physics do not produce systematic traps.

Test:

- For each board type and layout:
  - Spawn coins from representative spawn positions in each lane.
  - Simulate physics for up to T seconds or N steps.
- Track outcomes:
  - Count coins that reach the final scoring tray.
  - Count coins that remain “stuck” (never exiting within the budget).

Assertions:

- A high majority (e.g., ≥ 95%) of test coins reach the final tray.
- No board layout exhibits systematic permanent trapping.
- Any remaining non-scored coins must be in edge cases acceptable for gameplay, not systemic fail states.

### 11.3 UI Hitbox Overlap & Touch Target Tests

Goal: guarantee readable, tappable UI.

Test:

- Headless browser tests (e.g., Playwright/Cypress) render:
  - Desktop viewport.
  - Small mobile viewport (old Android-like).
- For each visible text/button element:
  - Retrieve bounding boxes.
- Check:
  - No two interactive or textual elements have overlapping bounding boxes beyond a small epsilon.
  - On mobile:
    - Each button’s shortest side ≥ minimum tap target (e.g., 44–48 logical pixels).

Includes:

- Main HUD elements.
- Prize Counter UI.
- Any modal overlays.

### 11.4 Prize System Sanity

Goal: ensure prize logic is stable and does not break runs.

Test:

- Run multiple full simulations with different fixed seeds.
- Force prize triggers (board unlock, score thresholds).
- Always select one of the prize options deterministically (e.g., 0).

Assertions:

- No NaN/infinite values after prize effects.
- Prize stacks remain within reasonable numeric ranges (no overflow).
- Prize selection never blocks future progression to 8 boards.

### 11.5 Performance / Health Checks

Goal: catch obvious performance or leak issues early.

Test:

- Run a long simulation (e.g., equivalent of several minutes of gameplay) with:
  - Conservative but non-trivial number of coins.
  - Active queue and pyramid.
- Monitor:
  - Object counts (coins, meshes, event listeners).
  - Frame time or step time.

Assertions:

- Coin and board entities do not grow unbounded.
- No unbounded event subscriptions.
- Physics step remains within a defined time budget in test environment.


============================================================
12. IMPLEMENTATION & TECHNICAL NOTES
============================================================

### 12.1 Tech Stack

- Language: TypeScript or modern JavaScript (ES modules).
- Rendering: three.js (WebGL1 mode).
- Physics:
  - Either custom lightweight physics tailored for coin pushers, or
  - A minimal physics library integrated with three.js for collisions, gravity, and friction.
- Build:
  - Vite / Webpack.
- Tests:
  - Unit/integration: Jest/Vitest.
  - E2E/UI: Playwright/Cypress.

Game code should be modular:

- `GameState` – global run state.
- `BoardManager` – board creation, layout, and routing.
- `ThemeRegistry` – wraps `tierThemes`.
- `PrizeEngine` – prize pool, roll logic, application of effects.
- `CoinSystem` – coin spawning, pooling, path tracking, scoring.
- `QueueSystem` – queue state, auto-drop logic.
- `UISystem` – HUD, Prize Counter, hitbox export for tests.

### 12.2 Data-Driven Content

- Themes live in `tierThemes` (already exists).
- Prizes live in `prizes.ts` (array of ~30 prize definitions).
- Numeric tuning should be easy to adjust via data, not code edits.

### 12.3 Old Android Performance Mode

A config flag (e.g., `lowPerformanceMode`) can:

- Limit simultaneous coin count.
- Disable or reduce particle systems.
- Simplify materials (no specular, no real-time shadows).
- Lower texture resolutions.


============================================================
13. DEVELOPMENT PHASES
============================================================

### Phase 0 – Foundations

- Add this document to `docs/design-spec.md`.
- Implement basic project structure, bundler, and linting.
- Stub:
  - `GameState`.
  - `BoardManager`.
  - `CoinSystem`.
  - `UISystem` (simple debug UI).

### Phase 1 – Single Board Prototype

- Implement a single board:
  - Basic mesh, pusher, simple exits.
- Implement coin spawning, gravity, and forward push.
- Implement scoring when coins fall off the front into a simple scoring zone.
- Add keyboard/mouse controls to drop coins.

### Phase 2 – Pyramid & Routing

- Implement the pyramid layout and board graph.
- Allow adding boards and wiring them as children.
- Ensure coins physically fall from parent boards onto child boards or the final tray.

### Phase 3 – Themes & Focus Effects

- Integrate `tierThemes`.
- Implement:
  - `powerupFocus` semantics (queueSpeed, coinValue, luckyCoins, etc.).
  - Basic obstacle types from `elements`.
- Boards visually and mechanically differ per theme.

### Phase 4 – Queue System & Basic Prizes

- Implement:
  - Queue state, auto-drop.
  - Simple board-driven queue gain.
- Implement a basic Prize system:
  - Define prize data.
  - Prize Counter UI with 6-choice rolls at board unlocks.
  - Apply a small subset of prize effects.

### Phase 5 – Full Prize Pool & Synergy

- Fill out the full 30-prize pool.
- Wire all prizes through the Prize Engine (modifiers/events).
- Ensure synergies between themes and prizes feel meaningful.

### Phase 6 – UX & Old Android Support

- Refine HUD and camera behavior.
- Add Low Performance Mode.
- Optimize geometry, textures, and materials.
- Ensure reasonable performance on low-end test profiles.

### Phase 7 – Test Harness & Automation

- Implement:
  - 8-board full-run simulation test.
  - Coin-flow consistency tests.
  - UI hitbox overlap tests (desktop + mobile).
  - Prize sanity tests.
  - Performance/health tests in CI.
- Add pre-commit hooks to run core tests.

### Phase 8 – Polish & Tuning

- Fine-tune:
  - Multiplier values.
  - Queue growth.
  - Jackpot rates.
  - Combo window lengths.
- Improve visual feedback:
  - Particles, SFX, hit feedback, big-cascade celebration.
- Add basic high score / run summary screen.

### Phase 9 – Packaging

- Implement save/load of runs (optional).
- Add settings menu (audio, graphics quality, performance mode).
- Prepare a simple landing page and instructions.


============================================================
END OF SPEC
============================================================
```
