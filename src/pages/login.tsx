/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from 'react';
import {
  IonPage,
  IonContent,
  IonButton,
  IonIcon,
  IonLoading,
  IonToast,
} from '@ionic/react';
import {
  arrowForwardOutline,
  lockClosedOutline,
  checkmarkCircleOutline,
  refreshOutline,
} from 'ionicons/icons';
import { useNavigate } from 'react-router-dom';
import { apiPost } from '../api';
import { useAuth } from '../context/AuthContext';
import { getDeviceId, getDeviceType, getDeviceName } from '../utils/device';
import aarnaLogo from '../assets/aarna-logo.jpeg';

const RESEND_SECONDS = 30;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [phone, setPhone] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '']);
  const [stage, setStage] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [resendTimer, setResendTimer] = useState(0);
  const submittingRef = useRef(false);

  const isValidPhone = /^[6-9]\d{9}$/.test(phone);
  const otp = otpDigits.join('');

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);
  const getErrorMessage = (e: any, fallback: string) => {
    return (
      e?.error ||
      e?.message ||
      (typeof e === 'string' ? e : '') ||
      fallback
    );
  };

  const handleSendOtp = async () => {
    if (submittingRef.current) return;
    if (!isValidPhone) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    submittingRef.current = true;
    setLoading(true);
    setError('');
    try {
      const res = await apiPost('/auth/send-otp', { mobile: phone });
      if (res?.devOtp) setDevOtp(res.devOtp);
      setOtpDigits(['', '', '', '']);
      setStage('otp');
      setResendTimer(RESEND_SECONDS);
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    } catch (e: any) {
      setError(getErrorMessage(e, 'Failed to send OTP'));
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    await handleSendOtp();
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);

    if (digit && index < 3) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;
    e.preventDefault();
    const next = pasted.split('');
    while (next.length < 4) next.push('');
    setOtpDigits(next);
    const lastIndex = Math.min(pasted.length, 4) - 1;
    inputsRef.current[lastIndex]?.focus();
  };

  const handleVerifyOtp = async () => {
    if (submittingRef.current) return;
    if (otp.length !== 4) {
      setError('Enter the 4 digit OTP');
      return;
    }
    submittingRef.current = true;
    setLoading(true);
    setError('');
    try {
      const res = await apiPost('/auth/verify-otp', {
        mobile: phone,
        otp,
        deviceId: getDeviceId(),
        deviceType: getDeviceType(),
        deviceName: getDeviceName(),
      });

      const token = res?.token;
      if (!token) {
        throw new Error(res?.error || res?.message || 'Invalid OTP');
      }
      login(res.user, token, Boolean(res.hasBusiness), Boolean(res.hasSubscription));
      setDevOtp('');

      if (!res.hasBusiness) {
        navigate('/business-setup');
      } else if (!res.hasSubscription) {
        navigate('/subscription');
      } else {
        navigate('/dashboard');
      }
    } catch (e: any) {
      setError(getErrorMessage(e, 'Invalid OTP'));
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const handleChangeNumber = () => {
    setOtpDigits(['', '', '', '']);
    setDevOtp('');
    setStage('phone');
    setError('');
    setResendTimer(0);
  };

  return (
    <IonPage>
      <IonContent fullscreen scrollY style={{ '--background': '#F5FAFE' } as any}>
        <div className="login-page">
          <div className="login-header">
            <div className="logo-container">
              <img src={aarnaLogo} alt="Aarnex AI" className="aarna-logo" />
            </div>

            {stage === 'phone' ? (
              <>
                <h1 className="welcome-text">Welcome 👋</h1>
                <h2 className="main-heading">
                  Grow your business
                  <br />
                  <span>with AI.</span>
                </h2>
                <p className="subtitle">
                  Smart marketing tools designed
                  <br />
                  for your business.
                </p>
              </>
            ) : (
              <>
                <h1 className="welcome-text">Verify your number</h1>
                <p className="subtitle">
                  Enter the 4-digit OTP sent to
                  <br />
                  <strong>+91 {phone}</strong>
                </p>
              </>
            )}
          </div>

          <div className="login-card">
            {stage === 'phone' ? (
              <>
                <label className="input-label">Mobile Number</label>
                <div className={`phone-input-wrapper ${isValidPhone ? 'valid' : ''}`}>
                  <div className="country-code">+91</div>
                  <div className="input-divider" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="Enter mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="phone-input"
                    onKeyDown={(e) => e.key === 'Enter' && isValidPhone && handleSendOtp()}
                  />
                  {isValidPhone && <IonIcon icon={checkmarkCircleOutline} className="valid-icon" />}
                </div>

                <IonButton
                  expand="block"
                  className="continue-button"
                  disabled={!isValidPhone || loading}
                  onClick={handleSendOtp}
                >
                  <span>Send OTP</span>
                  <IonIcon icon={arrowForwardOutline} slot="end" />
                </IonButton>

                <div className="security-box">
                  <IonIcon icon={lockClosedOutline} />
                  <div>
                    <strong>Your information is secure</strong>
                    <p>We use your mobile number only to verify your account.</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <label className="input-label">Enter OTP</label>

                <div className="otp-boxes" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        inputsRef.current[i] = el;
                      }}
                      type="tel"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      className="otp-box"
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    />
                  ))}
                </div>

                {devOtp && (
                  <div className="dev-otp">
                    <span>Development OTP:</span>
                    <strong>{devOtp}</strong>
                  </div>
                )}

                <IonButton
                  expand="block"
                  className="continue-button"
                  disabled={otp.length !== 4 || loading}
                  onClick={handleVerifyOtp}
                >
                  <span>Verify & Continue</span>
                  <IonIcon icon={arrowForwardOutline} slot="end" />
                </IonButton>

                <div className="otp-actions">
                  <IonButton fill="clear" className="change-number-button" onClick={handleChangeNumber}>
                    Change number
                  </IonButton>

                  <IonButton
                    fill="clear"
                    className="resend-button"
                    disabled={resendTimer > 0}
                    onClick={handleResendOtp}
                  >
                    <IonIcon icon={refreshOutline} slot="start" />
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                  </IonButton>
                </div>
              </>
            )}
          </div>

          <div className="login-footer">
            <p>By continuing, you agree to our</p>
            <p>Terms of Service &nbsp;•&nbsp; Privacy Policy</p>
            <small>© {new Date().getFullYear()} Aarnex AI</small>
          </div>
        </div>

        <IonLoading isOpen={loading} message={stage === 'phone' ? 'Sending OTP...' : 'Verifying OTP...'} />
        <IonToast
          isOpen={!!error}
          message={error}
          duration={3000}
          color="danger"
          position="top"
          onDidDismiss={() => setError('')}
        />
      </IonContent>

      <style>
        {`
          * { box-sizing: border-box; }

          .login-page {
            min-height: 100%;
            width: 100%;
            padding: 30px 20px 30px;
            display: flex;
            flex-direction: column;
            align-items: center;
            background:
              radial-gradient(circle at 8% 0%, rgba(255,140,26,0.14), transparent 40%),
              radial-gradient(circle at 100% 15%, rgba(41,198,246,0.16), transparent 45%),
              #F5FAFE;
          }

          .login-header { width: 100%; max-width: 430px; text-align: center; }

          .logo-container {
            width: 100px; height: 100px; margin: 0 auto 14px;
            background: #FFFFFF; border-radius: 26px;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 12px 34px rgba(20,119,214,0.18);
            border: 1px solid #E7EDF2;
            padding: 8px;
          }
          .aarna-logo { width: 100%; height: 100%; object-fit: contain; }

          .welcome-text { margin: 0 0 10px; font-size: 18px; font-weight: 600; color: #5A6B7B; }
          .main-heading { margin: 0; font-size: 32px; line-height: 1.15; font-weight: 800; color: #0F2A4A; letter-spacing: -0.7px; }
          .main-heading span {
            background: linear-gradient(90deg, #1E7FE0, #29C6F6);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }
          .subtitle { margin: 13px 0 28px; font-size: 14px; line-height: 1.5; color: #718096; }

          .login-card {
            width: 100%; max-width: 430px; padding: 26px 22px;
            background: #FFFFFF; border-radius: 22px;
            box-shadow: 0 15px 45px rgba(15,42,74,0.10);
            border: 1px solid #E7EDF2;
          }

          .input-label { display: block; margin-bottom: 9px; font-size: 13px; font-weight: 700; color: #0F2A4A; }

          .phone-input-wrapper {
            height: 56px; width: 100%; display: flex; align-items: center;
            border: 1.5px solid #DCE4EB; border-radius: 13px; padding: 0 13px;
            background: #FFFFFF; transition: all 0.2s ease;
          }
          .phone-input-wrapper:focus-within { border-color: #1E7FE0; box-shadow: 0 0 0 3px rgba(30,127,224,0.10); }
          .phone-input-wrapper.valid { border-color: #FF8C1A; }

          .country-code { color: #0F2A4A; font-size: 16px; font-weight: 600; min-width: 34px; }
          .input-divider { height: 25px; width: 1px; background: #DCE4EB; margin: 0 8px; }
          .phone-input { flex: 1; border: none; outline: none; font-size: 16px; color: #0F2A4A; background: transparent; }
          .valid-icon { font-size: 21px; color: #FF8C1A; }

          .continue-button {
            margin: 18px 0 0; height: 52px; --border-radius: 13px;
            --background: linear-gradient(90deg, #1E7FE0, #29C6F6);
            --background-hover: linear-gradient(90deg, #176CC0, #1FB4E0);
            --box-shadow: 0 8px 20px rgba(30,127,224,0.28);
            font-size: 15px; font-weight: 700;
          }
          .continue-button[disabled] { opacity: 0.55; }

          .security-box {
            display: flex; gap: 11px; margin-top: 21px; padding: 13px;
            border-radius: 12px; background: #FFF6EC; border: 1px solid #FBE1BF;
          }
          .security-box > ion-icon { flex-shrink: 0; margin-top: 2px; font-size: 19px; color: #FF8C1A; }
          .security-box strong { display: block; font-size: 12px; color: #0F2A4A; }
          .security-box p { margin: 3px 0 0; font-size: 11px; line-height: 1.4; color: #718096; }

          .otp-boxes { display: flex; gap: 10px; justify-content: space-between; }
          .otp-box {
            width: 100%; height: 58px; border: 1.5px solid #DCE4EB; border-radius: 13px;
            text-align: center; font-size: 24px; font-weight: 700; color: #0F2A4A;
            outline: none; transition: all 0.2s ease;
          }
          .otp-box:focus { border-color: #1E7FE0; box-shadow: 0 0 0 3px rgba(30,127,224,0.10); }

          .dev-otp {
            margin-top: 12px; padding: 10px 12px; border-radius: 10px;
            background: #FFF8E6; border: 1px solid #F3D98B;
            display: flex; justify-content: space-between; align-items: center;
            font-size: 12px; color: #6B5A20;
          }
          .dev-otp strong { font-size: 18px; letter-spacing: 3px; color: #0F2A4A; }

          .otp-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
          .change-number-button { --color: #5A6B7B; font-size: 13px; }
          .resend-button { --color: #FF8C1A; font-size: 13px; }
          .resend-button[disabled] { --color: #A6B2BD; }

          .login-footer { width: 100%; max-width: 430px; text-align: center; margin-top: 24px; padding-bottom: 10px; }
          .login-footer p { margin: 3px 0; font-size: 10.5px; color: #98A5B1; }
          .login-footer small { display: block; margin-top: 12px; font-size: 10px; color: #B0BAC3; }

          @media (max-width: 380px) {
            .login-page { padding: 22px 15px; }
            .main-heading { font-size: 28px; }
            .login-card { padding: 22px 17px; }
            .logo-container { width: 120px; height: 120px; }
            .otp-box { height: 52px; font-size: 20px; }
          }
        `}
      </style>
    </IonPage>
  );
};

export default Login;