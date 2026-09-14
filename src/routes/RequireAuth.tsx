import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, isInitializing, hasBusiness, hasSubscription } = useAuth();
  const location = useLocation();

  // Still checking localStorage/session for a saved session - render nothing
  // briefly rather than flashing the login screen.
  if (isInitializing) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const path = location.pathname;

  // Force onboarding order: business details first, then subscription.
  // Each check skips itself on its own route to avoid redirect loops.
  if (!hasBusiness && path !== '/business-setup') {
    return <Navigate to="/business-setup" replace />;
  }

  if (hasBusiness && !hasSubscription && path !== '/subscription') {
    return <Navigate to="/subscription" replace />;
  }

  // Fully onboarded users shouldn't be able to revisit these setup pages.
  if (hasBusiness && hasSubscription && (path === '/business-setup' || path === '/subscription')) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default RequireAuth;