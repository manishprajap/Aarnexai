import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonPage,
  IonSpinner,
  IonText,
} from '@ionic/react';
import { arrowForwardOutline, callOutline, mailOutline, personOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { useAuth } from '../context/AuthContext';
import { apiPost } from '../api';
import logo from '../assets/aarna-logo.png';
import './login.css';

const RESEND_SECONDS = 30;

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [stage, setStage] = useState<'details' | 'otp'>('details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const submittingRef = useRef(false);

  const validMobile = /^[6-9]\d{9}$/.test(mobile);
  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = window.setTimeout(() => setResendTimer((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendTimer]);

  const getErrorMessage = (reason: unknown, fallback: string) =>
    reason instanceof Error ? reason.message : fallback;

  const sendOtp = async () => {
    if (submittingRef.current) return;
    if (!name.trim() || !validMobile || !validEmail) {
      setError('Enter your name, a valid 10-digit mobile number and a valid email address.');
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setError('');
    try {
      const response = await apiPost<{ devOtp?: string }>('/auth/register/send-otp', {
        name: name.trim(),
        mobile,
        email: email.trim().toLowerCase(),
      });
      setDevOtp(response.devOtp || '');
      setOtp('');
      setStage('otp');
      setResendTimer(RESEND_SECONDS);
    } catch (reason) {
      setError(getErrorMessage(reason, 'Could not send your verification code. Please try again.'));
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const verifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit code sent to your email.');
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setError('');
    try {
      const response = await apiPost<{
        user: { id: number; name: string; mobile: string; email: string | null };
        token: string;
      }>('/auth/register/verify-otp', {
        name: name.trim(),
        mobile,
        email: email.trim().toLowerCase(),
        otp,
      });
      if (!response?.token || !response.user) {
        throw new Error('Account verification did not complete. Please request a new code.');
      }
      login(response.user, response.token, false, false);
      navigate('/onboarding', { replace: true });
    } catch (reason) {
      setError(getErrorMessage(reason, 'Could not verify your code. Please try again.'));
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  return (
    <IonPage className="login-page register-page">
      <IonContent fullscreen scrollY className="login-content register-content">
        <div className="login-frame register-frame">
          <div className="brand-mark">
            <img src={logo} alt="Aarna Market OS" className="brand-logo" />
          </div>

          <header className="login-header">
            <h1>{stage === 'details' ? 'Start growing your business' : 'Verify your email'}</h1>
            <p>
              {stage === 'details'
                ? 'Create your Aarna account to get started with AI-powered marketing.'
                : <>We sent a 6-digit verification code to <strong>{email}</strong>.</>}
            </p>
          </header>

          {stage === 'details' ? (
            <form
              className="login-form"
              onSubmit={(event) => {
                event.preventDefault();
                void sendOtp();
              }}
              noValidate
            >
              <label className="field-label" htmlFor="register-name">Your name</label>
              <div className="input-shell">
                <IonIcon icon={personOutline} aria-hidden="true" />
                <IonInput
                  id="register-name"
                  type="text"
                  autocomplete="name"
                  placeholder="Full name"
                  value={name}
                  onIonInput={(event) => setName(event.detail.value ?? '')}
                />
              </div>

              <label className="field-label field-spaced" htmlFor="register-email">Email address</label>
              <div className="input-shell">
                <IonIcon icon={mailOutline} aria-hidden="true" />
                <IonInput
                  id="register-email"
                  type="email"
                  inputmode="email"
                  autocomplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onIonInput={(event) => setEmail(event.detail.value ?? '')}
                />
              </div>

              <label className="field-label field-spaced" htmlFor="register-mobile">Mobile number</label>
              <div className="input-shell">
                <span className="register-country-code">+91</span>
                <span className="register-divider" aria-hidden="true" />
                <IonIcon icon={callOutline} aria-hidden="true" />
                <IonInput
                  id="register-mobile"
                  type="tel"
                  inputmode="numeric"
                  maxlength={10}
                  autocomplete="tel"
                  placeholder="10-digit mobile number"
                  value={mobile}
                  onIonInput={(event) => setMobile((event.detail.value ?? '').replace(/\D/g, '').slice(0, 10))}
                />
              </div>

              {error && <IonText color="danger" className="form-error">{error}</IonText>}

              <IonButton
                expand="block"
                type="submit"
                className="cta-button"
                disabled={loading || !name.trim() || !validEmail || !validMobile}
              >
                {loading ? <IonSpinner name="dots" /> : <>Continue with email OTP <IonIcon icon={arrowForwardOutline} slot="end" /></>}
              </IonButton>

              <div className="security-box">
                <IonIcon icon={shieldCheckmarkOutline} />
                <div>
                  <strong>Verify securely with email</strong>
                  <p>We’ll send a one-time code to confirm your email before creating your account.</p>
                </div>
              </div>
            </form>
          ) : (
            <form className="login-form" onSubmit={(event) => void verifyOtp(event)}>
              <label className="field-label" htmlFor="register-otp">Email verification code</label>
              <div className="input-shell register-otp-shell">
                <IonIcon icon={mailOutline} aria-hidden="true" />
                <IonInput
                  id="register-otp"
                  type="text"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  maxlength={6}
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onIonInput={(event) => setOtp((event.detail.value ?? '').replace(/\D/g, '').slice(0, 6))}
                />
              </div>

              {devOtp && <p className="register-dev-otp">Development code: <strong>{devOtp}</strong></p>}
              {error && <IonText color="danger" className="form-error">{error}</IonText>}

              <IonButton
                expand="block"
                type="submit"
                className="cta-button"
                disabled={loading || otp.length !== 6}
              >
                {loading ? <IonSpinner name="dots" /> : <>Verify & continue <IonIcon icon={arrowForwardOutline} slot="end" /></>}
              </IonButton>

              <div className="register-otp-actions">
                <button type="button" className="link-inline" onClick={() => { setStage('details'); setError(''); }}>
                  Edit details
                </button>
                <button
                  type="button"
                  className="link-inline"
                  disabled={loading || resendTimer > 0}
                  onClick={() => void sendOtp()}
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
                </button>
              </div>
            </form>
          )}

          <p className="signup-line">
            Already have an account?{' '}
            <button type="button" className="link-inline strong" onClick={() => navigate('/login/mobile')}>
              Sign in with mobile OTP
            </button>
          </p>
        </div>
      </IonContent>

    </IonPage>
  );
};

export default Register;
