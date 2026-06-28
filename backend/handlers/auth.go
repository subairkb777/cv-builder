package handlers

import (
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"portfolio/config"
	authmw "portfolio/middleware"
)

type AuthHandler struct {
	cfg *config.Config
}

func NewAuthHandler(cfg *config.Config) *AuthHandler {
	return &AuthHandler{cfg: cfg}
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type loginResponse struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	usernameOK := subtle.ConstantTimeCompare([]byte(req.Username), []byte(h.cfg.Auth.Username)) == 1
	passwordOK := subtle.ConstantTimeCompare([]byte(req.Password), []byte(h.cfg.Auth.Password)) == 1

	if !usernameOK || !passwordOK {
		jsonError(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	expiresAt := time.Now().Add(time.Duration(h.cfg.Auth.SessionHours) * time.Hour)

	claims := authmw.Claims{
		Username: req.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(h.cfg.Auth.JWTSecret))
	if err != nil {
		jsonError(w, "failed to create token", http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "portfolio_token",
		Value:    tokenString,
		Expires:  expiresAt,
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	})

	jsonResponse(w, loginResponse{Token: tokenString, ExpiresAt: expiresAt}, http.StatusOK)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     "portfolio_token",
		Value:    "",
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Path:     "/",
		MaxAge:   -1,
	})
	jsonResponse(w, map[string]string{"message": "logged out"}, http.StatusOK)
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	tokenString := extractToken(r)
	if tokenString == "" {
		jsonError(w, "not authenticated", http.StatusUnauthorized)
		return
	}

	claims, err := authmw.ValidateToken(tokenString, h.cfg.Auth.JWTSecret)
	if err != nil {
		jsonError(w, "invalid token", http.StatusUnauthorized)
		return
	}

	jsonResponse(w, map[string]string{"username": claims.Username}, http.StatusOK)
}

func extractToken(r *http.Request) string {
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimPrefix(auth, "Bearer ")
	}
	cookie, err := r.Cookie("portfolio_token")
	if err == nil && cookie.Value != "" {
		return cookie.Value
	}
	return ""
}

// ─── Shared handler utilities ────────────────────────────────────────────────

func jsonResponse(w http.ResponseWriter, data interface{}, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		fmt.Printf("jsonResponse encode error: %v\n", err)
	}
}

func jsonError(w http.ResponseWriter, message string, status int) {
	jsonResponse(w, map[string]string{"error": message}, status)
}
