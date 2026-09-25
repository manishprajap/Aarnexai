import { useEffect, useRef, useState } from 'react';
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
  IonSpinner,
  IonToast,
  IonCard,
  IonCardContent,
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
  settingsOutline,
  linkOutline,
  checkmarkCircleOutline,
  pricetagOutline,
  locationOutline,
  logoInstagram,
  logoFacebook,
  logoYoutube,
  logoLinkedin,
  logoWhatsapp,
  statsChartOutline,
} from 'ionicons/icons';

import { useAuth } from '../context/AuthContext';

import logo from '../assets/aarna-logo.png';
import './Home.css';
import { useSocialConnections } from '../hooks/useSocialConnections';
import { useLogoTheme } from '../hooks/useLogoTheme';
import BottomTabBar from '../components/BottomTabBar';
import { clearBusinessCategory, saveBusinessCategory } from '../utils/businessCategory';
import { generatePromptPlan, getPlanDay, getPromptPlan, savePromptPlan, PromptPlanItem } from '../utils/promptPlan';

const Home: React.FC = () => {
  const ionRouter = useIonRouter();
  const { user, logout } = useAuth();
  const popoverRef = useRef<HTMLIonPopoverElement>(null);
  const themeStyle = useLogoTheme();

  const {
    connectedCount,
    error,
    success,
    clearError,
    clearSuccess,
    refresh,
  } = useSocialConnections();

  const [promptPlan, setPromptPlan] = useState<PromptPlanItem[]>([]);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [promptMessage, setPromptMessage] = useState('');

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const initial = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  // Business details saved in Business Setup (come from /auth/me)
  const businessName = user?.name?.trim() || '';
  const businessCategory = user?.category?.trim() || '';
  const businessCity = user?.city?.trim() || '';
  const hasBusinessInfo = Boolean(businessCategory || businessCity);

  const todayPrompt = promptPlan.find((item) => item.day === getPlanDay());

  useEffect(() => {
    if (user?.id) {
      setPromptPlan(getPromptPlan(user.id));
    }
  }, [user?.id]);

  const handleGeneratePromptPlan = () => {
    if (!user?.id || !businessCategory) {
      setPromptMessage('Please complete Business Setup first.');
      return;
    }

    if (promptPlan.length === 30) {
      setPromptMessage('Your saved 30-day prompt table is ready to use.');
      return;
    }

    setGeneratingPlan(true);
    const plan = generatePromptPlan(businessCategory);
    savePromptPlan(user.id, plan);
    setPromptPlan(plan);
    setPromptMessage('Your unique 30-day prompt plan is ready.');
    setGeneratingPlan(false);
  };

  // Keep the localStorage cache (used by the Upload page) in sync with the server value.
  useEffect(() => {
    if (user?.id && user.categoryId) {
      saveBusinessCategory(user.id, {
        categoryId: user.categoryId,
        categoryName: user.category ?? null,
      });
    }
  }, [user?.id, user?.categoryId, user?.category]);

  // Re-check live status every time Home becomes visible
  // (e.g. after coming back from Posters or an OAuth redirect).
  useIonViewWillEnter(() => {
    void refresh();
  });

  const handleLogout = () => {
    popoverRef.current?.dismiss();

    if (user?.id) {
      clearBusinessCategory(user.id);
    }

    logout();
    ionRouter.push('/login', 'root', 'replace');
  };

  const goToProductDetails = () => {
    ionRouter.push('/product-details', 'forward');
  };

  const goToProfile = () => {
    popoverRef.current?.dismiss();
    ionRouter.push('/profile', 'forward');
  };

  const goToSettings = () => {
    popoverRef.current?.dismiss();
    ionRouter.push('/settings', 'forward');
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
                <IonItem button detail={false} onClick={goToSettings}>
                  <IonIcon icon={settingsOutline} slot="start" />
                  <IonLabel>Settings</IonLabel>
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

          {/* Business info (from Business Setup) */}
          {hasBusinessInfo && (
            <section
              aria-label="Your business"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                margin: '0 0 16px',
                borderRadius: 16,
                border: '1px solid #E1E8EE',
                background: '#FFFFFF',
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  flexShrink: 0,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 17,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  background: 'linear-gradient(135deg, #1E7FE0, #12A19C)',
                }}
              >
                {initial}
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                {businessName && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#0F2A4A',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {businessName}
                  </p>
                )}

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    marginTop: businessName ? 5 : 0,
                  }}
                >
                  {businessCategory && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 9px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#1E7FE0',
                        background: '#EAF4FF',
                      }}
                    >
                      <IonIcon icon={pricetagOutline} style={{ fontSize: 13 }} />
                      {businessCategory}
                    </span>
                  )}

                  {businessCity && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 9px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#12A19C',
                        background: '#EAFBF8',
                      }}
                    >
                      <IonIcon icon={locationOutline} style={{ fontSize: 13 }} />
                      {businessCity}
                    </span>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Hero */}
          <section className="hero">
            <div className="hero-chip">
              <IonIcon icon={sparklesOutline} />
            </div>

            <h2 className="hero-heading">Create professional ads with AI</h2>
            <p className="hero-copy">
              Upload a product photo and AI builds thirty days of posts, captions and
              hashtags for you.
            </p>

            <IonButton routerLink="/upload" expand="block" className="hero-button">
              <IonIcon slot="start" icon={cloudUploadOutline} />
              Upload product
            </IonButton>
          </section>

          <IonCard style={{ margin: '22px 0 0', borderRadius: 18, boxShadow: '0 8px 24px rgba(15, 27, 45, 0.08)' }}>
            <IonCardContent>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div>
                  <p style={{ margin: 0, color: '#0F6FEC', fontSize: 12, fontWeight: 700 }}>AI PROMPT PLANNER</p>
                  <h3 style={{ margin: '5px 0 6px', color: '#0F1B2D', fontSize: 19 }}>Generate 30 days of ideas</h3>
                  <p style={{ margin: 0, color: '#6B7A90', fontSize: 13, lineHeight: 1.45 }}>
                    Unique daily prompts based on {businessCategory || 'your business category'}.
                  </p>
                </div>
                <IonIcon icon={timeOutline} style={{ color: '#0F6FEC', fontSize: 24 }} />
              </div>
              <IonButton expand="block" onClick={handleGeneratePromptPlan} disabled={generatingPlan || promptPlan.length === 30} style={{ marginTop: 16 }}>
                {generatingPlan ? <IonSpinner name="crescent" /> : promptPlan.length === 30 ? '30-day table saved' : 'Generate 30-day prompts'}
              </IonButton>
              {todayPrompt && (
                <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: '#F8FAFD' }}>
                  <strong style={{ color: '#0F1B2D', fontSize: 13 }}>Today · Day {todayPrompt.day}</strong>
                  <p style={{ margin: '6px 0 0', color: '#526176', fontSize: 13, lineHeight: 1.45 }}>{todayPrompt.prompt}</p>
                </div>
              )}
              {promptPlan.length === 30 && (
                <div style={{ marginTop: 14, maxHeight: 360, overflowY: 'auto', border: '1px solid #E1E7EF', borderRadius: 12 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ position: 'sticky', top: 0, background: '#F8FAFD', zIndex: 1 }}>
                        <th style={{ padding: '10px 8px', width: 54, textAlign: 'left', color: '#526176' }}>Day</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', color: '#526176' }}>Saved prompt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promptPlan.map((item) => (
                        <tr key={item.day} style={{ borderTop: '1px solid #E1E7EF', background: item.day === getPlanDay() ? '#EAF3FF' : '#FFFFFF' }}>
                          <td style={{ padding: '10px 8px', verticalAlign: 'top', fontWeight: 700, color: '#0F1B2D' }}>{item.day}</td>
                          <td style={{ padding: '10px 8px', lineHeight: 1.45, color: '#526176' }}>{item.prompt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {promptMessage && <p style={{ margin: '10px 0 0', color: '#0F6FEC', fontSize: 12 }}>{promptMessage}</p>}
            </IonCardContent>
          </IonCard>

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
                    onClick={() => ionRouter.push('/social-connections', 'forward')}
                  >
                    <IonIcon icon={connectedCount ? checkmarkCircleOutline : linkOutline} />
                    {connectedCount ? `${connectedCount} connected` : 'Connect'}
                  </button>
                </div>
              </div>

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

              <button
                type="button"
                className="feature-row feature-row-link"
                onClick={() => ionRouter.push('/analytics')}
              >
                <div className="tile">
                  <IonIcon icon={statsChartOutline} />
                </div>
                <div className="feature-text">
                  <h4>Google and YouTube analytics</h4>
                  <p>Review channel reach, engagement and published posts.</p>
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