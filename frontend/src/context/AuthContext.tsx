import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient, setApiAuthToken, setUnauthorizedHandler } from '../api/client.js';
import { User, AuthContextType } from '../types/auth.js';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearSession = () => {
    setUser(null);
    setToken(null);
    setApiAuthToken(null);
  };

  useEffect(() => {
    // Connect central 401 handler to clear in-memory session
    setUnauthorizedHandler(clearSession);

    // Restore session strictly from server /auth/me (never trusting localStorage)
    const restoreSession = async () => {
      try {
        const res = await apiClient.get('/auth/me');
        if (res.data && res.data.user) {
          setUser(res.data.user);
        } else {
          clearSession();
        }
      } catch {
        clearSession();
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setError(null);
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const { user: authUser, tokens } = res.data;
      setUser(authUser);
      setToken(tokens.accessToken);
      setApiAuthToken(tokens.accessToken);
    } catch (err: any) {
      let msg = 'Login failed. Please verify credentials.';
      if (err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err.response?.status === 404) {
        msg = 'Cannot connect to backend API (404 Not Found). Please verify your backend server is running and VITE_API_URL is configured.';
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        msg = 'Cannot connect to backend server. Please verify the API server is running and CORS is configured.';
      } else if (err.response?.status && err.response.status >= 500) {
        msg = `Backend server error (HTTP ${err.response.status}). Please check server logs.`;
      }
      setError(msg);
      throw new Error(msg);
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    role: 'PATIENT' | 'DOCTOR';
    firstName?: string;
    lastName?: string;
  }): Promise<void> => {
    setError(null);
    try {
      const res = await apiClient.post('/auth/register', data);
      const { user: authUser, tokens } = res.data;
      setUser(authUser);
      setToken(tokens.accessToken);
      setApiAuthToken(tokens.accessToken);
    } catch (err: any) {
      let msg = 'Registration failed.';
      if (err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err.response?.status === 404) {
        msg = 'Cannot connect to backend API (404 Not Found). Please verify your backend server is running and VITE_API_URL is configured.';
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        msg = 'Cannot connect to backend server. Please verify the API server is running and CORS is configured.';
      } else if (err.response?.status && err.response.status >= 500) {
        msg = `Backend server error (HTTP ${err.response.status}). Please check server logs.`;
      }
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Best-effort logout
    } finally {
      clearSession();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        login,
        register,
        logout,
        clearSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
