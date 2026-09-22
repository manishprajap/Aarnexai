import React from 'react';
import { IonContent, IonIcon, IonPage, IonToolbar } from '@ionic/react';
import {
  alertCircleOutline,
  chevronForwardOutline,
  helpCircleOutline,
  informationCircleOutline,
  logoInstagram,
  notificationsOutline,
  personOutline,
  pricetagOutline,
  arrowBackOutline,
} from 'ionicons/icons';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/aarna-logo.png';
import { useAuth } from '../context/AuthContext';
import './Settings.css';

type SettingRowProps = {
  icon: string;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  danger?: boolean;
};

const SettingRow: React.FC<SettingRowProps> = ({ icon, title, subtitle, onClick, danger }) => (
  <button type="button" className={`settings-row${danger ? ' is-danger' : ''}`} onClick={onClick}>
    <span className="settings-row-icon"><IonIcon icon={icon} /></span>
    <span className="settings-row-copy">
      <strong>{title}</strong>
      {subtitle && <small>{subtitle}</small>}
    </span>
    <IonIcon className="settings-chevron" icon={chevronForwardOutline} />
  </button>
);

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <IonPage className="settings-page">
      <IonContent fullscreen>
        <IonToolbar className="settings-toolbar">
          <button type="button" className="settings-back" onClick={() => navigate(-1)} aria-label="Back">
            <IonIcon icon={arrowBackOutline} />
          </button>
          <img src={logo} alt="AarnexAi" className="settings-logo" />
          <span className="settings-toolbar-spacer" />
        </IonToolbar>

        <main className="settings-content">
          <h1>Settings</h1>
          <div className="settings-list" aria-label="Settings options">
            <SettingRow icon={personOutline} title="Account" subtitle={user?.name || 'Manage your account'} onClick={() => navigate('/profile')} />
            <SettingRow icon={logoInstagram} title="Instagram Connection" subtitle="Not Connected" onClick={() => navigate('/social-connections')} />
            <SettingRow icon={notificationsOutline} title="Notifications" subtitle="Manage alerts and updates" />
            <SettingRow icon={pricetagOutline} title="Subscription" subtitle="View your current plan" onClick={() => navigate('/subscription')} />
            <SettingRow icon={helpCircleOutline} title="Help & Support" subtitle="Get help with AarnexAi" />
            <SettingRow icon={informationCircleOutline} title="About" subtitle="Version and app information" />
          </div>

          <button type="button" className="settings-row settings-logout" onClick={handleLogout}>
            <span className="settings-row-icon"><IonIcon icon={alertCircleOutline} /></span>
            <span className="settings-row-copy"><strong>Log out</strong></span>
            <IonIcon className="settings-chevron" icon={chevronForwardOutline} />
          </button>
        </main>
      </IonContent>
    </IonPage>
  );
};

export default Settings;
