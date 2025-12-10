# Testing Guide - Coin Pusher World

**Last Updated:** 2025-12-10

This document describes all testing infrastructure for Coin Pusher World, according to Design Spec Section 11.

---

## Test Overview

**Total Test Coverage: 62/62 tests passing** ✅

The game has comprehensive automated testing covering all major systems and requirements from the design specification.

---

## Automated Test Suites

### 1. Comprehensive Test Suite (20 tests)
**File:** `test-comprehensive.js`
**Run:** `node test-comprehensive.js` or `npm run test:comprehensive`
**Duration:** ~2.5s
**Purpose:** Core game functionality and system integration

**Coverage:**
- ✅ Game initialization
- ✅ Three.js scene setup
- ✅ Board geometry creation
- ✅ Physics system
- ✅ Coin dropping and physics updates
- ✅ UI element presence
- ✅ Scoring system
- ✅ All game systems (Combo, Jackpot, PowerUps, CoinRain, Collectibles, Prizes, DailyChallenges)
- ✅ Console error detection
- ✅ Coin cleanup (memory leaks)
- ✅ Score validation (no NaN/Infinity)
- ✅ Pusher movement
- ✅ Object count stability

**Design Spec Compliance:** Sections 11.2, 11.5

---

### 2. 8-Board Pyramid Test (11 tests)
**File:** `test-8board-pyramid.js`
**Run:** `node test-8board-pyramid.js` or `npm run test:pyramid`
**Duration:** ~2s
**Purpose:** Full playthrough validation (Design Spec 11.1)

**Coverage:**
- ✅ Fixed RNG seed for deterministic behavior
- ✅ Board creation up to 8 boards
- ✅ Pyramid structure (1→2→3→2 layout)
- ✅ Parent-child relationships
- ✅ ThemeEffects integration with all 8 powerupFocus types
- ✅ No deadlocks or NaN values
- ✅ Pyramid cannot exceed 8 boards
- ✅ Coin processing through full pyramid
- ✅ Game remains responsive

**Design Spec Compliance:** Section 11.1 - Full Playthrough to 8 Boards

---

### 3. UI Hitbox Tests (19 tests)
**File:** `test-ui-hitbox.js`
**Run:** `node test-ui-hitbox.js` or `npm run test:ui`
**Duration:** ~5s
**Purpose:** UI overlap and accessibility validation (Design Spec 11.3)

**Viewports Tested:**
- Desktop (1280×720) - 4 tests
- Tablet (768×1024) - 5 tests
- Mobile (375×667) - 5 tests
- Old Android (800×480) - 5 tests

**Coverage:**
- ✅ UI elements visible in all viewports
- ✅ No overlapping interactive elements
- ✅ Minimum tap target validation (44-48px)
- ✅ Button sizing validation
- ✅ Viewport bounds checking

**Design Spec Compliance:** Section 11.3 - UI Hitbox Overlap & Touch Target Tests

---

### 4. Board Manager Unit Tests (12 tests)
**File:** `test-board-manager.js`
**Run:** `node test-board-manager.js`
**Duration:** <0.5s
**Purpose:** Isolated unit tests for BoardManager (no browser required)

**Coverage:**
- ✅ BoardManager initialization
- ✅ Top board creation at row 0, col 0
- ✅ Next available slot calculation
- ✅ Child board linking to parents
- ✅ Full 8-board pyramid creation
- ✅ Row distribution (1+2+3+2 = 8)
- ✅ Mid-tier board exit routing
- ✅ Bottom-tier scoring tray routing
- ✅ World position calculations
- ✅ Board retrieval by ID
- ✅ Excluded themes tracking
- ✅ Reset functionality

**Design Spec Compliance:** Section 6 - Pyramid Structure & Routing

---

## Running All Tests

### Quick Run (Main Test Suites)
```bash
npm test
```
Runs all 3 primary test suites: comprehensive (20) + pyramid (11) + UI (19) = **50 tests**

### Individual Test Suites
```bash
npm run test:comprehensive  # 20 tests
npm run test:pyramid        # 11 tests
npm run test:ui             # 19 tests
```

### All Tests (Including Unit Tests)
```bash
npm test && node test-board-manager.js
```
Runs all automated tests: **62 tests total**

---

## Debug Tools (Browser Console)

These are manual debugging tools, not automated tests. Run them in the browser console during gameplay.

### Pusher Physics Debug
**File:** `test-pusher.js`
**Usage:** Load in browser console

```javascript
PusherDebug.start()     // Start monitoring
PusherDebug.stop()      // Stop monitoring
PusherDebug.snapshot()  // One-time state dump
PusherDebug.runTest()   // Automated check for backward push bugs
```

**Purpose:** Verify coins are NEVER pushed backward by the pusher

---

### Coin Drop Position Debug
**File:** `test-drop-position.js`
**Usage:** Load in browser console

```javascript
DropTest.start()    // Start monitoring
DropTest.stop()     // Stop monitoring
DropTest.runTest()  // Drop many coins and check positions
```

**Purpose:** Verify coins NEVER spawn behind the board (negative Z beyond back wall)

---

## Deprecated/Legacy Tests

### test-tier-debug.js
- **Status:** Deprecated (uses CommonJS require, old port)
- **Replacement:** test-8board-pyramid.js covers tier/board unlocking
- **Keep?** Can be deleted

### test-pyramid.js
- **Status:** Potentially redundant
- **Overlap:** Similar to test-8board-pyramid.js
- **Keep?** Review and possibly consolidate

---

## Test Requirements (Design Spec Section 11)

All test suites implement the following requirements:

### ✅ Timeouts
All tests have timeouts to prevent hanging:
- Browser tests: 30-120 seconds
- Unit tests: Synchronous (instant)

### ✅ Deterministic Behavior
Tests use fixed RNG seeds where applicable for reproducibility.

### ✅ No Manual Intervention
All tests are fully automated and can run in CI/CD.

### ✅ Clear Pass/Fail Output
All tests provide:
- ✅/❌ status for each test
- Summary with passed/failed counts
- Duration metrics
- Detailed error messages on failure

---

## Design Spec Compliance Summary

| Spec Section | Requirement | Test File | Status |
|--------------|-------------|-----------|--------|
| 11.1 | Full Playthrough to 8 Boards | test-8board-pyramid.js | ✅ 11/11 |
| 11.2 | Coin Flow to Final Boards | test-comprehensive.js | ✅ Covered |
| 11.3 | UI Hitbox Overlap & Touch | test-ui-hitbox.js | ✅ 19/19 |
| 11.4 | Prize System Sanity | test-comprehensive.js, test-8board-pyramid.js | ✅ Covered |
| 11.5 | Performance/Health Checks | test-comprehensive.js | ✅ Covered |
| 6.x | Pyramid Structure | test-board-manager.js | ✅ 12/12 |

**Total Coverage:** All required test categories implemented ✅

---

## Adding New Tests

When adding new features, ensure tests cover:

1. **Happy Path** - Feature works as intended
2. **Edge Cases** - Boundary conditions (max boards, zero values, etc.)
3. **Error Handling** - No crashes, NaN, or infinite loops
4. **Performance** - No memory leaks or unbounded growth
5. **Integration** - Works with existing systems

Example test structure:
```javascript
test('Feature does X correctly', async () => {
  // Arrange - Setup test conditions
  // Act - Perform the action
  // Assert - Verify expected outcome
});
```

---

## Continuous Integration

For CI/CD pipelines, run:
```bash
npm test
```

Expected result: **50/50 tests passing** ✅

For comprehensive validation including unit tests:
```bash
npm test && node test-board-manager.js
```

Expected result: **62/62 tests passing** ✅

---

## Troubleshooting

### Tests Hang Forever
- All tests have timeouts, but if you see hanging, check:
  - Browser not launching (Playwright/Puppeteer issues)
  - Port conflicts (tests expect different ports)

### Browser Not Found Error
```bash
npx playwright install chromium
```

### Port Already in Use
Tests use different ports, check your dev server isn't running on the same port.

---

## Test Maintenance

- Run tests before every commit
- Update tests when adding features
- Keep test documentation current
- Remove deprecated tests when confident in replacements
