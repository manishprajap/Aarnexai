// context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiGet } from '../api';

export interface AuthUser {
  id?: number;
  name: string;
  mobile?: string;
  email: string | null;
  plan?: string;
  credits?: number;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  isInitializing: boolean;
  user: AuthUser | null;
  hasBusiness: boolean;
  hasSubscription: boolean;
  login: (user: AuthUser, token: string, hasBusiness: boolean, hasSubscription: boolean) => void;
  logout: () => void;
  refreshStatus: () => Promise<void>;
}

// 'token' matches the key src/api.ts reads for the Authorization header.
const AUTH_TOKEN_KEY = 'token';
const AUTH_USER_KEY = 'auth_user';
const AUTH_HAS_BUSINESS_KEY = 'auth_has_business';
const AUTH_HAS_SUBSCRIPTION_KEY = 'auth_has_subscription';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hasBusiness, setHasBusiness] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);

  // Runs once on app start - restores the session if one was saved earlier,
  // then re-validates against the server so stale local flags never drive
  // navigation (e.g. after a business/subscription change on another device).
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      const storedUser = localStorage.getItem(AUTH_USER_KEY);

      if (!token) {
        setIsInitializing(false);
        return;
      }

      setIsAuthenticated(true);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          setUser(null);
        }
      }
      setHasBusiness(localStorage.getItem(AUTH_HAS_BUSINESS_KEY) === 'true');
      setHasSubscription(localStorage.getItem(AUTH_HAS_SUBSCRIPTION_KEY) === 'true');

      try {
        const res = await apiGet('/auth/me');
        setUser(res.user);
        setHasBusiness(Boolean(res.hasBusiness));
        setHasSubscription(Boolean(res.hasSubscription));
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(res.user));
        localStorage.setItem(AUTH_HAS_BUSINESS_KEY, String(Boolean(res.hasBusiness)));
        localStorage.setItem(AUTH_HAS_SUBSCRIPTION_KEY, String(Boolean(res.hasSubscription)));
      } catch {
        // Token invalid/expired - clear the session.
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        localStorage.removeItem(AUTH_HAS_BUSINESS_KEY);
        localStorage.removeItem(AUTH_HAS_SUBSCRIPTION_KEY);
        setIsAuthenticated(false);
        setUser(null);
        setHasBusiness(false);
        setHasSubscription(false);
      }

      setIsInitializing(false);
    };

    init();
  }, []);

  const login = (
    nextUser: AuthUser,
    token: string,
    nextHasBusiness: boolean,
    nextHasSubscription: boolean
  ) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser));
    localStorage.setItem(AUTH_HAS_BUSINESS_KEY, String(nextHasBusiness));
    localStorage.setItem(AUTH_HAS_SUBSCRIPTION_KEY, String(nextHasSubscription));
    setUser(nextUser);
    setHasBusiness(nextHasBusiness);
    setHasSubscription(nextHasSubscription);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_HAS_BUSINESS_KEY);
    localStorage.removeItem(AUTH_HAS_SUBSCRIPTION_KEY);
    setUser(null);
    setHasBusiness(false);
    setHasSubscription(false);
    setIsAuthenticated(false);
  };

  // Call after business-setup or subscription purchase completes, so the
  // rest of the app (guards, redirects) sees the updated status immediately.
  const refreshStatus = async () => {
    try {
      const res = await apiGet('/auth/me');
      setUser(res.user);
      setHasBusiness(Boolean(res.hasBusiness));
      setHasSubscription(Boolean(res.hasSubscription));
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(res.user));
      localStorage.setItem(AUTH_HAS_BUSINESS_KEY, String(Boolean(res.hasBusiness)));
      localStorage.setItem(AUTH_HAS_SUBSCRIPTION_KEY, String(Boolean(res.hasSubscription)));
    } catch {
      // ignore - caller can retry or rely on next navigation
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isInitializing,
        user,
        hasBusiness,
        hasSubscription,
        login,
        logout,
        refreshStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }
  return ctx;
};