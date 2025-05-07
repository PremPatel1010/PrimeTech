import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthState, AuthResponse } from '../types/auth';
import { authService } from '../services/auth.service';

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: true,
  error: null
};

const AuthContext = createContext<{
  authState: AuthState;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string, role: 'admin' | 'manager') => Promise<void>;
  logout: () => void;
}>({
  authState: initialState,
  login: async () => {},
  signup: async () => {},
  logout: () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(initialState);

  useEffect(() => {
    const token = authService.getToken();
    const user = authService.getCurrentUser();
    
    if (token && user) {
      setAuthState({
        isAuthenticated: true,
        user,
        token,
        loading: false,
        error: null
      });
    } else {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      const response = await authService.login({ email, password });
      setAuthState({
        isAuthenticated: true,
        user: response.user,
        token: response.token,
        loading: false,
        error: null
      });
    } catch (error: any) {
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: error.response?.data?.message || 'An error occurred during login'
      }));
      throw error;
    }
  };

  const signup = async (username: string, email: string, password: string, role: 'admin' | 'manager') => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      const response = await authService.signup({ username, email, password, role });
      setAuthState({
        isAuthenticated: true,
        user: response.user,
        token: response.token,
        loading: false,
        error: null
      });
    } catch (error: any) {
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: error.response?.data?.message || 'An error occurred during signup'
      }));
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setAuthState(initialState);
  };

  return (
    <AuthContext.Provider value={{ authState, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 