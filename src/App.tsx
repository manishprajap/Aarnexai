import { Navigate, Route } from 'react-router-dom';
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

setupIonicReact();

const App: React.FC = () => (
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
            path="/upload"
            element={
              <RequireAuth>
                <Upload />
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
            path="/products/:productId/customize"
            element={
              <RequireAuth>
                <SelectCategory />
              </RequireAuth>
            }
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </IonRouterOutlet>
      </IonReactRouter>
    </AuthProvider>
  </IonApp>
);

export default App;