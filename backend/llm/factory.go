package llm

import (
	"log"

	"portfolio/config"
)

// NewAdapter constructs the appropriate LLMAdapter based on config.
func NewAdapter(cfg *config.Config) LLMAdapter {
	if !cfg.LLM.Enabled {
		log.Println("LLM: disabled — running in offline mode")
		return &DisabledAdapter{}
	}

	pc := cfg.ActiveProviderConfig()
	if pc == nil {
		log.Printf("LLM: unknown provider %q — falling back to disabled", cfg.LLM.Provider)
		return &DisabledAdapter{}
	}

	prompt := cfg.LLM.ParsePrompt
	if prompt == "" {
		prompt = defaultParsePrompt
	}

	var adapter LLMAdapter
	switch cfg.LLM.Provider {
	case "anthropic":
		adapter = NewAnthropicAdapter(*pc, prompt)
	case "openai":
		adapter = NewOpenAIAdapter(*pc, prompt, "openai")
	case "deepseek":
		adapter = NewOpenAIAdapter(*pc, prompt, "deepseek")
	case "groq":
		adapter = NewOpenAIAdapter(*pc, prompt, "groq")
	case "gemini":
		adapter = NewGeminiAdapter(*pc, prompt)
	case "mistral":
		adapter = NewMistralAdapter(*pc, prompt)
	case "cohere":
		adapter = NewCohereAdapter(*pc, prompt)
	case "ollama":
		adapter = NewOllamaAdapter(*pc, prompt)
	default:
		log.Printf("LLM: unknown provider %q — falling back to disabled", cfg.LLM.Provider)
		return &DisabledAdapter{}
	}

	log.Printf("LLM: enabled provider=%s model=%s", adapter.ProviderName(), pc.Model)
	return adapter
}

const defaultParsePrompt = `You are a resume parser. Extract structured information from the resume text provided.
Return ONLY valid JSON with no additional text or markdown, matching the portfolio data schema.`
