package handlers

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	pdfapi "github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"

	"portfolio/config"
	"portfolio/llm"
)

const maxPDFSize = 10 << 20 // 10 MB

type LLMHandler struct {
	cfg     *config.Config
	adapter llm.LLMAdapter
}

func NewLLMHandler(cfg *config.Config, adapter llm.LLMAdapter) *LLMHandler {
	return &LLMHandler{cfg: cfg, adapter: adapter}
}

type parsePDFResponse struct {
	RawText    string            `json:"raw_text,omitempty"`
	Data       *llm.PortfolioData `json:"data,omitempty"`
	LLMEnabled bool              `json:"llm_enabled"`
	Provider   string            `json:"provider,omitempty"`
}

type llmStatusResponse struct {
	Enabled  bool   `json:"enabled"`
	Provider string `json:"provider"`
}

func (h *LLMHandler) Status(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, llmStatusResponse{
		Enabled:  h.adapter.IsEnabled(),
		Provider: h.adapter.ProviderName(),
	}, http.StatusOK)
}

func (h *LLMHandler) ParsePDF(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxPDFSize)
	if err := r.ParseMultipartForm(maxPDFSize); err != nil {
		jsonError(w, "file too large or malformed (max 10MB)", http.StatusBadRequest)
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		jsonError(w, "file field missing", http.StatusBadRequest)
		return
	}
	defer file.Close()

	pdfBytes, err := io.ReadAll(file)
	if err != nil {
		jsonError(w, "failed to read uploaded file", http.StatusInternalServerError)
		return
	}

	extractedText, err := extractPDFText(pdfBytes)
	if err != nil {
		jsonError(w, fmt.Sprintf("PDF text extraction failed: %v", err), http.StatusUnprocessableEntity)
		return
	}

	if !h.adapter.IsEnabled() {
		jsonResponse(w, parsePDFResponse{
			RawText:    extractedText,
			LLMEnabled: false,
		}, http.StatusOK)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	data, err := h.adapter.ParseResume(ctx, extractedText)
	if err != nil {
		jsonError(w, fmt.Sprintf("LLM parsing failed: %v", err), http.StatusServiceUnavailable)
		return
	}

	jsonResponse(w, parsePDFResponse{
		Data:       data,
		LLMEnabled: true,
		Provider:   h.adapter.ProviderName(),
	}, http.StatusOK)
}

// extractPDFText writes the PDF to a temp file, uses pdfcpu to extract page
// content streams, then parses human-readable text from those streams.
func extractPDFText(pdfBytes []byte) (string, error) {
	tmpPDF, err := os.CreateTemp("", "portfolio-upload-*.pdf")
	if err != nil {
		return "", fmt.Errorf("creating temp file: %w", err)
	}
	defer os.Remove(tmpPDF.Name())

	if _, err := tmpPDF.Write(pdfBytes); err != nil {
		tmpPDF.Close()
		return "", fmt.Errorf("writing temp file: %w", err)
	}
	tmpPDF.Close()

	outDir, err := os.MkdirTemp("", "portfolio-pdf-out-*")
	if err != nil {
		return "", fmt.Errorf("creating output dir: %w", err)
	}
	defer os.RemoveAll(outDir)

	conf := model.NewDefaultConfiguration()
	conf.ValidationMode = model.ValidationRelaxed

	if err := pdfapi.ExtractContentFile(tmpPDF.Name(), outDir, nil, conf); err != nil {
		return "", fmt.Errorf("extracting PDF content: %w", err)
	}

	entries, err := os.ReadDir(outDir)
	if err != nil {
		return "", fmt.Errorf("reading output dir: %w", err)
	}

	var sb strings.Builder
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		raw, err := os.ReadFile(filepath.Join(outDir, entry.Name()))
		if err != nil {
			continue
		}
		sb.WriteString(parseContentStreamText(string(raw)))
		sb.WriteString("\n")
	}

	text := strings.TrimSpace(sb.String())
	if text == "" {
		// Fallback: try to extract any readable strings from the raw bytes
		text = extractFallbackText(pdfBytes)
	}

	return text, nil
}

var (
	// Matches text strings in PDF content streams: (text) and <hex>
	pdfTextRe  = regexp.MustCompile(`\(([^)\\]*(?:\\.[^)\\]*)*)\)`)
	btEtRe     = regexp.MustCompile(`(?s)BT(.*?)ET`)
	newlinePRe = regexp.MustCompile(`\s+`)
)

// parseContentStreamText extracts human-readable text from a PDF content stream.
func parseContentStreamText(content string) string {
	var sb strings.Builder

	// Process text within BT...ET blocks
	btBlocks := btEtRe.FindAllString(content, -1)
	for _, block := range btBlocks {
		matches := pdfTextRe.FindAllStringSubmatch(block, -1)
		for _, m := range matches {
			if len(m) > 1 {
				text := unescapePDFString(m[1])
				if isPrintable(text) {
					sb.WriteString(text)
					sb.WriteString(" ")
				}
			}
		}
		sb.WriteString("\n")
	}

	// If no BT blocks, try extracting from the whole stream
	if sb.Len() == 0 {
		matches := pdfTextRe.FindAllStringSubmatch(content, -1)
		for _, m := range matches {
			if len(m) > 1 {
				text := unescapePDFString(m[1])
				if isPrintable(text) {
					sb.WriteString(text)
					sb.WriteString(" ")
				}
			}
		}
	}

	return newlinePRe.ReplaceAllString(sb.String(), " ")
}

func unescapePDFString(s string) string {
	s = strings.ReplaceAll(s, `\n`, "\n")
	s = strings.ReplaceAll(s, `\r`, "\r")
	s = strings.ReplaceAll(s, `\t`, "\t")
	s = strings.ReplaceAll(s, `\\`, "\\")
	s = strings.ReplaceAll(s, `\(`, "(")
	s = strings.ReplaceAll(s, `\)`, ")")
	return s
}

func isPrintable(s string) bool {
	if len(s) == 0 || len(s) > 500 {
		return false
	}
	printable := 0
	for _, ch := range s {
		if ch >= 32 && ch < 127 {
			printable++
		}
	}
	return printable > len(s)/2
}

// extractFallbackText tries to pull readable ASCII text from raw PDF bytes.
// Useful for PDFs where content stream extraction fails.
func extractFallbackText(data []byte) string {
	var sb strings.Builder
	var run bytes.Buffer

	for _, b := range data {
		if b >= 32 && b < 127 {
			run.WriteByte(b)
		} else {
			if run.Len() >= 4 {
				sb.WriteString(run.String())
				sb.WriteString(" ")
			}
			run.Reset()
		}
	}
	if run.Len() >= 4 {
		sb.WriteString(run.String())
	}

	return sb.String()
}
