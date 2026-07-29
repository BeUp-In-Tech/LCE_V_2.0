import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authAPI, userAPI } from '../services/api';
import type { User } from '../services/api';
import type { AxiosError } from 'axios';
import { AuthContext } from './AuthContextDef';
import type { RegisterFormData, AuthContextType } from './AuthContextDef';

interface ErrorResponse {
  error?: string;
  message?: string;
  code?: string;
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        try {
          
          const response = await authAPI.me();
          setUser(response.data.user);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        } catch {
          
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const response = await authAPI.login(email, password);
      const { access_token: newToken, user: userData } = response.data;

      
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (err) {
      const error = err as AxiosError<ErrorResponse>;
      if (error.response?.data?.code === 'USER_NOT_FOUND') {
        throw new Error('USER_NOT_FOUND');
      }
      const message = error.response?.data?.error || 'Login failed. Please check your credentials.';
      throw new Error(message);
    }
  };

  const googleLogin = async (token: string): Promise<{ isNewUser: boolean }> => {
    try {
      const response = await authAPI.google(token);
      const { access_token: newToken, user: userData, is_new_user: isNewUser } = response.data;

      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));

      
      
      const needsRegistration = !!isNewUser || (!userData.phone && !userData.cell_phone);

      return { isNewUser: needsRegistration };
    } catch (err) {
      const error = err as AxiosError<ErrorResponse>;
      const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Google login failed.';
      throw new Error(message);
    }
  };

  const register = async (data: RegisterFormData): Promise<void> => {
    try {
      const response = await authAPI.register(data);
      const { access_token: newToken, user: userData } = response.data;

      
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (err) {
      const error = err as AxiosError<ErrorResponse>;
      const message = error.response?.data?.error || error.response?.data?.message || 'Registration failed.';
      throw new Error(message);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authAPI.logout();
    } catch {
      
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  };

  const updateUser = (updatedUser: User): void => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const response = await userAPI.getProfile();
      setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    googleLogin,
    register,
    logout,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

