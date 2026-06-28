package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"portfolio/config"
	"portfolio/handlers"
	"portfolio/llm"
	authmw "portfolio/middleware"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("FATAL: failed to load config: %v", err)
	}

	cfg.LogSummary()

	adapter := llm.NewAdapter(cfg)

	r := chi.NewRouter()

	// Base middleware
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(chimw.RealIP)

	// CORS for local development
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://localhost:3000", "http://localhost:4173"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Initialise handlers
	authHandler := handlers.NewAuthHandler(cfg)
	portfolioHandler := handlers.NewPortfolioHandler(cfg)
	llmHandler := handlers.NewLLMHandler(cfg, adapter)

	// API routes
	r.Route("/api", func(r chi.Router) {
		// Public auth routes
		r.Post("/auth/login", authHandler.Login)
		r.Post("/auth/logout", authHandler.Logout)
		r.Get("/auth/me", authHandler.Me)

		// Public portfolio read
		r.Get("/portfolio", portfolioHandler.Get)

		// LLM status (public — so the frontend can show provider badge)
		r.Get("/llm/status", llmHandler.Status)

		// Protected routes — require valid JWT
		r.Group(func(r chi.Router) {
			r.Use(authmw.Authenticate(cfg))
			r.Put("/portfolio", portfolioHandler.Update)
			r.Post("/portfolio/photo", portfolioHandler.UploadPhoto)
			r.Post("/llm/parse-pdf", llmHandler.ParsePDF)
		})
	})

	// Serve React SPA for all non-API routes
	distDir := "./frontend/dist"
	r.Get("/*", spaHandler(distDir))

	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	log.Printf("Portfolio server listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, r))
}

// spaHandler serves a React SPA from distDir, falling back to index.html for
// routes not found on disk (client-side routing).
func spaHandler(distDir string) http.HandlerFunc {
	fs := http.FileServer(http.Dir(distDir))
	return func(w http.ResponseWriter, r *http.Request) {
		// Strip the leading slash for filepath.Join
		urlPath := strings.TrimPrefix(r.URL.Path, "/")
		fullPath := filepath.Join(distDir, urlPath)

		_, err := os.Stat(fullPath)
		if os.IsNotExist(err) || urlPath == "" {
			// SPA fallback — serve index.html
			http.ServeFile(w, r, filepath.Join(distDir, "index.html"))
			return
		}
		fs.ServeHTTP(w, r)
	}
}
