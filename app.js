/**
 * Sudoku Game Application
 * Handles UI, game state, interactions, tutorial, and victory flow.
 */
(function () {
    'use strict';

    // ===== Game State =====
    const state = {
        puzzle: [],
        solution: [],
        board: [],           // current player board (numbers only)
        notes: [],           // 9x9 array of Sets
        given: [],           // 9x9 bool - true if cell is pre-filled
        selectedCell: null,  // { row, col }
        notesMode: false,
        mistakes: 0,
        maxMistakes: 3,
        hintsLeft: 3,
        hintsUsed: 0,
        difficulty: 'easy',
        timer: 0,
        timerInterval: null,
        history: [],         // undo stack
        gameOver: false,
        gameWon: false,
    };

    // ===== DOM Elements =====
    const dom = {
        board: document.getElementById('sudoku-board'),
        timerDisplay: document.getElementById('timer-display'),
        mistakesCount: document.getElementById('mistakes-count'),
        difficultyLabel: document.getElementById('difficulty-label'),
        hintsRemaining: document.getElementById('hints-remaining'),
        numberPad: document.getElementById('number-pad'),
        undoBtn: document.getElementById('undo-btn'),
        eraseBtn: document.getElementById('erase-btn'),
        notesBtn: document.getElementById('notes-btn'),
        hintBtn: document.getElementById('hint-btn'),
        tutorialBtn: document.getElementById('tutorial-btn'),
        tutorialOverlay: document.getElementById('tutorial-overlay'),
        tutorialCloseBtn: document.getElementById('tutorial-close-btn'),
        tutorialPrevBtn: document.getElementById('tutorial-prev-btn'),
        tutorialNextBtn: document.getElementById('tutorial-next-btn'),
        victoryOverlay: document.getElementById('victory-overlay'),
        victoryTime: document.getElementById('victory-time'),
        victoryDifficulty: document.getElementById('victory-difficulty'),
        victoryMistakes: document.getElementById('victory-mistakes'),
        victoryHints: document.getElementById('victory-hints'),
        victoryNewGameBtn: document.getElementById('victory-new-game-btn'),
        bgParticles: document.getElementById('bg-particles'),
    };

    // ===== Initialization =====
    function init() {
        createBackgroundParticles();
        buildBoard();
        bindEvents();
        showTutorialOnFirstVisit();
        newGame('easy');
    }

    // ===== Background Particles =====
    function createBackgroundParticles() {
        const colors = ['#7C5CFC', '#B94FFF', '#FF6B9D', '#00D4AA', '#C850C0'];
        for (let i = 0; i < 25; i++) {
            const p = document.createElement('div');
            p.classList.add('particle');
            const size = Math.random() * 4 + 2;
            p.style.width = size + 'px';
            p.style.height = size + 'px';
            p.style.left = Math.random() * 100 + '%';
            p.style.background = colors[Math.floor(Math.random() * colors.length)];
            p.style.animationDuration = (Math.random() * 15 + 10) + 's';
            p.style.animationDelay = (Math.random() * 10) + 's';
            dom.bgParticles.appendChild(p);
        }
    }

    // ===== Build Board DOM =====
    function buildBoard() {
        dom.board.innerHTML = '';
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.setAttribute('role', 'gridcell');
                cell.setAttribute('aria-label', `Row ${r + 1}, Column ${c + 1}`);
                cell.id = `cell-${r}-${c}`;

                // 3x3 box borders
                if (c === 2 || c === 5) cell.classList.add('box-right');
                if (r === 2 || r === 5) cell.classList.add('box-bottom');

                dom.board.appendChild(cell);
            }
        }
    }

    // ===== New Game =====
    async function newGame(difficulty) {
        // Stop timer
        clearInterval(state.timerInterval);

        state.difficulty = difficulty;
        
        try {
            const response = await fetch(`/api/puzzle?difficulty=${difficulty}`);
            const { puzzle, solution } = await response.json();
            
            state.puzzle = puzzle;
            state.solution = solution;
            state.board = puzzle.map(row => [...row]);
            state.notes = Array.from({ length: 9 }, () =>
                Array.from({ length: 9 }, () => new Set())
            );
            state.given = puzzle.map(row => row.map(v => v !== 0));
            state.selectedCell = null;
            state.notesMode = false;
            state.mistakes = 0;
            state.hintsLeft = 3;
            state.hintsUsed = 0;
            state.timer = 0;
            state.history = [];
            state.gameOver = false;
            state.gameWon = false;

            // Update UI
            dom.notesBtn.classList.remove('active');
            dom.mistakesCount.textContent = '0';
            dom.difficultyLabel.textContent = capitalize(difficulty);
            dom.hintsRemaining.textContent = `(${state.hintsLeft})`;
            dom.victoryOverlay.classList.add('hidden');

            // Update difficulty buttons
            document.querySelectorAll('.diff-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.difficulty === difficulty);
            });

            renderBoard();
            updateNumberCounts();
            startTimer();
        } catch (error) {
            console.error('Failed to fetch puzzle:', error);
            alert('Failed to start a new game. Please ensure the backend is running.');
        }
    }

    // ===== Render Board =====
    function renderBoard() {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.getElementById(`cell-${r}-${c}`);
                const value = state.board[r][c];
                const isGiven = state.given[r][c];
                const notes = state.notes[r][c];

                // Reset classes
                cell.className = 'cell';
                if (c === 2 || c === 5) cell.classList.add('box-right');
                if (r === 2 || r === 5) cell.classList.add('box-bottom');

                // Content
                cell.innerHTML = '';
                if (value !== 0) {
                    cell.textContent = value;
                    cell.classList.add(isGiven ? 'given' : 'user-input');
                } else if (notes.size > 0) {
                    const grid = document.createElement('div');
                    grid.classList.add('notes-grid');
                    for (let n = 1; n <= 9; n++) {
                        const span = document.createElement('span');
                        span.textContent = notes.has(n) ? n : '';
                        grid.appendChild(span);
                    }
                    cell.appendChild(grid);
                }

                // Highlighting
                if (state.selectedCell) {
                    const sr = state.selectedCell.row;
                    const sc = state.selectedCell.col;

                    if (r === sr && c === sc) {
                        cell.classList.add('selected');
                    } else if (r === sr || c === sc || (Math.floor(r / 3) === Math.floor(sr / 3) && Math.floor(c / 3) === Math.floor(sc / 3))) {
                        cell.classList.add('highlighted');
                    }

                    // Highlight same number
                    const selectedVal = state.board[sr][sc];
                    if (selectedVal !== 0 && value === selectedVal && !(r === sr && c === sc)) {
                        cell.classList.add('same-number');
                    }
                }
            }
        }
    }

    // ===== Timer =====
    function startTimer() {
        clearInterval(state.timerInterval);
        state.timer = 0;
        updateTimerDisplay();
        state.timerInterval = setInterval(() => {
            if (!state.gameOver && !state.gameWon) {
                state.timer++;
                updateTimerDisplay();
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        const mins = Math.floor(state.timer / 60).toString().padStart(2, '0');
        const secs = (state.timer % 60).toString().padStart(2, '0');
        dom.timerDisplay.textContent = `${mins}:${secs}`;
    }

    // ===== Cell Selection =====
    function selectCell(row, col) {
        if (state.gameOver || state.gameWon) return;
        state.selectedCell = { row, col };
        renderBoard();
    }

    // ===== Place Number =====
    function placeNumber(num) {
        if (!state.selectedCell || state.gameOver || state.gameWon) return;
        const { row, col } = state.selectedCell;
        if (state.given[row][col]) return;

        if (state.notesMode) {
            // Toggle note
            const prevNotes = new Set(state.notes[row][col]);
            if (state.notes[row][col].has(num)) {
                state.notes[row][col].delete(num);
            } else {
                state.notes[row][col].add(num);
            }
            state.history.push({ type: 'note', row, col, prevNotes, prevValue: state.board[row][col] });
            renderBoard();
            return;
        }

        // Normal placement
        const prevValue = state.board[row][col];
        const prevNotes = new Set(state.notes[row][col]);
        const correct = state.solution[row][col];

        state.board[row][col] = num;
        state.notes[row][col].clear();
        state.history.push({ type: 'place', row, col, prevValue, prevNotes });

        if (num !== correct) {
            state.mistakes++;
            dom.mistakesCount.textContent = state.mistakes;
            const cell = document.getElementById(`cell-${row}-${col}`);
            renderBoard();
            cell.classList.add('error');
            setTimeout(() => cell.classList.remove('error'), 500);

            if (state.mistakes >= state.maxMistakes) {
                state.gameOver = true;
                clearInterval(state.timerInterval);
                setTimeout(() => alert('Game Over! Too many mistakes. Starting a new game...'), 300);
                setTimeout(() => newGame(state.difficulty), 1500);
                return;
            }
        } else {
            // Clear notes in same row/col/box for this number
            clearRelatedNotes(row, col, num);
            renderBoard();
            const cell = document.getElementById(`cell-${row}-${col}`);
            cell.classList.add('correct-anim');
            setTimeout(() => cell.classList.remove('correct-anim'), 350);
        }

        updateNumberCounts();
        checkVictory();
    }

    // ===== Clear related notes when a number is placed =====
    function clearRelatedNotes(row, col, num) {
        for (let i = 0; i < 9; i++) {
            state.notes[row][i].delete(num);
            state.notes[i][col].delete(num);
        }
        const boxR = Math.floor(row / 3) * 3;
        const boxC = Math.floor(col / 3) * 3;
        for (let r = boxR; r < boxR + 3; r++) {
            for (let c = boxC; c < boxC + 3; c++) {
                state.notes[r][c].delete(num);
            }
        }
    }

    // ===== Erase =====
    function eraseCell() {
        if (!state.selectedCell || state.gameOver || state.gameWon) return;
        const { row, col } = state.selectedCell;
        if (state.given[row][col]) return;

        const prevValue = state.board[row][col];
        const prevNotes = new Set(state.notes[row][col]);
        if (prevValue === 0 && prevNotes.size === 0) return;

        state.history.push({ type: 'erase', row, col, prevValue, prevNotes });
        state.board[row][col] = 0;
        state.notes[row][col].clear();
        renderBoard();
        updateNumberCounts();
    }

    // ===== Undo =====
    function undo() {
        if (state.history.length === 0 || state.gameOver || state.gameWon) return;
        const action = state.history.pop();

        if (action.type === 'place' || action.type === 'erase') {
            state.board[action.row][action.col] = action.prevValue;
            state.notes[action.row][action.col] = action.prevNotes;
        } else if (action.type === 'note') {
            state.notes[action.row][action.col] = action.prevNotes;
            state.board[action.row][action.col] = action.prevValue;
        } else if (action.type === 'hint') {
            state.board[action.row][action.col] = action.prevValue;
            state.notes[action.row][action.col] = action.prevNotes;
        }

        renderBoard();
        updateNumberCounts();
    }

    // ===== Hint =====
    function useHint() {
        if (state.hintsLeft <= 0 || state.gameOver || state.gameWon) return;
        if (!state.selectedCell) return;

        const { row, col } = state.selectedCell;
        if (state.given[row][col]) return;
        if (state.board[row][col] === state.solution[row][col]) return;

        const prevValue = state.board[row][col];
        const prevNotes = new Set(state.notes[row][col]);

        state.board[row][col] = state.solution[row][col];
        state.notes[row][col].clear();
        state.hintsLeft--;
        state.hintsUsed++;
        dom.hintsRemaining.textContent = `(${state.hintsLeft})`;

        state.history.push({ type: 'hint', row, col, prevValue, prevNotes });
        clearRelatedNotes(row, col, state.solution[row][col]);
        renderBoard();

        const cell = document.getElementById(`cell-${row}-${col}`);
        cell.classList.add('hint-reveal');
        setTimeout(() => cell.classList.remove('hint-reveal'), 600);

        updateNumberCounts();
        checkVictory();
    }

    // ===== Number Counts (disable completed numbers) =====
    function updateNumberCounts() {
        for (let n = 1; n <= 9; n++) {
            let count = 0;
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (state.board[r][c] === n) count++;
                }
            }
            const btn = dom.numberPad.querySelector(`[data-num="${n}"]`);
            if (count >= 9) {
                btn.classList.add('completed');
            } else {
                btn.classList.remove('completed');
            }
        }
    }

    // ===== Check Victory =====
    function checkVictory() {
        // Check if all cells are filled correctly
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (state.board[r][c] !== state.solution[r][c]) return;
            }
        }

        state.gameWon = true;
        clearInterval(state.timerInterval);

        setTimeout(() => showVictory(), 400);
    }

    function showVictory() {
        dom.victoryTime.textContent = dom.timerDisplay.textContent;
        dom.victoryDifficulty.textContent = capitalize(state.difficulty);
        dom.victoryMistakes.textContent = state.mistakes;
        dom.victoryHints.textContent = state.hintsUsed;
        dom.victoryOverlay.classList.remove('hidden');
    }

    // ===== Tutorial =====
    let tutorialSlide = 0;
    const totalSlides = 4;

    function showTutorialOnFirstVisit() {
        if (!localStorage.getItem('sudoku-tutorial-seen')) {
            openTutorial();
            localStorage.setItem('sudoku-tutorial-seen', 'true');
        }
    }

    function openTutorial() {
        tutorialSlide = 0;
        updateTutorialSlide();
        dom.tutorialOverlay.classList.remove('hidden');
    }

    function closeTutorial() {
        dom.tutorialOverlay.classList.add('hidden');
    }

    function updateTutorialSlide() {
        document.querySelectorAll('.tutorial-slide').forEach((slide, i) => {
            slide.classList.toggle('active', i === tutorialSlide);
        });
        document.querySelectorAll('.dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === tutorialSlide);
        });
        dom.tutorialPrevBtn.disabled = tutorialSlide === 0;
        dom.tutorialNextBtn.innerHTML = tutorialSlide === totalSlides - 1
            ? 'Start Playing <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>'
            : 'Next <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';
    }

    // ===== Event Bindings =====
    function bindEvents() {
        // Board clicks
        dom.board.addEventListener('click', (e) => {
            const cell = e.target.closest('.cell');
            if (!cell) return;
            selectCell(+cell.dataset.row, +cell.dataset.col);
        });

        // Number pad
        dom.numberPad.addEventListener('click', (e) => {
            const btn = e.target.closest('.num-btn');
            if (!btn || btn.classList.contains('completed')) return;
            placeNumber(+btn.dataset.num);
        });

        // Action buttons
        dom.undoBtn.addEventListener('click', undo);
        dom.eraseBtn.addEventListener('click', eraseCell);
        dom.notesBtn.addEventListener('click', () => {
            state.notesMode = !state.notesMode;
            dom.notesBtn.classList.toggle('active', state.notesMode);
        });
        dom.hintBtn.addEventListener('click', useHint);

        // Difficulty buttons
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => newGame(btn.dataset.difficulty));
        });

        // Tutorial
        dom.tutorialBtn.addEventListener('click', openTutorial);
        dom.tutorialCloseBtn.addEventListener('click', closeTutorial);
        dom.tutorialPrevBtn.addEventListener('click', () => {
            if (tutorialSlide > 0) { tutorialSlide--; updateTutorialSlide(); }
        });
        dom.tutorialNextBtn.addEventListener('click', () => {
            if (tutorialSlide < totalSlides - 1) { tutorialSlide++; updateTutorialSlide(); }
            else closeTutorial();
        });
        document.querySelectorAll('.dot').forEach(dot => {
            dot.addEventListener('click', () => {
                tutorialSlide = +dot.dataset.dot;
                updateTutorialSlide();
            });
        });

        // Victory
        dom.victoryNewGameBtn.addEventListener('click', () => newGame(state.difficulty));

        // Keyboard
        document.addEventListener('keydown', handleKeyboard);

        // Close overlays with Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (!dom.tutorialOverlay.classList.contains('hidden')) closeTutorial();
                if (!dom.victoryOverlay.classList.contains('hidden')) dom.victoryOverlay.classList.add('hidden');
            }
        });
    }

    function handleKeyboard(e) {
        if (!dom.tutorialOverlay.classList.contains('hidden')) return;
        if (!dom.victoryOverlay.classList.contains('hidden')) return;

        const key = e.key;

        // Number input
        if (key >= '1' && key <= '9') {
            e.preventDefault();
            placeNumber(+key);
            return;
        }

        // Delete/Backspace
        if (key === 'Delete' || key === 'Backspace') {
            e.preventDefault();
            eraseCell();
            return;
        }

        // Undo
        if ((e.ctrlKey || e.metaKey) && key === 'z') {
            e.preventDefault();
            undo();
            return;
        }

        // Notes toggle
        if (key === 'n' || key === 'N') {
            e.preventDefault();
            state.notesMode = !state.notesMode;
            dom.notesBtn.classList.toggle('active', state.notesMode);
            return;
        }

        // Hint
        if (key === 'h' || key === 'H') {
            e.preventDefault();
            useHint();
            return;
        }

        // Arrow keys for navigation
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
            e.preventDefault();
            if (!state.selectedCell) { selectCell(0, 0); return; }
            let { row, col } = state.selectedCell;
            if (key === 'ArrowUp') row = Math.max(0, row - 1);
            if (key === 'ArrowDown') row = Math.min(8, row + 1);
            if (key === 'ArrowLeft') col = Math.max(0, col - 1);
            if (key === 'ArrowRight') col = Math.min(8, col + 1);
            selectCell(row, col);
        }
    }

    // ===== Utility =====
    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // ===== Start =====
    document.addEventListener('DOMContentLoaded', init);
})();
