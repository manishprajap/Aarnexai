import { Navigate, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { AuthProvider } from './context/AuthContext';
import RequireAuth from './routes/RequireAuth';
import RedirectIfAuthed from './routes/RedirectIfAuthed';
import Register from './pages/Register';
import Upload from './pages/Upload';

import '@ionic/react/css/core.css';

import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';
import ProductDetails from './pages/ProductDetails';
import SelectCategory from './pages/SelectCategory';
import Login from './pages/login';
import BusinessSetup from './pages/business-setup';
import Subscription from './pages/subscription';
import Home from './pages/Home';
import Posters from './pages/Posters';
import Campaigns from './pages/Campaigns';
import CreateCampaign from './pages/CreateCampaign';
import CampaignDetails from './pages/CampaignDetails';
import Profile from './pages/profile';
import SocialConnections from './pages/SocialConnections';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';
import aarnaLogo from './assets/aarna-logo.png';
import './splash.css';

setupIonicReact();

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 1800);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <IonApp>
      <AuthProvider>
        <IonReactRouter>
          <IonRouterOutlet>
          <Route
            path="/login"
            element={
              <RedirectIfAuthed>
                <Login />
              </RedirectIfAuthed>
            }
          />
          <Route
            path="/register"
            element={
              <RedirectIfAuthed>
                <Register />
              </RedirectIfAuthed>
            }
          />

          {/* Business details form - shown when hasBusiness is false */}
          <Route
            path="/business-setup"
            element={
              <RequireAuth>
                <BusinessSetup />
              </RequireAuth>
            }
          />

          {/* Plan purchase - shown when hasBusiness is true but hasSubscription is false */}
          <Route
            path="/subscription"
            element={
              <RequireAuth>
                <Subscription />
              </RequireAuth>
            }
          />

          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Home />
              </RequireAuth>
            }
          />
          <Route path="/home" element={<Navigate to="/dashboard" replace />} />

          <Route
            path="/campaigns"
            element={
              <RequireAuth>
                <Campaigns />
              </RequireAuth>
            }
          />

          <Route
            path="/campaigns/create"
            element={
              <RequireAuth>
                <CreateCampaign />
              </RequireAuth>
            }
          />

          <Route
            path="/campaigns/:campaignId"
            element={
              <RequireAuth>
                <CampaignDetails />
              </RequireAuth>
            }
          />

          <Route
            path="/upload"
            element={
              <RequireAuth>
                <Upload />
              </RequireAuth>
            }
          />

          <Route
            path="/posters"
            element={
              <RequireAuth>
                <Posters />
              </RequireAuth>
            }
          />

          <Route
            path="/social-connections"
            element={
              <RequireAuth>
                <SocialConnections />
              </RequireAuth>
            }
          />

          <Route
            path="/analytics"
            element={
              <RequireAuth>
                <Analytics />
              </RequireAuth>
            }
          />

          <Route
            path="/products/:productId"
            element={
              <RequireAuth>
                <ProductDetails />
              </RequireAuth>
            }
          />

          <Route
            path="/product-details"
            element={
              <RequireAuth>
                <ProductDetails />
              </RequireAuth>
            }
          />

          <Route
            path="/products/:productId/customize"
            element={
              <RequireAuth>
                <SelectCategory />
              </RequireAuth>
            }
          /> 
           <Route
            path="/profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          /> 
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <Settings />
              </RequireAuth>
            }
          />
          
          
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
          </IonRouterOutlet>
        </IonReactRouter>

        {showSplash && (
          <div className="brand-splash" role="status" aria-label="Loading AarnexAi">
            <div className="brand-splash__content">
              <img src={aarnaLogo} alt="AarnexAi" className="brand-splash__logo" />
            </div>
            <div className="brand-splash__waves" aria-hidden="true">
              <span className="brand-splash__wave brand-splash__wave--blue" />
              <span className="brand-splash__wave brand-splash__wave--orange" />
              <span className="brand-splash__wave brand-splash__wave--sky" />
            </div>
          </div>
        )}
      </AuthProvider>
    </IonApp>
  );
};

export default App;