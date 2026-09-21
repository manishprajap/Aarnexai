import { useRef, useState } from 'react';
import { useIonRouter } from '@ionic/react';
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
  IonModal,
  IonSpinner,
  IonToast,
  useIonViewWillEnter,
} from '@ionic/react';

import {
  cloudUploadOutline,
  imagesOutline,
  sparklesOutline,
  timeOutline,
  textOutline,
  arrowForwardOutline,
  chevronForwardOutline,
  personOutline,
  logOutOutline,
  linkOutline,
  checkmarkCircleOutline,
  logoInstagram,
  logoFacebook,
  logoYoutube,
  logoLinkedin,
  logoWhatsapp,
} from 'ionicons/icons';

import { useAuth } from '../context/AuthContext';

import logo from '../assets/aarna-logo.jpeg';
import './Home.css';
import { isConnectable, PlatformKey, useSocialConnections } from '../hooks/useSocialConnections';
import { useLogoTheme } from '../hooks/useLogoTheme';
import BottomTabBar from '../components/BottomTabBar';


type Social = {
  id: string;
  name: string;
  note: string;
  icon: string;
};

const SOCIALS: Social[] = [
  { id: 'instagram', name: 'Instagram', note: 'Posters, reels and stories', icon: logoInstagram },
  { id: 'facebook', name: 'Facebook', note: 'Page posts and ads', icon: logoFacebook },
  { id: 'whatsapp', name: 'WhatsApp Business', note: 'Offers and catalogues for customers', icon: logoWhatsapp },
  { id: 'youtube', name: 'YouTube', note: 'Product videos and shorts', icon: logoYoutube },
  { id: 'linkedin', name: 'LinkedIn', note: 'Updates for your business network', icon: logoLinkedin },
];

const Home: React.FC = () => {
   const ionRouter = useIonRouter();
  const { user, logout } = useAuth();
  const popoverRef = useRef<HTMLIonPopoverElement>(null); const [accountPopoverOpen, setAccountPopoverOpen] = useState(false);
  const [accountPopoverEvent, setAccountPopoverEvent] =
    useState<MouseEvent | undefined>(undefined);
  const themeStyle = useLogoTheme();

  const {
    connected,
    usernames,
    connectedCount,
    busy,
    error,
    success,
    clearError,
    clearSuccess,
    refresh,
    connect,
  } = useSocialConnections();

  const [showConnect, setShowConnect] = useState(false);

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const initial = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  // Re-check live status every time Home becomes visible
  // (e.g. after coming back from Posters or an OAuth redirect).
  useIonViewWillEnter(() => {
    void refresh();
  });

  const openConnect = () => {
    setShowConnect(true);
    void refresh();
  };

 

  const handleLogout = () => {
    popoverRef.current?.dismiss();
    logout();
     ionRouter.push('/login', 'root', 'replace');
  };

   const goToProductDetails = () => {
    console.log('[HOME] Product details clicked');

    ionRouter.push('/product-details', 'forward');
  };

  const goToProfile = () => {
    setAccountPopoverOpen(false);
    setAccountPopoverEvent(undefined);

    ionRouter.push('/profile', 'forward');
  };

  return (
    <IonPage className="home-page" style={themeStyle}>
      {/* Header */}
      <IonHeader className="ion-no-border">
        <IonToolbar className="app-toolbar">
          <div className="app-header-inner">
            <img src={logo} alt="Aarna Market OS" className="header-logo" />

            <button
              id="account-trigger"
              type="button"
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

      <IonContent fullscreen className="home-content">
        <div className="home-container">
          {/* Greeting */}
          <section className="greeting">
            <h1>Hi, {firstName}</h1>
            <p>What are we promoting today?</p>
          </section>

          {/* Hero */}
          <section className="hero">
            <div className="hero-chip">
              <IonIcon icon={sparklesOutline} />
            </div>

            <h2 className="hero-heading">Create professional ads with AI</h2>
            <p className="hero-copy">
              Upload a product photo and AI builds ten days of posts, captions and
              hashtags for you.
            </p>

            <IonButton routerLink="/upload" expand="block" className="hero-button">
              <IonIcon slot="start" icon={cloudUploadOutline} />
              Upload product
            </IonButton>
          </section>

          {/* What AI can do */}
          <section className="section">
            <h3 className="section-title">What AI can do</h3>

            <div className="feature-panel">
              <div className="feature-row feature-row-detect">
                <div className="feature-main">
                  <div className="tile">
                    <IonIcon icon={sparklesOutline} />
                  </div>
                  <div className="feature-text">
                    <h4>Social Media Connection</h4>
                    <p>Identifies brand, product and category.</p>
                  </div>
                </div>

                <div className="connect-line">
                  <div className="social-stack" aria-hidden="true">
                    <span className="brand-instagram"><IonIcon icon={logoInstagram} /></span>
                    <span className="brand-facebook"><IonIcon icon={logoFacebook} /></span>
                    <span className="brand-youtube"><IonIcon icon={logoYoutube} /></span>
                  </div>

                  <button
                    type="button"
                    className={`connect-btn ${connectedCount ? 'is-connected' : ''}`}
                    aria-haspopup="dialog"
                    onClick={openConnect}
                  >
                    <IonIcon icon={connectedCount ? checkmarkCircleOutline : linkOutline} />
                    {connectedCount ? `${connectedCount} connected` : 'Connect'}
                  </button>
                </div>
              </div>

              {/* Product details (renamed from "Product detection"; now clickable) */}
             

              <button
                type="button"
                className="feature-row feature-row-link"
                 onClick={goToProductDetails}
              >
                <div className="tile">
                  <IonIcon icon={sparklesOutline} />
                </div>
                <div className="feature-text">
                  <h4>Product details</h4>
                  <p>View brand, product and category info.</p>
                </div>
                <IonIcon icon={chevronForwardOutline} className="row-chevron" />
              </button>
              
              
              <button
                type="button"
                className="feature-row feature-row-link"
                onClick={() => ionRouter.push('/posters')}
              >
                <div className="tile">
                  <IonIcon icon={imagesOutline} />
                </div>
                <div className="feature-text">
                  <h4>AI posters</h4>
                  <p>Generates different professional designs.</p>
                </div>
                <IonIcon icon={chevronForwardOutline} className="row-chevron" />
              </button>

              <div className="feature-row">
                <div className="tile">
                  <IonIcon icon={textOutline} />
                </div>
                <div className="feature-text">
                  <h4>AI content</h4>
                  <p>Captions, descriptions, SEO and hashtags.</p>
                </div>
              </div>

              <div className="feature-row">
                <div className="tile">
                  <IonIcon icon={timeOutline} />
                </div>
                <div className="feature-text">
                  <h4>30-day plan</h4>
                  <p>A different marketing post every day.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Recent campaigns */}
          <section className="section">
            <h3 className="section-title">Recent campaigns</h3>

            <button type="button" className="empty-card" onClick={() => ionRouter.push('/upload')}>
              <div className="empty-thumb">
                <IonIcon icon={imagesOutline} />
              </div>
              <div className="empty-text">
                <h4>No campaigns yet</h4>
                <p>Upload your first product to get started.</p>
              </div>
              <IonIcon icon={arrowForwardOutline} className="empty-arrow" />
            </button>
          </section>
        </div>
      </IonContent>

      {/* Bottom tabs (IonFooter, so IonContent automatically leaves room for it) */}
      <BottomTabBar />

      {/* Connect accounts sheet */}
      <IonModal
        isOpen={showConnect}
        onDidDismiss={() => setShowConnect(false)}
        initialBreakpoint={0.78}
        breakpoints={[0, 0.78, 1]}
        backdropBreakpoint={0.4}
        handle
        className="connect-sheet"
        style={themeStyle}
      >
        <IonContent className="cs-content">
          <div className="cs-body">
            <header className="cs-head">
              <h2 className="cs-title">Connect your accounts</h2>
              <p className="cs-sub">Choose where your campaigns will be published.</p>
            </header>

            <ul className="cs-list">
              {SOCIALS.map((s) => {
                const platform: PlatformKey | null = isConnectable(s.id) ? s.id : null;
                const isConnected = platform ? connected[platform] : false;
                const isBusy = platform ? busy === platform : false;
                const accountName = platform ? usernames[platform] : null;

                const subtitle = !platform
                  ? 'Coming soon'
                  : isConnected
                    ? accountName
                      ? `Connected as ${accountName}`
                      : 'Connected'
                    : s.note;

                return (
                  <li key={s.id} className="cs-row">
                    <div className={`cs-icon is-${s.id}`}>
                      <IonIcon icon={s.icon} />
                    </div>

                    <div className="cs-info">
                      <h4>{s.name}</h4>
                      <p className={isConnected ? 'is-ok' : ''}>{subtitle}</p>
                    </div>

                    {!platform ? (
                      <span className="cs-soon">Soon</span>
                    ) : (
                      <button
                        type="button"
                        className={`cs-btn ${isConnected ? 'is-connected' : ''}`}
                        disabled={isConnected || busy !== null}
                        onClick={() => void connect(platform)}
                      >
                        {isBusy ? (
                          <IonSpinner name="crescent" className="cs-spinner" />
                        ) : isConnected ? (
                          <>
                            <IonIcon icon={checkmarkCircleOutline} />
                            Connected
                          </>
                        ) : (
                          'Connect'
                        )}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="cs-footer">
              <IonButton
                expand="block"
                className="cs-done"
                onClick={() => setShowConnect(false)}
              >
                Done
              </IonButton>
            </div>
          </div>
        </IonContent>
      </IonModal>

      {/* Feedback */}
      <IonToast
        isOpen={Boolean(success)}
        message={success ?? ''}
        duration={3500}
        position="top"
        color="success"
        onDidDismiss={clearSuccess}
      />
      <IonToast
        isOpen={Boolean(error)}
        message={error ?? ''}
        duration={5000}
        position="top"
        color="danger"
        onDidDismiss={clearError}
      />
    </IonPage>
  );
};

export default Home;