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

// OpenAIAdapter handles OpenAI, DeepSeek, and Groq — all OpenAI-API-compatible.
type OpenAIAdapter struct {
	cfg          config.ProviderConfig
	systemPrompt string
	providerName string
	httpClient   *http.Client
}

func NewOpenAIAdapter(cfg config.ProviderConfig, systemPrompt, providerName string) *OpenAIAdapter {
	return &OpenAIAdapter{
		cfg:          cfg,
		systemPrompt: systemPrompt,
		providerName: providerName,
		httpClient:   &http.Client{Timeout: 30 * time.Second},
	}
}

type openAIRequest struct {
	Model          string          `json:"model"`
	Messages       []openAIMessage `json:"messages"`
	MaxTokens      int             `json:"max_tokens"`
	ResponseFormat *responseFormat `json:"response_format,omitempty"`
}

type openAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type responseFormat struct {
	Type string `json:"type"`
}

type openAIResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
		Type    string `json:"type"`
	} `json:"error,omitempty"`
}

func (a *OpenAIAdapter) ParseResume(ctx context.Context, extractedText string) (*PortfolioData, error) {
	reqBody := openAIRequest{
		Model:     a.cfg.Model,
		MaxTokens: a.cfg.MaxTokens,
		Messages: []openAIMessage{
			{Role: "system", Content: a.systemPrompt},
			{Role: "user", Content: extractedText},
		},
		ResponseFormat: &responseFormat{Type: "json_object"},
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
		return nil, fmt.Errorf("%s request: %w", a.providerName, err)
	}
	defer resp.Body.Close()

	var or openAIResponse
	if err := json.NewDecoder(resp.Body).Decode(&or); err != nil {
		return nil, fmt.Errorf("decoding %s response: %w", a.providerName, err)
	}

	if resp.StatusCode != http.StatusOK {
		if or.Error != nil {
			return nil, fmt.Errorf("%s error (%s): %s", a.providerName, or.Error.Type, or.Error.Message)
		}
		return nil, fmt.Errorf("%s returned status %d", a.providerName, resp.StatusCode)
	}

	if len(or.Choices) == 0 || or.Choices[0].Message.Content == "" {
		return nil, fmt.Errorf("empty response from %s", a.providerName)
	}

	var data PortfolioData
	if err := json.Unmarshal([]byte(or.Choices[0].Message.Content), &data); err != nil {
		return nil, fmt.Errorf("parsing portfolio JSON from %s: %w", a.providerName, err)
	}

	return &data, nil
}

func (a *OpenAIAdapter) ProviderName() string { return a.providerName }
func (a *OpenAIAdapter) IsEnabled() bool      { return true }
