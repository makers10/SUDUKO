/**
 * Sudoku Puzzle Engine
 * Handles puzzle generation, solving, and validation.
 */
class SudokuEngine {
    constructor() {
        this.SIZE = 9;
        this.BOX = 3;
    }

    /**
     * Generate a complete, valid solved Sudoku board.
     * @returns {number[][]} 9x9 solved board
     */
    generateSolvedBoard() {
        const board = Array.from({ length: 9 }, () => Array(9).fill(0));
        this._fillBoard(board);
        return board;
    }

    /**
     * Recursively fill the board using backtracking.
     */
    _fillBoard(board) {
        const empty = this._findEmpty(board);
        if (!empty) return true;
        const [row, col] = empty;
        const nums = this._shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const num of nums) {
            if (this._isValid(board, row, col, num)) {
                board[row][col] = num;
                if (this._fillBoard(board)) return true;
                board[row][col] = 0;
            }
        }
        return false;
    }

    /**
     * Find an empty cell (value 0).
     */
    _findEmpty(board) {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (board[r][c] === 0) return [r, c];
            }
        }
        return null;
    }

    /**
     * Check if placing num at (row, col) is valid.
     */
    _isValid(board, row, col, num) {
        // Check row
        for (let c = 0; c < 9; c++) {
            if (board[row][c] === num) return false;
        }
        // Check column
        for (let r = 0; r < 9; r++) {
            if (board[r][col] === num) return false;
        }
        // Check 3x3 box
        const boxR = Math.floor(row / 3) * 3;
        const boxC = Math.floor(col / 3) * 3;
        for (let r = boxR; r < boxR + 3; r++) {
            for (let c = boxC; c < boxC + 3; c++) {
                if (board[r][c] === num) return false;
            }
        }
        return true;
    }

    /**
     * Fisher-Yates shuffle.
     */
    _shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    /**
     * Create a puzzle by removing cells from a solved board.
     * @param {'easy'|'medium'|'hard'} difficulty
     * @returns {{ puzzle: number[][], solution: number[][] }}
     */
    generatePuzzle(difficulty = 'easy') {
        const solution = this.generateSolvedBoard();
        const puzzle = solution.map(row => [...row]);

        const removeCount = { easy: 36, medium: 46, hard: 54 };
        let toRemove = removeCount[difficulty] || 36;

        const positions = [];
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                positions.push([r, c]);
            }
        }
        const shuffled = this._shuffle(positions);

        let removed = 0;
        for (const [r, c] of shuffled) {
            if (removed >= toRemove) break;
            const backup = puzzle[r][c];
            puzzle[r][c] = 0;

            // For easy/medium, we just remove. For hard, verify unique solution.
            if (difficulty === 'hard') {
                const count = this._countSolutions(puzzle.map(row => [...row]), 0, 2);
                if (count !== 1) {
                    puzzle[r][c] = backup;
                    continue;
                }
            }
            removed++;
        }

        return { puzzle, solution };
    }

    /**
     * Count solutions (up to limit) for uniqueness check.
     */
    _countSolutions(board, count, limit) {
        if (count >= limit) return count;
        const empty = this._findEmpty(board);
        if (!empty) return count + 1;
        const [row, col] = empty;
        for (let num = 1; num <= 9; num++) {
            if (this._isValid(board, row, col, num)) {
                board[row][col] = num;
                count = this._countSolutions(board, count, limit);
                if (count >= limit) return count;
                board[row][col] = 0;
            }
        }
        return count;
    }

    /**
     * Validate if the current board state is complete and correct.
     */
    isComplete(board) {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (board[r][c] === 0) return false;
            }
        }
        return this.isValidBoard(board);
    }

    /**
     * Check if entire board is valid (no duplicates in any row/col/box).
     */
    isValidBoard(board) {
        for (let i = 0; i < 9; i++) {
            if (!this._isValidGroup(board[i])) return false;
            const col = board.map(row => row[i]);
            if (!this._isValidGroup(col)) return false;
        }
        for (let br = 0; br < 3; br++) {
            for (let bc = 0; bc < 3; bc++) {
                const box = [];
                for (let r = br * 3; r < br * 3 + 3; r++) {
                    for (let c = bc * 3; c < bc * 3 + 3; c++) {
                        box.push(board[r][c]);
                    }
                }
                if (!this._isValidGroup(box)) return false;
            }
        }
        return true;
    }

    _isValidGroup(group) {
        const nums = group.filter(n => n !== 0);
        return nums.length === new Set(nums).size;
    }
}
