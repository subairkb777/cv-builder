{{/*
Expand the name of the chart.
*/}}
{{- define "portfolio.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
Truncated at 63 chars because Kubernetes name fields are limited.
*/}}
{{- define "portfolio.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart label value.
*/}}
{{- define "portfolio.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels applied to all resources.
*/}}
{{- define "portfolio.labels" -}}
helm.sh/chart: {{ include "portfolio.chart" . }}
{{ include "portfolio.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels — used in Deployment.spec.selector and Service.spec.selector.
*/}}
{{- define "portfolio.selectorLabels" -}}
app.kubernetes.io/name: {{ include "portfolio.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Service account name.
*/}}
{{- define "portfolio.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "portfolio.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Name of the Secret that holds config.yaml.
Supports existingSecret override so users can manage creds externally
(e.g., Sealed Secrets, External Secrets Operator).
*/}}
{{- define "portfolio.configSecretName" -}}
{{- if .Values.existingSecret }}
{{- .Values.existingSecret }}
{{- else }}
{{- include "portfolio.fullname" . }}-config
{{- end }}
{{- end }}

{{/*
Name of the PersistentVolumeClaim for portfolio.json storage.
Supports existingClaim override.
*/}}
{{- define "portfolio.pvcName" -}}
{{- if .Values.persistence.existingClaim }}
{{- .Values.persistence.existingClaim }}
{{- else }}
{{- include "portfolio.fullname" . }}-data
{{- end }}
{{- end }}

{{/*
Render the complete config.yaml content from values.
Used in the Secret template via stringData so k8s handles base64 encoding.
*/}}
{{- define "portfolio.configYaml" -}}
server:
  port: {{ .Values.config.server.port }}
  trust_proxy: {{ .Values.config.server.trustProxy }}

auth:
  username: {{ .Values.config.auth.username | quote }}
  password: {{ .Values.config.auth.password | quote }}
  jwt_secret: {{ .Values.config.auth.jwtSecret | quote }}
  session_hours: {{ .Values.config.auth.sessionHours }}

llm:
  enabled: {{ .Values.config.llm.enabled }}
  provider: {{ .Values.config.llm.provider | quote }}

  providers:
    anthropic:
      api_key: {{ .Values.config.llm.providers.anthropic.apiKey | quote }}
      model: {{ .Values.config.llm.providers.anthropic.model | quote }}
      base_url: {{ .Values.config.llm.providers.anthropic.baseUrl | quote }}
      max_tokens: {{ .Values.config.llm.providers.anthropic.maxTokens }}

    openai:
      api_key: {{ .Values.config.llm.providers.openai.apiKey | quote }}
      model: {{ .Values.config.llm.providers.openai.model | quote }}
      base_url: {{ .Values.config.llm.providers.openai.baseUrl | quote }}
      max_tokens: {{ .Values.config.llm.providers.openai.maxTokens }}

    deepseek:
      api_key: {{ .Values.config.llm.providers.deepseek.apiKey | quote }}
      model: {{ .Values.config.llm.providers.deepseek.model | quote }}
      base_url: {{ .Values.config.llm.providers.deepseek.baseUrl | quote }}
      max_tokens: {{ .Values.config.llm.providers.deepseek.maxTokens }}

    gemini:
      api_key: {{ .Values.config.llm.providers.gemini.apiKey | quote }}
      model: {{ .Values.config.llm.providers.gemini.model | quote }}
      base_url: {{ .Values.config.llm.providers.gemini.baseUrl | quote }}
      max_tokens: {{ .Values.config.llm.providers.gemini.maxTokens }}

    groq:
      api_key: {{ .Values.config.llm.providers.groq.apiKey | quote }}
      model: {{ .Values.config.llm.providers.groq.model | quote }}
      base_url: {{ .Values.config.llm.providers.groq.baseUrl | quote }}
      max_tokens: {{ .Values.config.llm.providers.groq.maxTokens }}

    mistral:
      api_key: {{ .Values.config.llm.providers.mistral.apiKey | quote }}
      model: {{ .Values.config.llm.providers.mistral.model | quote }}
      base_url: {{ .Values.config.llm.providers.mistral.baseUrl | quote }}
      max_tokens: {{ .Values.config.llm.providers.mistral.maxTokens }}

    cohere:
      api_key: {{ .Values.config.llm.providers.cohere.apiKey | quote }}
      model: {{ .Values.config.llm.providers.cohere.model | quote }}
      base_url: {{ .Values.config.llm.providers.cohere.baseUrl | quote }}
      max_tokens: {{ .Values.config.llm.providers.cohere.maxTokens }}

    ollama:
      api_key: {{ .Values.config.llm.providers.ollama.apiKey | quote }}
      model: {{ .Values.config.llm.providers.ollama.model | quote }}
      base_url: {{ .Values.config.llm.providers.ollama.baseUrl | quote }}
      max_tokens: {{ .Values.config.llm.providers.ollama.maxTokens }}

  parse_prompt: |
{{ .Values.config.llm.parsePrompt | indent 4 }}
{{- end }}
