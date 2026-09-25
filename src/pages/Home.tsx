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
  timeOutline,
  arrowForwardOutline,
  chevronForwardOutline,
  personOutline,
  logOutOutline,
  settingsOutline,
  linkOutline,
  checkmarkCircleOutline,
  shieldCheckmarkOutline,
  statsChartOutline,
} from 'ionicons/icons';

import { useAuth } from '../context/AuthContext';

import logo from '../assets/aarna-logo.png';
import './Home.css';
import { useSocialConnections } from '../hooks/useSocialConnections';
import { useLogoTheme } from '../hooks/useLogoTheme';
import BottomTabBar from '../components/BottomTabBar';
import { clearBusinessCategory, saveBusinessCategory } from '../utils/businessCategory';

import { fetchPromptPlan, fillPromptTemplate, generatePromptPlan } from '../utils/promptPlan';

type PromptPlanItem = {
  day: number;
  theme?: string | null;
  prompt: string;
};

// How long a generated 30-day plan stays locked before the user can regenerate it.
// This is computed from the server's real plan.startDate, not from anything
// stored on the device, so it survives reinstalls and works across devices.
const REGENERATE_LOCK_DAYS = 30;
const REGENERATE_LOCK_MS = REGENERATE_LOCK_DAYS * 24 * 60 * 60 * 1000;

// How long we wait for the "generate" request before giving up and showing
// an error, so the UI can never get stuck on a blank/pending state forever.
const GENERATE_WATCHDOG_MS = 95_000;

const Home: React.FC = () => {
  const ionRouter = useIonRouter();
  const { user, logout } = useAuth() as any;

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
  const [todayPrompt, setTodayPrompt] = useState<PromptPlanItem | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [promptMessage, setPromptMessage] = useState('');
  const [planToastOpen, setPlanToastOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [promptMessageColor, setPromptMessageColor] = useState<'primary' | 'danger'>('primary');

  // ms timestamp of when the current plan was generated, straight from the
  // server (plan.startDate). null = no plan yet, so no lock.
  const [planStartAt, setPlanStartAt] = useState<number | null>(null);

  // Safety timer so a hung/killed request can never leave the button stuck
  // on "Generating…" or the screen looking frozen.
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const initial = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  // Business details saved in Business Setup (come from /auth/me)
  const businessCategory = user?.category?.trim() || '';
  const businessCity = user?.city?.trim() || '';

  const badgeText = businessCategory && businessCity
    ? `${businessCategory} · ${businessCity}`
    : businessCategory || businessCity || 'Your workspace is ready';

  const nextAvailableAt = planStartAt ? planStartAt + REGENERATE_LOCK_MS : null;
  const isRegenerateLocked = Boolean(nextAvailableAt && nextAvailableAt > Date.now());

  const daysUntilUnlock = (() => {
    if (!nextAvailableAt) return 0;
    const msLeft = nextAvailableAt - Date.now();
    return Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
  })();

  useEffect(() => {
    return () => {
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
    };
  }, []);

  // -----------------------------------------------------------------------
  // Load the user's existing saved plan from the DB
  // -----------------------------------------------------------------------
  const loadPlan = async () => {
    if (!user?.id) return;

    setLoadingPlan(true);

    try {
      const data = await fetchPromptPlan();
      setPromptPlan(Array.isArray(data?.items) ? data.items : []);
      setTodayPrompt(data?.today ?? null);
      setPlanStartAt(data?.startDate ? new Date(data.startDate).getTime() : null);
    } catch (err: any) {
      console.error('Could not load prompt plan:', err);
      setPromptMessageColor('danger');
      setPromptMessage(err?.message || err?.error || 'Could not load your saved plan from the server.');
    } finally {
      setLoadingPlan(false);
    }
  };

  useEffect(() => {
    void loadPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleGeneratePromptPlan = async () => {
    if (!user?.id) {
      setPromptMessageColor('danger');
      setPromptMessage('Please log in again.');
      return;
    }

    if (isRegenerateLocked || generatingPlan || loadingPlan) {
      // Safety guard in case a disabled button somehow still fires a click.
      return;
    }

    // Flip to the "Generating…" state immediately, before the request starts.
    setGeneratingPlan(true);
    setPromptMessage('');

    // Belt-and-braces: even if the request layer's own timeout never fires
    // for some reason, this guarantees the button un-sticks itself.
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    watchdogRef.current = setTimeout(() => {
      setGeneratingPlan(false);
      setPromptMessageColor('danger');
      setPromptMessage('This is taking unusually long. Please check your connection and try again.');
    }, GENERATE_WATCHDOG_MS);

    try {
      const res = await generatePromptPlan({
        categoryId: user?.categoryId ?? undefined,
        categoryName: businessCategory || undefined,
        businessName: user?.name || undefined,
      });

      const items: PromptPlanItem[] = Array.isArray(res?.items) ? res.items : [];

      if (items.length === 0) {
        throw new Error('The server returned an empty plan. Please try again.');
      }

      setPromptPlan(items);
      setTodayPrompt(res?.today ?? items[0] ?? null);
      setPlanStartAt(res?.startDate ? new Date(res.startDate).getTime() : Date.now());
      setPromptMessageColor('primary');
      setPromptMessage('Success! Your 30-day prompt plan is ready.');
      setPlanToastOpen(true);

      // bring the freshly generated list into view
      setTimeout(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 200);
    } catch (err: any) {
      setPromptMessageColor('danger');
      setPromptMessage(err?.message || err?.error || 'Could not generate your 30-day plan. Please try again.');
    } finally {
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
      setGeneratingPlan(false);
    }
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
  useIonViewWillEnter(() => {
    void refresh();
    void loadPlan();
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

  const scrollToPlanner = () => {
    document.getElementById('prompt-planner-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Decide what the generate button should say/do right now.
  const renderGenerateButtonLabel = () => {
    if (generatingPlan) {
      return (
        <>
          <IonSpinner name="crescent" slot="start" />
          Generating…
        </>
      );
    }
    if (loadingPlan) {
      return 'Loading your plan…';
    }
    if (isRegenerateLocked) {
      return `Available again in ${daysUntilUnlock} day${daysUntilUnlock === 1 ? '' : 's'}`;
    }
    if (promptPlan.length > 0) {
      return 'Regenerate 30-day prompts';
    }
    return 'Generate 30-day prompts';
  };

  return (
    <IonPage className="home-page" style={themeStyle}>
      {/* Header */}
      <IonHeader className="ion-no-border">
        <IonToolbar className="app-toolbar">
          <div className="app-header-inner">
            <span className="header-logo-badge">
              <img src={logo} alt="Aarna Market OS" className="header-logo" />
            </span>

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
            <p className="greeting-eyebrow">Welcome back,</p>
            <h1>{firstName}</h1>
            <span className="greeting-badge">
              <IonIcon icon={shieldCheckmarkOutline} />
              {badgeText}
            </span>
          </section>

          {/* Quick actions grid */}
          <section className="quick-grid" aria-label="Quick actions">
            <button type="button" className="quick-card" onClick={() => ionRouter.push('/upload', 'forward')}>
              <span className="quick-icon quick-icon-green">
                <IonIcon icon={cloudUploadOutline} />
              </span>
              <h4>Upload Product</h4>
              <p>Turn a photo into ready-made ads</p>
              <span className="quick-arrow quick-arrow-green">
                <IonIcon icon={arrowForwardOutline} />
              </span>
            </button>

            <button type="button" className="quick-card" onClick={() => ionRouter.push('/posters', 'forward')}>
              <span className="quick-icon quick-icon-blue">
                <IonIcon icon={imagesOutline} />
              </span>
              <h4>AI Posters</h4>
              <p>Browse your generated designs</p>
              <span className="quick-arrow quick-arrow-blue">
                <IonIcon icon={arrowForwardOutline} />
              </span>
            </button>

            <button type="button" className="quick-card" onClick={scrollToPlanner}>
              <span className="quick-icon quick-icon-purple">
                <IonIcon icon={timeOutline} />
              </span>
              <h4>30-Day Prompts</h4>
              <p>{promptPlan.length > 0 ? 'View your saved plan' : 'Generate daily content ideas'}</p>
              <span className="quick-arrow quick-arrow-purple">
                <IonIcon icon={arrowForwardOutline} />
              </span>
            </button>

            <button type="button" className="quick-card" onClick={() => ionRouter.push('/social-connections', 'forward')}>
              <span className="quick-icon quick-icon-orange">
                <IonIcon icon={linkOutline} />
              </span>
              <h4>Connections</h4>
              <p>{connectedCount ? `${connectedCount} account${connectedCount === 1 ? '' : 's'} linked` : 'Link Instagram, Facebook & more'}</p>
              <span className="quick-arrow quick-arrow-orange">
                <IonIcon icon={arrowForwardOutline} />
              </span>
            </button>
          </section>

          {/* Secondary links */}
          <section className="quick-links-row">
            <button type="button" className="quick-link-chip" onClick={goToProductDetails}>
              <IonIcon icon={checkmarkCircleOutline} />
              Product details
              <IonIcon icon={chevronForwardOutline} className="row-chevron" />
            </button>
            <button type="button" className="quick-link-chip" onClick={() => ionRouter.push('/analytics', 'forward')}>
              <IonIcon icon={statsChartOutline} />
              Analytics
              <IonIcon icon={chevronForwardOutline} className="row-chevron" />
            </button>
          </section>

          {/* AI Prompt Planner */}
          <div id="prompt-planner-section">
            <IonCard style={{ margin: '0 0 0', borderRadius: 18, boxShadow: '0 8px 24px rgba(15, 27, 45, 0.08)' }}>
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

                <IonButton
                  expand="block"
                  color={generatingPlan ? 'medium' : 'primary'}
                  onClick={handleGeneratePromptPlan}
                  disabled={generatingPlan || loadingPlan || isRegenerateLocked}
                  style={{ marginTop: 16 }}
                >
                  {renderGenerateButtonLabel()}
                </IonButton>

                {generatingPlan && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: 12,
                      borderRadius: 12,
                      background: '#F1F7FF',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <IonSpinner name="dots" style={{ color: '#0F6FEC', flexShrink: 0 }} />
                    <span style={{ color: '#0F1B2D', fontSize: 13, lineHeight: 1.4 }}>
                      Generating your 30 unique prompts. This can take up to a minute…
                    </span>
                  </div>
                )}

                {!generatingPlan && isRegenerateLocked && (
                  <p
                    style={{
                      margin: '12px 0 0',
                      fontSize: 12,
                      color: '#6B7A90',
                    }}
                  >
                    Your current 30-day plan is active. You can generate a new one once it unlocks.
                  </p>
                )}

                {!generatingPlan && promptMessage && (
                  <p
                    style={{
                      margin: '12px 0 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: promptMessageColor === 'danger' ? '#D33' : '#1E9E5A',
                    }}
                  >
                    {promptMessageColor !== 'danger' && <IonIcon icon={checkmarkCircleOutline} />}
                    {promptMessage}
                  </p>
                )}

                {todayPrompt && (
                  <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: '#F8FAFD' }}>
                    <strong style={{ color: '#0F1B2D', fontSize: 13 }}>
                      Today · Day {todayPrompt.day}
                      {todayPrompt.theme ? ` · ${todayPrompt.theme}` : ''}
                    </strong>
                    <p style={{ margin: '6px 0 0', color: '#526176', fontSize: 13, lineHeight: 1.45 }}>{fillPromptTemplate(todayPrompt.prompt, { category: businessCategory })}</p>
                  </div>
                )}

                {promptPlan.length > 0 && (
                  <div ref={listRef} style={{ marginTop: 14, maxHeight: 360, overflowY: 'auto', border: '1px solid #E1E7EF', borderRadius: 12 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ position: 'sticky', top: 0, background: '#F8FAFD', zIndex: 1 }}>
                          <th style={{ padding: '10px 8px', width: 54, textAlign: 'left', color: '#526176' }}>Day</th>
                          <th style={{ padding: '10px 8px', textAlign: 'left', color: '#526176' }}>Saved prompt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {promptPlan.map((item) => (
                          <tr
                            key={item.day}
                            style={{
                              borderTop: '1px solid #E1E7EF',
                              background: item.day === todayPrompt?.day ? '#EAF3FF' : '#FFFFFF',
                            }}
                          >
                            <td style={{ padding: '10px 8px', verticalAlign: 'top', fontWeight: 700, color: '#0F1B2D' }}>{item.day}</td>
                            <td style={{ padding: '10px 8px', lineHeight: 1.45, color: '#526176' }}>
                              {item.theme && (
                                <span style={{ display: 'block', fontWeight: 600, color: '#0F6FEC', fontSize: 11, marginBottom: 2 }}>
                                  {item.theme}
                                </span>
                              )}
                              {fillPromptTemplate(item.prompt, { category: businessCategory })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </IonCardContent>
            </IonCard>
          </div>

          {/* Recent campaigns, styled as a File Overview card */}
          <section className="overview-card">
            <div className="overview-head">
              <h3>
                <IonIcon icon={cloudUploadOutline} />
                Recent Campaigns
              </h3>
              <button type="button" className="overview-link" onClick={() => ionRouter.push('/posters', 'forward')}>
                View All
                <IonIcon icon={chevronForwardOutline} />
              </button>
            </div>

            <button type="button" className="empty-card" onClick={() => ionRouter.push('/upload', 'forward')}>
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

      {/* Bottom tabs */}
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
      <IonToast
        isOpen={planToastOpen}
        message="30-day prompt plan generated successfully"
        duration={3000}
        position="top"
        color="success"
        onDidDismiss={() => setPlanToastOpen(false)}
      />
    </IonPage>
  );
};

export default Home;