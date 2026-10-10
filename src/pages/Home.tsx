import { FormEvent, useEffect, useRef, useState } from 'react';
import { useIonRouter } from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
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
  IonModal,
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
  imageOutline,
  cameraOutline,
  chatbubblesOutline,
  sparklesOutline,
} from 'ionicons/icons';

import { useAuth } from '../context/AuthContext';

import logo from '../assets/aarna-logo.png';
import './Home.css';
import { useSocialConnections } from '../hooks/useSocialConnections';
import { useLogoTheme } from '../hooks/useLogoTheme';
import BottomTabBar from '../components/BottomTabBar';
import { clearBusinessCategory, saveBusinessCategory } from '../utils/businessCategory';
import { apiGet, apiPost } from '../api';

import {
  fetchPromptPlan,
  fillPromptTemplate,
  generatePromptPlan,
  getPromptPlanRegenerationState,
} from '../utils/promptPlan';
type ProductDraft = {
  name: string;
  description: string;
  price: string;
  currency: string;
  image: File | null;
};

type PromptPlanItem = {
  day: number;
  theme?: string | null;
  prompt: string;
};

type SubscriptionReminder = {
  planName: string;
  daysRemaining: number;
  endDate: string;
} | null;

const GENERATE_WATCHDOG_MS = 95_000;

const emptyProduct = (): ProductDraft => ({
  name: '',
  description: '',
  price: '',
  currency: 'INR',
  image: null,
});

const adSlides = [
  {
    type: 'image',
    label: 'IMAGE AD',
    title: 'Make every product stand out',
    description: 'Turn product photos into scroll-stopping ads.',
    media: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=85',
    alt: 'Red sneaker featured in a product advertisement',
  },
  {
    type: 'video',
    label: 'VIDEO AD',
    title: 'Bring your story to life',
    description: 'Create short videos that make people stop and watch.',
    media: 'https://videos.pexels.com/video-files/3195394/3195394-hd_1920_1080_25fps.mp4',
    poster: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=1200&q=85',
  },
  {
    type: 'image',
    label: 'IMAGE AD',
    title: 'Share your next big offer',
    description: 'Design polished campaign creatives in minutes.',
    media: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=1200&q=85',
    alt: 'Shopping bags and products arranged for a retail promotion',
  },
] as const;

const Home: React.FC = () => {
  const ionRouter = useIonRouter();
  const { user, logout } = useAuth() as any;
  const [activeAdSlide, setActiveAdSlide] = useState(0);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productDraft, setProductDraft] = useState<ProductDraft>(emptyProduct);
  const [savingProduct, setSavingProduct] = useState(false);
  const [productFormError, setProductFormError] = useState('');
  const [productToast, setProductToast] = useState('');
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
  const [selectedPromptDay, setSelectedPromptDay] = useState<number | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [promptMessage, setPromptMessage] = useState('');
  const [planToastOpen, setPlanToastOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [promptMessageColor, setPromptMessageColor] = useState<'primary' | 'danger'>('primary');

  const [planStartDate, setPlanStartDate] = useState<string | null>(null);
  const [subscriptionReminder, setSubscriptionReminder] = useState<SubscriptionReminder>(null);
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
  const selectedPrompt = promptPlan.find((item) => item.day === selectedPromptDay)
    ?? todayPrompt
    ?? promptPlan[0]
    ?? null;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveAdSlide((current) => (current + 1) % adSlides.length);
    }, adSlides[activeAdSlide].type === 'video' ? 12000 : 6000);
    return () => window.clearTimeout(timer);
  }, [activeAdSlide]);

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
      const items = Array.isArray(data?.items) ? data.items : [];
      setPromptPlan(items);
      setTodayPrompt(data?.today ?? null);
      setPlanStartDate(data?.startDate ?? null);
      setSelectedPromptDay((currentDay) => {
        const preferredDay = data?.today?.day ?? currentDay;
        return items.some((item) => item.day === preferredDay)
          ? preferredDay
          : items[0]?.day ?? null;
      });
    } catch (err: any) {
      console.error('Could not load prompt plan:', err);
      setPromptMessageColor('danger');
      setPromptMessage(err?.message || err?.error || 'Could not load your saved plan from the server.');
    } finally {
      setLoadingPlan(false);
    }
  };

  const loadSubscriptionReminder = async () => {
    try {
      const response = await apiGet<{ subscription?: SubscriptionReminder }>('/auth/me');
      const subscription = response.subscription;
      setSubscriptionReminder(
        subscription && subscription.daysRemaining <= 7
          ? subscription
          : null
      );
    } catch (error) {
      console.error('Could not load subscription expiry reminder:', error);
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
      setSelectedPromptDay(res?.today?.day ?? items[0]?.day ?? null);
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
    void loadSubscriptionReminder();
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

  const openProductForm = () => {
    setProductDraft(emptyProduct());
    setProductFormError('');
    setProductModalOpen(true);
  };

  const handleProductImage = (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setProductFormError('Choose a JPG, PNG or WEBP image.');
      return;
    }
    setProductDraft((draft) => ({ ...draft, image: file }));
    setProductFormError('');
  };

  const takeProductPhoto = async () => {
    setProductFormError('');
    if (!Capacitor.isNativePlatform()) {
      cameraInputRef.current?.click();
      return;
    }

    try {
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        correctOrientation: true,
      });
      if (!photo.webPath) {
        throw new Error('Could not read the captured photo.');
      }
      const response = await fetch(photo.webPath);
      if (!response.ok) {
        throw new Error('Could not load the captured photo.');
      }
      const blob = await response.blob();
      const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
      handleProductImage(new File([blob], `product-${Date.now()}.${extension}`, {
        type: blob.type || 'image/jpeg',
      }));
    } catch (error) {
      if (error instanceof Error && /cancel/i.test(error.message)) return;
      console.error('PRODUCT IMAGE CAMERA ERROR:', error);
      setProductFormError(error instanceof Error ? error.message : 'Unable to open the camera.');
    }
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!productDraft.name.trim()) {
      setProductFormError('Enter a product or service name.');
      return;
    }
    if (!productDraft.image) {
      setProductFormError('Choose an image for your product or service.');
      return;
    }

    const price = productDraft.price.trim() ? Number(productDraft.price) : null;
    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      setProductFormError('Enter a valid price.');
      return;
    }

    setSavingProduct(true);
    setProductFormError('');
    try {
      const imageForm = new FormData();
      imageForm.set('image', productDraft.image);
      if (user?.id) imageForm.set('userId', String(user.id));

      const uploadResult = await apiPost<{
        success?: boolean;
        message?: string;
        imageUrl?: string;
      }>('/upload', imageForm);
      if (!uploadResult?.success) {
        throw new Error(uploadResult?.message || 'Image upload failed.');
      }
      if (!uploadResult.imageUrl?.trim()) {
        throw new Error('Image upload succeeded but no image URL was returned.');
      }

      const result = await apiPost<{ success?: boolean; message?: string }>('/userproduct', {
        name: productDraft.name.trim(),
        originalImageUrl: uploadResult.imageUrl,
        description: productDraft.description.trim(),
        price: price === null ? null : String(price),
      });
      if (!result?.success) {
        throw new Error(result?.message || 'The product could not be saved.');
      }

      setProductModalOpen(false);
      setProductDraft(emptyProduct());
      setProductToast('Product or service saved successfully.');
    } catch (error) {
      setProductFormError(
        error instanceof Error ? error.message : 'Could not save this product or service. Please try again.'
      );
    } finally {
      setSavingProduct(false);
    }
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
          <div className="ad-news-ticker" aria-label="Latest news">
            <span className="ad-news-label">LATEST</span>
            <div className="ad-news-window">
              <div className="ad-news-track">
                <span>New: create image and video ads for your next campaign</span>
                <span aria-hidden="true">New: create image and video ads for your next campaign</span>
              </div>
            </div>
          </div>
          <section className="ad-carousel" aria-label="Ad examples" aria-roledescription="carousel">
            <div className={`ad-carousel-media${adSlides[activeAdSlide].type === 'video' ? ' ad-carousel-video' : ''}`}>
              {adSlides[activeAdSlide].type === 'video' ? (
                <video
                  key={adSlides[activeAdSlide].media}
                  className="ad-carousel-creative"
                  src={adSlides[activeAdSlide].media}
                  poster={adSlides[activeAdSlide].poster}
                  autoPlay
                  controls
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-label="Example video advertisement"
                />
              ) : (
                <img
                  className="ad-carousel-creative"
                  src={adSlides[activeAdSlide].media}
                  alt={adSlides[activeAdSlide].alt}
                />
              )}
              <span className="ad-carousel-type">{adSlides[activeAdSlide].label}</span>
              <div className="ad-carousel-copy">
                <h2>{adSlides[activeAdSlide].title}</h2>
                <p>{adSlides[activeAdSlide].description}</p>
                <button type="button" onClick={() => ionRouter.push('/uploadnew', 'forward')}>
                  Create an ad <IonIcon icon={arrowForwardOutline} />
                </button>
              </div>
              <button
                type="button"
                className="ad-carousel-arrow ad-carousel-next"
                aria-label="Next ad"
                onClick={() => setActiveAdSlide((current) => (current + 1) % adSlides.length)}
              >
                <IonIcon icon={chevronForwardOutline} />
              </button>
            </div>
            <div className="ad-carousel-footer">
              <span>Creative inspiration</span>
              <div className="ad-carousel-dots" aria-label="Choose an ad">
                {adSlides.map((slide, index) => (
                  <button
                    key={slide.title}
                    type="button"
                    className={index === activeAdSlide ? 'active' : ''}
                    aria-label={`Show ${slide.label.toLowerCase()} ${index + 1} of ${adSlides.length}`}
                    aria-current={index === activeAdSlide ? 'true' : undefined}
                    onClick={() => setActiveAdSlide(index)}
                  />
                ))}
              </div>
              <span>{String(activeAdSlide + 1).padStart(2, '0')} / {String(adSlides.length).padStart(2, '0')}</span>
            </div>
          </section>

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

          {subscriptionReminder && (
            <section className="subscription-expiry-alert" role="status">
              <div>
                <strong>
                  {subscriptionReminder.daysRemaining <= 4
                    ? 'Your plan is about to expire'
                    : 'Your plan expires soon'}
                </strong>
                <p>
                  {subscriptionReminder.planName} expires in {subscriptionReminder.daysRemaining} day
                  {subscriptionReminder.daysRemaining === 1 ? '' : 's'}. Upgrade now to keep generating banners and publishing posts.
                </p>
              </div>
              <IonButton size="small" onClick={() => ionRouter.push('/subscription', 'forward')}>
                Upgrade plan
              </IonButton>
            </section>
          )}

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
              <span className="quick-icon quick-icon-purple">
                <IonIcon icon={sparklesOutline} />
              </span>
              <h4>Guided Upload</h4>
              <p>Create and publish from one flow</p>
              <span className="quick-arrow quick-arrow-purple">
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

            <button type="button" className="quick-card" onClick={openProductForm}>
              <span className="quick-icon quick-icon-green">
                <IonIcon icon={cubeOutline} />
              </span>
              <h4>Add Products &amp; Services</h4>
              <p>Add an item to your business catalog</p>
              <span className="quick-arrow quick-arrow-green">
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

                {promptPlan.length > 0 && (
                  <IonSelect
                    aria-label="Choose a saved daily prompt"
                    interface="alert"
                    placeholder="Select a saved prompt"
                    value={selectedPrompt?.day ?? ''}
                    onIonChange={(event) => setSelectedPromptDay(Number(event.detail.value))}
                    style={{ marginTop: 12 }}
                  >
                    {promptPlan.map((item) => (
                      <IonSelectOption key={item.day} value={item.day}>
                        {`Day ${item.day}${item.theme ? ` · ${item.theme}` : ''}`}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                )}

                {selectedPrompt && (
                  <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: '#F8FAFD' }}>
                    <strong style={{ color: '#0F1B2D', fontSize: 13 }}>
                      {selectedPrompt.day === todayPrompt?.day ? 'Today · ' : ''}
                      Day {selectedPrompt.day}
                      {selectedPrompt.theme ? ` · ${selectedPrompt.theme}` : ''}
                    </strong>
                    <p style={{ margin: '6px 0 0', color: '#526176', fontSize: 13, lineHeight: 1.45 }}>{fillPromptTemplate(selectedPrompt.prompt, { category: businessCategory })}</p>
                  </div>
                )}

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

      <IonModal
        isOpen={productModalOpen}
        onDidDismiss={() => setProductModalOpen(false)}
        className="home-product-modal"
      >
        <div className="home-product-modal-content">
          <header className="home-product-modal-header">
            <div>
              <p className="dashboard-kicker">YOUR CATALOG</p>
              <h2>Add a product or service</h2>
            </div>
            <button
              type="button"
              className="home-product-close"
              onClick={() => setProductModalOpen(false)}
              aria-label="Close form"
            >
              ×
            </button>
          </header>

          <form id="home-product-form" className="home-product-form" onSubmit={(event) => void saveProduct(event)}>
            <div className="home-product-image-section">
              <span className="home-product-image-label">Product or service image</span>
              <div className={`home-product-image-picker${productDraft.image ? ' has-image' : ''}`}>
                <IonIcon icon={productDraft.image ? checkmarkCircleOutline : imageOutline} />
                <span>{productDraft.image?.name ?? 'Choose an image to upload'}</span>
                <small>{productDraft.image ? 'Image ready' : 'JPG, PNG or WEBP'}</small>
              </div>
              <div className="home-product-image-actions">
                <button type="button" onClick={() => galleryInputRef.current?.click()}>
                  <IonIcon icon={imagesOutline} />
                  Choose from gallery
                </button>
                <button type="button" onClick={() => void takeProductPhoto()}>
                  <IonIcon icon={cameraOutline} />
                  Take photo
                </button>
              </div>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  handleProductImage(event.target.files?.[0]);
                  event.currentTarget.value = '';
                }}
                className="home-product-file-input"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                aria-label="Take product or service photo"
                onChange={(event) => {
                  handleProductImage(event.target.files?.[0]);
                  event.currentTarget.value = '';
                }}
                className="home-product-file-input"
              />
            </div>

            <label>
              Product or service name
              <input
                required
                maxLength={150}
                value={productDraft.name}
                onChange={(event) => setProductDraft((draft) => ({ ...draft, name: event.target.value }))}
                placeholder="e.g. Consultation or item name"
              />
            </label>
            <label>
              Description
              <textarea
                rows={3}
                maxLength={1000}
                value={productDraft.description}
                onChange={(event) => setProductDraft((draft) => ({ ...draft, description: event.target.value }))}
                placeholder="Describe what you offer"
              />
            </label>
            <div className="home-product-form-grid">
              <label>
                Price
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={productDraft.price}
                  onChange={(event) => setProductDraft((draft) => ({ ...draft, price: event.target.value }))}
                  placeholder="Optional"
                />
              </label>
              <label>
                Currency
                <select
                  value={productDraft.currency}
                  onChange={(event) => setProductDraft((draft) => ({ ...draft, currency: event.target.value }))}
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                </select>
              </label>
            </div>
            {productFormError && <p className="home-product-form-error" role="alert">{productFormError}</p>}
          </form>
          <footer className="home-product-savebar">
            <button form="home-product-form" type="submit" disabled={savingProduct}>
              {savingProduct ? <IonSpinner name="crescent" /> : null}
              {savingProduct ? 'Saving...' : 'Save product or service'}
            </button>
          </footer>
        </div>
      </IonModal>

      {/* Feedback */}
      <IonToast
        isOpen={Boolean(productToast)}
        message={productToast}
        duration={3000}
        position="top"
        color="success"
        onDidDismiss={() => setProductToast('')}
      />
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