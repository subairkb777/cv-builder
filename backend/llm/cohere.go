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

type CohereAdapter struct {
	cfg          config.ProviderConfig
	systemPrompt string
	httpClient   *http.Client
}

func NewCohereAdapter(cfg config.ProviderConfig, systemPrompt string) *CohereAdapter {
	return &CohereAdapter{
		cfg:          cfg,
		systemPrompt: systemPrompt,
		httpClient:   &http.Client{Timeout: 30 * time.Second},
	}
}

type cohereRequest struct {
	Model     string          `json:"model"`
	System    string          `json:"system"`
	Messages  []cohereMessage `json:"messages"`
	MaxTokens int             `json:"max_tokens"`
}

type cohereMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type cohereResponse struct {
	Message *struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	} `json:"message,omitempty"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (a *CohereAdapter) ParseResume(ctx context.Context, extractedText string) (*PortfolioData, error) {
	reqBody := cohereRequest{
		Model:     a.cfg.Model,
		System:    a.systemPrompt,
		MaxTokens: a.cfg.MaxTokens,
		Messages: []cohereMessage{
			{Role: "user", Content: extractedText},
		},
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshalling request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, a.cfg.BaseURL+"/chat", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+a.cfg.APIKey)
	req.Header.Set("X-Client-Name", "portfolio-app")

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("cohere request: %w", err)
	}
	defer resp.Body.Close()

	var cr cohereResponse
	if err := json.NewDecoder(resp.Body).Decode(&cr); err != nil {
		return nil, fmt.Errorf("decoding cohere response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		if cr.Error != nil {
			return nil, fmt.Errorf("cohere error: %s", cr.Error.Message)
		}
		return nil, fmt.Errorf("cohere returned status %d", resp.StatusCode)
	}

	if cr.Message == nil || len(cr.Message.Content) == 0 {
		return nil, fmt.Errorf("empty response from cohere")
	}

	text := cr.Message.Content[0].Text
	var data PortfolioData
	if err := json.Unmarshal([]byte(text), &data); err != nil {
		return nil, fmt.Errorf("parsing portfolio JSON from cohere: %w", err)
	}

	return &data, nil
}

func (a *CohereAdapter) ProviderName() string { return "cohere" }
func (a *CohereAdapter) IsEnabled() bool      { return true }
