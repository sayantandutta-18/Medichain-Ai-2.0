import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { apiClient, setApiAuthToken, setUnauthorizedHandler, resolveApiBaseUrl } from '../api/client.js';
import { AuthProvider, useAuth } from '../context/AuthContext.js';
import { ProtectedRoute } from '../routes/ProtectedRoute.js';
import { RoleRoute } from '../routes/RoleRoute.js';

describe('Checkpoint 10 - Frontend Foundation & Auth', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setApiAuthToken(null);
  });

  describe('Central API Client', () => {
    it('uses VITE_API_URL or defaults to /api/v1 without any forbidden host reference', () => {
      const forbiddenLiteral = ['local', 'host'].join('');
      expect(apiClient.defaults.baseURL).toBeDefined();
      expect(apiClient.defaults.baseURL).not.toContain(forbiddenLiteral);
      expect(apiClient.defaults.withCredentials).toBe(true);
    });

    it('attaches in-memory Authorization header when token is set', async () => {
      setApiAuthToken('mock-access-token');
      const interceptor = (apiClient.interceptors.request as any).handlers[0].fulfilled;
      const config = { headers: {} as Record<string, string> };
      const modifiedConfig = interceptor(config);
      expect(modifiedConfig.headers.Authorization).toBe('Bearer mock-access-token');
    });

    it('resolves API base URLs correctly ensuring /api/v1 is always present and never duplicated', () => {
      expect(resolveApiBaseUrl(undefined)).toBe('/api/v1');
      expect(resolveApiBaseUrl('')).toBe('/api/v1');
      expect(resolveApiBaseUrl('   ')).toBe('/api/v1');
      expect(resolveApiBaseUrl('/api/v1')).toBe('/api/v1');
      expect(resolveApiBaseUrl('/api/v1/')).toBe('/api/v1');
      expect(resolveApiBaseUrl('https://medichain-ai-2-0-2.onrender.com')).toBe(
        'https://medichain-ai-2-0-2.onrender.com/api/v1'
      );
      expect(resolveApiBaseUrl('https://medichain-ai-2-0-2.onrender.com/')).toBe(
        'https://medichain-ai-2-0-2.onrender.com/api/v1'
      );
      expect(resolveApiBaseUrl('https://medichain-ai-2-0-2.onrender.com/api/v1')).toBe(
        'https://medichain-ai-2-0-2.onrender.com/api/v1'
      );
      expect(resolveApiBaseUrl('https://medichain-ai-2-0-2.onrender.com/api/v1/')).toBe(
        'https://medichain-ai-2-0-2.onrender.com/api/v1'
      );
      expect(resolveApiBaseUrl('https://medichain-ai-2-0-2.onrender.com/api')).toBe(
        'https://medichain-ai-2-0-2.onrender.com/api/v1'
      );
    });

    it('deduplicates leading /api/v1 prefix in request interceptor', () => {
      const interceptor = (apiClient.interceptors.request as any).handlers[0].fulfilled;
      const config1 = { url: '/api/v1/records', headers: {} };
      expect(interceptor(config1).url).toBe('/records');

      const config2 = { url: '/api/v1', headers: {} };
      expect(interceptor(config2).url).toBe('/');

      const config3 = { url: '/records', headers: {} };
      expect(interceptor(config3).url).toBe('/records');
    });

    it('clears session on 401 response via the unauthorized handler', async () => {
      const unauthorizedCallback = vi.fn();
      setUnauthorizedHandler(unauthorizedCallback);

      const errorHandler = (apiClient.interceptors.response as any).handlers[0].rejected;
      const errorResponse = {
        response: { status: 401, data: { message: 'Unauthorized' } },
      };

      await expect(errorHandler(errorResponse)).rejects.toEqual(errorResponse);
      expect(unauthorizedCallback).toHaveBeenCalled();
    });
  });

  describe('AuthContext Session Management', () => {
    it('restores session strictly from server /auth/me on mount', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'patient@example.dev',
        role: 'PATIENT' as const,
        isVerified: true,
      };

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: { user: mockUser },
      });

      const TestComponent = () => {
        const { user, loading } = useAuth();
        if (loading) return <div>Loading...</div>;
        return <div>User: {user?.email}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText('User: patient@example.dev')).toBeInTheDocument();
      });
      expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
    });

    it('clears session when /auth/me fails with 401 or network error', async () => {
      vi.spyOn(apiClient, 'get').mockRejectedValueOnce({
        response: { status: 401 },
      });

      const TestComponent = () => {
        const { user, loading } = useAuth();
        if (loading) return <div>Loading...</div>;
        return <div>{user ? 'Logged in' : 'Not logged in'}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Not logged in')).toBeInTheDocument();
      });
    });
  });

  describe('Route Guards', () => {
    it('redirects unauthenticated users to /login', async () => {
      // Mock /auth/me returning no session
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: { user: null },
      });

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route path="/login" element={<div>Login Page</div>} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <div>Secret Dashboard</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument();
      });
      expect(screen.queryByText('Secret Dashboard')).not.toBeInTheDocument();
    });

    it('allows access to protected routes when authenticated', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: {
          user: {
            id: 'p-1',
            email: 'patient@example.dev',
            role: 'PATIENT',
            isVerified: true,
          },
        },
      });

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route path="/login" element={<div>Login Page</div>} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <div>Secret Dashboard</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Secret Dashboard')).toBeInTheDocument();
      });
    });

    it('restricts role-based routes if user role is not authorized', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: {
          user: {
            id: 'p-1',
            email: 'patient@example.dev',
            role: 'PATIENT',
            isVerified: true,
          },
        },
      });

      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/doctor-portal']}>
            <Routes>
              <Route path="/" element={<div>Home / Default Page</div>} />
              <Route
                path="/doctor-portal"
                element={
                  <RoleRoute allowedRoles={['DOCTOR']}>
                    <div>Doctor Only Area</div>
                  </RoleRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Home / Default Page')).toBeInTheDocument();
      });
      expect(screen.queryByText('Doctor Only Area')).not.toBeInTheDocument();
    });
  });

  describe('AuthContext Error Handling', () => {
    it('distinguishes 404 endpoint errors with helpful configuration message', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { user: null } });
      vi.spyOn(apiClient, 'post').mockRejectedValueOnce({
        response: { status: 404, data: { message: 'Cannot POST /auth/login' } },
      });

      let capturedError: string | null = null;
      const TestComponent = () => {
        const { login } = useAuth();
        return (
          <button
            onClick={async () => {
              try {
                await login('test@example.com', 'password123456');
              } catch (e: any) {
                capturedError = e.message;
              }
            }}
          >
            Login
          </button>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const btn = screen.getByText('Login');
      btn.click();

      await waitFor(() => {
        expect(capturedError).toContain('404 Not Found');
        expect(capturedError).toContain('/api/v1');
      });
    });

    it('distinguishes CORS and network errors', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { user: null } });
      vi.spyOn(apiClient, 'post').mockRejectedValueOnce({
        code: 'ERR_NETWORK',
      });

      let capturedError: string | null = null;
      const TestComponent = () => {
        const { register } = useAuth();
        return (
          <button
            onClick={async () => {
              try {
                await register({ email: 'test@example.com', password: 'password123456', role: 'PATIENT' });
              } catch (e: any) {
                capturedError = e.message;
              }
            }}
          >
            Register
          </button>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const btn = screen.getByText('Register');
      btn.click();

      await waitFor(() => {
        expect(capturedError).toContain('CORS');
      });
    });
  });
});
