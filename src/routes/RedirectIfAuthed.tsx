import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RedirectIfAuthed: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, isInitializing, hasBusiness, hasSubscription } = useAuth();

  if (isInitializing) {
    return null;
  }

  if (isAuthenticated) {
    if (!hasBusiness) return <Navigate to="/business-setup" replace />;
    if (!hasSubscription) return <Navigate to="/subscription" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default RedirectIfAuthed;