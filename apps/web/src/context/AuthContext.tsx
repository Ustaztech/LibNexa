import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';
import api from '../services/api';
import { useToast } from './ToastContext';

interface AuthContextValue {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (payload: {
    fullName: string;
    email: string;
    password: string;
    matricNumber: string;
    department?: string;
    faculty?: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  getDefaultTabForRole: (role: UserRole) => string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const getDefaultTabForRole = (role: UserRole): string => {
  switch (role) {
    case 'ADMIN':
      return 'admin_analytics';
    case 'LIBRARIAN':
      return 'circulation';
    case 'STUDENT':
    default:
      return 'catalogue';
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('libnexa_access_token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        // Token invalid or user not found
        localStorage.removeItem('libnexa_access_token');
        localStorage.removeItem('libnexa_refresh_token');
        setUser(null);
      }
    } catch {
      localStorage.removeItem('libnexa_access_token');
      localStorage.removeItem('libnexa_refresh_token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (identifier: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(identifier, pass);
      if (res.success && res.data) {
        localStorage.setItem('libnexa_access_token', res.data.accessToken);
        localStorage.setItem('libnexa_refresh_token', res.data.refreshToken);
        setUser(res.data.user);
        showToast({
          type: 'success',
          title: `Welcome back, ${res.data.user.fullName}!`,
          message: `Authenticated as ${res.data.user.role}.`,
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Authentication Failed',
        message: err.message || 'Invalid credentials. Please verify your email/matric and password.',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: {
    fullName: string;
    email: string;
    password: string;
    matricNumber: string;
    department?: string;
    faculty?: string;
    phone?: string;
  }) => {
    setIsLoading(true);
    try {
      const res = await api.registerStudent(payload);
      if (res.success && res.data) {
        localStorage.setItem('libnexa_access_token', res.data.accessToken);
        localStorage.setItem('libnexa_refresh_token', res.data.refreshToken);
        setUser(res.data.user);
        showToast({
          type: 'success',
          title: 'Registration Successful!',
          message: `Welcome to LibNexa NSUK, ${res.data.user.fullName}! Your student membership is active.`,
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Registration Failed',
        message: err.message || 'Please check your information and try again.',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('libnexa_access_token');
    localStorage.removeItem('libnexa_refresh_token');
    setUser(null);
    showToast({
      type: 'info',
      title: 'Signed Out',
      message: 'You have been safely signed out of the library system.',
    });
  };

  const role: UserRole = user?.role || 'STUDENT';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        getDefaultTabForRole,
      }}
    >
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
