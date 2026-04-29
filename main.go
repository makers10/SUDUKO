package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sort"
	"sudoku-game/sudoku"
	"sync"
	"time"
)

type LeaderboardEntry struct {
	Name       string    `json:"name"`
	Time       int       `json:"time"` // in seconds
	Difficulty string    `json:"difficulty"`
	Mistakes   int       `json:"mistakes"`
	Date       time.Time `json:"date"`
}

var (
	leaderboard      []LeaderboardEntry
	leaderboardMutex sync.RWMutex
	leaderboardFile  = "leaderboard.json"
)

func loadLeaderboard() {
	file, err := os.ReadFile(leaderboardFile)
	if err != nil {
		if os.IsNotExist(err) {
			leaderboard = []LeaderboardEntry{}
			return
		}
		log.Printf("Error reading leaderboard: %v", err)
		return
	}

	leaderboardMutex.Lock()
	defer leaderboardMutex.Unlock()
	if err := json.Unmarshal(file, &leaderboard); err != nil {
		log.Printf("Error unmarshaling leaderboard: %v", err)
	}
}

func saveLeaderboard() {
	leaderboardMutex.RLock()
	data, err := json.MarshalIndent(leaderboard, "", "  ")
	leaderboardMutex.RUnlock()

	if err != nil {
		log.Printf("Error marshaling leaderboard: %v", err)
		return
	}

	if err := os.WriteFile(leaderboardFile, data, 0644); err != nil {
		log.Printf("Error writing leaderboard: %v", err)
	}
}

func main() {
	engine := sudoku.NewEngine()
	loadLeaderboard()

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

	// Leaderboard API
	http.HandleFunc("/api/leaderboard", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			difficulty := r.URL.Query().Get("difficulty")

			leaderboardMutex.RLock()
			filtered := []LeaderboardEntry{}
			for _, entry := range leaderboard {
				if difficulty == "" || entry.Difficulty == difficulty {
					filtered = append(filtered, entry)
				}
			}
			leaderboardMutex.RUnlock()

			// Sort by time (ascending), then by mistakes
			sort.Slice(filtered, func(i, j int) bool {
				if filtered[i].Time != filtered[j].Time {
					return filtered[i].Time < filtered[j].Time
				}
				return filtered[i].Mistakes < filtered[j].Mistakes
			})

			// Return top 10
			if len(filtered) > 10 {
				filtered = filtered[:10]
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(filtered)

		} else if r.Method == http.MethodPost {
			var entry LeaderboardEntry
			if err := json.NewDecoder(r.Body).Decode(&entry); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}

			if entry.Name == "" {
				http.Error(w, "Name is required", http.StatusBadRequest)
				return
			}

			entry.Date = time.Now()

			leaderboardMutex.Lock()
			leaderboard = append(leaderboard, entry)
			leaderboardMutex.Unlock()

			saveLeaderboard()

			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(map[string]string{"status": "success"})
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	port := 8080
	fmt.Printf("Server starting on http://localhost:%d\n", port)
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", port), nil))
}
