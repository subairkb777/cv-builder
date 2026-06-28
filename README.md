# Portfolio App

A self-hosted full-stack personal portfolio with resume, projects, and an admin editor.
Optionally integrates with any major LLM to parse resumes from PDF.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS v3 |
| Backend | Go 1.22 · chi router · JWT auth |
| PDF parsing | pdfcpu (pure Go) |
| Storage | JSON file on disk |
| Container | Docker · Docker Compose |

---

## Quickstart (3 commands)

```bash
# 1. Clone and enter the project
git clone <repo-url> portfolio && cd portfolio

# 2. Edit credentials (change jwt_secret — must be 32+ chars!)
cp .env.example .env
nano config.yaml

# 3. Build and run
docker compose up --build
```

Open **http://localhost:8080** in your browser.
The React app is served by the Go backend.

For local development with hot reload:
```bash
# Terminal 1 — backend
cd backend && go run . 

# Terminal 2 — frontend dev server (proxies /api to :8080)
cd frontend && npm install && npm run dev
```

---

## Configuration Reference

All configuration lives in `config.yaml`.

### Server

| Field | Default | Description |
|---|---|---|
| `server.port` | `8080` | HTTP port the server listens on |
| `server.trust_proxy` | `false` | Set `true` behind a reverse proxy (nginx, Caddy) |

### Auth

| Field | Default | Description |
|---|---|---|
| `auth.username` | `admin` | Admin login username |
| `auth.password` | `changeme123` | Admin login password |
| `auth.jwt_secret` | _(must change)_ | HMAC-SHA256 signing key — **minimum 32 characters** |
| `auth.session_hours` | `24` | JWT lifetime in hours |

### LLM

| Field | Default | Description |
|---|---|---|
| `llm.enabled` | `false` | Set `true` to enable AI PDF parsing |
| `llm.provider` | `anthropic` | Active provider key (see providers table) |
| `llm.providers.<name>.api_key` | `""` | Provider API key |
| `llm.providers.<name>.model` | varies | Model ID |
| `llm.providers.<name>.base_url` | varies | API base URL |
| `llm.providers.<name>.max_tokens` | `4096` | Max output tokens |
| `llm.parse_prompt` | _(built-in)_ | System prompt sent to the LLM |

### Supported LLM Providers

| Key | Provider | Notes |
|---|---|---|
| `anthropic` | Anthropic Claude | Needs `x-api-key` header |
| `openai` | OpenAI GPT | Standard chat completions |
| `deepseek` | DeepSeek | OpenAI-compatible API |
| `groq` | Groq | OpenAI-compatible API |
| `gemini` | Google Gemini | Uses `generateContent` REST API |
| `mistral` | Mistral AI | Standard chat completions |
| `cohere` | Cohere | v2 chat API |
| `ollama` | Ollama (local) | No API key required |

---

## Features

### Public pages
- **Home** (`/`) — Hero, skills, and project cards
- **Resume** (`/resume`) — Two-column resume layout, PDF export
- **Project detail** (`/projects/:slug`) — Full project write-up with "My Contribution" highlighted

### Admin editor (`/editor`)
Login with credentials from `config.yaml` to access:
- Edit all portfolio fields (basic info, links, skills, experience, education, projects)
- Upload profile photo (JPEG/PNG/WebP → stored as base64)
- **PDF Import**: Upload a resume PDF → extracts text
  - With LLM enabled: auto-fills all fields (review before saving)
  - Without LLM: shows extracted text for manual copy-paste

### PDF Export
Any page can be printed as PDF via the "Export PDF" button.
`print.css` hides navigation and formats for A4 with correct page breaks.

---

## Data Storage

All portfolio data is stored in `backend/data/portfolio.json`.
On first run (no file present), realistic seed data is generated automatically.

In Docker, this is persisted via the `portfolio_data` named volume.

The JSON schema matches the `PortfolioData` interface in `frontend/src/api/client.ts`
and the `PortfolioData` struct in `backend/llm/adapter.go`.

---

## Adding a New LLM Provider

The LLM layer uses a simple adapter pattern. Adding a new provider takes 3 steps:

**1. Create `backend/llm/myprovider.go`:**

```go
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

type MyProviderAdapter struct {
    cfg          config.ProviderConfig
    systemPrompt string
    httpClient   *http.Client
}

func NewMyProviderAdapter(cfg config.ProviderConfig, systemPrompt string) *MyProviderAdapter {
    return &MyProviderAdapter{
        cfg:          cfg,
        systemPrompt: systemPrompt,
        httpClient:   &http.Client{Timeout: 30 * time.Second},
    }
}

func (a *MyProviderAdapter) ParseResume(ctx context.Context, extractedText string) (*PortfolioData, error) {
    // Call your provider's API here.
    // Return a *PortfolioData parsed from the JSON response.
    // Use a 30-second context timeout (already passed in ctx).
}

func (a *MyProviderAdapter) ProviderName() string { return "myprovider" }
func (a *MyProviderAdapter) IsEnabled() bool      { return true }
```

**2. Add a case to `backend/llm/factory.go`:**

```go
case "myprovider":
    adapter = NewMyProviderAdapter(*pc, prompt)
```

**3. Add the provider config block to `config.yaml`:**

```yaml
llm:
  provider: myprovider
  providers:
    myprovider:
      api_key: "your-key"
      model: "your-model-id"
      base_url: "https://api.myprovider.com/v1"
      max_tokens: 4096
```

That's it — the rest of the system picks it up automatically.

---

## Project Structure

```
portfolio/
├── config.yaml              # App configuration
├── docker-compose.yml       # Multi-service Docker setup
├── backend/
│   ├── Dockerfile           # Multi-stage: builds frontend + Go binary
│   ├── main.go              # Server entry point, route registration
│   ├── config/config.go     # Config loading and validation
│   ├── handlers/
│   │   ├── auth.go          # Login, logout, /me
│   │   ├── portfolio.go     # CRUD for portfolio.json + photo upload
│   │   └── llm.go           # PDF upload + LLM routing
│   ├── llm/
│   │   ├── adapter.go       # LLMAdapter interface + shared data types
│   │   ├── factory.go       # Adapter construction from config
│   │   ├── anthropic.go     # Anthropic Messages API
│   │   ├── openai.go        # OpenAI / DeepSeek / Groq (compatible)
│   │   ├── gemini.go        # Google Gemini REST API
│   │   ├── mistral.go       # Mistral chat completions
│   │   ├── cohere.go        # Cohere v2 chat
│   │   ├── ollama.go        # Ollama local API
│   │   └── disabled.go      # No-op adapter
│   ├── middleware/auth.go   # JWT validation middleware
│   └── data/portfolio.json  # Portfolio data (auto-seeded)
└── frontend/
    ├── Dockerfile           # Dev server image
    ├── src/
    │   ├── api/client.ts    # Typed fetch wrapper for all backend calls
    │   ├── store/authStore.ts  # Zustand auth state (sessionStorage)
    │   ├── components/      # Navbar, LoginModal, ExportButton, ProjectCard
    │   ├── pages/           # HomePage, ResumePage, ProjectDetailPage, EditorPage
    │   └── print.css        # A4 print styles, hides nav/controls
    └── ...
```

---

## License

MIT
