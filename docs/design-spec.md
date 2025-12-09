# Coin Pusher World – Game Design Specification and Task List

## High-Level Vision

- Single-player, run-based roguelite coin-pusher deckbuilder.
- Core fantasy: you’re a dimension-hopping arcade shark, mastering a collection of magical coin-pusher boards to beat increasingly bizarre enemies.
- Like *Slay the Spire*: branching map, runs, relics, deck-building–style progression and synergies.
- Unlike *Slay the Spire*: your plays are physical coin drops onto a simulated board; positioning, timing, and board choice are as important as build choices.

## Design Pillars

- **Skillful Synergy** – Strong builds come from understanding how coins, boards, and relics multiply each other, not from raw RNG.
- **Tactical Physics** – Coin placement matters: edges vs center, timing, stacking, and priming boards for big pushes.
- **Adaptable Runs** – Each run forces you to adapt to the boards, coins, and relics you see; no single dominant strategy.
- **Readable Chaos** – The board is visually busy but outcomes are predictable enough to plan around.

## Core Player Experience

- A run lasts roughly **30–45 minutes**.
- The player chooses a path on a **node map** (battles, elites, events, shops, rest, board nodes).
- Each battle is a series of **rounds**; during your turn you:
  - Choose which **board** to use (if multiple are unlocked/equipped).
  - Spend **energy** to drop coins onto that board.
  - Coins that fall off the front tray or into special slots trigger effects (damage, block, status, gold, etc.).
- Enemies respond with attacks and abilities; you manage HP, block, and statuses.
- Between battles you:
  - Gain new **coins** to add to your coin pool.
  - Acquire **relics**.
  - Upgrade **boards** and coins.
  - Heal, remove coins, and change boards.

## Run Structure

### Acts and Map

- **Acts**: 3 acts, each with increasing difficulty and its own enemy set and boss.
- **Map**:
  - Nodes connected in branching paths.
  - Node types:
    - **Normal Battle** – primary source of rewards.
    - **Elite Battle** – tougher fights, high-value relics.
    - **Shop** – buy coins, relics, board upgrades, heal, remove coins.
    - **Rest** – heal or upgrade a coin or apply a minor board tweak.
    - **Board Node** – unlock, upgrade, or modify boards.
    - **Mystery/Event** – choices with narrative flavor and small swings in power.
    - **Boss** – ends the act; grants high-impact relics and meta progression unlocks.

### Run End

- **Win**: defeat the Act 3 boss → meta rewards (currency, unlocks).
- **Loss**: gain partial meta currency; track progress and achievements.

## Player Resources

- **HP** – Loss condition at 0; replenished partially at rests and via some coins/relics.
- **Energy (per turn)** – Spent to drop coins or activate board abilities.
- **Coin Pool (Deck)**:
  - A bag or pool of coins drawn each turn (e.g., a hand of 5 each turn, drawn from a shuffled pool).
  - Coins are returned to the pool at end of turn; some coins exhaust, transform, or upgrade mid-run.
- **Relics** – Persistent passive modifiers for the duration of the run.
- **Gold** – Used in shops, events, and board upgrades.
- **Meta Currency** – Persistent resource between runs to unlock boards, coins, relics, and difficulty modifiers.

## Coin System (Cards Equivalent)

Coins are the primary tactical actions, like cards in a deckbuilder.

### Coin Definition

Each coin type has:

- **Name** and **tier** (basic, rare, epic).
- **Effect**: triggered when the coin falls off the board or enters a special slot.
- **Cost**: energy required to drop the coin.
- **Tags**: e.g., `Attack`, `Block`, `Draw`, `Status`, `Burn`, `Combo`, `Growth`, `Curse`.
- **Physical traits**: size, weight, and shape that affect how it behaves on the board.

### Example Coins

- **Basic Attack Coin**
  - Cost: 1
  - Effect: Deal 6 damage when pushed off the front.
  - Tags: `Attack`
  - Traits: standard weight and size.
- **Guard Token**
  - Cost: 1
  - Effect: Grant 5 block when it falls.
  - Tags: `Block`
  - Traits: standard weight and size.
- **Heavy Slam**
  - Cost: 2
  - Effect: Deal 10 damage when it falls.
  - Tags: `Attack`, `Heavy`
  - Traits: heavier coin, produces stronger pushes.
- **Chain Coin**
  - Cost: 1
  - Effect: Deal 2 damage plus +2 per other `Chain` coin that fell this turn.
  - Tags: `Attack`, `Combo`
  - Traits: light, encourages cascades.
- **Interest Coin**
  - Cost: 1
  - Effect: Gain 5 gold when it falls; +1 gold per previous Interest Coin that fell this combat.
  - Tags: `Economy`, `Growth`
  - Traits: light, weak push.
- **Curse Coin**
  - Cost: 0
  - Effect: When it falls, you take 3 damage and exhaust it.
  - Tags: `Curse`, `Status`
  - Traits: awkward shape that clogs lanes.

### Draw and Turn Flow

- At the **start of turn**, draw `N` coins from the coin pool into your hand (e.g., 5).
- Spend energy to **drop coins** onto the active board (drag-and-drop at top, or lane buttons).
- You may end the turn early; unused coins are:
  - Discarded, or
  - Retained in hand,
  - Depending on relics and board rules.
- At **end of turn**:
  - Board resolves any lingering effects (e.g., shaker effects).
  - Enemy takes its turn.
  - Most coins re-enter the pool for reshuffling (unless exhausted or transformed).

## Board System

Boards are like classes or stances: each defines the geometry and rules for coin pushing. Players can own multiple boards in a run and swap between them in battles (with constraints).

### Board Characteristics

Each board has:

- **Lane layout** – Number of lanes, lane width, and angle; influences how coins slide and stack.
- **Shelf depth/height** – How many layers of coins accumulate before falling.
- **Edge behaviors** – Side pockets, fall-off modifiers, or side rails.
- **Special slots** – Holes or targets that trigger special effects.
- **Active ability** – A board-specific ability activated with energy or another resource (shake, tilt, magnetize, etc.).
- **Passive bonus** – Board-specific rules that modify coin effects (e.g., `+1 damage to first Attack coin that falls each turn`).

### Example Boards

#### Arcade Classic (Starter)

- Layout: Straight, three-lane board, medium shelf depth.
- Passive: `+1 damage` to the first Attack coin that falls each turn.
- Active: **Shake** (cost 2 energy) – small extra push to all coins.

#### Combo Cascade

- Layout: Narrow central lane, wide side lanes with side pockets.
- Side pockets: Trigger extra draws or energy when filled.
- Passive: For each coin that falls this turn, the next coin’s effect is increased by `+10%`.
- Active: **Cascade** (cost 1 energy) – drop a free lightweight `Combo` coin in the center lane.

#### Bulwark Board

- Layout: Deep shelf; coins fall slowly; one wide front zone.
- Passive: Every 3rd coin that falls grants double block instead of its normal effect (if it grants block).
- Active: **Fortify** (cost 2 energy) – convert the next 2 Attack coins that fall into Guard Tokens with +50% block.

#### Risky Jackpot

- Layout: Many small jackpot slots at the front with multipliers; coins can also fall into void slots and do nothing.
- Passive: Attack coin damage doubled if they fall into a jackpot; 50% chance coins fall into a void slot and have no effect.
- Active: **Tilt** (cost 2 energy) – nudge coins toward the jackpot side for a turn.

### Board Progression and Upgrades

- Between nodes, players can:
  - Unlock new boards.
  - Upgrade boards (more slots, stronger passive, cheaper active, better geometry).
  - Add small **mod chips** (board augment items) that slightly alter behavior:
    - Example: `Left lane Attack coins deal +2 damage.`
    - Example: `Board drops a free Guard Token at the start of battle.`

## Relic System

Relics are the primary long-term run modifiers and synergy amplifiers.

### Relic Types

- **Economy relics** – more gold, cheaper shops, better coin rewards.
- **Board relics** – modify board physics or abilities.
- **Coin relics** – buff coins with certain tags (`Attack`, `Block`, `Combo`, `Heavy`, `Light`).
- **Status relics** – apply starting buffs/debuffs per combat or interact with statuses.

### Example Relics

- **Weighted Edge**
  - Heavy coins gain +3 push strength and +2 damage.
- **Frontline Shields**
  - First Block coin that falls each turn grants +50% block.
- **Lucky Token**
  - First coin that falls into a special slot each combat triggers its effect twice.
- **Greedy Claw**
  - Gain 5 gold each time more than 3 coins fall in a single chain.
- **Safety Rails**
  - Cursed coins are less likely to fall; when they do, reduce their self-damage by 2.

Relics should clearly suggest build directions (e.g., heavy coins, big cascades, board actives, curses).

## Synergy Design

Synergies are the heart of skill expression. They arise from combining coins, boards, and relics.

### Coin Tag Synergies

- **Attack + Combo**
  - Coins that increase each other’s damage when multiple fall in a turn.
  - Example: `Chain Coin` + relics that reward multi-fall turns.
- **Defense + Growth**
  - Block coins that grow stronger throughout a combat or run.
  - Example: `Scaling Shield` coin that gains +1 block each time it falls.
- **Economy + Greed**
  - Coins that trade short-term damage for long-term gold or relic benefits.
  - Example: Interest Coin plus relics that give combat bonuses based on gold.
- **Status Coins**
  - Poison/burn/freeze equivalents that stack with each other and with relics or boards.

### Board Synergies

- Boards that **reward stacking** (deep shelves) vs **quick falling** (shallow shelves).
- Boards that favor **heavy** vs **light** coins.
- Boards with high-value **special slots** vs general pushing.

### Relic Synergies

- Relics that **double down** on a board’s identity:
  - Example: Board that loves cascades + relic that boosts damage per coin that fell this turn.
- Relics that **invert drawbacks**:
  - Example: curses that are bad on most boards become beneficial on a specific board with the right relic.

### Skillful Play

Player skill shines in:

- Choosing which board to use each combat or turn.
- Choosing coin drop positions to maximize the chance of key coins falling now vs later.
- Planning several turns ahead to set up a **big push round** (hoarding heavy coins, setting board state).
- Drafting coins and relics that support an emerging synergy rather than spreading power thinly.

## Combat and Enemy Design

### Enemy Behaviors

- Enemies telegraph their intent (attack, buff, debuff, defend) similarly to Slay the Spire.
- Enemy design includes:
  - Enemies that **punish long setups** (e.g., damage scaling each turn).
  - Enemies that **punish spam** of small pushes (e.g., reactive damage to every coin fall).
  - Enemies that **reward burst turns** (e.g., break shields if hit hard in one turn).
  - Enemies that **interact with the board**:
    - Add junk coins.
    - Add curse coins.
    - Freeze or lock certain lanes.

### Status Effects

Core statuses include:

- **Block/Armor** – temporary damage reduction.
- **Poison** – damage at end of turn.
- **Burn** – damage when the target takes certain actions.
- **Stun** – skip next action.
- **Fragile** – take extra damage from the next hit(s).
- **Heavy** – harder to push; may be beneficial or harmful.
- **Slippery** – easier to push; coins move farther.

Some statuses affect the board:

- **Oiled** board: higher slip; coins slide farther than normal.
- **Frozen** board: coins move less per push, requiring more turns to fall.

### Difficulty Curve

- **Act 1**:
  - Low punishing mechanics.
  - Focus on teaching board basics and simple synergies.
- **Act 2**:
  - Introduces enemies that constrain or pressure board strategies (e.g., lane-locking, curse spam).
- **Act 3**:
  - High synergy demands.
  - Players must have a coherent build or be very skilled tactically to win.

## Progression and Meta

### Meta Unlocks

Between runs, meta progression can unlock:

- New boards.
- New coin types.
- New relics.
- New enemy packs and act variants.

### Ascension / Difficulty Levels

- Ascension-style system (e.g., **Arcade Levels**):
  - Enemies start with more HP.
  - Fewer rest nodes.
  - Less forgiving board geometry (shallower shelves, more voids).
  - Stronger curses and junk coins.

### Run Variety

- Different **starting boards** and starter coin sets.
- Optional **mutators**:
  - *Heavy World* – all coins are heavier.
  - *Tilted* – boards are permanently slanted.
  - *Jackpot Fever* – more special slots, but they’re unpredictable.

## UX and Aesthetic Direction

### Visual Style

- Colorful, arcade-inspired aesthetic with fantasy/sci-fi flair.
- Distinct looks for each board (materials, glow, decorations).
- Clear **lane** and **slot** indicators; coin types easily distinguished by color and iconography.

### Feedback and Juice

- Strong feedback when coins fall, especially big cascades:
  - Screen shake (configurable).
  - Sound and particle effects.
- Clear state indicators:
  - Enemy intent icons.
  - Player HP and block.
  - Status icons with tooltips.
  - Upcoming enemy actions.

### Readability

- Slow motion or highlight effect for big pushes.
- Option to **fast-forward** simple turns.
- Hover tooltips for coins, boards, and relics with clear text summaries.

## Implementation-Level Scope (High-Level)

- Likely stack: JavaScript/TypeScript with a browser-based renderer.
- Possible tech choices:
  - Canvas/WebGL using a lightweight engine (e.g., Phaser) or custom rendering.
  - Simple pseudo-physics model for coin pushing (grid/heightmap) rather than full rigid-body physics.
- Core systems:
  - **Run and map management** (acts, nodes, progression).
  - **Combat loop** (turns, turns timers, enemy AI).
  - **Board simulation** (lanes, pushes, slot triggers).
  - **Coin pool** management (deckbuilder logic).
  - **Relic and status effect** engine (event-driven).
  - **Content data** stored in JSON/TS objects for coins, boards, relics, enemies, and events.

---

# Development Task List

This is a phased backlog for implementing the game.

## Phase 0 – Spec and Foundations

- Record this design spec in version control (`docs/design-spec.md`).
- Define core terminology in code and documentation:
  - Coin, board, relic, status, node, act, run.
- Choose and document the tech stack (engine, renderer, physics approach).
- Set up project structure, build tooling, linting, and basic tests.

## Phase 1 – Core Systems Prototype

- Implement a minimal **game shell** with a single run:
  - State management for `Run → Map → Combat → Rewards`.
- Implement the basic **coin pool** system:
  - Define a coin data structure (stats, tags, effects).
  - Draw/discard/reshuffle logic per turn.
- Implement basic **board simulation**:
  - Represent board as lanes and discrete positions (grid or height-based).
  - Implement coin placement at the top and step-based pushing toward the front.
  - Detect coins falling off the front vs into special slots.
- Implement simple **combat**:
  - Single enemy with HP and basic telegraphed attack.
  - Player HP/block/damage resolution based on coin effects.
  - End-of-combat reward: choose 1 of 3 new coins; gain gold.

## Phase 2 – Boards and Relics Core

- Implement multiple **board types**:
  - Data model for boards (layout, passive, active).
  - Board selection at run start and/or before combat.
  - Board-specific geometry and special slots.
- Implement **board active abilities**:
  - Energy cost, per-turn or per-combat limits.
  - UI elements (buttons, icons) and basic animations.
- Implement the **relic system**:
  - Data model for relics, acquisition, and persistent run effects.
  - Hook relic effects into key events (coin drop, coin fall, start/end of turn, start/end of combat).

## Phase 3 – Content Pass 1

- Design and implement initial content sets:
  - **Coins**:
    - ~30–40 coins covering attacks, block, economy, combo, curses.
  - **Boards**:
    - 4–6 boards with distinct identities (starter + specialized boards).
  - **Relics**:
    - ~20–30 relics that support clear build archetypes.
  - **Enemies**:
    - 10–15 base enemies across Acts 1–2.
    - 3–4 elite enemies.
    - 2–3 bosses.
- Implement the **node map**:
  - Branching map generator for Acts 1–3.
  - Node types: battle, elite, shop, rest, boss, event (event content can be stubbed).

## Phase 4 – Synergy and Balance Iteration

- Playtest internally to evaluate **core feel**:
  - Tune coin damage, block values, and energy costs.
  - Adjust board geometry and actives for clarity and power balance.
- Establish **build archetypes** and ensure they are viable:
  - Heavy coin builds.
  - Combo/cascade builds.
  - Defense/growth builds.
  - Economy/greed builds.
- Add basic **tooltips and synergy hints**:
  - Highlight relevant tags (e.g., all `Heavy` coins when hovering a heavy-synergy relic).
  - Add tutorial prompts explaining boards, coins, and relics in early runs.

## Phase 5 – Map, Events, and Shops

- Implement **shop nodes**:
  - Buying coins, relics, board upgrades, removals, healing.
  - Price curves, rarity tiers, and refresh behavior.
- Implement **rest nodes**:
  - Heal vs upgrade decisions (coins, board minor upgrades).
- Implement **board nodes**:
  - Introduce new boards mid-run.
  - Offer board upgrades or mod chips.
- Implement **event nodes**:
  - 10–20 narrative events with multiple choices and outcomes.
  - Mix of risk/reward (e.g., gain a powerful relic in exchange for a curse).

## Phase 6 – Meta Progression

- Implement **meta currency** and progression:
  - Reward currency on win and on death.
  - Build an unlock tree for boards, coins, relics, and enemy packs.
- Implement **ascending difficulty**:
  - Arcade Level / Ascension system with stacking modifiers.
- Add **achievement tracking**:
  - Wins with specific archetypes.
  - Specific feats (e.g., chain 10 coins in a single push, win with only one board).

## Phase 7 – UX, Visuals, and Juice

- Upgrade **board visuals**:
  - Distinct look and feel for each board.
  - Clear lane and slot indicators.
- Polish **animations and effects**:
  - Coin falling, stacking, and cascading.
  - Hit/block feedback and enemy animations.
- Add **audio**:
  - Coin clinks, board shuffles, push cascades.
  - UI sound effects and simple music loops.
- Add **options and accessibility**:
  - Speed controls (normal/fast).
  - Colorblind-friendly tags and contrast.
  - Reduced motion option.

## Phase 8 – Testing, Tuning, and Polish

- Add unit tests for:
  - Coin effects and triggers.
  - Board behaviors and geometry logic.
  - Relic interactions and status handling.
- Add automated **sanity checks**:
  - Simulation runs to approximate win rates and detect extreme outliers.
- Balance iteration:
  - Tune enemy HP/damage curves.
  - Adjust coin and relic power levels.
- Finalize **onboarding**:
  - Tutorial battles.
  - Quick-start tooltips and a minimal text walkthrough.

## Phase 9 – Packaging and Release Prep

- Implement **save/load** for ongoing runs.
- Add player **settings**:
  - Audio and graphics.
  - Keybinds/mouse settings.
- Build **distribution pipeline**:
  - Web build and/or desktop packaging.
- Create a minimal **landing page** and player-facing instructions.

