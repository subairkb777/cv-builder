package llm

import "context"

// LLMAdapter is the interface every LLM provider must implement.
type LLMAdapter interface {
	ParseResume(ctx context.Context, extractedText string) (*PortfolioData, error)
	ProviderName() string
	IsEnabled() bool
}

// ─── Data types shared between LLM and handler layers ───────────────────────

type Link struct {
	Label string `json:"label"`
	URL   string `json:"url"`
}

type Experience struct {
	Company     string `json:"company"`
	Role        string `json:"role"`
	StartDate   string `json:"start_date"`
	EndDate     string `json:"end_date"`
	Description string `json:"description"`
}

type Education struct {
	Institution string `json:"institution"`
	Degree      string `json:"degree"`
	Year        string `json:"year"`
}

type Project struct {
	Title          string   `json:"title"`
	Slug           string   `json:"slug"`
	Summary        string   `json:"summary"`
	MyContribution string   `json:"my_contribution"`
	TechStack      []string `json:"tech_stack"`
	Outcomes       string   `json:"outcomes"`
	StartDate      string   `json:"start_date"`
	EndDate        string   `json:"end_date"`
}

type Award struct {
	Title       string `json:"title"`
	Date        string `json:"date"`
	Issuer      string `json:"issuer"`
	Description string `json:"description"`
}

type PortfolioData struct {
	Name       string       `json:"name"`
	Title      string       `json:"title"`
	Email      string       `json:"email"`
	Phone      string       `json:"phone"`
	Location   string       `json:"location"`
	Summary    string       `json:"summary"`
	PhotoURL   string       `json:"photo_url"`
	Links      []Link       `json:"links"`
	Skills     []string     `json:"skills"`
	Experience []Experience `json:"experience"`
	Education  []Education  `json:"education"`
	Projects   []Project    `json:"projects"`
	Awards     []Award      `json:"awards"`
}
