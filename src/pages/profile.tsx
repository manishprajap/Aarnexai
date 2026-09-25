/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import {
  IonPage,
  IonContent,
  IonButton,
  IonIcon,
  IonLoading,
  IonToast,
  IonAlert,
} from '@ionic/react';
import {
  personOutline,
  callOutline,
  mailOutline,
  locationOutline,
  globeOutline,
  cardOutline,
  businessOutline,
  walletOutline,
  createOutline,
  checkmarkOutline,
  closeOutline,
  logOutOutline,
  chevronBackOutline,
} from 'ionicons/icons';
import { useNavigate } from 'react-router-dom';
import { apiPost, apiPut } from '../api';
import { useAuth } from '../context/AuthContext';
import './Profile.css';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth() as any;

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const phone = user?.mobile || user?.phone || '';
  const isEmailEditable = !user?.email; 
  const displayValue = (value: unknown) =>
    typeof value === 'string' && value.trim() ? value.trim() : 'Not added';

  const initials = (user?.name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase())
    .join('');

  const isValidEmail = email === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidName = name.trim().length > 1;

  const getErrorMessage = (e: any, fallback: string) => {
    return e?.error || e?.message || (typeof e === 'string' ? e : '') || fallback;
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // cancel: revert unsaved changes
      setName(user?.name || '');
      setEmail(user?.email || '');
      setError('');
    }
    setIsEditing((prev) => !prev);
  };

  const handleSave = async () => {
  if (!isValidName) {
    setError('Please enter your name');
    return;
  }

  if (!isValidEmail) {
    setError('Invalid email');
    return;
  }

  setLoading(true);
  setError('');

  try {
    const payload: any = {
      name: name.trim(),
    };

    // ✅ only send email if it is allowed
    if (!user?.email && email.trim()) {
      payload.email = email.trim();
    }

    const res = await apiPut('/auth/profile', payload);

    updateUser?.(
      res?.user || {
        ...user,
        name: name.trim(),
        ...(payload.email ? { email: payload.email } : {}),
      }
    );

    setSuccess('Profile updated');
    setIsEditing(false);
  } catch (e: any) {
    setError(getErrorMessage(e, 'Failed to update profile'));
  } finally {
    setLoading(false);
  }
};

  const handleLogout = () => {
    logout?.();
    navigate('/login', { replace: true });
  };

  return (
    <IonPage>
      <IonContent fullscreen scrollY style={{ '--background': '#F5FAFE' } as any}>
        <div className="profile-page">
          <div className="profile-topbar">
            <button className="back-button" onClick={() => navigate(-1)} aria-label="Back">
              <IonIcon icon={chevronBackOutline} />
            </button>
            <span className="topbar-title">My Profile</span>
            <div className="topbar-spacer" />
          </div>

          <div className="profile-hero">
            <div className="avatar-circle">
              {initials || <IonIcon icon={personOutline} />}
            </div>
            <h1 className="profile-name">{user?.name || 'Your Name'}</h1>
            <p className="profile-phone">+91 {phone}</p>
          </div>

          <div className="profile-card">
            <div className="card-header">
              <span>Personal Information</span>
              {!isEditing ? (
                <button className="edit-link" onClick={handleEditToggle}>
                  <IonIcon icon={createOutline} />
                  Edit
                </button>
              ) : (
                <button className="edit-link cancel" onClick={handleEditToggle}>
                  <IonIcon icon={closeOutline} />
                  Cancel
                </button>
              )}
            </div>

            <div className="field-group">
              <label className="field-label">
                <IonIcon icon={personOutline} />
                Full Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  className="field-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                />
              ) : (
                <div className="field-value">{user?.name || '—'}</div>
              )}
            </div>

            <div className="field-group">
              <label className="field-label">
                <IonIcon icon={callOutline} />
                Mobile Number
              </label>
              <div className="field-value locked">
                +91 {phone}
                <span className="locked-tag">Verified</span>
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">
                <IonIcon icon={mailOutline} />
                Email Address
              </label>

              {isEditing ? (
                isEmailEditable ? (
                  <input
                    type="email"
                    className="field-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                  />
                ) : (
                  <div className="field-value locked">
                    {displayValue(user?.email)}
                    <span className="locked-tag">Locked</span>
                  </div>
                )
              ) : (
                <div className="field-value">
                  {displayValue(user?.email)}
                </div>
              )}
            </div>

            <div className="profile-section-divider" />
            <p className="profile-section-title">Business Information</p>

            <div className="profile-detail-grid">
              <div className="detail-item">
                <span className="detail-label"><IonIcon icon={businessOutline} /> Category</span>
                <strong>{displayValue(user?.category)}</strong>
              </div>
              <div className="detail-item">
                <span className="detail-label"><IonIcon icon={locationOutline} /> City</span>
                <strong>{displayValue(user?.city)}</strong>
              </div>
              <div className="detail-item detail-item-wide">
                <span className="detail-label"><IonIcon icon={globeOutline} /> Website</span>
                <strong>{displayValue(user?.website)}</strong>
              </div>
            </div>

            <div className="profile-section-divider" />
            <p className="profile-section-title">Account Plan</p>
            <div className="plan-summary">
              <div><span><IonIcon icon={cardOutline} /> Plan</span><strong>{displayValue(user?.plan)}</strong></div>
              <div><span><IonIcon icon={walletOutline} /> Credits</span><strong>{user?.credits ?? 'Not available'}</strong></div>
            </div>



            {isEditing && (
              <IonButton
                expand="block"
                className="save-button"
                disabled={loading || !isValidName || !isValidEmail}
                onClick={handleSave}
              >
                <IonIcon icon={checkmarkOutline} slot="start" />
                <span>Save Changes</span>
              </IonButton>
            )}
          </div>

          <button className="logout-row" onClick={() => setShowLogoutConfirm(true)}>
            <IonIcon icon={logOutOutline} />
            Log Out
          </button>
        </div>

        <IonLoading isOpen={loading} message="Saving changes..." />
        <IonToast
          isOpen={!!error}
          message={error}
          duration={3000}
          color="danger"
          position="top"
          onDidDismiss={() => setError('')}
        />
        <IonToast
          isOpen={!!success}
          message={success}
          duration={2000}
          color="success"
          position="top"
          onDidDismiss={() => setSuccess('')}
        />
        <IonAlert
          isOpen={showLogoutConfirm}
          header="Log out?"
          message="You'll need to verify your mobile number again to sign back in."
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            { text: 'Log Out', role: 'destructive', handler: handleLogout },
          ]}
          onDidDismiss={() => setShowLogoutConfirm(false)}
        />
      </IonContent>
    </IonPage>
  );
};

export default Profile;