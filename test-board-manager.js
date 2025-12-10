/**
 * Board Manager Test Suite
 * Tests pyramid structure, board linking, and routing
 *
 * Run with: node test-board-manager.js
 */

import BoardManager from './src/systems/BoardManager.js';

let passedTests = 0;
let failedTests = 0;
const errors = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function test(name, testFn) {
  try {
    testFn();
    console.log(`✅ PASSED: ${name}`);
    passedTests++;
  } catch (error) {
    console.error(`❌ FAILED: ${name}`);
    console.error(`   ${error.message}`);
    failedTests++;
    errors.push({ test: name, error: error.message });
  }
}

console.log('═══════════════════════════════════════════════════════');
console.log('   Board Manager Test Suite');
console.log('═══════════════════════════════════════════════════════\n');

// Test 1: Initialization
test('BoardManager initializes correctly', () => {
  BoardManager.init(null, null);
  assert(Array.isArray(BoardManager.boards), 'boards should be an array');
  assert(BoardManager.currentBoardCount === 0, 'should start with 0 boards');
  assert(BoardManager.maxBoards === 8, 'max boards should be 8');
});

// Test 2: Create first board (top of pyramid)
test('Creates top board at row 0, col 0', () => {
  BoardManager.reset();
  BoardManager.init(null, null);

  const board = BoardManager.createBoard(0); // Theme index 0
  assert(board !== null, 'should create board');
  assert(board.row === 0, 'first board should be at row 0');
  assert(board.col === 0, 'first board should be at col 0');
  assert(board.parent === null, 'top board should have no parent');
  assert(BoardManager.currentBoardCount === 1, 'board count should be 1');
});

// Test 3: Next slot calculation
test('Calculates next available slot correctly', () => {
  BoardManager.reset();
  BoardManager.init(null, null);

  // First slot: row 0, col 0
  let slot = BoardManager.getNextAvailableSlot();
  assert(slot.row === 0 && slot.col === 0, 'first slot should be (0,0)');

  // Add first board
  BoardManager.createBoard(0);

  // Second slot: row 1, col 0
  slot = BoardManager.getNextAvailableSlot();
  assert(slot.row === 1 && slot.col === 0, 'second slot should be (1,0)');

  // Add second board
  BoardManager.createBoard(1);

  // Third slot: row 1, col 1
  slot = BoardManager.getNextAvailableSlot();
  assert(slot.row === 1 && slot.col === 1, 'third slot should be (1,1)');
});

// Test 4: Board linking to parents
test('Links child boards to parents correctly', () => {
  BoardManager.reset();
  BoardManager.init(null, null);

  // Create top board (row 0, col 0)
  const top = BoardManager.createBoard(0);

  // Create two children (row 1, col 0 and col 1)
  const leftChild = BoardManager.createBoard(1);
  const rightChild = BoardManager.createBoard(2);

  // Check parent references
  assert(leftChild.parent === top.boardId, 'left child should reference parent');
  assert(rightChild.parent === top.boardId, 'right child should reference parent');

  // Check child references on parent
  assert(top.childLeft === leftChild.boardId, 'parent should reference left child');
  assert(top.childRight === rightChild.boardId, 'parent should reference right child');
});

// Test 5: Full pyramid creation (8 boards)
test('Creates full 8-board pyramid', () => {
  BoardManager.reset();
  BoardManager.init(null, null);

  // Add 8 boards
  for (let i = 0; i < 8; i++) {
    const board = BoardManager.addBoard(i % 8); // Use theme indices 0-7
    assert(board !== null, `should create board ${i + 1}`);
  }

  assert(BoardManager.currentBoardCount === 8, 'should have 8 boards');
  assert(BoardManager.getStatus().isFull, 'pyramid should be full');

  // Try to add 9th board
  const extraBoard = BoardManager.addBoard(0);
  assert(extraBoard === null, 'should not create 9th board');
});

// Test 6: Pyramid layout validation
test('Pyramid has correct row distribution', () => {
  BoardManager.reset();
  BoardManager.init(null, null);

  // Create 8 boards
  for (let i = 0; i < 8; i++) {
    BoardManager.addBoard(i % 8);
  }

  const status = BoardManager.getStatus();

  // Expected: Row 0: 1, Row 1: 2, Row 2: 3, Row 3: 2
  assert(status.rowCounts[0] === 1, 'row 0 should have 1 board');
  assert(status.rowCounts[1] === 2, 'row 1 should have 2 boards');
  assert(status.rowCounts[2] === 3, 'row 2 should have 3 boards');
  assert(status.rowCounts[3] === 2, 'row 3 should have 2 boards');
});

// Test 7: Exit routing for mid-tier board
test('Mid-tier board exits route to children', () => {
  BoardManager.reset();
  BoardManager.init(null, null);

  const top = BoardManager.createBoard(0);
  const leftChild = BoardManager.createBoard(1);
  const rightChild = BoardManager.createBoard(2);

  // Top board should have exits routing to children
  const leftTarget = BoardManager.getExitTarget(top.boardId, 'left');
  const rightTarget = BoardManager.getExitTarget(top.boardId, 'right');

  assert(leftTarget.targetType === 'board', 'left exit should route to board');
  assert(leftTarget.targetId === leftChild.boardId, 'left exit should route to left child');

  assert(rightTarget.targetType === 'board', 'right exit should route to board');
  assert(rightTarget.targetId === rightChild.boardId, 'right exit should route to right child');
});

// Test 8: Exit routing for bottom board
test('Bottom-tier boards route to scoring tray', () => {
  BoardManager.reset();
  BoardManager.init(null, null);

  // Fill pyramid to get bottom tier boards
  for (let i = 0; i < 8; i++) {
    BoardManager.addBoard(i % 8);
  }

  // Get boards in bottom row (row 3)
  const bottomBoards = BoardManager.getBoardsInRow(3);
  assert(bottomBoards.length === 2, 'should have 2 boards in bottom row');

  // Check their exits
  const bottomBoard = bottomBoards[0];
  const target = BoardManager.getExitTarget(bottomBoard.boardId, 'left');

  assert(target.targetType === 'scoring_tray', 'bottom board should route to scoring tray');
  assert(target.targetId === 'final_tray', 'should route to final tray');
});

// Test 9: World position calculation
test('Calculates world positions correctly', () => {
  BoardManager.reset();
  BoardManager.init(null, null);

  const board1 = BoardManager.createBoard(0);
  const board2 = BoardManager.createBoard(1);
  const board3 = BoardManager.createBoard(2);

  // Row 0, col 0 should be at y=0
  assert(board1.worldPosition.y === 0, 'row 0 should be at y=0');

  // Row 1 boards should be lower (negative y)
  assert(board2.worldPosition.y < 0, 'row 1 should be below row 0');
  assert(board3.worldPosition.y < 0, 'row 1 should be below row 0');
  assert(board2.worldPosition.y === board3.worldPosition.y, 'same row should have same y');

  // Boards in same row should have different x
  assert(board2.worldPosition.x !== board3.worldPosition.x, 'boards in row should have different x');
});

// Test 10: Board lookup by ID
test('Can retrieve boards by ID', () => {
  BoardManager.reset();
  BoardManager.init(null, null);

  const board = BoardManager.createBoard(0);
  const retrieved = BoardManager.getBoard(board.boardId);

  assert(retrieved !== null, 'should retrieve board');
  assert(retrieved.boardId === board.boardId, 'should retrieve correct board');
  assert(retrieved === board, 'should be same object reference');
});

// Test 11: Excluded themes
test('Tracks excluded themes correctly', () => {
  BoardManager.reset();
  BoardManager.init(null, null);

  BoardManager.createBoard(0); // Neon Arcade
  BoardManager.createBoard(3); // Pirate Cove
  BoardManager.createBoard(5); // Space Station

  const excluded = BoardManager.getExcludedThemes();
  assert(excluded.includes(0), 'should include theme 0');
  assert(excluded.includes(3), 'should include theme 3');
  assert(excluded.includes(5), 'should include theme 5');
  assert(excluded.length === 3, 'should have 3 excluded themes');
});

// Test 12: Reset functionality
test('Reset clears all boards', () => {
  BoardManager.reset();
  BoardManager.init(null, null);

  // Add some boards
  BoardManager.createBoard(0);
  BoardManager.createBoard(1);
  BoardManager.createBoard(2);

  assert(BoardManager.currentBoardCount === 3, 'should have 3 boards before reset');

  // Reset
  BoardManager.reset();

  assert(BoardManager.currentBoardCount === 0, 'should have 0 boards after reset');
  assert(BoardManager.boards.length === 0, 'boards array should be empty');
  assert(Object.keys(BoardManager.boardsById).length === 0, 'boardsById should be empty');
});

// Print results
console.log('\n═══════════════════════════════════════════════════════');
console.log('                    TEST RESULTS');
console.log('═══════════════════════════════════════════════════════');
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);

if (errors.length > 0) {
  console.log('\n📋 Failed Tests:');
  errors.forEach(err => {
    console.log(`   • ${err.test}: ${err.error}`);
  });
}

console.log('═══════════════════════════════════════════════════════\n');

process.exit(failedTests > 0 ? 1 : 0);
