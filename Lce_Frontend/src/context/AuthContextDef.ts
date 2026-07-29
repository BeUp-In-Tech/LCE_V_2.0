import { createContext } from 'react';
import type { User } from '../services/api';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterFormData) => Promise<void>;
  googleLogin: (token: string) => Promise<{ isNewUser: boolean }>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
}

export interface RegisterFormData {
  email: string;
  password: string;
  password_confirmation: string;
  first_name: string;
  last_name: string;
  phone?: string;
  zip?: string;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
