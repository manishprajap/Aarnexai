import { useState } from 'react';
import { useIonRouter } from '@ionic/react';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonAlert,
  IonSpinner,
  IonToast,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';
import {
  arrowBackOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  linkOutline,
  logoFacebook,
  logoGoogle,
  logoInstagram,
  logoLinkedin,
  logoWhatsapp,
  refreshOutline,
  logoYoutube,
} from 'ionicons/icons';

import BottomTabBar from '../components/BottomTabBar';
import { useLogoTheme } from '../hooks/useLogoTheme';
import {
  CONNECTABLE_PLATFORMS,
  isConnectable,
  PlatformKey,
  useSocialConnections,
} from '../hooks/useSocialConnections';
import './Home.css';


const GoogleAnalyticsIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
    <rect x="3" y="12" width="4" height="9" rx="1" fill="#F9AB00" />
    <rect x="10" y="7" width="4" height="14" rx="1" fill="#E37400" />
    <rect x="17" y="3" width="4" height="18" rx="1" fill="#4285F4" />
  </svg>
);

const YoutubeAnalyticsIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
    <rect x="1" y="4" width="22" height="16" rx="5" fill="#FF0000" />
    <path d="M10 8.5L16 12L10 15.5V8.5Z" fill="#FFFFFF" />
  </svg>
);

type Social = {
  id: string;
  name: string;
  note: string;



  
  icon?: string; // ionicon name, used when no custom SVG is provided
  Custom?: React.FC; 
};

const SOCIALS: Social[] = [
  { id: 'instagram', name: 'Instagram', note: 'Posters, reels and stories', icon: logoInstagram },
  { id: 'facebook', name: 'Facebook', note: 'Page posts and ads', icon: logoFacebook },
  { id: 'whatsapp', name: 'WhatsApp Business', note: 'Offers and catalogues for customers', icon: logoWhatsapp },
  { id: 'google_business', name: 'Google Business Profile', note: 'Manage your business listing and local presence', icon: logoGoogle },
  { id: 'youtube', name: 'YouTube', note: 'Video campaigns and shorts', icon: logoYoutube },
  { id: 'linkedin', name: 'LinkedIn', note: 'Updates for your business network', icon: logoLinkedin },
  { id: 'google_analytics', name: 'Google Analytics', note: 'Track website and campaign performance', Custom: GoogleAnalyticsIcon },
  { id: 'youtube_analytics', name: 'YouTube Analytics', note: 'Views, watch time and audience insights', Custom: YoutubeAnalyticsIcon },
];

const CONNECTABLE_COUNT = CONNECTABLE_PLATFORMS.length;

const SocialConnections: React.FC = () => {
  const ionRouter = useIonRouter();
  const themeStyle = useLogoTheme();
  const {
    connected,
    usernames,
    connectedCount,
    checking,
    busy,
    error,
    success,
    clearError,
    clearSuccess,
    refresh,
    connect,
    disconnect,
    youtubeChannels,
    youtubeNeedsSelection,
    selectedYoutubeChannelId,
    setSelectedYoutubeChannelId,
    saveYoutubeChannelSelection,
  } =
    useSocialConnections();
  const [disconnectingPlatform, setDisconnectingPlatform] = useState<PlatformKey | null>(null);

  useIonViewWillEnter(() => {
    void refresh();
  });

  return (
    <IonPage className="home-page" style={themeStyle}>
      <IonHeader className="ion-no-border">
        <IonToolbar className="app-toolbar">
          <div className="app-header-inner">
            <button
              type="button"
              className="social-page-back"
              onClick={() => {
                if (ionRouter.canGoBack()) {
                  ionRouter.back();
                } else {
                  ionRouter.push('/dashboard', 'back');
                }
              }}
              aria-label="Back"
            >
              <IonIcon icon={arrowBackOutline} />
            </button>
            <h1 className="social-page-title">Social accounts</h1>
            <span className="social-page-spacer" />
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="home-content">
        <div className="home-container">
          <section className="social-page-intro">
            <div className="social-page-heading">
              <div>
                <p className="social-page-eyebrow">PUBLISHING CHANNELS</p>
                <h1>Social accounts</h1>
                <p>Connect your business channels to publish campaigns from AarnexAi.</p>
              </div>
              <div className="social-count" aria-label={`${connectedCount} accounts connected`}>
                <strong>{connectedCount}</strong>
                <span>of {CONNECTABLE_COUNT} connected</span>
              </div>
            </div>
          </section>

          <div className="social-section-label">
            <h2>Available channels</h2>
            <span>{checking ? 'Checking status...' : 'Live connection status'}</span>
          </div>

          <ul className="cs-list social-page-list" aria-label="Social accounts">
            {SOCIALS.map((social) => {
              const platform: PlatformKey | null = isConnectable(social.id) ? social.id : null;
              const isConnected = platform ? connected[platform] : false;
              const isBusy = platform ? busy === platform : false;
              const accountName = platform ? usernames[platform] : null;
              const needsYoutubeChoice = social.id === 'youtube' && youtubeNeedsSelection;

              return (
                <li key={social.id} className="cs-row">
                  <div className={`cs-icon is-${social.id}`} aria-hidden="true">
                    {social.Custom ? <social.Custom /> : <IonIcon icon={social.icon} />}
                  </div>
                  <div className="cs-info">
                    <h4>{social.name}</h4>
                    <p className={isConnected ? 'is-ok' : ''}>
                      {needsYoutubeChoice
                        ? 'Choose a channel to finish connecting'
                        : isConnected
                          ? accountName ? `Connected as ${accountName}` : 'Connected'
                          : social.note}
                    </p>
                    {needsYoutubeChoice && (
                      <div className="youtube-channel-choice">
                        <select
                          value={selectedYoutubeChannelId}
                          onChange={(event) => setSelectedYoutubeChannelId(event.target.value)}
                          aria-label="Choose a YouTube channel"
                        >
                          <option value="">Select a channel</option>
                          {youtubeChannels.map((channel) => (
                            <option key={channel.id} value={channel.id}>
                              {channel.title}{channel.customUrl ? ` (${channel.customUrl})` : ''}
                            </option>
                          ))}
                        </select>
                        <IonButton
                          size="small"
                          onClick={() => void saveYoutubeChannelSelection()}
                          disabled={!selectedYoutubeChannelId || busy !== null}
                        >
                          {isBusy ? <IonSpinner name="crescent" /> : 'Use channel'}
                        </IonButton>
                      </div>
                    )}
                  </div>
                  {platform ? (
                    <div className="cs-actions">
                      <button
                        type="button"
                        className={`cs-btn cs-action-icon ${isConnected ? 'is-connected' : ''}`}
                        disabled={isConnected || needsYoutubeChoice || busy !== null}
                        onClick={() => void connect(platform)}
                        aria-label={isConnected ? `${social.name} connected` : `Connect ${social.name}`}
                        title={isConnected ? `${social.name} connected` : `Connect ${social.name}`}
                      >
                        {isBusy ? (
                          <IonSpinner name="crescent" className="cs-spinner" />
                        ) : (
                          <IonIcon icon={isConnected ? checkmarkCircleOutline : linkOutline} />
                        )}
                      </button>
                      {isConnected && (
                        <button
                          type="button"
                          className="cs-btn-disconnect cs-action-icon"
                          disabled={busy !== null}
                          aria-label={`Disconnect ${social.name}`}
                          title={`Disconnect ${social.name}`}
                          onClick={() => setDisconnectingPlatform(platform)}
                        >
                          {isBusy ? (
                            <IonSpinner name="crescent" className="cs-spinner" />
                          ) : (
                            <IonIcon icon={closeCircleOutline} />
                          )}
                        </button>
                      )}
                    </div>
                  ) : <span className="cs-soon">Soon</span>}
                </li>
              );
            })}
          </ul>

          <IonButton className="social-refresh" expand="block" fill="outline" onClick={() => void refresh()} disabled={checking}>
            <IonIcon slot="start" icon={refreshOutline} />
            {checking ? 'Checking status...' : 'Refresh connection status'}
          </IonButton>
        </div>
      </IonContent>

      <BottomTabBar />
      <IonAlert
        isOpen={disconnectingPlatform !== null}
        header="Disconnect account?"
        message={`Disconnect ${disconnectingPlatform ? SOCIALS.find((social) => social.id === disconnectingPlatform)?.name : 'this account'} from AarnexAi? You can reconnect it later.`}
        buttons={[
          { text: 'Cancel', role: 'cancel', handler: () => setDisconnectingPlatform(null) },
          {
            text: 'Disconnect',
            role: 'destructive',
            handler: () => {
              if (disconnectingPlatform) void disconnect(disconnectingPlatform);
              setDisconnectingPlatform(null);
            },
          },
        ]}
        onDidDismiss={() => setDisconnectingPlatform(null)}
      />
      <IonToast isOpen={Boolean(success)} message={success ?? ''} duration={3500} position="top" color="success" onDidDismiss={clearSuccess} />
      <IonToast isOpen={Boolean(error)} message={error ?? ''} duration={5000} position="top" color="danger" onDidDismiss={clearError} />
    </IonPage>
  );
};

export default SocialConnections;