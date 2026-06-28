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

type MistralAdapter struct {
	cfg          config.ProviderConfig
	systemPrompt string
	httpClient   *http.Client
}

func NewMistralAdapter(cfg config.ProviderConfig, systemPrompt string) *MistralAdapter {
	return &MistralAdapter{
		cfg:          cfg,
		systemPrompt: systemPrompt,
		httpClient:   &http.Client{Timeout: 30 * time.Second},
	}
}

type mistralRequest struct {
	Model       string          `json:"model"`
	Messages    []openAIMessage `json:"messages"`
	MaxTokens   int             `json:"max_tokens"`
	ResponseFmt *responseFormat `json:"response_format,omitempty"`
}

type mistralResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (a *MistralAdapter) ParseResume(ctx context.Context, extractedText string) (*PortfolioData, error) {
	reqBody := mistralRequest{
		Model:     a.cfg.Model,
		MaxTokens: a.cfg.MaxTokens,
		Messages: []openAIMessage{
			{Role: "system", Content: a.systemPrompt},
			{Role: "user", Content: extractedText},
		},
		ResponseFmt: &responseFormat{Type: "json_object"},
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshalling request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, a.cfg.BaseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+a.cfg.APIKey)

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("mistral request: %w", err)
	}
	defer resp.Body.Close()

	var mr mistralResponse
	if err := json.NewDecoder(resp.Body).Decode(&mr); err != nil {
		return nil, fmt.Errorf("decoding mistral response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		if mr.Error != nil {
			return nil, fmt.Errorf("mistral error: %s", mr.Error.Message)
		}
		return nil, fmt.Errorf("mistral returned status %d", resp.StatusCode)
	}

	if len(mr.Choices) == 0 || mr.Choices[0].Message.Content == "" {
		return nil, fmt.Errorf("empty response from mistral")
	}

	var data PortfolioData
	if err := json.Unmarshal([]byte(mr.Choices[0].Message.Content), &data); err != nil {
		return nil, fmt.Errorf("parsing portfolio JSON from mistral: %w", err)
	}

	return &data, nil
}

func (a *MistralAdapter) ProviderName() string { return "mistral" }
func (a *MistralAdapter) IsEnabled() bool      { return true }
