import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import {
  useIonRouter,
  IonContent,
  IonPage,
  IonSpinner,
} from '@ionic/react';

import { useAuth } from '../context/AuthContext';

const RequireAuth: React.FC<{
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
  const path = location.pathname;

  
  useEffect(() => {

    if (isInitializing) {
      return;
    }

    if (!isAuthenticated) {
      ionRouter.push('/login', 'root', 'replace');
      return;
    }

    if (!hasBusiness && path !== '/business-setup') {
      ionRouter.push('/business-setup', 'root', 'replace');
      return;
    }

    if (hasBusiness && !hasSubscription && path !== '/subscription') {
      ionRouter.push('/subscription', 'root', 'replace');
      return;
    }

    if (
      hasBusiness &&
      hasSubscription &&
      (path === '/business-setup' || path === '/subscription')
    ) {
      ionRouter.push('/dashboard', 'root', 'replace');
      return;
    }

  }, [
    isInitializing,
    isAuthenticated,
    hasBusiness,
    hasSubscription,
    path,
    ionRouter,
  ]);

  /**
   * Wait until AuthContext has finished checking
   * localStorage + /auth/me.
   */
  if (isInitializing) {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <div
            style={{
              minHeight: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IonSpinner name="crescent" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const shouldBlock =
    !isAuthenticated ||
    (!hasBusiness && path !== '/business-setup') ||
    (hasBusiness && !hasSubscription && path !== '/subscription') ||
    (
      hasBusiness &&
      hasSubscription &&
      (path === '/business-setup' || path === '/subscription')
    );

  /**
   * A redirect is in flight (handled by the effect above) —
   * render nothing rather than the guarded page.
   */
  if (shouldBlock) {
    return null;
  }

  return children;
};

export default RequireAuth;