import axios from 'axios';

let memoryToken: string | null = null;
let onUnauthorizedCallback: (() => void) | null = null;

export function resolveApiBaseUrl(rawUrl?: string): string {
  if (!rawUrl || !rawUrl.trim()) {
    return '/api/v1';
  }
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return '/api/v1';
  }
  if (trimmed.endsWith('/api/v1')) {
    return trimmed;
  }
  if (trimmed.endsWith('/api')) {
    return `${trimmed}/v1`;
  }
  return `${trimmed}/api/v1`;
}

export const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_URL);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const api = apiClient;

export function setApiAuthToken(token: string | null): void {
  memoryToken = token;
}

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorizedCallback = handler;
}

// Request interceptor: normalize endpoint URLs and attach in-memory access token if present
apiClient.interceptors.request.use((config) => {
  if (config.url) {
    if (config.url.startsWith('/api/v1/')) {
      config.url = config.url.substring('/api/v1'.length);
    } else if (config.url === '/api/v1') {
      config.url = '/';
    }
  }
  if (memoryToken) {
    config.headers.Authorization = `Bearer ${memoryToken}`;
  }
  return config;
});

// Single response interceptor: on 401, clear session and redirect to /login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
      if (
        typeof window !== 'undefined' &&
        window.location &&
        window.location.pathname !== '/login' &&
        window.location.pathname !== '/register' &&
        !window.location.pathname.startsWith('/emergency/') &&
        !window.location.pathname.startsWith('/share/') &&
        import.meta.env.MODE !== 'test'
      ) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
