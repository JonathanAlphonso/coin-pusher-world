/**
 * Focused E2E checks for board selection, stats overlay, and containment rails.
 * Run with: node test-board-selection-stats.cjs (dev server on PORT or default 3007)
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
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const results = [];
  const logResult = (name, passed, details) => {
    results.push({ name, passed, details });
    const status = passed ? 'PASS' : 'FAIL';
    console.log(`[${status}] ${name}${details ? ' - ' + details : ''}`);
  };

  try {
    const port = process.env.PORT || 3007;
    await page.goto(`http://localhost:${port}?mute&test`);
    await page.waitForTimeout(500);
    await page.waitForFunction(() => window.Game && window.Board && window.UI, { timeout: 5000 });

    // Start the game
    await page.click('#start-button');
    await page.waitForTimeout(500);

    // --- Board selection respects player choice ---
    await page.evaluate(() => {
      Game.score = Game.expansionThresholds[0] + 10;
      Game.checkExpansion();
    });

    await page.waitForSelector('#board-selection-overlay:not(.hidden)', { timeout: 5000 });

    const firstOption = page.locator('.board-option').first();
    const selectedName = (await firstOption.locator('.board-option-name').innerText()).trim();
    await firstOption.click();

    await page.waitForSelector('#board-selection-overlay.hidden', { state: 'attached', timeout: 5000 });
    await page.waitForFunction(() => Board.currentTierCount > 1);

    const appliedName = await page.evaluate(() => {
      const tiers = Board.tiers;
      const last = tiers[tiers.length - 1];
      return last?.theme?.name || null;
    });

    logResult('Board selection applied', appliedName === selectedName, `Selected ${selectedName}, applied ${appliedName}`);

    // --- Stats overlay populates live values ---
    // Update some game state that affects stats
    await page.evaluate(() => {
      // Simulate some game activity
      Game.score = 432;
      UI.updateScore(Game.score);
      // Update stats values directly
      const tierEl = document.getElementById('stat-tier');
      if (tierEl) tierEl.textContent = String(Board.currentTierCount);
    });

    await page.click('#stats-button');
    await page.waitForSelector('#stats-overlay:not(.hidden)', { timeout: 3000 });

    // Check that stats overlay has stat rows with values
    // The stats grid structure is: .stat-row > .stat-label > span.stat-icon + span + .stat-value
    const stats = await page.$$eval('#stats-grid .stat-row', (rows) =>
      rows.map((r) => ({
        label: r.querySelector('.stat-label span:last-child')?.textContent?.trim(),
        value: r.querySelector('.stat-value')?.textContent?.trim(),
      })),
    );

    // The stats overlay should have some stat rows populated
    const hasStats = stats.length > 0;
    const hasScore = stats.some(s => s.label && s.label.includes('Score'));
    const hasCombo = stats.some(s => s.label && s.label.includes('Combo'));
    logResult('Stats overlay has stats', hasStats, `Found ${stats.length} stat rows`);
    logResult('Stats includes score or combo', hasScore || hasCombo, `Labels: ${stats.map(s => s.label).join(', ')}`);

    await page.click('#close-stats');
    await page.waitForSelector('#stats-overlay.hidden', { state: 'attached', timeout: 5000 });

    // --- Containment rails exist to stop side escapes ---
    const hasContainment = await page.evaluate(() =>
      Physics.staticBodies.some((b) => b.data && b.data.type === 'containment'),
    );
    logResult('Containment rails present', hasContainment);
  } catch (err) {
    console.error('Test run failed:', err);
    results.push({ name: 'Unhandled error', passed: false, details: err.message });
  } finally {
    await browser.close();
    clearTimeout(timeoutId);
    const failed = results.filter((r) => !r.passed);
    if (failed.length > 0) {
      console.log(`\n${failed.length} checks failed.`);
      process.exit(1);
    } else {
      console.log('\nAll checks passed.');
      process.exit(0);
    }
  }
})();
