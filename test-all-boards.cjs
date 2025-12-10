/**
 * Ensures every board theme can be added and applied (no single-theme lock).
 * Run with: node test-all-boards.cjs (dev server on PORT or default 3007)
 */
const { chromium } = require('playwright');

// Global timeout to prevent hanging (2 minutes)
const GLOBAL_TIMEOUT = 120000;
const timeoutId = setTimeout(() => {
  console.log('\n[TIMEOUT] Test exceeded 2 minute limit, forcing exit');
  process.exit(1);
}, GLOBAL_TIMEOUT);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  try {
    const port = process.env.PORT || 3007;
    await page.goto(`http://localhost:${port}?mute&test`);
    await page.waitForFunction(() => window.Game && window.Board && Board.tierThemes);
    await page.click('#start-button');
    await page.waitForTimeout(300);

    // Unlock all tiers by directly invoking the board expansion logic per theme index.
    await page.evaluate(() => {
      // Start clean
      Board.cleanup();
      Board.init(Game.scene, {
        physics: Game.physics,
        coins: Game.coins,
        ui: Game.ui,
        game: Game,
      });

      // Apply every theme sequentially (skip theme 0 which is already active)
      for (let i = 1; i < Board.tierThemes.length; i++) {
        Board.expandWithTheme(i);
      }
    });

    await page.waitForFunction(() => Board.currentTierCount === Board.tierThemes.length);

    const { themesApplied, uniqueCount, totalThemes } = await page.evaluate(() => {
      const applied = Board.tiers
        .filter(t => t.theme)
        .map(t => t.theme.name);
      return {
        themesApplied: applied,
        uniqueCount: new Set(applied).size,
        totalThemes: Board.tierThemes.length,
      };
    });

    console.log('Themes applied:', themesApplied);
    console.log('Unique themes:', uniqueCount);

    if (uniqueCount !== totalThemes) {
      throw new Error('Not all themes were applied uniquely.');
    }

    console.log('PASS: All board themes can be added without repeating a single theme.');
    clearTimeout(timeoutId);
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('FAIL:', err);
    await page.screenshot({ path: 'screenshots/all-boards-fail.png' }).catch(() => {});
    clearTimeout(timeoutId);
    await browser.close();
    process.exit(1);
  }
})();
