import { useAuthStore } from '../store/authStore'

const BASE = ''

export interface Link {
  label: string
  url: string
}

export interface Experience {
  company: string
  role: string
  start_date: string
  end_date: string
  description: string
}

export interface Education {
  institution: string
  degree: string
  year: string
}

export interface Project {
  title: string
  slug: string
  summary: string
  my_contribution: string
  tech_stack: string[]
  outcomes: string
  start_date: string
  end_date: string
}

export interface Award {
  title: string
  date: string
  issuer: string
  description: string
}

export interface PortfolioData {
  name: string
  title: string
  email: string
  phone: string
  location: string
  summary: string
  photo_url: string
  links: Link[]
  skills: string[]
  experience: Experience[]
  education: Education[]
  projects: Project[]
  awards: Award[]
}

export interface AuthResponse {
  token: string
  expires_at: string
}

export interface ParseResponse {
  raw_text?: string
  data?: PortfolioData
  llm_enabled: boolean
  provider?: string
}

export interface LlmStatus {
  enabled: boolean
  provider: string
}

class APIError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'APIError'
  }
}

function authHeaders(): HeadersInit {
  const token = useAuthStore.getState().token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(authHeaders() as Record<string, string>),
    ...(init.headers as Record<string, string>),
  }

  const resp = await fetch(BASE + path, { ...init, headers })

  if (!resp.ok) {
    let message = `HTTP ${resp.status}`
    try {
      const err = (await resp.json()) as { error?: string }
      if (err.error) message = err.error
    } catch {
      // ignore parse error
    }
    throw new APIError(resp.status, message)
  }

  return resp.json() as Promise<T>
}

function get<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' })
}

function put<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function postFormData<T>(path: string, formData: FormData): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: formData,
  })
}

export const api = {
  getPortfolio: () => get<PortfolioData>('/api/portfolio'),
  savePortfolio: (data: PortfolioData) => put<PortfolioData>('/api/portfolio', data),
  login: (username: string, password: string) =>
    post<AuthResponse>('/api/auth/login', { username, password }),
  logout: () => post<{ message: string }>('/api/auth/logout', {}),
  me: () => get<{ username: string }>('/api/auth/me'),
  parsePdf: (file: File): Promise<ParseResponse> => {
    const fd = new FormData()
    fd.append('file', file)
    return postFormData<ParseResponse>('/api/llm/parse-pdf', fd)
  },
  uploadPhoto: (file: File): Promise<{ url: string }> => {
    const fd = new FormData()
    fd.append('photo', file)
    return postFormData<{ url: string }>('/api/portfolio/photo', fd)
  },
  llmStatus: () => get<LlmStatus>('/api/llm/status'),
}

export { APIError }
