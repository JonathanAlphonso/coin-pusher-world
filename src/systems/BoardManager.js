/**
 * Board Manager for Coin Pusher World
 * Manages the pyramid structure of boards and coin routing
 * According to design spec section 6
 */

import { getThemeOptions, tierThemes } from '../world/themes/index.js';

const BoardManager = {
  // Pyramid of boards
  boards: [],

  // Board lookup by ID
  boardsById: {},

  // Current pyramid configuration
  maxBoards: 8,
  currentBoardCount: 0,

  // Pyramid layout configuration
  // Row 0: 1 board (top)
  // Row 1: 2 boards
  // Row 2: 3 boards
  // Row 3: 2 boards (total = 8)
  pyramidLayout: [
    { row: 0, slots: 1 },  // Top
    { row: 1, slots: 2 },  // Second tier
    { row: 2, slots: 3 },  // Third tier
    { row: 3, slots: 2 },  // Bottom tier (total: 1+2+3+2 = 8)
  ],

  // Next board ID counter
  nextBoardId: 1,

  // References (set during init)
  scene: null,
  board: null,  // Reference to Board system for creating actual 3D boards
  themeEffects: null,  // Reference to ThemeEffects system

  /**
   * Initialize the Board Manager
   */
  init: function(scene, boardSystem, themeEffects = null) {
    this.scene = scene;
    this.board = boardSystem;
    this.themeEffects = themeEffects;
    this.boards = [];
    this.boardsById = {};
    this.currentBoardCount = 0;
    this.nextBoardId = 1;
  },

  /**
   * Create a new board in the pyramid
   * @param {number} themeIndex - Index of theme to use
   * @param {object} position - Optional override position {row, col}
   * @returns {object} Board object
   */
  createBoard: function(themeIndex, position = null) {
    // Determine position in pyramid if not specified
    if (!position) {
      position = this.getNextAvailableSlot();
      if (!position) {
        console.warn('No available slots in pyramid');
        return null;
      }
    }

    const boardId = `board_${this.nextBoardId++}`;

    // Get theme data
    const theme = tierThemes[themeIndex];
    const themeName = theme ? theme.name : 'Unknown';
    const powerupFocus = theme ? theme.powerupFocus : 'none';

    // Create board object
    const newBoard = {
      boardId: boardId,
      themeIndex: themeIndex,
      themeName: themeName,
      powerupFocus: powerupFocus,
      row: position.row,
      col: position.col,

      // Child references (null until children are added)
      childLeft: null,
      childRight: null,

      // Parent reference
      parent: null,

      // Exit zone mapping
      exits: this.createExitMapping(position.row),

      // Local state
      gauges: {},
      counters: {
        stomps: 0,
        lasers: 0,
        jackpots: 0,
      },

      // Board statistics (for player insight and strategic decisions - Design Spec 2.2)
      stats: {
        coinsProcessed: 0,    // Total coins that passed through this board
        valueGenerated: 0,     // Total score value attributed to this board
        queueGenerated: 0,     // Total queue added by this board
        jackpotsTriggered: 0,  // Number of jackpots from this board
        combosStarted: 0,      // Number of combo chains this board contributed to
      },

      // 3D position in world
      worldPosition: this.calculateWorldPosition(position.row, position.col),
    };

    // Add to collections
    this.boards.push(newBoard);
    this.boardsById[boardId] = newBoard;
    this.currentBoardCount++;

    // Link to parent if this is not the top board
    if (position.row > 0) {
      this.linkToParent(newBoard);
    }

    // Update theme effects if available
    if (this.themeEffects) {
      this.themeEffects.updateEffects(this.boards);
    }

    return newBoard;
  },

  /**
   * Get the next available slot in the pyramid
   * @returns {object|null} {row, col} or null if pyramid is full
   */
  getNextAvailableSlot: function() {
    // Count boards in each row
    const rowCounts = {};
    this.boards.forEach(board => {
      rowCounts[board.row] = (rowCounts[board.row] || 0) + 1;
    });

    // Find first row with available slots
    for (const layout of this.pyramidLayout) {
      const currentCount = rowCounts[layout.row] || 0;
      if (currentCount < layout.slots) {
        // Find first available column in this row
        return {
          row: layout.row,
          col: currentCount
        };
      }
    }

    return null; // Pyramid is full
  },

  /**
   * Calculate world position for a board based on row/col
   * @param {number} row - Pyramid row
   * @param {number} col - Column within row
   * @returns {object} {x, y, z} world position
   */
  calculateWorldPosition: function(row, col) {
    // Vertical spacing between tiers
    const verticalSpacing = 12;

    // Horizontal spacing
    const horizontalSpacing = 15;

    // Calculate base positions
    const y = -row * verticalSpacing;

    // Center boards in each row
    const rowWidth = this.pyramidLayout[row].slots;
    const offsetX = (rowWidth - 1) * horizontalSpacing / 2;
    const x = col * horizontalSpacing - offsetX;

    // Z position (all boards at same depth for now)
    const z = 0;

    return { x, y, z };
  },

  /**
   * Create exit zone mapping for a board
   * @param {number} row - Board row in pyramid
   * @returns {array} Exit configurations
   */
  createExitMapping: function(row) {
    const isBottomRow = row === this.pyramidLayout.length - 1;

    if (isBottomRow) {
      // Bottom row: all exits go to final scoring tray
      return [
        { zone: 'left', target: 'scoring_tray', type: 'normal' },
        { zone: 'center-left', target: 'scoring_tray', type: 'normal' },
        { zone: 'center-right', target: 'scoring_tray', type: 'bonus' },
        { zone: 'right', target: 'scoring_tray', type: 'jackpot' },
      ];
    } else {
      // Other rows: exits route to child boards (to be filled when children are added)
      return [
        { zone: 'left', target: 'child_left', type: 'normal' },
        { zone: 'center-left', target: 'child_left', type: 'bonus' },
        { zone: 'center-right', target: 'child_right', type: 'bonus' },
        { zone: 'right', target: 'child_right', type: 'jackpot' },
      ];
    }
  },

  /**
   * Link a board to its parent
   * @param {object} board - Board to link
   */
  linkToParent: function(board) {
    if (board.row === 0) return; // Top board has no parent

    // Find parent board
    // Parent is in previous row
    const parentRow = board.row - 1;
    const parentCol = Math.floor(board.col / 2); // Simple mapping: 2 children per parent

    const parent = this.boards.find(b => b.row === parentRow && b.col === parentCol);

    if (parent) {
      board.parent = parent.boardId;

      // Add this board as child to parent
      // If board.col is even, it's the left child; if odd, it's the right child
      if (board.col % 2 === 0) {
        parent.childLeft = board.boardId;
      } else {
        parent.childRight = board.boardId;
      }
    }
  },

  /**
   * Get board by ID
   * @param {string} boardId - Board ID
   * @returns {object|null} Board object
   */
  getBoard: function(boardId) {
    return this.boardsById[boardId] || null;
  },

  /**
   * Get all boards in a specific row
   * @param {number} row - Row number
   * @returns {array} Array of boards
   */
  getBoardsInRow: function(row) {
    return this.boards.filter(b => b.row === row);
  },

  /**
   * Get the target board for a coin exiting a board through a specific exit
   * @param {string} boardId - Source board ID
   * @param {string} exitZone - Exit zone name
   * @returns {object|null} {targetType, targetId} where targetType is 'board' or 'scoring_tray'
   */
  getExitTarget: function(boardId, exitZone) {
    const board = this.getBoard(boardId);
    if (!board) return null;

    const exit = board.exits.find(e => e.zone === exitZone);
    if (!exit) return null;

    if (exit.target === 'scoring_tray') {
      return { targetType: 'scoring_tray', targetId: 'final_tray', exitType: exit.type };
    } else if (exit.target === 'child_left') {
      return {
        targetType: 'board',
        targetId: board.childLeft,
        exitType: exit.type
      };
    } else if (exit.target === 'child_right') {
      return {
        targetType: 'board',
        targetId: board.childRight,
        exitType: exit.type
      };
    }

    return null;
  },

  /**
   * Add a new board to the pyramid (game progression)
   * @param {number} themeIndex - Theme to use
   * @returns {object|null} New board or null if pyramid is full
   */
  addBoard: function(themeIndex) {
    if (this.currentBoardCount >= this.maxBoards) {
      console.warn('Pyramid is full, cannot add more boards');
      return null;
    }

    return this.createBoard(themeIndex);
  },

  /**
   * Get pyramid status
   * @returns {object} Status info
   */
  getStatus: function() {
    const rowCounts = {};
    this.boards.forEach(board => {
      rowCounts[board.row] = (rowCounts[board.row] || 0) + 1;
    });

    return {
      totalBoards: this.currentBoardCount,
      maxBoards: this.maxBoards,
      isFull: this.currentBoardCount >= this.maxBoards,
      rowCounts: rowCounts,
      nextSlot: this.getNextAvailableSlot(),
    };
  },

  /**
   * Reset the pyramid (for new game)
   */
  reset: function() {
    this.boards = [];
    this.boardsById = {};
    this.currentBoardCount = 0;
    this.nextBoardId = 1;
    // Note: Stats are reset automatically when boards array is cleared
  },

  /**
   * Get excluded theme indices (themes already in use)
   * @returns {array} Array of theme indices
   */
  getExcludedThemes: function() {
    return this.boards.map(b => b.themeIndex);
  },

  /**
   * Offer theme selection for next board
   * @returns {array} Array of 3 theme options
   */
  offerThemeSelection: function() {
    const excluded = this.getExcludedThemes();
    return getThemeOptions(excluded);
  },

  /**
   * Update board statistics when a coin passes through
   * @param {string} boardId - Board ID
   * @param {object} coinData - Coin data with value and effects
   */
  updateBoardStats: function(boardId, coinData = {}) {
    const board = this.getBoard(boardId);
    if (!board) return;

    // Increment coins processed
    board.stats.coinsProcessed++;

    // Add value generated (if provided)
    if (coinData.valueAdded) {
      board.stats.valueGenerated += coinData.valueAdded;
    }

    // Add queue generated (if provided)
    if (coinData.queueAdded) {
      board.stats.queueGenerated += coinData.queueAdded;
    }

    // Track jackpots
    if (coinData.jackpotTriggered) {
      board.stats.jackpotsTriggered++;
    }

    // Track combos
    if (coinData.comboStarted) {
      board.stats.combosStarted++;
    }
  },

  /**
   * Get statistics for all boards (for UI display)
   * @returns {array} Array of board stats sorted by row/col
   */
  getAllBoardStats: function() {
    return this.boards
      .sort((a, b) => {
        if (a.row !== b.row) return a.row - b.row;
        return a.col - b.col;
      })
      .map(board => ({
        boardId: board.boardId,
        themeName: board.themeName,
        powerupFocus: board.powerupFocus,
        row: board.row,
        col: board.col,
        stats: { ...board.stats },
      }));
  },

  /**
   * Reset all board statistics (for new game)
   */
  resetAllStats: function() {
    this.boards.forEach(board => {
      board.stats = {
        coinsProcessed: 0,
        valueGenerated: 0,
        queueGenerated: 0,
        jackpotsTriggered: 0,
        combosStarted: 0,
      };
    });
  },

  /**
   * Phase 9 - Save/Load support for run state persistence
   * Get save data for BoardManager state
   */
  getSaveData: function() {
    return {
      boards: this.boards.map(board => ({
        boardId: board.boardId,
        themeIndex: board.themeIndex,
        themeName: board.themeName,
        powerupFocus: board.powerupFocus,
        row: board.row,
        col: board.col,
        childLeft: board.childLeft,
        childRight: board.childRight,
      })),
      maxBoards: this.maxBoards,
      nextBoardId: this.nextBoardId,
    };
  },

  /**
   * Load save data for BoardManager
   * Note: This only restores the board metadata. The actual 3D board objects
   * need to be recreated by the Game system after loading this data.
   */
  loadSaveData: function(data) {
    if (!data) return;

    // Restore basic state
    this.maxBoards = data.maxBoards || 8;
    this.nextBoardId = data.nextBoardId || 1;

    // Note: boards array will be empty here. The Game system will need to
    // recreate the actual Board objects using the saved board metadata.
    // This is because Board objects contain 3D meshes that can't be serialized.
    // The saved data serves as a blueprint for reconstruction.
  },
};

export default BoardManager;
