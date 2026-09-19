import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

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

  login: (
    user: AuthUser,
    token: string,
    hasBusiness: boolean,
    hasSubscription: boolean
  ) => void;

  logout: () => void;

  refreshStatus: () => Promise<void>;
}

const AUTH_TOKEN_KEY = 'token';
const AUTH_USER_KEY = 'auth_user';
const AUTH_HAS_BUSINESS_KEY = 'auth_has_business';
const AUTH_HAS_SUBSCRIPTION_KEY = 'auth_has_subscription';

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

export const AuthProvider: React.FC<{
  children: ReactNode;
}> = ({ children }) => {

  const [isAuthenticated, setIsAuthenticated] =
    useState(false);

  const [isInitializing, setIsInitializing] =
    useState(true);

  const [user, setUser] =
    useState<AuthUser | null>(null);

  const [hasBusiness, setHasBusiness] =
    useState(false);

  const [hasSubscription, setHasSubscription] =
    useState(false);

  /**
   * ============================================================
   * SAVE AUTH STATUS
   * ============================================================
   */

  const saveAuthStatus = (
    nextUser: AuthUser | null,
    nextHasBusiness: boolean,
    nextHasSubscription: boolean
  ) => {

    setUser(nextUser);

    setHasBusiness(nextHasBusiness);

    setHasSubscription(nextHasSubscription);

    if (nextUser) {
      localStorage.setItem(
        AUTH_USER_KEY,
        JSON.stringify(nextUser)
      );
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
    }

    localStorage.setItem(
      AUTH_HAS_BUSINESS_KEY,
      String(nextHasBusiness)
    );

    localStorage.setItem(
      AUTH_HAS_SUBSCRIPTION_KEY,
      String(nextHasSubscription)
    );
  };

  /**
   * ============================================================
   * INITIAL AUTH CHECK
   * ============================================================
   */

  useEffect(() => {

    let mounted = true;

    const init = async () => {

      const token =
        localStorage.getItem(AUTH_TOKEN_KEY);

      const storedUser =
        localStorage.getItem(AUTH_USER_KEY);

      if (!token) {

        if (mounted) {
          setIsAuthenticated(false);
          setUser(null);
          setHasBusiness(false);
          setHasSubscription(false);
          setIsInitializing(false);
        }

        return;
      }

      /*
       * Restore cached values immediately.
       */
      if (mounted) {

        setIsAuthenticated(true);

        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            setUser(null);
          }
        }

        setHasBusiness(
          localStorage.getItem(
            AUTH_HAS_BUSINESS_KEY
          ) === 'true'
        );

        setHasSubscription(
          localStorage.getItem(
            AUTH_HAS_SUBSCRIPTION_KEY
          ) === 'true'
        );
      }

      /*
       * Verify with backend.
       */
      try {

        const res = await apiGet('/auth/me');

        if (!mounted) {
          return;
        }

        const nextUser =
          res?.user ?? null;

        const nextHasBusiness =
          Boolean(res?.hasBusiness);

        const nextHasSubscription =
          Boolean(res?.hasSubscription);

        saveAuthStatus(
          nextUser,
          nextHasBusiness,
          nextHasSubscription
        );

        setIsAuthenticated(true);

      } catch (error) {

        console.error(
          '[AUTH] /auth/me failed:',
          error
        );

        if (!mounted) {
          return;
        }

        localStorage.removeItem(
          AUTH_TOKEN_KEY
        );

        localStorage.removeItem(
          AUTH_USER_KEY
        );

        localStorage.removeItem(
          AUTH_HAS_BUSINESS_KEY
        );

        localStorage.removeItem(
          AUTH_HAS_SUBSCRIPTION_KEY
        );

        setIsAuthenticated(false);
        setUser(null);
        setHasBusiness(false);
        setHasSubscription(false);

      } finally {

        if (mounted) {
          setIsInitializing(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };

  }, []);

  /**
   * ============================================================
   * LOGIN
   * ============================================================
   */

  const login = (
    nextUser: AuthUser,
    token: string,
    nextHasBusiness: boolean,
    nextHasSubscription: boolean
  ) => {

    localStorage.setItem(
      AUTH_TOKEN_KEY,
      token
    );

    saveAuthStatus(
      nextUser,
      Boolean(nextHasBusiness),
      Boolean(nextHasSubscription)
    );

    setIsAuthenticated(true);
    setIsInitializing(false);
  };

  /**
   * ============================================================
   * LOGOUT
   * ============================================================
   */

  const logout = () => {

    localStorage.removeItem(
      AUTH_TOKEN_KEY
    );

    localStorage.removeItem(
      AUTH_USER_KEY
    );

    localStorage.removeItem(
      AUTH_HAS_BUSINESS_KEY
    );

    localStorage.removeItem(
      AUTH_HAS_SUBSCRIPTION_KEY
    );

    setUser(null);

    setHasBusiness(false);

    setHasSubscription(false);

    setIsAuthenticated(false);

    setIsInitializing(false);
  };

  /**
   * ============================================================
   * REFRESH SERVER AUTH STATUS
   * ============================================================
   */

  const refreshStatus = async (): Promise<void> => {

    const res = await apiGet('/auth/me');

    const nextUser =
      res?.user ?? null;

    const nextHasBusiness =
      Boolean(res?.hasBusiness);

    const nextHasSubscription =
      Boolean(res?.hasSubscription);

    console.log(
      '[AUTH] Refreshed status:',
      {
        user: nextUser,
        hasBusiness: nextHasBusiness,
        hasSubscription: nextHasSubscription,
      }
    );

    saveAuthStatus(
      nextUser,
      nextHasBusiness,
      nextHasSubscription
    );
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
    throw new Error(
      'useAuth must be used inside an <AuthProvider>'
    );
  }

  return ctx;
};

