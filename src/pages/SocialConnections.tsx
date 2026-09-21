import { useIonRouter } from '@ionic/react';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonSpinner,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import {
  arrowBackOutline,
  businessOutline,
  checkmarkCircleOutline,
  logoFacebook,
  logoInstagram,
  logoLinkedin,
  logoWhatsapp,
  logoYoutube,
} from 'ionicons/icons';

import BottomTabBar from '../components/BottomTabBar';
import { useLogoTheme } from '../hooks/useLogoTheme';
import { isConnectable, PlatformKey, useSocialConnections } from '../hooks/useSocialConnections';
import './Home.css';

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
  { id: 'google_business', name: 'Google Business Profile', note: 'Manage your business listing and local presence', icon: businessOutline },
  { id: 'youtube', name: 'YouTube', note: 'Video campaigns and shorts', icon: logoYoutube },
  { id: 'linkedin', name: 'LinkedIn', note: 'Updates for your business network', icon: logoLinkedin },
];

const SocialConnections: React.FC = () => {
  const ionRouter = useIonRouter();
  const themeStyle = useLogoTheme();
  const { connected, usernames, busy, error, success, clearError, clearSuccess, refresh, connect } =
    useSocialConnections();

  return (
    <IonPage className="home-page" style={themeStyle}>
      <IonHeader className="ion-no-border">
        <IonToolbar className="app-toolbar">
          <div className="app-header-inner">
            <button type="button" className="social-page-back" onClick={() => ionRouter.back()} aria-label="Back">
              <IonIcon icon={arrowBackOutline} />
            </button>
            <h1 className="social-page-title">Social accounts</h1>
            <span className="social-page-spacer" />
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="home-content">
        <div className="home-container">
          <section className="greeting social-page-intro">
            <p className="social-page-eyebrow">PUBLISHING CHANNELS</p>
            <h1>Connect your accounts</h1>
            <p>Connect your business channels to publish campaigns from AarnexAi.</p>
          </section>

          <ul className="cs-list social-page-list">
            {SOCIALS.map((social) => {
              const platform: PlatformKey | null = isConnectable(social.id) ? social.id : null;
              const isConnected = platform ? connected[platform] : false;
              const isBusy = platform ? busy === platform : false;
              const accountName = platform ? usernames[platform] : null;

              return (
                <li key={social.id} className="cs-row">
                  <div className={`cs-icon is-${social.id}`}><IonIcon icon={social.icon} /></div>
                  <div className="cs-info">
                    <h4>{social.name}</h4>
                    <p className={isConnected ? 'is-ok' : ''}>
                      {isConnected ? accountName ? `Connected as ${accountName}` : 'Connected' : social.note}
                    </p>
                  </div>
                  {platform ? (
                    <button
                      type="button"
                      className={`cs-btn ${isConnected ? 'is-connected' : ''}`}
                      disabled={isConnected || busy !== null}
                      onClick={() => void connect(platform)}
                    >
                      {isBusy ? <IonSpinner name="crescent" className="cs-spinner" /> : isConnected ? <><IonIcon icon={checkmarkCircleOutline} /> Connected</> : 'Connect'}
                    </button>
                  ) : <span className="cs-soon">Soon</span>}
                </li>
              );
            })}
          </ul>

          <IonButton expand="block" fill="outline" onClick={() => void refresh()} style={{ marginTop: 18 }}>
            Refresh connection status
          </IonButton>
        </div>
      </IonContent>

      <BottomTabBar />
      <IonToast isOpen={Boolean(success)} message={success ?? ''} duration={3500} position="top" color="success" onDidDismiss={clearSuccess} />
      <IonToast isOpen={Boolean(error)} message={error ?? ''} duration={5000} position="top" color="danger" onDidDismiss={clearError} />
    </IonPage>
  );
};

export default SocialConnections;
