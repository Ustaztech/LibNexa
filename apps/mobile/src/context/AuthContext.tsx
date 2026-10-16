import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole } from '../types';
import api from '../services/api';

interface AuthContextValue {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, pass: string) => Promise<void>;
  register: (payload: {
    fullName: string;
    email: string;
    password: string;
    matricNumber: string;
    department?: string;
    faculty?: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('libnexa_token');
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const res = await api.getMe();
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        await AsyncStorage.removeItem('libnexa_token');
        setUser(null);
      }
    } catch {
      await AsyncStorage.removeItem('libnexa_token');
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
        await AsyncStorage.setItem('libnexa_token', res.data.accessToken);
        setUser(res.data.user);
      }
    } catch (err: any) {
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
        await AsyncStorage.setItem('libnexa_token', res.data.accessToken);
        setUser(res.data.user);
      }
    } catch (err: any) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('libnexa_token');
    setUser(null);
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
