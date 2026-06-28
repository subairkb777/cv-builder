package handlers

import (
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"portfolio/config"
	"portfolio/llm"
)

const dataFile = "./data/portfolio.json"
const maxPhotoSize = 5 << 20 // 5 MB

type PortfolioHandler struct {
	cfg *config.Config
	mu  sync.RWMutex
}

func NewPortfolioHandler(cfg *config.Config) *PortfolioHandler {
	h := &PortfolioHandler{cfg: cfg}
	h.ensureDataFile()
	return h
}

func (h *PortfolioHandler) Get(w http.ResponseWriter, r *http.Request) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	data, err := h.load()
	if err != nil {
		jsonError(w, "failed to load portfolio data", http.StatusInternalServerError)
		return
	}

	// If photo_url is a bare filename (not a data URI or http URL), read the
	// file from the data directory and inline it as a base64 data URI.
	if p := data.PhotoURL; p != "" && !strings.HasPrefix(p, "data:") && !strings.HasPrefix(p, "http") {
		imgPath := filepath.Join(filepath.Dir(dataFile), p)
		if imgBytes, err := os.ReadFile(imgPath); err == nil {
			mime := "image/jpeg"
			switch strings.ToLower(filepath.Ext(p)) {
			case ".png":
				mime = "image/png"
			case ".webp":
				mime = "image/webp"
			}
			data.PhotoURL = "data:" + mime + ";base64," + base64.StdEncoding.EncodeToString(imgBytes)
		}
	}

	jsonResponse(w, data, http.StatusOK)
}

func (h *PortfolioHandler) Update(w http.ResponseWriter, r *http.Request) {
	h.mu.Lock()
	defer h.mu.Unlock()

	var data llm.PortfolioData
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.save(&data); err != nil {
		jsonError(w, "failed to save portfolio data", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, data, http.StatusOK)
}

func (h *PortfolioHandler) UploadPhoto(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxPhotoSize)
	if err := r.ParseMultipartForm(maxPhotoSize); err != nil {
		jsonError(w, "file too large (max 5MB)", http.StatusRequestEntityTooLarge)
		return
	}

	file, header, err := r.FormFile("photo")
	if err != nil {
		jsonError(w, "photo field missing", http.StatusBadRequest)
		return
	}
	defer file.Close()

	ct := header.Header.Get("Content-Type")
	if ct == "" {
		ct = "image/jpeg"
	}

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" {
		jsonError(w, "only JPEG, PNG, and WebP images are accepted", http.StatusBadRequest)
		return
	}

	imgBytes, err := io.ReadAll(file)
	if err != nil {
		jsonError(w, "failed to read photo", http.StatusInternalServerError)
		return
	}

	mimeType := "image/jpeg"
	if ext == ".png" {
		mimeType = "image/png"
	} else if ext == ".webp" {
		mimeType = "image/webp"
	}

	dataURI := "data:" + mimeType + ";base64," + base64.StdEncoding.EncodeToString(imgBytes)

	h.mu.Lock()
	defer h.mu.Unlock()

	data, err := h.load()
	if err != nil {
		jsonError(w, "failed to load portfolio data", http.StatusInternalServerError)
		return
	}
	data.PhotoURL = dataURI
	if err := h.save(data); err != nil {
		jsonError(w, "failed to save photo", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]string{"url": dataURI}, http.StatusOK)
}

func (h *PortfolioHandler) load() (*llm.PortfolioData, error) {
	raw, err := os.ReadFile(dataFile)
	if err != nil {
		return nil, err
	}
	var data llm.PortfolioData
	if err := json.Unmarshal(raw, &data); err != nil {
		return nil, err
	}
	return &data, nil
}

func (h *PortfolioHandler) save(data *llm.PortfolioData) error {
	if err := os.MkdirAll(filepath.Dir(dataFile), 0755); err != nil {
		return err
	}
	raw, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(dataFile, raw, 0644)
}

func (h *PortfolioHandler) ensureDataFile() {
	if _, err := os.Stat(dataFile); err == nil {
		return
	}
	if err := os.MkdirAll(filepath.Dir(dataFile), 0755); err != nil {
		return
	}
	// Try to load seed data from the data directory alongside portfolio.json.
	// Falls back to a minimal empty record if no seed file is present.
	seed := loadSeedOrEmpty()
	raw, err := json.MarshalIndent(seed, "", "  ")
	if err != nil {
		return
	}
	_ = os.WriteFile(dataFile, raw, 0644)
}

const seedFile = "./data/seed.json"

func loadSeedOrEmpty() *llm.PortfolioData {
	if raw, err := os.ReadFile(seedFile); err == nil {
		var d llm.PortfolioData
		if json.Unmarshal(raw, &d) == nil {
			return &d
		}
	}
	return &llm.PortfolioData{}
}

