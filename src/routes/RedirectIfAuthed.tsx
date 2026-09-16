// routes/RedirectIfAuthed.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface LocationState {
  from?: { pathname: string };
}

const RedirectIfAuthed: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, isInitializing, hasBusiness, hasSubscription } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return null;
  }

  if (isAuthenticated) {
    // Onboarding takes priority: an unonboarded user can't land on an
    // arbitrary "from" route, since RequireAuth would just bounce them
    // to /business-setup or /subscription anyway.
    if (!hasBusiness) return <Navigate to="/business-setup" replace />;
    if (!hasSubscription) return <Navigate to="/subscription" replace />;

    const state = location.state as LocationState | null;
    const from = state?.from?.pathname ?? '/dashboard';
    return <Navigate to={from} replace />;
  }

  return children;
};

export default RedirectIfAuthed;