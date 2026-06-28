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

type AnthropicAdapter struct {
	cfg          config.ProviderConfig
	systemPrompt string
	httpClient   *http.Client
}

func NewAnthropicAdapter(cfg config.ProviderConfig, systemPrompt string) *AnthropicAdapter {
	return &AnthropicAdapter{
		cfg:          cfg,
		systemPrompt: systemPrompt,
		httpClient:   &http.Client{Timeout: 30 * time.Second},
	}
}

type anthropicRequest struct {
	Model     string             `json:"model"`
	MaxTokens int                `json:"max_tokens"`
	System    string             `json:"system"`
	Messages  []anthropicMessage `json:"messages"`
}

type anthropicMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type anthropicResponse struct {
	Content []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"content"`
	Error *struct {
		Message string `json:"message"`
		Type    string `json:"type"`
	} `json:"error,omitempty"`
}

func (a *AnthropicAdapter) ParseResume(ctx context.Context, extractedText string) (*PortfolioData, error) {
	reqBody := anthropicRequest{
		Model:     a.cfg.Model,
		MaxTokens: a.cfg.MaxTokens,
		System:    a.systemPrompt,
		Messages: []anthropicMessage{
			{Role: "user", Content: extractedText},
		},
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshalling request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, a.cfg.BaseURL+"/v1/messages", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", a.cfg.APIKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("anthropic request: %w", err)
	}
	defer resp.Body.Close()

	var ar anthropicResponse
	if err := json.NewDecoder(resp.Body).Decode(&ar); err != nil {
		return nil, fmt.Errorf("decoding anthropic response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		if ar.Error != nil {
			return nil, fmt.Errorf("anthropic error (%s): %s", ar.Error.Type, ar.Error.Message)
		}
		return nil, fmt.Errorf("anthropic returned status %d", resp.StatusCode)
	}

	if len(ar.Content) == 0 || ar.Content[0].Text == "" {
		return nil, fmt.Errorf("empty response from anthropic")
	}

	var data PortfolioData
	if err := json.Unmarshal([]byte(ar.Content[0].Text), &data); err != nil {
		return nil, fmt.Errorf("parsing portfolio JSON from anthropic: %w", err)
	}

	return &data, nil
}

func (a *AnthropicAdapter) ProviderName() string { return "anthropic" }
func (a *AnthropicAdapter) IsEnabled() bool      { return true }
