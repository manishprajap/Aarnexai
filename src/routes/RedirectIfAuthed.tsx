import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useIonRouter } from '@ionic/react';

import { useAuth } from '../context/AuthContext';

interface LocationState {
  from?: { pathname: string };
}

const RedirectIfAuthed: React.FC<{
  children: React.ReactElement;
}> = ({ children }) => {

  const {
    isAuthenticated,
    isInitializing,
    hasBusiness,
    hasSubscription,
  } = useAuth();

  const location = useLocation();
  const ionRouter = useIonRouter();

  useEffect(() => {

    if (isInitializing || !isAuthenticated) {
      return;
    }

    /*
     * Onboarding takes priority: an unonboarded user can't land
     * on an arbitrary "from" route, since RequireAuth would just
     * bounce them to /business-setup or /subscription anyway.
     */
    if (!hasBusiness) {
      ionRouter.push('/business-setup', 'root', 'replace');
      return;
    }

    if (!hasSubscription) {
      ionRouter.push('/subscription', 'root', 'replace');
      return;
    }

    const state = location.state as LocationState | null;
    const from = state?.from?.pathname ?? '/dashboard';

    ionRouter.push(from, 'root', 'replace');

  }, [
    isInitializing,
    isAuthenticated,
    hasBusiness,
    hasSubscription,
    location.state,
    ionRouter,
  ]);

  if (isInitializing) {
    return null;
  }

  if (isAuthenticated) {
    // Redirect in flight — handled by the effect above.
    return null;
  }

  return children;
};

export default RedirectIfAuthed;