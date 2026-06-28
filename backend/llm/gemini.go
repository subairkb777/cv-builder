package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"portfolio/config"
)

type GeminiAdapter struct {
	cfg          config.ProviderConfig
	systemPrompt string
	httpClient   *http.Client
}

func NewGeminiAdapter(cfg config.ProviderConfig, systemPrompt string) *GeminiAdapter {
	return &GeminiAdapter{
		cfg:          cfg,
		systemPrompt: systemPrompt,
		httpClient:   &http.Client{Timeout: 30 * time.Second},
	}
}

type geminiRequest struct {
	SystemInstruction *geminiContent  `json:"system_instruction,omitempty"`
	Contents          []geminiContent `json:"contents"`
	GenerationConfig  geminiGenConfig `json:"generationConfig"`
}

type geminiContent struct {
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text string `json:"text"`
}

type geminiGenConfig struct {
	ResponseMIMEType string `json:"response_mime_type"`
	MaxOutputTokens  int    `json:"maxOutputTokens"`
}

type geminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
	Error *struct {
		Message string `json:"message"`
		Code    int    `json:"code"`
	} `json:"error,omitempty"`
}

func (a *GeminiAdapter) ParseResume(ctx context.Context, extractedText string) (*PortfolioData, error) {
	reqBody := geminiRequest{
		SystemInstruction: &geminiContent{
			Parts: []geminiPart{{Text: a.systemPrompt}},
		},
		Contents: []geminiContent{
			{Parts: []geminiPart{{Text: extractedText}}},
		},
		GenerationConfig: geminiGenConfig{
			ResponseMIMEType: "application/json",
			MaxOutputTokens:  a.cfg.MaxTokens,
		},
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshalling request: %w", err)
	}

	url := fmt.Sprintf("%s/v1beta/models/%s:generateContent?key=%s",
		a.cfg.BaseURL, a.cfg.Model, a.cfg.APIKey)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("gemini request: %w", err)
	}
	defer resp.Body.Close()

	var gr geminiResponse
	if err := json.NewDecoder(resp.Body).Decode(&gr); err != nil {
		return nil, fmt.Errorf("decoding gemini response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		if gr.Error != nil {
			return nil, fmt.Errorf("gemini error (code %d): %s", gr.Error.Code, gr.Error.Message)
		}
		return nil, fmt.Errorf("gemini returned status %d", resp.StatusCode)
	}

	if len(gr.Candidates) == 0 || len(gr.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("empty response from gemini")
	}

	text := gr.Candidates[0].Content.Parts[0].Text
	var data PortfolioData
	if err := json.Unmarshal([]byte(text), &data); err != nil {
		return nil, fmt.Errorf("parsing portfolio JSON from gemini: %w", err)
	}

	return &data, nil
}

func (a *GeminiAdapter) ProviderName() string { return "gemini" }
func (a *GeminiAdapter) IsEnabled() bool      { return true }
