# ─── Stage 1: Build React frontend ──────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/package.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ─── Stage 2: Build Go binary ────────────────────────────────────────────────
FROM golang:1.22-alpine AS go-builder

RUN apk add --no-cache git ca-certificates

WORKDIR /app

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -a -ldflags="-s -w" -o portfolio .

# ─── Stage 3: Final minimal image ────────────────────────────────────────────
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata && \
    addgroup -S portfolio && \
    adduser -S portfolio -G portfolio

WORKDIR /app

# Copy binary
COPY --from=go-builder /app/portfolio .

# Copy frontend build
COPY --from=frontend-builder /frontend/dist ./frontend/dist

# Bake in a safe default config (secrets are overridden via env vars at runtime)
COPY config.default.yaml ./config.yaml

# Bake in seed data next to the binary (NOT inside /app/data which is volume-mounted)
COPY backend/data/portfolio.json ./seed.json

# Data directory (overridden by Fly volume mount at runtime)
RUN mkdir -p ./data && chown -R portfolio:portfolio /app

USER portfolio

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/portfolio > /dev/null || exit 1

CMD ["./portfolio"]
