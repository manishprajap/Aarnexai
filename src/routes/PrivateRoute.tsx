import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute: React.FC = () => {
  const { isAuthenticated, isInitializing, hasBusiness, hasSubscription } = useAuth();
  const location = useLocation();

  if (isInitializing) return null; // or a splash/loading screen

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const path = location.pathname;

  if (!hasBusiness && path !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (hasBusiness && path === '/onboarding') {
    return <Navigate to="/dashboard" replace />;
  }

  if (hasBusiness && hasSubscription && path === '/subscription') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;