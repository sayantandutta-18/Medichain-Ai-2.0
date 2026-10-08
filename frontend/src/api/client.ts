import axios from 'axios';

let memoryToken: string | null = null;
let onUnauthorizedCallback: (() => void) | null = null;

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
});

export function setApiAuthToken(token: string | null): void {
  memoryToken = token;
}

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorizedCallback = handler;
}

// Request interceptor: attach in-memory access token if present
apiClient.interceptors.request.use((config) => {
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
        import.meta.env.MODE !== 'test'
      ) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
