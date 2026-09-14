/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonItem,
  IonLabel,
  IonLoading,
  IonToast,
  IonAvatar,
  IonIcon,
  IonText,
  IonButtons,
  IonBackButton,
} from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../api';

import {
  cameraOutline,
  businessOutline,
  pricetagOutline,
  locationOutline,
  globeOutline,
  callOutline,
  languageOutline,
  closeCircle,
} from 'ionicons/icons';

const brand = {
  navy: '#0F2A4A',
  blue: '#1E7FE0',
  teal: '#12A19C',
  green: '#4CAF50',
  ink: '#5A6B7B',
  border: '#E1E8EE',
  cardBg: '#FFFFFF',
  pageBgFrom: '#EAF4FF',
  pageBgTo: '#F3FBF4',
};

const fieldStyle = {
  '--background': '#FAFCFE',
  '--border-radius': '12px',
  '--border-color': brand.border,
  '--border-width': '1px',
  '--border-style': 'solid',
  '--padding-start': '12px',
  '--inner-padding-end': '12px',
  '--highlight-height': '0px',
  marginBottom: 14,
  borderRadius: 12,
} as React.CSSProperties;

const CATEGORIES = [
  'Restaurant / Cafe',
  'Retail / Shop',
  'Salon / Spa',
  'Clinic / Healthcare',
  'IT Services',
  'Real Estate',
  'Education / Coaching',
  'Other',
];

const MAX_LOGO_SIZE_MB = 5;

// apiGet/apiPost (see src/api.ts) return the parsed JSON body directly and
// throw the parsed JSON error body directly on non-2xx responses — there is
// no axios-style { data: ... } / { response: { data: ... } } wrapper.
const getErrorMessage = (e: any, fallback: string) =>
  e?.error || e?.message || (typeof e === 'string' ? e : '') || fallback;

const BusinessSetup: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');

  const [language, setLanguage] =
    useState<'Hindi' | 'English' | 'Hinglish'>('Hinglish');

  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState('');

  // Logo — OPTIONAL. Defaults to null/not-selected and the form can be
  // submitted without one; `canSubmit` below never checks logoFile.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Logo is intentionally excluded from this check — only name, category,
  // and city are required to submit.
  const canSubmit = Boolean(name.trim() && category.trim() && city.trim());

  // ==================================================
  // LOAD CURRENT USER (for phone number + any existing details)
  // ==================================================

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        // apiGet('/auth/me') resolves to { user: {...} } directly.
        const res = await apiGet('/auth/me');
        const user = res?.user;
        if (cancelled || !user) return;

        setPhone(user.mobile || '');
        if (user.name) setName(user.name);
        if (user.category) setCategory(user.category);
        if (user.city) setCity(user.city);
        if (user.website) setWebsite(user.website);
        if (user.language) setLanguage(user.language);
      } catch (e: any) {
        if (!cancelled) {
          setError(getErrorMessage(e, 'Could not load your profile'));
        }
      } finally {
        if (!cancelled) setInitializing(false);
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  // ==================================================
  // OPEN FILE PICKER
  // ==================================================

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  // ==================================================
  // LOGO CHANGE
  // ==================================================

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    // Allow same file to be selected again
    e.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file');
      return;
    }

    if (file.size > MAX_LOGO_SIZE_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_LOGO_SIZE_MB}MB`);
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setLogoPreview(reader.result as string);
      setLogoFile(file);
    };

    reader.onerror = () => {
      setError('Could not read that image, try another one');
    };

    reader.readAsDataURL(file);
  };

  // ==================================================
  // REMOVE LOGO — resets back to the optional/null default
  // ==================================================

  const removeLogo = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setLogoFile(null);
    setLogoPreview(null);
  };

  // ==================================================
  // SUBMIT
  // ==================================================

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError('Please fill in business name, category and city');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let payload: FormData | Record<string, string | null>;

      if (logoFile) {
        const formData = new FormData();
        formData.append('name', name.trim());
        formData.append('category', category.trim());
        formData.append('city', city.trim());
        formData.append('website', website.trim());
        formData.append('language', language);
        formData.append('logo', logoFile);
        payload = formData;
      } else {
        // No logo selected — send `logo: null` explicitly so the backend
        // always receives the key rather than it being absent. Logo stays
        // fully optional; this does not block submission.
        payload = {
          name: name.trim(),
          category: category.trim(),
          city: city.trim(),
          website: website.trim(),
          language,
          logo: null,
        };
      }

      await apiPost('/business/setup', payload);

      navigate('/subscription');
    } catch (e: any) {
      setError(getErrorMessage(e, 'Could not save your business details'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      {/* ==================================================
          HEADER
      ================================================== */}

      <IonHeader className="ion-no-border">
        <IonToolbar
          style={
            {
              '--background': `linear-gradient(90deg, ${brand.blue}, ${brand.teal})`,
              '--color': '#FFFFFF',
            } as React.CSSProperties
          }
        >
          <IonButtons slot="start">
            <IonBackButton
              defaultHref="/login"
              style={
                {
                  '--color': '#FFFFFF',
                } as React.CSSProperties
              }
            />
          </IonButtons>

          <IonTitle
            style={{
              fontWeight: 700,
            }}
          >
            Tell us about your business
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      {/* ==================================================
          CONTENT
      ================================================== */}

      <IonContent
        style={
          {
            '--background': `linear-gradient(
              180deg,
              ${brand.pageBgFrom} 0%,
              ${brand.pageBgTo} 40%,
              #FFFFFF 40%
            )`,
          } as React.CSSProperties
        }
      >
        <div
          style={{
            padding: '20px 18px 40px',
          }}
        >
          {/* ==================================================
              LOGO (OPTIONAL)
          ================================================== */}

          <div
            className="ion-text-center"
            style={{
              marginBottom: 20,
            }}
          >
            <div
              onClick={openFilePicker}
              role="button"
              tabIndex={0}
              style={{
                position: 'relative',
                width: 88,
                height: 88,
                margin: '0 auto',
                cursor: 'pointer',
              }}
            >
              <IonAvatar
                style={{
                  width: 88,
                  height: 88,
                  background: '#FFFFFF',
                  border: logoPreview
                    ? `2px solid ${brand.border}`
                    : `2px dashed ${brand.teal}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 10px 24px rgba(15, 42, 74, 0.10)',
                  overflow: 'hidden',
                }}
              >
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Business logo"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <IonIcon
                    icon={cameraOutline}
                    style={{
                      fontSize: 28,
                      color: brand.teal,
                    }}
                  />
                )}
              </IonAvatar>

              {/* Camera badge */}

              <div
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: `linear-gradient(
                      135deg,
                      ${brand.blue},
                      ${brand.teal}
                    )`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #FFFFFF',
                  boxShadow: '0 4px 10px rgba(15, 42, 74, 0.18)',
                }}
              >
                <IonIcon
                  icon={cameraOutline}
                  style={{
                    fontSize: 13,
                    color: '#FFFFFF',
                  }}
                />
              </div>

              {/* Remove */}

              {logoPreview && (
                <button
                  type="button"
                  onClick={removeLogo}
                  aria-label="Remove logo"
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    border: `1px solid ${brand.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(15, 42, 74, 0.15)',
                  }}
                >
                  <IonIcon
                    icon={closeCircle}
                    style={{
                      fontSize: 16,
                      color: '#D64545',
                    }}
                  />
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              style={{
                display: 'none',
              }}
            />

            <p
              style={{
                marginTop: 10,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.6,
                color: brand.navy,
              }}
            >
              {logoFile ? logoFile.name : 'ADD BUSINESS LOGO (OPTIONAL)'}
            </p>
          </div>

          {/* ==================================================
              FORM CARD
          ================================================== */}

          <div
            style={{
              background: brand.cardBg,
              borderRadius: 20,
              padding: '22px 18px 8px',
              boxShadow: '0 14px 34px rgba(15, 42, 74, 0.10)',
              border: `1px solid ${brand.border}`,
              marginBottom: 18,
            }}
          >
            {/* Business name */}

            <IonItem lines="none" style={fieldStyle}>
              <IonIcon
                icon={businessOutline}
                slot="start"
                style={{
                  color: brand.blue,
                  fontSize: 18,
                }}
              />

              <IonLabel
                position="stacked"
                style={{
                  color: brand.navy,
                  fontWeight: 600,
                }}
              >
                Business Name
              </IonLabel>

              <IonInput
                value={name}
                placeholder="Aarna Tech Xperts"
                onIonInput={(e) => setName(e.detail.value || '')}
              />
            </IonItem>

            {/* Category */}

            <IonItem lines="none" style={fieldStyle}>
              <IonIcon
                icon={pricetagOutline}
                slot="start"
                style={{
                  color: brand.teal,
                  fontSize: 18,
                }}
              />

              <IonLabel
                position="stacked"
                style={{
                  color: brand.navy,
                  fontWeight: 600,
                }}
              >
                Business Category
              </IonLabel>

              <IonSelect
                value={category}
                placeholder="Select category"
                onIonChange={(e) => setCategory(String(e.detail.value || ''))}
              >
                {CATEGORIES.map((item) => (
                  <IonSelectOption key={item} value={item}>
                    {item}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            {/* City */}

            <IonItem lines="none" style={fieldStyle}>
              <IonIcon
                icon={locationOutline}
                slot="start"
                style={{
                  color: brand.green,
                  fontSize: 18,
                }}
              />

              <IonLabel
                position="stacked"
                style={{
                  color: brand.navy,
                  fontWeight: 600,
                }}
              >
                City
              </IonLabel>

              <IonInput
                value={city}
                placeholder="Lucknow"
                onIonInput={(e) => setCity(e.detail.value || '')}
              />
            </IonItem>

            {/* Website */}

            <IonItem lines="none" style={fieldStyle}>
              <IonIcon
                icon={globeOutline}
                slot="start"
                style={{
                  color: brand.blue,
                  fontSize: 18,
                }}
              />

              <IonLabel
                position="stacked"
                style={{
                  color: brand.navy,
                  fontWeight: 600,
                }}
              >
                Website (optional)
              </IonLabel>

              <IonInput
                value={website}
                placeholder="www.yourbusiness.com"
                onIonInput={(e) => setWebsite(e.detail.value || '')}
              />
            </IonItem>

            {/* Phone */}

            <IonItem lines="none" style={fieldStyle}>
              <IonIcon
                icon={callOutline}
                slot="start"
                style={{
                  color: brand.ink,
                  fontSize: 18,
                }}
              />

              <IonLabel
                position="stacked"
                style={{
                  color: brand.navy,
                  fontWeight: 600,
                }}
              >
                Phone
              </IonLabel>

              <IonInput value={phone} readonly />
            </IonItem>

            {/* Language */}

            <IonItem
              lines="none"
              style={{
                ...fieldStyle,
                marginBottom: 18,
              }}
            >
              <IonIcon
                icon={languageOutline}
                slot="start"
                style={{
                  color: brand.teal,
                  fontSize: 18,
                }}
              />

              <IonLabel
                position="stacked"
                style={{
                  color: brand.navy,
                  fontWeight: 600,
                }}
              >
                Language
              </IonLabel>

              <IonSelect
                value={language}
                onIonChange={(e) =>
                  setLanguage(e.detail.value as 'Hindi' | 'English' | 'Hinglish')
                }
              >
                <IonSelectOption value="Hindi">Hindi</IonSelectOption>
                <IonSelectOption value="English">English</IonSelectOption>
                <IonSelectOption value="Hinglish">Hinglish</IonSelectOption>
              </IonSelect>
            </IonItem>
          </div>

          {/* ==================================================
              CONTINUE
          ================================================== */}

          <IonButton
            expand="block"
            onClick={handleSubmit}
            disabled={!canSubmit || loading || initializing}
            style={
              {
                '--background': `linear-gradient(
                    90deg,
                    ${brand.blue},
                    ${brand.teal}
                  )`,
                '--background-activated': `linear-gradient(
                    90deg,
                    ${brand.blue},
                    ${brand.teal}
                  )`,
                '--border-radius': '12px',
                '--box-shadow': 'none',
                fontWeight: 600,
              } as React.CSSProperties
            }
          >
            Continue
          </IonButton>

          <IonText>
            <p
              style={{
                textAlign: 'center',
                color: brand.ink,
                fontSize: 12,
                marginTop: 14,
              }}
            >
              You can always edit these details later from Settings
            </p>
          </IonText>
        </div>

        <IonLoading isOpen={loading} message="Saving business..." />
        <IonLoading isOpen={initializing} message="Loading..." />

        <IonToast
          isOpen={Boolean(error)}
          message={error}
          duration={2500}
          color="danger"
          onDidDismiss={() => setError('')}
        />
      </IonContent>
    </IonPage>
  );
};

export default BusinessSetup;