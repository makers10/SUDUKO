package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sudoku-game/sudoku"
)

func main() {
	engine := sudoku.NewEngine()

	// Serve static files
	fs := http.FileServer(http.Dir("."))
	http.Handle("/", fs)

	// API for puzzle generation
	http.HandleFunc("/api/puzzle", func(w http.ResponseWriter, r *http.Request) {
		difficulty := r.URL.Query().Get("difficulty")
		if difficulty == "" {
			difficulty = "easy"
		}

		puzzle := engine.GeneratePuzzle(difficulty)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(puzzle)
	})

	port := 8080
	fmt.Printf("Server starting on http://localhost:%d\n", port)
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", port), nil))
}
