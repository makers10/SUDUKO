package sudoku

import (
	"math/rand"
	"time"
)

type Engine struct {
	Size int
	Box  int
}

func NewEngine() *Engine {
	return &Engine{
		Size: 9,
		Box:  3,
	}
}

// GenerateSolvedBoard creates a complete, valid Sudoku board.
func (e *Engine) GenerateSolvedBoard() [][]int {
	board := make([][]int, 9)
	for i := range board {
		board[i] = make([]int, 9)
	}
	e.fillBoard(board)
	return board
}

func (e *Engine) fillBoard(board [][]int) bool {
	row, col, found := e.findEmpty(board)
	if !found {
		return true
	}

	nums := []int{1, 2, 3, 4, 5, 6, 7, 8, 9}
	rand.Seed(time.Now().UnixNano())
	rand.Shuffle(len(nums), func(i, j int) {
		nums[i], nums[j] = nums[j], nums[i]
	})

	for _, num := range nums {
		if e.isValid(board, row, col, num) {
			board[row][col] = num
			if e.fillBoard(board) {
				return true
			}
			board[row][col] = 0
		}
	}
	return false
}

func (e *Engine) findEmpty(board [][]int) (int, int, bool) {
	for r := 0; r < 9; r++ {
		for c := 0; c < 9; c++ {
			if board[r][c] == 0 {
				return r, c, true
			}
		}
	}
	return 0, 0, false
}

func (e *Engine) isValid(board [][]int, row, col, num int) bool {
	// Check row
	for c := 0; c < 9; c++ {
		if board[row][c] == num {
			return false
		}
	}
	// Check column
	for r := 0; r < 9; r++ {
		if board[r][col] == num {
			return false
		}
	}
	// Check 3x3 box
	boxR := (row / 3) * 3
	boxC := (col / 3) * 3
	for r := boxR; r < boxR+3; r++ {
		for c := boxC; c < boxC+3; c++ {
			if board[r][c] == num {
				return false
			}
		}
	}
	return true
}

type Puzzle struct {
	Puzzle   [][]int `json:"puzzle"`
	Solution [][]int `json:"solution"`
}

// GeneratePuzzle creates a puzzle by removing cells from a solved board.
func (e *Engine) GeneratePuzzle(difficulty string) Puzzle {
	solution := e.GenerateSolvedBoard()
	puzzle := make([][]int, 9)
	for i := range solution {
		puzzle[i] = make([]int, 9)
		copy(puzzle[i], solution[i])
	}

	removeCount := map[string]int{
		"easy":   36,
		"medium": 46,
		"hard":   54,
		"master": 62,
	}

	toRemove := removeCount[difficulty]
	if toRemove == 0 {
		toRemove = 36
	}

	type pos struct{ r, c int }
	positions := make([]pos, 0, 81)
	for r := 0; r < 9; r++ {
		for c := 0; c < 9; c++ {
			positions = append(positions, pos{r, c})
		}
	}

	rand.Shuffle(len(positions), func(i, j int) {
		positions[i], positions[j] = positions[j], positions[i]
	})

	removed := 0
	for _, p := range positions {
		if removed >= toRemove {
			break
		}
		backup := puzzle[p.r][p.c]
		puzzle[p.r][p.c] = 0

		if difficulty == "hard" || difficulty == "master" {
			if e.countSolutions(e.copyBoard(puzzle), 0, 2) != 1 {
				puzzle[p.r][p.c] = backup
				continue
			}
		}
		removed++
	}

	return Puzzle{Puzzle: puzzle, Solution: solution}
}

func (e *Engine) copyBoard(board [][]int) [][]int {
	newBoard := make([][]int, 9)
	for i := range board {
		newBoard[i] = make([]int, 9)
		copy(newBoard[i], board[i])
	}
	return newBoard
}

func (e *Engine) countSolutions(board [][]int, count, limit int) int {
	if count >= limit {
		return count
	}
	row, col, found := e.findEmpty(board)
	if !found {
		return count + 1
	}

	for num := 1; num <= 9; num++ {
		if e.isValid(board, row, col, num) {
			board[row][col] = num
			count = e.countSolutions(board, count, limit)
			if count >= limit {
				return count
			}
			board[row][col] = 0
		}
	}
	return count
}
