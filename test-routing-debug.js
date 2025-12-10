/**
 * Quick debug test for coin routing
 */

import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capture console logs
  page.on('console', msg => {
    console.log('Browser:', msg.text());
  });

  await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof Game !== 'undefined');

  const debug = await page.evaluate(() => {
    // Stop the game and clear existing coins
    if (Game.isRunning) {
      Game.stop();
    }

    // Check initial state
    const initialState = {
      hasBoardManager: typeof BoardManager !== 'undefined',
      coinsBoardManagerSet: Coins.boardManager !== null && Coins.boardManager !== undefined,
      boardManagerRef: Coins.boardManager === BoardManager,
      currentBoards: BoardManager ? BoardManager.currentBoardCount : 0
    };

    // Create a board manually
    if (BoardManager) {
      BoardManager.reset();
      BoardManager.init(Game.scene, Board, ThemeEffects);

      // Important: reconnect Coins to the BoardManager
      Coins.boardManager = BoardManager;

      const board1 = BoardManager.createBoard(0);
    }

    // Clear existing coins
    Coins.activeCoins = [];
    Coins.coinQueue = 0;

    // Start the game
    if (!Game.isRunning) {
      Game.start();
    }

    const afterCreation = {
      boards: BoardManager ? BoardManager.currentBoardCount : 0,
      coinsBoardManagerSet: Coins.boardManager !== null,
      topBoardExists: BoardManager && BoardManager.boards.length > 0
    };

    // Debug board details
    const boardDetails = {
      boardCount: BoardManager.boards.length,
      boards: BoardManager.boards.map(b => ({
        id: b.boardId,
        row: b.row,
        col: b.col
      })),
      topBoard: BoardManager.boards.find(b => b.row === 0)
    };

    // Try to drop a coin
    Coins.addToQueue(1);

    // Debug before drop
    const beforeDrop = {
      coinsQueueBefore: Coins.coinQueue,
      coinsActiveBefore: Coins.activeCoins.length
    };

    Game.dropCoin();

    return new Promise(resolve => {
      setTimeout(() => {
        const coin = Coins.activeCoins[0];

        resolve({
          initialState,
          afterCreation,
          boardDetails,
          beforeDrop,
          coinDropped: Coins.activeCoins.length > 0,
          coinCurrentBoard: coin ? coin.currentBoard : null,
          coinPathBoards: coin ? coin.pathBoards : null,
          topBoardId: BoardManager && BoardManager.boards[0] ? BoardManager.boards[0].boardId : null,
          coinsQueueAfter: Coins.coinQueue,
          coinsActiveAfter: Coins.activeCoins.length
        });
      }, 200);
    });
  });

  console.log('\n=== KEY RESULTS ===');
  console.log('Coin dropped:', debug.coinDropped);
  console.log('Coin currentBoard:', debug.coinCurrentBoard);
  console.log('Top board ID:', debug.topBoardId);
  console.log('Coins queue after drop:', debug.coinsQueueAfter);
  console.log('Active coins:', debug.coinsActiveAfter);
  console.log('==================\n');

  await browser.close();
}

main();
