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

type OllamaAdapter struct {
	cfg          config.ProviderConfig
	systemPrompt string
	httpClient   *http.Client
}

func NewOllamaAdapter(cfg config.ProviderConfig, systemPrompt string) *OllamaAdapter {
	return &OllamaAdapter{
		cfg:          cfg,
		systemPrompt: systemPrompt,
		httpClient:   &http.Client{Timeout: 30 * time.Second},
	}
}

type ollamaRequest struct {
	Model    string          `json:"model"`
	Stream   bool            `json:"stream"`
	Messages []ollamaMessage `json:"messages"`
	Options  ollamaOptions   `json:"options"`
}

type ollamaMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ollamaOptions struct {
	NumPredict int `json:"num_predict"`
}

type ollamaResponse struct {
	Message struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	} `json:"message"`
	Error string `json:"error,omitempty"`
}

func (a *OllamaAdapter) ParseResume(ctx context.Context, extractedText string) (*PortfolioData, error) {
	reqBody := ollamaRequest{
		Model:  a.cfg.Model,
		Stream: false,
		Messages: []ollamaMessage{
			{Role: "system", Content: a.systemPrompt},
			{Role: "user", Content: extractedText},
		},
		Options: ollamaOptions{NumPredict: a.cfg.MaxTokens},
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshalling request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, a.cfg.BaseURL+"/api/chat", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ollama request (is Ollama running at %s?): %w", a.cfg.BaseURL, err)
	}
	defer resp.Body.Close()

	var or ollamaResponse
	if err := json.NewDecoder(resp.Body).Decode(&or); err != nil {
		return nil, fmt.Errorf("decoding ollama response: %w", err)
	}

	if or.Error != "" {
		return nil, fmt.Errorf("ollama error: %s", or.Error)
	}

	if or.Message.Content == "" {
		return nil, fmt.Errorf("empty response from ollama")
	}

	var data PortfolioData
	if err := json.Unmarshal([]byte(or.Message.Content), &data); err != nil {
		return nil, fmt.Errorf("parsing portfolio JSON from ollama: %w", err)
	}

	return &data, nil
}

func (a *OllamaAdapter) ProviderName() string { return "ollama" }
func (a *OllamaAdapter) IsEnabled() bool      { return true }
