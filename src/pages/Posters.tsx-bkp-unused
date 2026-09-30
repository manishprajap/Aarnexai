import React, { useEffect, useMemo, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonIcon,
  IonSpinner,
  IonToast,
  IonModal,
  IonCheckbox,
  IonButton,
} from '@ionic/react';
import {
  imagesOutline,
  calendarOutline,
  logoFacebook,
  logoInstagram,
  logoWhatsapp,
  logoGoogle,
  logoYoutube,
  logoLinkedin,
  chevronDownOutline,
  chevronUpOutline,
  checkmarkCircle,
  closeOutline,
  lockClosedOutline,
} from 'ionicons/icons';
import { apiGet, apiPost } from '../api';
import { loadFacebookSdk } from '../lib/facebookSdk';

interface BannerItem {
  id: number;
  productId: number;
  productName: string | null;
  productImageUrl: string | null;
  day: number;
  theme: string | null;
  imageUrl: string;
  caption: string | null;
  description?: string | null;
  features?: string | null; // JSON string array
  hashtags?: string | null; // JSON string array
  keywords?: string | null; // JSON string array
  visibleText?: string | null; // JSON string array
  metaDescription?: string | null;
  createdAt: string;
}

const brand = {
  navy: '#0F2A4A',
  blue: '#1E7FE0',
  teal: '#12A19C',
  ink: '#5A6B7B',
  border: '#E1E8EE',
  bg: '#F7FAFC',
  fb: '#1877F2',
  ig1: '#F58529',
  ig2: '#DD2A7B',
  ig3: '#8134AF',
  wa: '#25D366',
  gmb: '#4285F4',
  yt: '#FF0000',
  li: '#0A66C2',
};

const META_APP_ID = import.meta.env.VITE_META_APP_ID as string;
const WHATSAPP_CONFIG_ID = import.meta.env.VITE_META_WHATSAPP_CONFIG_ID as string;

type PlatformKey =
  | 'facebook'
  | 'instagram'
  | 'whatsapp'
  | 'google_business'
  | 'youtube'
  | 'linkedin';

interface PlatformConfig {
  key: PlatformKey;
  label: string;
  icon: string;
  iconColor: string;
  statusEndpoint: string;
  connectEndpoint: string;
}

const PLATFORMS: PlatformConfig[] = [
  {
    key: 'facebook',
    label: 'Facebook',
    icon: logoFacebook,
    iconColor: brand.fb,
    statusEndpoint: '/facebook/status',
    connectEndpoint: '/facebook/connect',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    icon: logoInstagram,
    iconColor: brand.ig2,
    statusEndpoint: '/instagram/status',
    connectEndpoint: '/instagram/connect',
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    icon: logoWhatsapp,
    iconColor: brand.wa,
    statusEndpoint: '/whatsapp/status',
    connectEndpoint: '/whatsapp/connect', // NOT used via startPlatformConnect — see connectWhatsApp* helpers
  },
  {
    key: 'google_business',
    label: 'Google Business',
    icon: logoGoogle,
    iconColor: brand.gmb,
    statusEndpoint: '/google_business/status',
    connectEndpoint: '/google_business/connect',
  },
  {
    key: 'youtube',
    label: 'YouTube',
    icon: logoYoutube,
    iconColor: brand.yt,
    statusEndpoint: '/youtube/status',
    connectEndpoint: '/youtube/connect',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    icon: logoLinkedin,
    iconColor: brand.li,
    statusEndpoint: '/linkedin/status',
    connectEndpoint: '/linkedin/connect',
  },
];

const PLATFORM_BY_KEY: Record<PlatformKey, PlatformConfig> = PLATFORMS.reduce(
  (acc, p) => {
    acc[p.key] = p;
    return acc;
  },
  {} as Record<PlatformKey, PlatformConfig>
);

const buildInitialStatus = (): Record<PlatformKey, boolean> =>
  PLATFORMS.reduce((acc, p) => {
    acc[p.key] = false;
    return acc;
  }, {} as Record<PlatformKey, boolean>);

const buildInitialUsernames = (): Record<PlatformKey, string | null> =>
  PLATFORMS.reduce((acc, p) => {
    acc[p.key] = null;
    return acc;
  }, {} as Record<PlatformKey, string | null>);

// Safely parse a field that may arrive as a JSON-stringified array.
function parseList(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function isConnectedResponse(response: unknown): boolean {
  const root =
    response && typeof response === 'object'
      ? (response as Record<string, unknown>)
      : {};
  const data =
    root.data && typeof root.data === 'object'
      ? (root.data as Record<string, unknown>)
      : {};
  const connection =
    root.connection && typeof root.connection === 'object'
      ? (root.connection as Record<string, unknown>)
      : {};
  const value =
    root.connected ?? data.connected ?? connection.connected ?? connection.status;

  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    value === 'true' ||
    value === 'connected'
  );
}

function getConnectionName(
  response: unknown,
  platform: PlatformKey
): string | null {
  const root =
    response && typeof response === 'object'
      ? (response as Record<string, any>)
      : {};
  const connection =
    root.connection && typeof root.connection === 'object'
      ? root.connection
      : {};
  const platformData =
    root[platform] && typeof root[platform] === 'object'
      ? root[platform]
      : {};
  const data = root.data && typeof root.data === 'object' ? root.data : {};
  const name =
    connection.pageName ??
    connection.username ??
    connection.businessName ??
    connection.phoneNumber ??
    platformData.username ??
    platformData.name ??
    data.username ??
    data.name ??
    root.username ??
    root.name;

  return typeof name === 'string' && name.trim() ? name.trim() : null;
}

async function publishBanner(bannerId: number, platforms: PlatformKey[]) {
  let response: any;

  try {
    response = await apiPost('/banners/publish', { bannerId, platforms });
  } catch (error: any) {
    const results = error?.results;
    const platformDetails = platforms
      .map((platform) => results?.[platform]?.message)
      .filter(Boolean);
    const rawMessage = platformDetails.join('; ') || error?.message || '';
    const message = rawMessage.includes('missing a locationId')
      ? 'Google Business needs to be reconnected. Its business location is missing; reconnect Google Business and try again.'
      : rawMessage;

    throw new Error(
      message || 'Failed to publish banner'
    );
  }

  if (!response?.success) {
    const platformErrors = response?.errors ?? response?.platformErrors;
    const details = Array.isArray(platformErrors)
      ? platformErrors
          .map((item: any) => item?.message || item?.error || String(item))
          .join('; ')
      : typeof platformErrors === 'string'
        ? platformErrors
        : '';

    throw new Error(
      [response?.message || 'No platform was successfully published', details]
        .filter(Boolean)
        .join(': ')
    );
  }

  return response;
}

const Posters: React.FC = () => {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Which day's "details" accordion is open.
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  // Platform-select modal state.
  const [activeBanner, setActiveBanner] = useState<BannerItem | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformKey[]>([]);
  const [posting, setPosting] = useState(false);

  // Connection status + username, keyed by platform. Built dynamically from
  // PLATFORMS so adding/removing a platform never leaves a stale key.
  const [connectionStatus, setConnectionStatus] = useState<
    Record<PlatformKey, boolean>
  >(buildInitialStatus);

  const [connectionUsername, setConnectionUsername] = useState<
    Record<PlatformKey, string | null>
  >(buildInitialUsernames);

  const [checkingConnections, setCheckingConnections] = useState(false);

  // Which platform is currently mid-connect from the standalone
  // "Connected accounts" section (as opposed to the post-a-banner flow).
  const [connectingPlatform, setConnectingPlatform] = useState<PlatformKey | null>(
    null
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const [bannerRes] = await Promise.all([
          apiGet('/banners'),
          checkAllConnections(),
        ]);

        setBanners(bannerRes?.banners ?? []);
      } catch (e: any) {
        setError(e?.message || 'Unable to load posters');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const checkPlatformConnection = async (platform: PlatformKey) => {
    try {
      const res = await apiGet(PLATFORM_BY_KEY[platform].statusEndpoint);

      const connected = isConnectedResponse(res);

      setConnectionStatus((prev) => ({
        ...prev,
        [platform]: connected,
      }));

      setConnectionUsername((prev) => ({
        ...prev,
        [platform]: getConnectionName(res, platform),
      }));

      return connected;
    } catch (error) {
      console.error(`${platform} status error:`, error);

      setConnectionStatus((prev) => ({
        ...prev,
        [platform]: false,
      }));

      return false;
    }
  };

  const checkAllConnections = async () => {
    try {
      setCheckingConnections(true);

      await Promise.all(
        PLATFORMS.map((p) => checkPlatformConnection(p.key))
      );
    } finally {
      setCheckingConnections(false);
    }
  };

  const startPlatformConnect = async (
    platform: PlatformKey,
    bannerId: number | undefined,
    platforms: PlatformKey[]
  ): Promise<string> => {
    const res = await apiPost(PLATFORM_BY_KEY[platform].connectEndpoint, {
      ...(bannerId ? { bannerId } : {}),
      platforms,
    });

    if (res?.success === false) {
      throw new Error(
        res?.message ||
          `Could not start ${PLATFORM_BY_KEY[platform].label} connection.`
      );
    }

    const authUrl: string | undefined =
      res?.redirectUrl ?? res?.authUrl ?? res?.url;

    if (!authUrl) {
      throw new Error(
        `Could not start ${PLATFORM_BY_KEY[platform].label} connection. Please try again.`
      );
    }

    return authUrl;
  };

  // Shared WhatsApp Embedded Signup popup. `onSuccess` decides what happens
  // once the account is linked — publish a banner, or just report connected.
  const runWhatsAppEmbeddedSignup = (
    onSuccess: (code: string, waba: { wabaId: string; phoneNumberId: string }) => Promise<void>
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      loadFacebookSdk(META_APP_ID)
        .then(() => {
          let sessionInfo: { wabaId?: string; phoneNumberId?: string } = {};

          const handleMessage = (event: MessageEvent) => {
            if (
              event.origin !== 'https://www.facebook.com' &&
              event.origin !== 'https://web.facebook.com'
            ) {
              return;
            }

            try {
              const data = JSON.parse(event.data);
              if (
                data.type === 'WA_EMBEDDED_SIGNUP' &&
                data.event === 'FINISH'
              ) {
                sessionInfo = {
                  wabaId: data.data?.waba_id,
                  phoneNumberId: data.data?.phone_number_id,
                };
              }
            } catch {
              // Not a JSON message meant for us — ignore.
            }
          };

          if (!window.FB || typeof window.FB.login !== 'function') {
            reject(new Error('Facebook SDK loaded but FB.login is unavailable'));
            return;
          }

          window.addEventListener('message', handleMessage);

          window.FB.login(
            (response: any) => {
              window.removeEventListener('message', handleMessage);

              console.log('FB.login raw response:', response);

              const code = response?.authResponse?.code;

              if (!code || !sessionInfo.wabaId || !sessionInfo.phoneNumberId) {
                let reason = 'WhatsApp signup was cancelled or incomplete';

                if (response?.status === 'not_authorized') {
                  reason =
                    'App is not authorized for this account — check App Roles / Live mode in the Meta App Dashboard';
                } else if (response?.status === 'unknown' || !response?.status) {
                  reason =
                    'Facebook login was blocked — verify this page is served over HTTPS and the Meta app is active';
                }

                reject(new Error(reason));
                return;
              }

              onSuccess(code, {
                wabaId: sessionInfo.wabaId,
                phoneNumberId: sessionInfo.phoneNumberId,
              })
                .then(resolve)
                .catch(reject);
            },
            {
              config_id: WHATSAPP_CONFIG_ID,
              response_type: 'code',
              override_default_response_type: true,
              extras: {
                feature: 'whatsapp_embedded_signup',
                sessionInfoVersion: '3',
              },
            }
          );
        })
        .catch((err: any) =>
          reject(err instanceof Error ? err : new Error('Failed to load Facebook SDK'))
        );
    });
  };

  // Connect WhatsApp and immediately publish a specific banner to it.
  const connectWhatsAppAndPost = (bannerId: number): Promise<void> =>
    runWhatsAppEmbeddedSignup(async (code, waba) => {
      const connectRes = await apiPost('/whatsapp/connect', {
        code,
        wabaId: waba.wabaId,
        phoneNumberId: waba.phoneNumberId,
      });

      if (!connectRes?.success) {
        throw new Error(connectRes?.message || 'WhatsApp connect failed');
      }

      await publishBanner(bannerId, ['whatsapp']);
    });

  // Connect WhatsApp only — used from the standalone "Connected accounts"
  // section, with no banner to publish.
  const connectWhatsAppOnly = (): Promise<void> =>
    runWhatsAppEmbeddedSignup(async (code, waba) => {
      const connectRes = await apiPost('/whatsapp/connect', {
        code,
        wabaId: waba.wabaId,
        phoneNumberId: waba.phoneNumberId,
      });

      if (!connectRes?.success) {
        throw new Error(connectRes?.message || 'WhatsApp connect failed');
      }
    });

  const groupedByDay = useMemo(() => {
    const map = new Map<number, BannerItem[]>();
    for (const banner of banners) {
      const list = map.get(banner.day) ?? [];
      list.push(banner);
      map.set(banner.day, list);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, items]) => {
        const [highlight, ...rest] = items;
        return { day, highlight, rest };
      });
  }, [banners]);

  const activeDay = groupedByDay[0]?.day ?? null;

  const openPlatformPicker = (banner: BannerItem) => {
    setActiveBanner(banner);
    setSelectedPlatforms([]);
  };

  const togglePlatform = (platform: PlatformKey) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  /* =========================================================
     OAUTH CALLBACK HANDLING
     (Facebook / Instagram / Google Business / YouTube / LinkedIn)

     WhatsApp never redirects the browser, so it never hits
     this handler — its whole flow (popup -> connect -> publish)
     resolves in memory inside connectWhatsApp* above.

     Backend should redirect back with a query param named
     after the platform, e.g.:
       ?instagram=connected
       ?facebook=connected
       ?google_business=connected
       ?youtube=connected
       ?linkedin=connected
     with possible values: connected, cancelled, no_account,
     error, invalid_state, expired.
  ========================================================= */
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);

      let matchedPlatform: PlatformKey | null = null;
      let result: string | null = null;

      for (const platform of PLATFORMS) {
        if (platform.key === 'whatsapp') continue; // never arrives via redirect
        const value = params.get(platform.key);
        if (value) {
          matchedPlatform = platform.key;
          result = value;
          break;
        }
      }

      if (!matchedPlatform || !result) return;

      const platformLabel = PLATFORM_BY_KEY[matchedPlatform].label;

      if (result === 'connected') {
        setSuccessMsg(`${platformLabel} connected successfully`);

        await checkPlatformConnection(matchedPlatform);

        const pending = localStorage.getItem('pending_banner_publish');

        if (pending) {
          try {
            const data = JSON.parse(pending);
            const pendingPlatforms: PlatformKey[] = data.platforms;

            const stillNeeded: PlatformKey[] = [];

            for (const platform of pendingPlatforms) {
              const connected = await checkPlatformConnection(platform);
              if (!connected) stillNeeded.push(platform);
            }

            if (stillNeeded.length > 0) {
              // Continue the connect chain with the next platform.
              // (WhatsApp can't appear here — it's handled separately
              // and never added to a pending redirect chain.)
              localStorage.setItem(
                'pending_banner_publish',
                JSON.stringify({
                  bannerId: data.bannerId,
                  platforms: pendingPlatforms,
                })
              );

              const nextAuthUrl = await startPlatformConnect(
                stillNeeded[0],
                data.bannerId,
                pendingPlatforms
              );
              window.location.href = nextAuthUrl;

              return;
            }

            await publishBanner(data.bannerId, pendingPlatforms);

            localStorage.removeItem('pending_banner_publish');

            setSuccessMsg(
              `${platformLabel} connected and banner posted successfully`
            );

            setBanners((prev) =>
              prev.filter((banner) => banner.id !== data.bannerId)
            );
          } catch (error: any) {
            setError(
              error?.message ||
                `${platformLabel} connected, but posting failed`
            );
          }
        }
      }

      if (result === 'cancelled') {
        setError(`${platformLabel} connection was cancelled`);
      }

      if (result === 'no_account') {
        setError(
          `No ${platformLabel} professional account was found for this account.`
        );
      }

      if (
        result === 'error' ||
        result === 'invalid_state' ||
        result === 'expired'
      ) {
        setError(`${platformLabel} connection failed. Please try again.`);
      }

      // Remove OAuth query parameters.
      window.history.replaceState({}, document.title, window.location.pathname);
    };

    handleOAuthCallback();
  }, []);

  // Standalone connect — triggered from the "Connected accounts" section,
  // not tied to posting any particular banner.
  const handleStandaloneConnect = async (platform: PlatformKey) => {
    if (connectionStatus[platform] || connectingPlatform) return;

    try {
      setConnectingPlatform(platform);

      if (platform === 'whatsapp') {
        await connectWhatsAppOnly();
        await checkPlatformConnection('whatsapp');
        setSuccessMsg('WhatsApp connected successfully');
        return;
      }

      // Clear any stale pending-publish state so the OAuth callback
      // treats this purely as a connect, not a resume-and-post.
      localStorage.removeItem('pending_banner_publish');

      const authUrl = await startPlatformConnect(platform, undefined, [platform]);
      window.location.href = authUrl;
    } catch (err: any) {
      setError(
        err?.message || `Failed to connect ${PLATFORM_BY_KEY[platform].label}`
      );
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleConnectAndPost = async () => {
    if (!activeBanner || selectedPlatforms.length === 0) {
      return;
    }

    try {
      setPosting(true);

      const bannerId = activeBanner.id;

      /*
       * WhatsApp always needs its own Embedded Signup popup —
       * handle it separately, before touching the redirect flow
       * used by every other platform below.
       */
      if (selectedPlatforms.includes('whatsapp')) {
        const alreadyConnected =
          connectionStatus.whatsapp || (await checkPlatformConnection('whatsapp'));

        if (!alreadyConnected) {
          await connectWhatsAppAndPost(bannerId);
        } else {
          await publishBanner(bannerId, ['whatsapp']);
        }

        // Any remaining non-WhatsApp platforms still go through the
        // normal redirect flow.
        const otherPlatforms = selectedPlatforms.filter((p) => p !== 'whatsapp');

        for (const platform of otherPlatforms) {
          let connected = connectionStatus[platform];
          try {
            connected = await checkPlatformConnection(platform);
          } catch {
            connected = false;
          }

          if (!connected) {
            localStorage.setItem(
              'pending_banner_publish',
              JSON.stringify({ bannerId, platforms: otherPlatforms })
            );
            const authUrl = await startPlatformConnect(platform, bannerId, otherPlatforms);
            window.location.href = authUrl;
            return; // browser is navigating away — nothing more to do here
          }
        }

        if (otherPlatforms.length > 0) {
          await publishBanner(bannerId, otherPlatforms);
        }

        const postedDay = activeBanner.day;

        setSuccessMsg(
          `Posted to ${selectedPlatforms
            .map((platform) => PLATFORM_BY_KEY[platform].label)
            .join(' & ')}`
        );

        setActiveBanner(null);
        setSelectedPlatforms([]);
        setBanners((prev) => prev.filter((banner) => banner.day !== postedDay));
        return;
      }

      /*
       * Every other platform — Facebook, Instagram, Google Business,
       * YouTube, LinkedIn — shares the same redirect-based connect flow.
       */
      for (const platform of selectedPlatforms) {
        let connected = connectionStatus[platform];

        try {
          connected = await checkPlatformConnection(platform);
        } catch {
          connected = false;
        }

        if (!connected) {
          localStorage.setItem(
            'pending_banner_publish',
            JSON.stringify({
              bannerId,
              platforms: selectedPlatforms,
            })
          );

          const authUrl = await startPlatformConnect(
            platform,
            bannerId,
            selectedPlatforms
          );
          window.location.href = authUrl;
          return;
        }
      }

      /*
       * Every selected platform is connected — publish directly.
       */
      await publishBanner(bannerId, selectedPlatforms);

      const postedDay = activeBanner.day;

      setSuccessMsg(
        `Posted to ${selectedPlatforms
          .map((platform) => PLATFORM_BY_KEY[platform].label)
          .join(' & ')}`
      );

      setActiveBanner(null);
      setSelectedPlatforms([]);

      /*
       * Remove the posted day from the UI.
       */
      setBanners((prev) => prev.filter((banner) => banner.day !== postedDay));
    } catch (error: any) {
      console.error('Connect & Post error:', error);

      setError(error?.message || 'Failed to connect or publish banner');
    } finally {
      setPosting(false);
    }
  };

  const buttonLabel = () => {
    if (posting || checkingConnections) return null;

    const disconnected = selectedPlatforms.filter(
      (p) => !connectionStatus[p]
    );

    if (disconnected.length > 0) {
      return `Connect ${PLATFORM_BY_KEY[disconnected[0]].label} & Post`;
    }

    return `Post Now${
      selectedPlatforms.length ? ` (${selectedPlatforms.length})` : ''
    }`;
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" text="" />
          </IonButtons>
          <IonTitle>AI posters</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen style={{ '--background': brand.bg } as React.CSSProperties}>
        <div style={{ padding: '16px' }}>
          {loading && (
            <div className="flex flex-col items-center justify-center" style={{ paddingTop: 80 }}>
              <IonSpinner name="crescent" />
              <p style={{ color: brand.ink, fontSize: 13, marginTop: 10 }}>Loading your posters...</p>
            </div>
          )}

          {!loading && !error && groupedByDay.length === 0 && (
            <div
              className="flex flex-col items-center justify-center rounded-2xl"
              style={{ padding: '48px 20px', border: `1px dashed ${brand.border}`, background: '#FFFFFF' }}
            >
              <IonIcon icon={imagesOutline} style={{ fontSize: 32, color: '#A9B6C2' }} />
              <h4 style={{ fontSize: 15, fontWeight: 700, color: brand.navy, margin: '12px 0 4px' }}>
                No posters yet
              </h4>
              <p style={{ fontSize: 13, color: brand.ink, textAlign: 'center', maxWidth: 260 }}>
                Upload a product to generate your first 10-day AI poster campaign.
              </p>
            </div>
          )}

          {!loading &&
            groupedByDay.map(({ day, highlight, rest }) => {
              const features = parseList(highlight.features);
              const hashtags = parseList(highlight.hashtags);
              const keywords = parseList(highlight.keywords);
              const isExpanded = expandedDay === day;
              const isActive = day === activeDay;

              // Every day except the current active one is locked: blurred,
              // not clickable, no details, no variants — just a preview.
              if (!isActive) {
                return (
                  <div key={day} style={{ marginBottom: 20 }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
                      <IonIcon icon={calendarOutline} style={{ fontSize: 16, color: '#A9B6C2' }} />
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#8A97A6', margin: 0 }}>
                        Day {day}
                      </h3>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#8A97A6',
                          background: '#EDF1F5',
                          borderRadius: 999,
                          padding: '2px 8px',
                          marginLeft: 4,
                        }}
                      >
                        UPCOMING
                      </span>
                    </div>
                    <div
                      style={{
                        position: 'relative',
                        borderRadius: 16,
                        overflow: 'hidden',
                        border: `1px solid ${brand.border}`,
                        background: '#FFFFFF',
                        cursor: 'not-allowed',
                      }}
                    >
                      <img
                        src={highlight.imageUrl}
                        alt={highlight.theme || `Day ${day} poster`}
                        style={{
                          width: '100%',
                          aspectRatio: '1 / 1',
                          objectFit: 'cover',
                          display: 'block',
                          filter: 'blur(8px)',
                          transform: 'scale(1.05)',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(15,42,74,0.35)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          padding: 16,
                          textAlign: 'center',
                        }}
                      >
                        <IonIcon icon={lockClosedOutline} style={{ fontSize: 22, color: '#FFFFFF' }} />
                        <p
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#FFFFFF',
                            margin: 0,
                            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                          }}
                        >
                          {highlight.theme || highlight.caption || `Day ${day} poster`}
                        </p>
                        <p style={{ fontSize: 10.5, color: '#E2E8F0', margin: 0 }}>
                          Unlocks after Day {activeDay} is posted
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={day} style={{ marginBottom: 28 }}>
                  {/* Day header */}
                  <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
                    <IonIcon icon={calendarOutline} style={{ fontSize: 16, color: brand.blue }} />
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: brand.navy, margin: 0 }}>
                      Day {day}
                    </h3>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: brand.teal,
                        background: '#E4F7F5',
                        borderRadius: 999,
                        padding: '2px 8px',
                        marginLeft: 4,
                      }}
                    >
                      READY TO POST
                    </span>
                  </div>

                  {/* Highlight card — the one meant to be posted; only this is clickable */}
                  <div
                    onClick={() => openPlatformPicker(highlight)}
                    role="button"
                    style={{
                      borderRadius: 16,
                      overflow: 'hidden',
                      background: '#FFFFFF',
                      border: `1px solid ${brand.border}`,
                      boxShadow: '0 4px 14px rgba(15,42,74,0.08)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ position: 'relative' }}>
                      <img
                        src={highlight.imageUrl}
                        alt={highlight.theme || `Day ${day} poster`}
                        style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          right: 10,
                          bottom: 10,
                          background: 'rgba(15,42,74,0.85)',
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 600,
                          borderRadius: 999,
                          padding: '6px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <IonIcon icon={logoFacebook} style={{ fontSize: 13 }} />
                        <IonIcon icon={logoInstagram} style={{ fontSize: 13 }} />
                        <IonIcon icon={logoWhatsapp} style={{ fontSize: 13 }} />
                        Tap to post
                      </div>
                    </div>

                    <div style={{ padding: '12px 14px' }}>
                      {highlight.theme && (
                        <p style={{ fontSize: 13, fontWeight: 700, color: brand.navy, margin: 0 }}>
                          {highlight.theme}
                        </p>
                      )}
                      {highlight.productName && (
                        <p style={{ fontSize: 12, color: brand.ink, margin: '2px 0 0' }}>
                          {highlight.productName}
                        </p>
                      )}
                      {highlight.description && (
                        <p style={{ fontSize: 12, color: brand.ink, margin: '6px 0 0', lineHeight: 1.4 }}>
                          {highlight.description}
                        </p>
                      )}
                      <p style={{ fontSize: 10, color: '#A9B6C2', margin: '8px 0 0' }}>
                        Created {formatDate(highlight.createdAt)}
                      </p>

                      {/* Full-details toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedDay(isExpanded ? null : day);
                        }}
                        style={{
                          marginTop: 10,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          color: brand.blue,
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                        }}
                      >
                        {isExpanded ? 'Hide details' : 'View all details'}
                        <IonIcon icon={isExpanded ? chevronUpOutline : chevronDownOutline} style={{ fontSize: 14 }} />
                      </button>

                      {isExpanded && (
                        <div
                          style={{
                            marginTop: 10,
                            paddingTop: 10,
                            borderTop: `1px solid ${brand.border}`,
                          }}
                        >
                          {highlight.caption && (
                            <DetailRow label="Caption" value={highlight.caption} />
                          )}
                          {highlight.metaDescription && (
                            <DetailRow label="Meta description" value={highlight.metaDescription} />
                          )}
                          {features.length > 0 && <ChipRow label="Features" items={features} />}
                          {keywords.length > 0 && <ChipRow label="Keywords" items={keywords} />}
                          {hashtags.length > 0 && (
                            <ChipRow label="Hashtags" items={hashtags} chipColor={brand.blue} />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Secondary variants for the day — blurred, short caption only, not clickable */}
                  {rest.length > 0 && (
                    <div className="grid grid-cols-2 gap-3" style={{ marginTop: 10 }}>
                      {rest.map((banner) => (
                        <div
                          key={banner.id}
                          style={{
                            position: 'relative',
                            borderRadius: 12,
                            overflow: 'hidden',
                            border: `1px solid ${brand.border}`,
                            background: '#FFFFFF',
                            cursor: 'default',
                          }}
                        >
                          <img
                            src={banner.imageUrl}
                            alt={banner.theme || `Day ${banner.day} alt poster`}
                            style={{
                              width: '100%',
                              aspectRatio: '1 / 1',
                              objectFit: 'cover',
                              display: 'block',
                              filter: 'blur(6px)',
                              transform: 'scale(1.05)',
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(15,42,74,0.28)',
                              display: 'flex',
                              alignItems: 'flex-end',
                              padding: 8,
                            }}
                          >
                            <p
                              className="truncate"
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#FFFFFF',
                                margin: 0,
                                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                              }}
                            >
                              {banner.theme || banner.caption || 'Alternate variant'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

          {/* Connected accounts — status for every platform, tap an
              unconnected one to connect it standalone (no banner needed). */}
          {!loading && (
            <ConnectedAccountsSection
              platforms={PLATFORMS}
              status={connectionStatus}
              usernames={connectionUsername}
              connectingPlatform={connectingPlatform}
              checking={checkingConnections}
              onConnect={handleStandaloneConnect}
            />
          )}
        </div>

        {/* Platform picker sheet for posting a specific banner.
            FIX: header / list / footer are now separate flex sections
            inside a fixed-height wrapper, with the list as the only
            scrollable area. This guarantees the "Post Now" button in
            the footer is always visible, no matter how many platforms
            are listed or how tall the device viewport is. */}
        <IonModal
          isOpen={!!activeBanner}
          initialBreakpoint={0.75}
          breakpoints={[0, 0.5, 0.75, 0.95]}
          handleBehavior="cycle"
          onDidDismiss={() => setActiveBanner(null)}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '70%',
              maxHeight: '80vh',
            }}
          >
            {/* Header — fixed, never scrolls */}
            <div style={{ padding: '20px 20px 12px', flexShrink: 0 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: brand.navy, margin: 0 }}>
                  Post this banner
                </h3>
                <IonIcon
                  icon={closeOutline}
                  style={{ fontSize: 20, color: brand.ink, cursor: 'pointer' }}
                  onClick={() => setActiveBanner(null)}
                />
              </div>
              <p style={{ fontSize: 12, color: brand.ink, margin: 0 }}>
                Choose one or more platforms to connect and publish.
              </p>
            </div>

            {/* Platform list — the only part that scrolls */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '8px 20px 0',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {PLATFORMS.map((platform) => (
                <PlatformRow
                  key={platform.key}
                  icon={platform.icon}
                  iconColor={platform.iconColor}
                  label={platform.label}
                  disabled={platform.key === 'youtube'}
                  disabledReason={platform.key === 'youtube' ? 'Video required' : undefined}
                  checked={selectedPlatforms.includes(platform.key)}
                  onToggle={() => togglePlatform(platform.key)}
                />
              ))}
            </div>

            {/* Post button — fixed footer, always visible */}
            <div
              style={{
                flexShrink: 0,
                padding: '12px 20px 24px',
                borderTop: `1px solid ${brand.border}`,
                background: '#FFFFFF',
              }}
            >
              <IonButton
                expand="block"
                disabled={
                  selectedPlatforms.length === 0 || posting || checkingConnections
                }
                onClick={handleConnectAndPost}
                style={{
                  '--border-radius': '12px',
                } as React.CSSProperties}
              >
                {posting || checkingConnections ? (
                  <IonSpinner name="dots" />
                ) : (
                  buttonLabel()
                )}
              </IonButton>
            </div>
          </div>
        </IonModal>

        <IonToast
          isOpen={!!error}
          message={error}
          duration={7000}
          color="danger"
          onDidDismiss={() => setError('')}
        />
        <IonToast
          isOpen={!!successMsg}
          message={successMsg}
          duration={2500}
          color="success"
          icon={checkmarkCircle}
          onDidDismiss={() => setSuccessMsg('')}
        />
      </IonContent>
    </IonPage>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ marginBottom: 8 }}>
    <p style={{ fontSize: 10, fontWeight: 700, color: '#A9B6C2', margin: 0, textTransform: 'uppercase', letterSpacing: 0.3 }}>
      {label}
    </p>
    <p style={{ fontSize: 12, color: brand.navy, margin: '2px 0 0', lineHeight: 1.4 }}>{value}</p>
  </div>
);

const ChipRow: React.FC<{ label: string; items: string[]; chipColor?: string }> = ({
  label,
  items,
  chipColor = brand.ink,
}) => (
  <div style={{ marginBottom: 8 }}>
    <p style={{ fontSize: 10, fontWeight: 700, color: '#A9B6C2', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.3 }}>
      {label}
    </p>
    <div className="flex flex-wrap gap-1">
      {items.map((item, i) => (
        <span
          key={i}
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            color: chipColor,
            background: '#F1F5F9',
            borderRadius: 999,
            padding: '3px 9px',
          }}
        >
          {item}
        </span>
      ))}
    </div>
  </div>
);

// FIX: the IonCheckbox is now purely decorative (pointerEvents: 'none').
// Previously it had its own onIonChange AND sat inside a div with
// onClick — a tap on the checkbox fired both handlers, toggling the
// selection twice (on, then instantly back off), so it looked like
// clicking never checked it. Now the row's onClick is the single
// source of truth for toggling, and the checkbox just reflects state.
const PlatformRow: React.FC<{
  icon: string;
  iconColor: string;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
  checked: boolean;
  onToggle: () => void;
}> = ({ icon, iconColor, label, disabled = false, disabledReason, checked, onToggle }) => (
  <div
    onClick={disabled ? undefined : onToggle}
    className="flex items-center justify-between"
    style={{
      padding: '12px 14px',
      borderRadius: 12,
      border: `1px solid ${checked ? brand.blue : brand.border}`,
      background: disabled ? '#F8FAFC' : checked ? '#EFF6FF' : '#FFFFFF',
      marginBottom: 10,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.62 : 1,
    }}
  >
    <div className="flex items-center gap-3">
      <IonIcon icon={icon} style={{ fontSize: 22, color: iconColor }} />
      <div>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: brand.navy }}>{label}</span>
        {disabledReason && (
          <span style={{ display: 'block', marginTop: 2, fontSize: 10.5, color: brand.ink }}>
            {disabledReason}
          </span>
        )}
      </div>
    </div>
    <IonCheckbox checked={checked} disabled={disabled} style={{ pointerEvents: 'none' }} />
  </div>
);

// Status list shown below the poster feed: every supported platform, whether
// it's connected (with username if known), and a tap-to-connect affordance
// for anything not yet linked. This is independent of posting a banner.
const ConnectedAccountsSection: React.FC<{
  platforms: PlatformConfig[];
  status: Record<PlatformKey, boolean>;
  usernames: Record<PlatformKey, string | null>;
  connectingPlatform: PlatformKey | null;
  checking: boolean;
  onConnect: (platform: PlatformKey) => void;
}> = ({ platforms, status, usernames, connectingPlatform, checking, onConnect }) => (
  <div
    style={{
      marginTop: 8,
      marginBottom: 24,
      background: '#FFFFFF',
      borderRadius: 16,
      border: `1px solid ${brand.border}`,
      padding: '14px 16px 4px',
    }}
  >
    <h4 style={{ fontSize: 13, fontWeight: 700, color: brand.navy, margin: '0 0 6px' }}>
      Connected accounts
    </h4>
    <p style={{ fontSize: 11, color: brand.ink, margin: '0 0 10px' }}>
      Tap a platform to connect it. Connected platforms show up here and in the post sheet.
    </p>

    {platforms.map((platform, i) => {
      const isConnected = status[platform.key];
      const isConnecting = connectingPlatform === platform.key;
      const isLast = i === platforms.length - 1;

      return (
        <div
          key={platform.key}
          onClick={() => onConnect(platform.key)}
          className="flex items-center justify-between"
          style={{
            padding: '10px 2px',
            borderBottom: isLast ? 'none' : `1px solid ${brand.border}`,
            cursor: isConnected ? 'default' : 'pointer',
          }}
        >
          <div className="flex items-center gap-3">
            <IonIcon icon={platform.icon} style={{ fontSize: 20, color: platform.iconColor }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: brand.navy, margin: 0 }}>
                {platform.label}
              </p>
              {isConnected && usernames[platform.key] && (
                <p style={{ fontSize: 11, color: brand.ink, margin: 0 }}>
                  {usernames[platform.key]}
                </p>
              )}
            </div>
          </div>

          {isConnecting ? (
            <IonSpinner name="dots" style={{ width: 18, height: 18 }} />
          ) : isConnected ? (
            <span
              className="flex items-center gap-1"
              style={{ fontSize: 11, fontWeight: 700, color: brand.teal }}
            >
              <IonIcon icon={checkmarkCircle} style={{ fontSize: 15 }} />
              Connected
            </span>
          ) : (
            <span style={{ fontSize: 11, fontWeight: 700, color: brand.blue }}>
              {checking ? '...' : 'Connect'}
            </span>
          )}
        </div>
      );
    })}
  </div>
);

export default Posters;