import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonIcon,
  IonButton,
  IonPopover,
  IonList,
  IonItem,
  IonLabel,
} from '@ionic/react';

import {
  cameraOutline,
  cloudUploadOutline,
  imagesOutline,
  sparklesOutline,
  timeOutline,
  arrowForwardOutline,
  personOutline,
  logOutOutline,
} from 'ionicons/icons';

import { useAuth } from '../context/AuthContext';
import logo from '../assets/aarna-logo.jpeg';
import './Home.css';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const popoverRef = useRef<HTMLIonPopoverElement>(null);

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const initial = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  const goToProfile = () => {
    popoverRef.current?.dismiss();
    navigate('/profile');
  };

  const handleLogout = () => {
    popoverRef.current?.dismiss();
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <IonPage>
      {/* Header */}
      <IonHeader className="ion-no-border">
        <IonToolbar className="app-toolbar">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="Aarna Market OS" className="header-logo" />
            </div>

            <button
              id="account-trigger"
              className="avatar-trigger"
              aria-label="Account menu"
            >
              <span>{initial}</span>
            </button>

            <IonPopover
              ref={popoverRef}
              trigger="account-trigger"
              side="bottom"
              alignment="end"
              className="account-popover"
            >
              <IonList lines="none" className="account-menu">
                <IonItem button detail={false} onClick={goToProfile}>
                  <IonIcon icon={personOutline} slot="start" />
                  <IonLabel>Profile</IonLabel>
                </IonItem>
                <IonItem button detail={false} onClick={handleLogout}>
                  <IonIcon icon={logOutOutline} slot="start" color="danger" />
                  <IonLabel color="danger">Logout</IonLabel>
                </IonItem>
              </IonList>
            </IonPopover>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="bg-gray-50">
        <div className="min-h-full bg-gray-50 px-4 pb-8 pt-4">
          <div className="header-text">
            <h1 className="m-0">Welcome back</h1>
            <p className="m-0">Hi, {firstName}</p>
          </div>

          {/* Hero */}
          <div className="hero-card mb-6 rounded-2xl p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl hero-icon-chip">
                <IonIcon icon={sparklesOutline} className="text-lg text-white" />
              </div>
              <h2 className="hero-heading m-0">
                Create professional ads with AI
              </h2>
            </div>

            <p className="mb-5 max-w-sm text-[13px] leading-5 text-white/70">
              Upload your product photo and let AI create marketing content for you.
            </p>

            <IonButton routerLink="/upload" expand="block" className="hero-button">
              <IonIcon slot="start" icon={cloudUploadOutline} />
              Upload product
            </IonButton>
          </div>

          {/* Main Upload Card */}
          <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
                <IonIcon icon={cameraOutline} className="text-lg text-indigo-600" />
              </div>
              <div>
                <h3 className="card-title">Start a new campaign</h3>
                <p className="card-subtitle">
                  Ten days of AI marketing content, from one photo.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200  px-5 py-7 text-center"
              onClick={() => navigate('/upload')}
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                <IonIcon icon={cloudUploadOutline} className="text-xl text-indigo-600" />
              </div>
              <h4 className="upload-title">Upload product image</h4>
              <p className="upload-desc max-w-xs">
                Take a photo or choose one from your gallery — AI identifies
                your product automatically.
              </p>
            </button>
          </div>

          {/* AI Features */}
          <div className="mb-6">
            <h3 className="section-title">What AI can do</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-100 bg-white p-3.5">
                <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                  <IonIcon icon={sparklesOutline} className="text-base text-blue-600" />
                </div>
                <h4 className="feature-title">Product detection</h4>
                <p className="feature-desc">
                  Identifies brand, product and category.
                </p>
              </div>

              <div
                className="rounded-xl border border-gray-100 bg-white p-3.5"
                role="button"
                onClick={() => navigate('/posters')}
              >
                <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50">
                  <IonIcon icon={imagesOutline} className="text-base text-purple-600" />
                </div>
                <h4 className="feature-title">AI posters</h4>
                <p className="feature-desc">
                  Generates different professional designs.
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-3.5">
                <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-green-50">
                  <IonIcon icon={sparklesOutline} className="text-base text-green-600" />
                </div>
                <h4 className="feature-title">AI content</h4>
                <p className="feature-desc">
                  Captions, descriptions, SEO and hashtags.
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-3.5">
                <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50">
                  <IonIcon icon={timeOutline} className="text-base text-orange-500" />
                </div>
                <h4 className="feature-title">10-day plan</h4>
                <p className="feature-desc">
                  A different marketing post every day.
                </p>
              </div>
            </div>
          </div>

          {/* Recent Campaigns */}
          <div>
            <h3 className="section-title">Recent campaigns</h3>

            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                  <IonIcon icon={imagesOutline} className="text-xl text-gray-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="m-0 truncate card-title">No campaigns yet</h4>
                  <p className="card-subtitle">
                    Upload your first product to get started.
                  </p>
                </div>
                <IonIcon icon={arrowForwardOutline} className="text-base text-gray-400" />
              </div>
            </div>
          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;