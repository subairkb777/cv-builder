package config

import (
	"errors"
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

type ServerConfig struct {
	Port       int  `yaml:"port"`
	TrustProxy bool `yaml:"trust_proxy"`
}

type AuthConfig struct {
	Username     string `yaml:"username"`
	Password     string `yaml:"password"`
	JWTSecret    string `yaml:"jwt_secret"`
	SessionHours int    `yaml:"session_hours"`
}

type ProviderConfig struct {
	APIKey    string `yaml:"api_key"`
	Model     string `yaml:"model"`
	BaseURL   string `yaml:"base_url"`
	MaxTokens int    `yaml:"max_tokens"`
}

type LLMProviders struct {
	Anthropic ProviderConfig `yaml:"anthropic"`
	OpenAI    ProviderConfig `yaml:"openai"`
	DeepSeek  ProviderConfig `yaml:"deepseek"`
	Gemini    ProviderConfig `yaml:"gemini"`
	Groq      ProviderConfig `yaml:"groq"`
	Mistral   ProviderConfig `yaml:"mistral"`
	Cohere    ProviderConfig `yaml:"cohere"`
	Ollama    ProviderConfig `yaml:"ollama"`
}

type LLMConfig struct {
	Enabled     bool         `yaml:"enabled"`
	Provider    string       `yaml:"provider"`
	Providers   LLMProviders `yaml:"providers"`
	ParsePrompt string       `yaml:"parse_prompt"`
}

type Config struct {
	Server ServerConfig `yaml:"server"`
	Auth   AuthConfig   `yaml:"auth"`
	LLM    LLMConfig    `yaml:"llm"`
}

func Load() (*Config, error) {
	path := os.Getenv("CONFIG_PATH")
	if path == "" {
		path = "./config.yaml"
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("reading config file %q: %w", path, err)
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parsing config file: %w", err)
	}

	// Environment variables override the config file — used for cloud deployments
	// where secrets are injected at runtime (e.g. Fly.io secrets).
	applyEnvOverrides(&cfg)

	if err := validate(&cfg); err != nil {
		return nil, fmt.Errorf("invalid config: %w", err)
	}

	return &cfg, nil
}

func applyEnvOverrides(cfg *Config) {
	if v := os.Getenv("AUTH_USERNAME"); v != "" {
		cfg.Auth.Username = v
	}
	if v := os.Getenv("AUTH_PASSWORD"); v != "" {
		cfg.Auth.Password = v
	}
	if v := os.Getenv("JWT_SECRET"); v != "" {
		cfg.Auth.JWTSecret = v
	}
	if v := os.Getenv("LLM_ENABLED"); v == "true" {
		cfg.LLM.Enabled = true
	}
	if v := os.Getenv("LLM_PROVIDER"); v != "" {
		cfg.LLM.Provider = v
	}
	if v := os.Getenv("LLM_API_KEY"); v != "" {
		switch cfg.LLM.Provider {
		case "anthropic":
			cfg.LLM.Providers.Anthropic.APIKey = v
		case "openai":
			cfg.LLM.Providers.OpenAI.APIKey = v
		case "deepseek":
			cfg.LLM.Providers.DeepSeek.APIKey = v
		case "gemini":
			cfg.LLM.Providers.Gemini.APIKey = v
		case "groq":
			cfg.LLM.Providers.Groq.APIKey = v
		case "mistral":
			cfg.LLM.Providers.Mistral.APIKey = v
		case "cohere":
			cfg.LLM.Providers.Cohere.APIKey = v
		}
	}
}

func validate(cfg *Config) error {
	if len(cfg.Auth.JWTSecret) < 32 {
		return errors.New("auth.jwt_secret must be at least 32 characters — refusing to start")
	}

	if cfg.Auth.Username == "" {
		return errors.New("auth.username must not be empty")
	}

	if cfg.Auth.Password == "" {
		return errors.New("auth.password must not be empty")
	}

	if cfg.Server.Port == 0 {
		cfg.Server.Port = 8080
	}

	if cfg.Auth.SessionHours == 0 {
		cfg.Auth.SessionHours = 24
	}

	if cfg.LLM.Enabled {
		if cfg.LLM.Provider == "" {
			return errors.New("llm.provider must be set when llm.enabled is true")
		}
		if cfg.LLM.Provider != "ollama" {
			key := activeProviderKey(cfg)
			if key == "" {
				return fmt.Errorf("llm.providers.%s.api_key must be set when llm.enabled is true", cfg.LLM.Provider)
			}
		}
	}

	return nil
}

func activeProviderKey(cfg *Config) string {
	switch cfg.LLM.Provider {
	case "anthropic":
		return cfg.LLM.Providers.Anthropic.APIKey
	case "openai":
		return cfg.LLM.Providers.OpenAI.APIKey
	case "deepseek":
		return cfg.LLM.Providers.DeepSeek.APIKey
	case "gemini":
		return cfg.LLM.Providers.Gemini.APIKey
	case "groq":
		return cfg.LLM.Providers.Groq.APIKey
	case "mistral":
		return cfg.LLM.Providers.Mistral.APIKey
	case "cohere":
		return cfg.LLM.Providers.Cohere.APIKey
	default:
		return ""
	}
}

func (cfg *Config) ActiveProviderConfig() *ProviderConfig {
	switch cfg.LLM.Provider {
	case "anthropic":
		p := cfg.LLM.Providers.Anthropic
		return &p
	case "openai":
		p := cfg.LLM.Providers.OpenAI
		return &p
	case "deepseek":
		p := cfg.LLM.Providers.DeepSeek
		return &p
	case "gemini":
		p := cfg.LLM.Providers.Gemini
		return &p
	case "groq":
		p := cfg.LLM.Providers.Groq
		return &p
	case "mistral":
		p := cfg.LLM.Providers.Mistral
		return &p
	case "cohere":
		p := cfg.LLM.Providers.Cohere
		return &p
	case "ollama":
		p := cfg.LLM.Providers.Ollama
		return &p
	default:
		return nil
	}
}

func (cfg *Config) LogSummary() {
	fmt.Printf("Server:  port=%d trust_proxy=%v\n", cfg.Server.Port, cfg.Server.TrustProxy)
	fmt.Printf("Auth:    username=%s session_hours=%d\n", cfg.Auth.Username, cfg.Auth.SessionHours)
	if cfg.LLM.Enabled {
		pc := cfg.ActiveProviderConfig()
		apiKeyHint := "(none)"
		if pc != nil && len(pc.APIKey) >= 6 {
			apiKeyHint = pc.APIKey[:6] + "..."
		}
		fmt.Printf("LLM:     enabled=true provider=%s model=%s api_key=%s\n",
			cfg.LLM.Provider, pc.Model, apiKeyHint)
	} else {
		fmt.Println("LLM:     enabled=false (offline mode)")
	}
}
