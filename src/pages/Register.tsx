import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonPage,
  IonContent,
  IonInput,
  IonButton,
  IonIcon,
  IonText,
  IonSpinner,
} from '@ionic/react';
import {
  personOutline,
  mailOutline,
  callOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline,
} from 'ionicons/icons';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/aarna-logo.png';
import { apiPost } from '../api';
import './Login.css';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

 const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');

  if (!name || !mobile || !password) {
    setError('Name, mobile number and password are required.');
    return;
  }
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    setError('Enter a valid 10-digit mobile number.');
    return;
  }
  if (password.length < 6) {
    setError('Password must be at least 6 characters.');
    return;
  }

  setLoading(true);
  try {
    const res = await apiPost('/auth/register', {
      name,
      mobile,
      email: email || undefined,
      password,
    });

    // A brand-new account never has business details or an active
    // subscription yet, so these are always false right after registration.
    login(res.user, res.token, false, false);
    navigate('/business-setup', { replace: true });
  } catch (err: any) {
    setError(err?.error || 'Could not create your account. Please try again.');
  } finally {
    setLoading(false);
  }
};

  return (
    <IonPage className="login-page">
      <IonContent fullscreen scrollY={true} className="login-content">
        <div className="login-frame">
          <div className="login-scroll">
            <div className="brand-mark">
              <img src={logo} alt="Aarna Market OS" className="brand-logo" />
            </div>

            <header className="login-header">
              <h1>Create your account</h1>
              <p>Set up your storefront on Aarna Market OS.</p>
            </header>

            <form className="login-form" onSubmit={handleRegister} noValidate>
              <label className="field-label" htmlFor="register-name">
                Full name
              </label>
              <div className="input-shell">
                <IonIcon icon={personOutline} aria-hidden="true" />
                <IonInput
                  id="register-name"
                  type="text"
                  placeholder="Priya Sharma"
                  value={name}
                  autocomplete="name"
                  onIonInput={(e) => setName(e.detail.value ?? '')}
                />
              </div>

              <label className="field-label field-spaced" htmlFor="register-mobile">
                Mobile number
              </label>
              <div className="input-shell">
                <IonIcon icon={callOutline} aria-hidden="true" />
                <IonInput
                  id="register-mobile"
                  type="tel"
                  inputmode="numeric"
                  maxlength={10}
                  placeholder="98765 43210"
                  value={mobile}
                  autocomplete="tel"
                  onIonInput={(e) => setMobile((e.detail.value ?? '').replace(/\D/g, ''))}
                />
              </div>

              <label className="field-label field-spaced" htmlFor="register-email">
                Email <span className="optional-tag">(optional)</span>
              </label>
              <div className="input-shell">
                <IonIcon icon={mailOutline} aria-hidden="true" />
                <IonInput
                  id="register-email"
                  type="email"
                  inputmode="email"
                  placeholder="you@business.com"
                  value={email}
                  autocomplete="email"
                  onIonInput={(e) => setEmail(e.detail.value ?? '')}
                />
              </div>

              <label className="field-label field-spaced" htmlFor="register-password">
                Password
              </label>
              <div className="input-shell">
                <IonIcon icon={lockClosedOutline} aria-hidden="true" />
                <IonInput
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={password}
                  autocomplete="new-password"
                  onIonInput={(e) => setPassword(e.detail.value ?? '')}
                />
                <button
                  type="button"
                  className="visibility-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  <IonIcon icon={showPassword ? eyeOffOutline : eyeOutline} />
                </button>
              </div>

              {error && (
                <IonText color="danger" className="form-error">
                  {error}
                </IonText>
              )}

              <IonButton
                expand="block"
                type="submit"
                className="cta-button"
                disabled={loading}
              >
                {loading ? <IonSpinner name="dots" /> : 'Create account'}
              </IonButton>
            </form>

            <p className="signup-line">
              Already have an account?{' '}
              <button
                type="button"
                className="link-inline strong"
                onClick={() => navigate('/login')}
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Register;