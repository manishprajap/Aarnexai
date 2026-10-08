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
  cubeOutline,
  chatbubblesOutline,
} from 'ionicons/icons';

import { useAuth } from '../context/AuthContext';

import logo from '../assets/aarna-logo.png';
import './Home.css';
import { useSocialConnections } from '../hooks/useSocialConnections';
import { useLogoTheme } from '../hooks/useLogoTheme';
import BottomTabBar from '../components/BottomTabBar';
import { clearBusinessCategory, saveBusinessCategory } from '../utils/businessCategory';

import {
  fetchPromptPlan,
  fillPromptTemplate,
  generatePromptPlan,
  getPromptPlanRegenerationState,
} from '../utils/promptPlan';

type PromptPlanItem = {
  day: number;
  theme?: string | null;
  prompt: string;
};

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
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [promptMessage, setPromptMessage] = useState('');
  const [planToastOpen, setPlanToastOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [promptMessageColor, setPromptMessageColor] = useState<'primary' | 'danger'>('primary');

  const [planStartDate, setPlanStartDate] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const initial = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  // Business category and industry come from /api/auth/me (mapped from the catalog tables).
  // Fallbacks keep older cached user objects working.
  const businessCategory = String(
    user?.businessCategory ?? user?.category ?? user?.business_category ?? ''
  ).trim();
  const businessCategoryId: number | null = user?.businessCategoryId ?? user?.categoryId ?? null;
  const industryName = String(user?.industry ?? '').trim();
  const businessCity = String(user?.city ?? '').trim();

  const badgeText = businessCategory && businessCity
    ? `${businessCategory} · ${businessCity}`
    : businessCategory || businessCity || 'Your workspace is ready';

  const regenerationState = getPromptPlanRegenerationState(
    planStartDate,
    promptPlan.length,
    currentTime,
  );
  const isRegenerateLocked = regenerationState.locked;
  const daysUntilUnlock = regenerationState.daysUntilUnlock;

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => {
      window.clearInterval(timer);
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
    };
  }, []);

  // -----------------------------------------------------------------------
  // Load the user's existing saved plan from the DB
  // -----------------------------------------------------------------------
  const loadPlan = async () => {
    if (!user?.id) {
      setLoadingPlan(false);
      return;
    }

    setLoadingPlan(true);

    try {
      const data = await fetchPromptPlan();
      setPromptPlan(Array.isArray(data?.items) ? data.items : []);
      setTodayPrompt(data?.today ?? null);
      setPlanStartDate(data?.startDate ?? null);
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

    if (isRegenerateLocked || hasPlanWithoutStartDate || generatingPlan || loadingPlan) {
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
        categoryId: businessCategoryId ?? undefined,
        categoryName: businessCategory || undefined,
        businessName: user?.name || undefined,
      });

      const items: PromptPlanItem[] = Array.isArray(res?.items) ? res.items : [];

      if (items.length !== 30) {
        throw new Error('The server did not return all 30 daily prompts. Please try again.');
      }

      setPromptPlan(items);
      setTodayPrompt(res?.today ?? items[0] ?? null);
      setPlanStartDate(res?.startDate ?? new Date().toISOString().slice(0, 10));
      setCurrentTime(Date.now());
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
    if (user?.id && businessCategoryId) {
      saveBusinessCategory(user.id, {
        categoryId: businessCategoryId,
        categoryName: businessCategory || null,
      });
    }
  }, [user?.id, businessCategoryId, businessCategory]);

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
      return daysUntilUnlock > 0
        ? `Plan active · ${daysUntilUnlock} day${daysUntilUnlock === 1 ? '' : 's'} left`
        : 'Current plan active';
    }
    if (hasPlanWithoutStartDate) {
      return '30-day prompts generated';
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

          <section className="dashboard-overview" aria-label="Workspace overview">
            <div className="dashboard-overview-heading">
              <div>
                <p className="dashboard-kicker">WORKSPACE</p>
                <h2>Your business at a glance</h2>
              </div>
              <span className="workspace-status"><span /> Active</span>
            </div>
            <div className="dashboard-metrics">
              <div><strong>{connectedCount}</strong><span>Connected channels</span></div>
              <div><strong>{promptPlan.length || '—'}</strong><span>Daily AI prompts</span></div>
              <div>
                <strong>{businessCategory || 'Set up'}</strong>
                <span>{industryName || 'Business category'}</span>
              </div>
            </div>
          </section>

          {/* Quick actions grid */}
          <div className="dashboard-section-heading">
            <div><p className="dashboard-kicker">TOOLS</p><h2>Quick actions</h2></div>
          </div>
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

                <button type="button" className="quick-card" onClick={() => ionRouter.push('/uploadnew', 'forward')}>
              <span className="quick-icon quick-icon-green">
                <IonIcon icon={cloudUploadOutline} />
              </span>
              <h4>Upload ProductNew</h4>
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

          <section className="whatsapp-shortcuts" aria-label="WhatsApp tools">
            <button type="button" onClick={() => ionRouter.push('/whatsapp', 'forward')}>
              <span><IonIcon icon={cubeOutline} /></span>
              <span><strong>WhatsApp Catalog</strong><small>Products, categories and Meta sync</small></span>
              <IonIcon className="whatsapp-shortcut-arrow" icon={chevronForwardOutline} />
            </button>
            <button type="button" onClick={() => ionRouter.push('/whatsapp?view=inbox', 'forward')}>
              <span><IonIcon icon={chatbubblesOutline} /></span>
              <span><strong>WhatsApp Inbox</strong><small>Customer conversations and replies</small></span>
              <IonIcon className="whatsapp-shortcut-arrow" icon={chevronForwardOutline} />
            </button>
          </section>

          {/* AI Prompt Planner */}
          <div id="prompt-planner-section">
            <IonCard style={{ margin: '0 0 0', borderRadius: 12, boxShadow: '0 2px 12px rgba(15, 27, 45, 0.06)' }}>
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
                  disabled={
                    generatingPlan || loadingPlan || isRegenerateLocked || hasPlanWithoutStartDate
                  }
                  style={{ marginTop: 16 }}
                >
                  {renderGenerateButtonLabel()}
                </IonButton>

                {promptPlan.length > 0 && (
                  <div ref={listRef} className="prompt-day-list" aria-label="Saved prompts by day">
                    {promptPlan.map((item) => {
                      const isToday = item.day === todayPrompt?.day;

                      return (
                        <article key={item.day} className={`prompt-day-item${isToday ? ' is-today' : ''}`}>
                          <div className="prompt-day-heading">
                            <strong>Day {item.day}</strong>
                            {isToday && <span>Today</span>}
                          </div>
                          {item.theme && <h4>{item.theme}</h4>}
                          <p>{fillPromptTemplate(item.prompt, { category: businessCategory })}</p>
                        </article>
                      );
                    })}
                  </div>
                )}

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

                {!generatingPlan && isRegenerateLocked && promptPlan.length > 0 && (
                  <p
                    style={{
                      margin: '12px 0 0',
                      fontSize: 12,
                      color: '#6B7A90',
                    }}
                  >
                    Your 30 daily prompts are saved below. A new plan becomes available after the 30-day plan period ends.
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