package llm

import (
	"context"
	"errors"
)

// DisabledAdapter is returned when llm.enabled = false in config.
type DisabledAdapter struct{}

func (d *DisabledAdapter) ParseResume(_ context.Context, _ string) (*PortfolioData, error) {
	return nil, errors.New("LLM integration is disabled")
}

func (d *DisabledAdapter) ProviderName() string { return "disabled" }
func (d *DisabledAdapter) IsEnabled() bool      { return false }
