import React from 'react';
import { IonContent, IonIcon, IonPage, IonToolbar } from '@ionic/react';
import {
  arrowBackOutline,
  helpCircleOutline,
  informationCircleOutline,
  notificationsOutline,
} from 'ionicons/icons';
import { useNavigate, useParams } from 'react-router-dom';
import logo from '../assets/aarna-logo.png';
import packageInfo from '../../package.json';
import BottomTabBar from '../components/BottomTabBar';
import './Settings.css';

const sections = {
  notifications: {
    title: 'Notifications',
    icon: notificationsOutline,
  },
  help: {
    title: 'Help & Support',
    icon: helpCircleOutline,
  },
  about: {
    title: 'About',
    icon: informationCircleOutline,
  },
} as const;

const SettingsSection: React.FC = () => {
  const navigate = useNavigate();
  const { section } = useParams<{ section: string }>();
  const currentSection = section && section in sections
    ? sections[section as keyof typeof sections]
    : null;

  return (
    <IonPage className="settings-page">
      <IonContent fullscreen>
        <IonToolbar className="settings-toolbar">
          <button type="button" className="settings-back" onClick={() => navigate('/settings', { replace: true })} aria-label="Back to settings">
            <IonIcon icon={arrowBackOutline} />
          </button>
          <img src={logo} alt="AarnexAi" className="settings-logo" />
          <span className="settings-toolbar-spacer" />
        </IonToolbar>

        <main className="settings-content">
          {currentSection ? (
            <>
              <h1 className="settings-section-title">
                <IonIcon icon={currentSection.icon} />
                {currentSection.title}
              </h1>

              {section === 'notifications' && (
                <section className="settings-info-card">
                  <h2>App notifications</h2>
                  <p>
                    Notification preferences are not available yet. Banner generation and publishing
                    results are shown directly in the app.
                  </p>
                </section>
              )}

              {section === 'help' && (
                <section className="settings-help-list" aria-label="Help topics">
                  <details>
                    <summary>How do I connect my social accounts?</summary>
                    <p>Open Social Connect from Settings to connect or manage your available channels.</p>
                    <button type="button" onClick={() => navigate('/social-connections')}>Open Social Connect</button>
                  </details>
                  <details>
                    <summary>How do I manage my subscription?</summary>
                    <p>View available plans and your subscription details from the Subscription page.</p>
                    <button type="button" onClick={() => navigate('/subscription')}>View subscription</button>
                  </details>
                  <details>
                    <summary>Where can I view my account details?</summary>
                    <p>Your account information and saved business details are available on your profile.</p>
                    <button type="button" onClick={() => navigate('/profile')}>Open profile</button>
                  </details>
                </section>
              )}

              {section === 'about' && (
                <section className="settings-info-card settings-about-card">
                  <img src={logo} alt="AarnexAi logo" />
                  <h2>AarnexAi</h2>
                  <p>Business marketing and social publishing in one place.</p>
                  <small>Version {packageInfo.version}</small>
                </section>
              )}
            </>
          ) : (
            <>
              <h1>Settings page not found</h1>
              <button type="button" className="settings-inline-link" onClick={() => navigate('/settings')}>
                Return to Settings
              </button>
            </>
          )}
        </main>
      </IonContent>
      <BottomTabBar />
    </IonPage>
  );
};

export default SettingsSection;
