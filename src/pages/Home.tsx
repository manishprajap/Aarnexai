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
  IonSelect,
  IonSelectOption,
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

import { apiGet } from '../api';
import { generatePromptPlan } from '../utils/promptPlan';

type CustomerMarketingPlan = {
  id: number | string;
  marketingPlanId: number | string | null;
  dayNumber: number | null;
  monthNumber: number | null;
  planName: string | null;
  customPrompt: string | null;
  scheduledDate: string | null;
  contentType: string | null;
  platform: string | null;
};

const GENERATE_WATCHDOG_MS = 95_000;

const isScheduleExpired = (scheduledDate: string | null): boolean => {
  if (!scheduledDate) {
    return false;
  }

  const scheduleDate = scheduledDate.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  const parsedScheduleDate = scheduleDate ?? (
    Number.isNaN(Date.parse(scheduledDate))
      ? null
      : new Date(scheduledDate).toISOString().slice(0, 10)
  );

  if (!parsedScheduleDate) {
    return false;
  }

  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');

  return parsedScheduleDate < today;
};

const getMarketingPlans = (response: unknown): CustomerMarketingPlan[] => {
  if (
    response &&
    typeof response === 'object' &&
    'success' in response &&
    (response as { success?: boolean }).success === false
  ) {
    const message = (response as { message?: unknown }).message;
    throw new Error(typeof message === 'string' ? message : 'Could not load saved marketing plans.');
  }

  if (Array.isArray(response)) {
    return normalizeMarketingPlanRows(response);
  }

  const findRows = (
    value: unknown,
    keys: string[],
    includeEmpty = false,
    depth = 0,
  ): unknown[] | null => {
    if (!value || typeof value !== 'object' || depth > 8) {
      return null;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const nestedRows = findRows(item, keys, includeEmpty, depth + 1);
        if (nestedRows) {
          return nestedRows;
        }
      }
      return null;
    }

    const record = value as Record<string, unknown>;
    for (const key of keys) {
      if (Array.isArray(record[key]) && (includeEmpty || record[key].length > 0)) {
        return record[key] as unknown[];
      }
    }

    for (const nestedValue of Object.values(record)) {
      const nestedRows = findRows(nestedValue, keys, includeEmpty, depth + 1);
      if (nestedRows) {
        return nestedRows;
      }
    }

    return null;
  };

  const scheduleRows = findRows(response, [
    'customerMarketingDays',
    'customer_marketing_days',
    'days',
    'schedule',
  ]);
  const planKeys = [
    'customerMarketingPlans',
    'customer_marketing_plans',
    'marketingPlans',
    'marketing_plans',
    'plans',
    'items',
    'data',
  ];
  const planRows = findRows(response, planKeys) ?? findRows(response, planKeys, true);
  const rows = scheduleRows ?? planRows;

  if (!Array.isArray(rows)) {
    throw new Error('The marketing plan endpoint returned an unexpected response.');
  }

  return normalizeMarketingPlanRows(rows);
};

const normalizeMarketingPlanRows = (rows: unknown[]): CustomerMarketingPlan[] =>
  rows.flatMap((value) => {
    if (!value || typeof value !== 'object') {
      return [];
    }

    const row = value as Record<string, unknown>;
    const nestedDays = [
      row.customerMarketingDays,
      row.customer_marketing_days,
      row.days,
      row.schedule,
    ].find(Array.isArray);
    const parentPrompt = row.customPrompt ?? row.custom_prompt;
    const parentName = row.planName ?? row.plan_name;
    const parentEndDate = row.endDate ?? row.end_date;

    const records: Record<string, unknown>[] = Array.isArray(nestedDays)
      ? nestedDays
          .filter((day): day is Record<string, unknown> => Boolean(day) && typeof day === 'object')
          .map((day) => ({
            ...day,
            marketingPlanId: day.marketingPlanId ?? day.marketing_plan_id ?? row.id,
            customPrompt: day.customPrompt ?? day.custom_prompt ?? day.prompt ?? parentPrompt,
            planName: day.planName ?? day.plan_name ?? day.theme ?? parentName,
            endDate:
              day.scheduledDate ??
              day.scheduled_date ??
              day.endDate ??
              day.end_date ??
              parentEndDate,
          }))
      : [row];

    return records.map((record, index) => {
      const marketingPlanId =
        record.marketingPlanId ?? record.marketing_plan_id ?? record.planId ?? record.plan_id;
      const dayNumber = Number(record.dayNumber ?? record.day_number ?? record.day);
      const rawId = record.id ?? record.dayId ?? record.day_id;
      const id = rawId ?? (
        marketingPlanId !== undefined && Number.isFinite(dayNumber)
          ? `${marketingPlanId}-${dayNumber}`
          : `${marketingPlanId ?? 'plan'}-${index}`
      );
      const promptValue =
        record.customPrompt ??
        record.custom_prompt ??
        record.prompt ??
        record.promptText ??
        record.prompt_text ??
        record.content ??
        record.contentText ??
        record.content_text ??
        record.description ??
        record.caption;
      const nameValue =
        record.planName ??
        record.plan_name ??
        record.theme ??
        record.title ??
        record.topicName ??
        record.topic_name;
      const dateValue =
        record.scheduledDate ??
        record.scheduled_date ??
        record.scheduleDate ??
        record.schedule_date ??
        record.endDate ??
        record.end_date;
      const contentTypeValue = record.contentType ?? record.content_type;
      const platformValue = record.platform;

      return {
        id: String(id),
        marketingPlanId:
          marketingPlanId === undefined || marketingPlanId === null
            ? null
            : String(marketingPlanId),
        dayNumber: Number.isFinite(dayNumber) ? dayNumber : null,
        monthNumber: Number.isFinite(Number(record.monthNumber ?? record.month_number))
          ? Number(record.monthNumber ?? record.month_number)
          : null,
        planName: typeof nameValue === 'string' ? nameValue : null,
        customPrompt: typeof promptValue === 'string' ? promptValue : null,
        scheduledDate: typeof dateValue === 'string' ? dateValue : null,
        contentType: typeof contentTypeValue === 'string' ? contentTypeValue : null,
        platform: typeof platformValue === 'string' ? platformValue : null,
      };
    });
  });

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

  const [marketingPlans, setMarketingPlans] = useState<CustomerMarketingPlan[]>([]);
  const [selectedMarketingPlanId, setSelectedMarketingPlanId] = useState('');
  const [marketingPlansError, setMarketingPlansError] = useState('');
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [promptMessage, setPromptMessage] = useState('');
  const [planToastOpen, setPlanToastOpen] = useState(false);
  const [promptMessageColor, setPromptMessageColor] = useState<'primary' | 'danger'>('primary');

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
  const hasActiveMarketingSchedule = marketingPlans.some(
    (plan) => !isScheduleExpired(plan.scheduledDate),
  );

  useEffect(() => {
    return () => {
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
    };
  }, []);

  // -----------------------------------------------------------------------
  // Load the user's existing saved plan from the DB
  // -----------------------------------------------------------------------
  const loadMarketingPlans = async () => {
    if (!user?.id) return;

    setLoadingPlan(true);
    setMarketingPlansError('');

    try {
      const response = await apiGet('/prompt-plan/generate');
      const plans = getMarketingPlans(response);
      setMarketingPlans(plans);
      setSelectedMarketingPlanId((selectedId) =>
        plans.some((plan) => String(plan.id) === selectedId)
          ? selectedId
          : String(plans[0]?.id ?? ''),
      );
    } catch (err: any) {
      console.error('Could not load customer marketing plans:', err);
      setMarketingPlansError(
        err?.message || err?.error || 'Could not load your saved marketing plans.',
      );
    } finally {
      setLoadingPlan(false);
    }
  };

  useEffect(() => {
    void loadMarketingPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleGeneratePromptPlan = async () => {
    if (!user?.id) {
      setPromptMessageColor('danger');
      setPromptMessage('Please log in again.');
      return;
    }

    if (hasActiveMarketingSchedule || generatingPlan || loadingPlan) {
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

      const items = Array.isArray(res?.items) ? res.items : [];

      if (items.length === 0) {
        throw new Error('The server returned an empty plan. Please try again.');
      }

      setPromptMessageColor('primary');
      setPromptMessage('Success! Your 30-day prompt plan is ready.');
      setPlanToastOpen(true);

      await loadMarketingPlans();
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
    void loadMarketingPlans();
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
    if (hasActiveMarketingSchedule) {
      return 'Schedule active';
    }
    return 'Generate 30-day prompts';
  };

  const selectedMarketingPlan = marketingPlans.find(
    (plan) => String(plan.id) === selectedMarketingPlanId,
  );

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
              <div><strong>{marketingPlans.length || '—'}</strong><span>Marketing plans</span></div>
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
              <p>{marketingPlans.length > 0 ? 'View your saved plan' : 'Generate daily content ideas'}</p>
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
                    generatingPlan ||
                    loadingPlan ||
                    hasActiveMarketingSchedule
                  }
                  style={{ marginTop: 16 }}
                >
                  {renderGenerateButtonLabel()}
                </IonButton>

                {marketingPlansError && (
                  <p role="alert" style={{ margin: '12px 0 0', color: '#D33', fontSize: 13 }}>
                    {marketingPlansError}
                  </p>
                )}

                {marketingPlans.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <IonSelect
                      aria-label="Saved marketing prompts"
                      interface="alert"
                      placeholder="Select a saved prompt"
                      value={selectedMarketingPlanId}
                      onIonChange={(event) => setSelectedMarketingPlanId(String(event.detail.value))}
                    >
                      {marketingPlans.map((plan) => (
                        <IonSelectOption key={plan.id} value={String(plan.id)}>
                          {plan.customPrompt ||
                            [
                              plan.dayNumber !== null ? `Day ${plan.dayNumber}` : null,
                              plan.scheduledDate,
                              plan.contentType,
                              plan.platform,
                            ].filter(Boolean).join(' · ') ||
                            plan.planName ||
                            `Month ${plan.monthNumber ?? ''}`}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                    {selectedMarketingPlan && (
                      <p style={{ margin: '8px 0 0', color: '#526176', fontSize: 13, lineHeight: 1.45 }}>
                        {selectedMarketingPlan.customPrompt ||
                          [
                            selectedMarketingPlan.dayNumber !== null
                              ? `Day ${selectedMarketingPlan.dayNumber}`
                              : null,
                            selectedMarketingPlan.scheduledDate
                              ? `Scheduled ${selectedMarketingPlan.scheduledDate}`
                              : null,
                            selectedMarketingPlan.contentType,
                            selectedMarketingPlan.platform,
                          ].filter(Boolean).join(' · ') ||
                          selectedMarketingPlan.planName}
                      </p>
                    )}
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