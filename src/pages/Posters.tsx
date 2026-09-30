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
  logoLinkedin,
  chevronDownOutline,
  chevronUpOutline,
  checkmarkCircle,
  closeOutline,
  lockClosedOutline,
  businessOutline,
  personOutline,
  shareSocialOutline,
} from 'ionicons/icons';
import { apiGet, apiPost } from '../api';
<<<<<<< HEAD
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
=======
import { loadFacebookSdk } from '../lib/facebookSdk';
import BottomTabBar from '../components/BottomTabBar';
>>>>>>> 3a2ff898c62aaf09d7ddbe58c16c695fa7b8c867

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
  linkedin: '#0A66C2',
};

const META_APP_ID = import.meta.env.VITE_META_APP_ID as string;
const WHATSAPP_CONFIG_ID = import.meta.env.VITE_META_WHATSAPP_CONFIG_ID as string;
const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
const WHATSAPP_CONNECT_WEB_URL =
  (import.meta.env.VITE_WHATSAPP_CONNECT_WEB_URL as string | undefined)?.trim() ||
  `${window.location.origin}/whatsapp-connect.html`;
const WHATSAPP_APP_CALLBACK_SCHEME =
  (import.meta.env.VITE_WHATSAPP_APP_CALLBACK_SCHEME as string | undefined)?.trim() ||
  'aarnamarket://whatsapp-callback';


type PlatformKey = 'facebook' | 'instagram' | 'whatsapp' | 'linkedin';

// Generic multi-target shape, shared by LinkedIn (personal profile /
// company page), Facebook (Page) and Instagram (business account).
// `type` just decides which icon/label to show — the urn/name fields
// are what actually get sent to the backend.
interface LinkedInTarget {
  type: 'personal' | 'organization' | 'page' | 'account';
  urn: string; // e.g. 'personal', an org urn, a Facebook pageId, or an IG userId
  name: string;
}

interface PlatformConfig {
  key: PlatformKey;
  label: string;
  icon: string;
  iconColor: string;
  statusEndpoint: string;
  connectEndpoint: string;
}

interface LinkedInTarget {
  type: 'personal' | 'organization';
  urn: string;
  name: string;
  id?: string;
  vanityName?: string | null;
  role?: string | null;
  connected?: boolean;
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
    connectEndpoint: '/whatsapp/connect', // NOT used via startPlatformConnect — see connectWhatsAppAndPost
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    icon: logoLinkedin,
    iconColor: brand.linkedin,
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

<<<<<<< HEAD
=======
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

// Generic parser for the `targets` / `selectedTargets` shape that
// /linkedin/status, /facebook/status and /instagram/status all return.
// (`targets`: every postable target for that platform, `selectedTargets`:
// what's currently chosen — see the status routes / useSocialConnections.ts).
function getConnectionTargets(response: unknown): {
  targets: LinkedInTarget[];
  selected: string[];
} {
  const root =
    response && typeof response === 'object'
      ? (response as Record<string, any>)
      : {};

  const targets: LinkedInTarget[] = Array.isArray(root.targets)
    ? root.targets
        .map((t: any): LinkedInTarget => ({
          type:
            t?.type === 'organization'
              ? 'organization'
              : t?.type === 'page'
              ? 'page'
              : t?.type === 'account'
              ? 'account'
              : 'personal',
          urn: String(t?.urn || '').trim(),
          name: String(
            t?.name || (t?.type === 'organization' ? 'Company page' : 'Personal profile')
          ),
        }))
        .filter((t) => t.urn.length > 0)
    : [];

  const personalTarget = targets.find((t) => t.type === 'personal');

  const rawSelected: string[] = Array.isArray(root.selectedTargets)
    ? root.selectedTargets.filter((t: unknown) => typeof t === 'string')
    : [];

  const selected: string[] =
    rawSelected.length > 0
      ? rawSelected.map((t) => (t === 'personal' ? personalTarget?.urn || t : t))
      : targets.map((t) => t.urn); // default: everything returned is selected

  return { targets, selected };
}

// Backward-compat alias — same function, old name kept in case anything
// else in the codebase still imports/refers to getLinkedInTargets.
const getLinkedInTargets = getConnectionTargets;

// Pull a public Facebook Page post URL out of the /banners/publish
// response, whatever shape the backend happened to return it in. Tries a
// few plausible locations before falling back to building the URL from a
// pageId + postId pair (Graph API's post id comes back as "{pageId}_{postId}").
function extractFacebookPostUrl(response: unknown): string | null {
  const root =
    response && typeof response === 'object'
      ? (response as Record<string, any>)
      : {};

  const results = root.results && typeof root.results === 'object' ? root.results : {};
  const fbResult =
    (results.facebook && typeof results.facebook === 'object' && results.facebook) ||
    (root.facebook && typeof root.facebook === 'object' && root.facebook) ||
    {};

  const directUrl = fbResult.postUrl ?? fbResult.url ?? fbResult.permalink;
  if (typeof directUrl === 'string' && directUrl.trim()) {
    return directUrl.trim();
  }

  const postId = fbResult.postId ?? fbResult.id;
  if (typeof postId === 'string' && postId.includes('_')) {
    const [pageId, id] = postId.split('_');
    if (pageId && id) {
      return `https://www.facebook.com/${pageId}/posts/${id}`;
    }
  }

  return null;
}

// Opens Facebook's native share dialog for a Page post, letting the user
// manually share that post to their own personal profile. This never
// auto-posts anything — it just opens the popup; the user still has to
// click "Share to Profile" themselves inside it.
function shareFacebookPagePost(postUrl: string) {
  const shareUrl =
    `https://www.facebook.com/dialog/share?` +
    `app_id=${META_APP_ID}` +
    `&display=popup` +
    `&href=${encodeURIComponent(postUrl)}`;

  window.open(shareUrl, 'facebook-share', 'width=600,height=700');
}

async function publishBanner(
  bannerId: number,
  platforms: PlatformKey[],
  linkedinOwnerUrns?: string[],
  facebookPageIds?: string[],
  instagramAccountIds?: string[]
) {
  let response: any;

  try {
    response = await apiPost('/banners/publish', {
      bannerId,
      platforms,
      // Matches PublishBody.linkedinOwnerUrns in
      // src/app/api/banners/publish/route.ts — must be real
      // urn:li:person:*/urn:li:organization:* strings, not the literal
      // 'personal'. Only relevant when 'linkedin' is selected; if omitted,
      // the backend falls back to the connected member's personal profile.
      ...(platforms.includes('linkedin') && linkedinOwnerUrns?.length
        ? { linkedinOwnerUrns }
        : {}),
      // Real Facebook Page IDs. Only relevant when 'facebook' is selected;
      // if omitted, backend should fall back to every active connected Page.
      ...(platforms.includes('facebook') && facebookPageIds?.length
        ? { facebookPageIds }
        : {}),
      // Real Instagram business-account IDs (instagramUserId). Only
      // relevant when 'instagram' is selected; if omitted, backend should
      // fall back to every active connected IG account.
      ...(platforms.includes('instagram') && instagramAccountIds?.length
        ? { instagramAccountIds }
        : {}),
    });
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

>>>>>>> 3a2ff898c62aaf09d7ddbe58c16c695fa7b8c867
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
  const [selectedLinkedInOwnerUrns, setSelectedLinkedInOwnerUrns] = useState<string[]>([]);
  const [linkedinTargets, setLinkedInTargets] = useState<LinkedInTarget[]>([]);
  const [posting, setPosting] = useState(false);

<<<<<<< HEAD
  // Connection status + username, keyed by platform.
=======
  // Set right after a Facebook Page post succeeds, so we can offer the
  // optional "Share to Personal Profile" popup. Cleared once the user
  // dismisses it or opens the share dialog.
  const [facebookShareUrl, setFacebookShareUrl] = useState<string | null>(null);

  // Connection status + username, keyed by platform. Built dynamically from
  // PLATFORMS so adding/removing a platform never leaves a stale key.
>>>>>>> 3a2ff898c62aaf09d7ddbe58c16c695fa7b8c867
  const [connectionStatus, setConnectionStatus] = useState<
    Record<PlatformKey, boolean>
  >({
    facebook: false,
    instagram: false,
    whatsapp: false,
    linkedin: false,
  });

  const [connectionUsername, setConnectionUsername] = useState<
    Record<PlatformKey, string | null>
  >({
    facebook: null,
    instagram: null,
    whatsapp: null,
    linkedin: null,
  });

  const [checkingConnections, setCheckingConnections] = useState(false);

<<<<<<< HEAD
=======
  /* =========================
     LINKEDIN TARGET SELECTION
     (personal profile / company page(s) / both)
  ========================= */

  // Every postable LinkedIn target for this account: personal profile +
  // any connected company pages. Populated from GET /linkedin/status.
  const [linkedinTargets, setLinkedinTargets] = useState<LinkedInTarget[]>([]);

  // Which of the above are currently chosen for the banner about to be
  // posted. Keys are 'personal' or an org urn.
  const [selectedLinkedinTargets, setSelectedLinkedinTargets] = useState<
    string[]
  >([]);

  /* =========================
     FACEBOOK TARGET SELECTION
     (one or more connected Pages)
  ========================= */

  const [facebookTargets, setFacebookTargets] = useState<LinkedInTarget[]>([]);
  const [selectedFacebookTargets, setSelectedFacebookTargets] = useState<
    string[]
  >([]);

  /* =========================
     INSTAGRAM TARGET SELECTION
     (one or more connected business accounts)
  ========================= */

  const [instagramTargets, setInstagramTargets] = useState<LinkedInTarget[]>([]);
  const [selectedInstagramTargets, setSelectedInstagramTargets] = useState<
    string[]
  >([]);

>>>>>>> 3a2ff898c62aaf09d7ddbe58c16c695fa7b8c867
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

      const connected = res?.connected === true;

      if (platform === 'linkedin') {
        const targets = Array.isArray(res?.targets)
          ? (res.targets as LinkedInTarget[])
          : [];

        setLinkedInTargets(targets);

        setConnectionUsername((prev) => ({
          ...prev,
          linkedin:
            targets.find((target) => target.type === 'personal')?.name ??
            res?.personal?.name ??
            null,
        }));
      }

      setConnectionStatus((prev) => ({
        ...prev,
        [platform]: connected,
      }));

      setConnectionUsername((prev) => ({
        ...prev,
        [platform]:
          res?.[platform]?.username ??
          res?.username ??
          null,
      }));

      if (platform === 'linkedin') {
        const { targets, selected } = getConnectionTargets(res);
        setLinkedinTargets(targets);
        setSelectedLinkedinTargets(selected);
      }

      if (platform === 'facebook') {
        const { targets, selected } = getConnectionTargets(res);
        setFacebookTargets(targets);
        setSelectedFacebookTargets(selected);
      }

      if (platform === 'instagram') {
        const { targets, selected } = getConnectionTargets(res);
        setInstagramTargets(targets);
        setSelectedInstagramTargets(selected);
      }

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

  /*
   * Kick off OAuth for Facebook/Instagram: POST to our backend's
   * connect endpoint (not GET-navigate to it — that's what
   * produced the 405 Method Not Allowed) and get back the
   * real Meta authorization URL to redirect to.
   *
   * NOT used for WhatsApp — see connectWhatsAppAndPost below.
   *
   * The backend route requires `platforms` to include this
   * platform's key — and uses `bannerId` for logging/context —
   * so both must be sent in the body, or it responds 400
   * "platform was not selected".
   */
  const startPlatformConnect = async (
    platform: PlatformKey,
    bannerId: number,
    platforms: PlatformKey[]
  ): Promise<string> => {
    const res = await apiPost(PLATFORM_BY_KEY[platform].connectEndpoint, {
      bannerId,
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

  /*
   * WhatsApp uses Embedded Signup (Facebook JS SDK popup),
   * NOT the server-redirect OAuth flow that Facebook/Instagram
   * use. FB.login() opens the popup; Meta posts session info
   * (waba_id, phone_number_id) to us via a window 'message'
   * event, and FB.login's own callback gives us the auth
   * `code`. Both are required before we can call
   * /api/whatsapp/connect, then /api/banners/publish.
   */
  /*
   * WhatsApp Embedded Signup is NOT executed inside the Capacitor WebView.
   *
   * APK flow:
   *   APK -> /whatsapp/session -> HTTPS browser page
   *   -> Meta Embedded Signup -> backend -> aarnamarket://whatsapp-callback
   *   -> APK -> publish banner
   *
   * The browser page is served from HTTPS and owns FB.login().
   */
  const connectWhatsAppAndPost = async (bannerId: number): Promise<void> => {
    if (!META_APP_ID) {
      throw new Error('VITE_META_APP_ID is missing.');
    }

    if (!WHATSAPP_CONFIG_ID) {
      throw new Error('VITE_META_WHATSAPP_CONFIG_ID is missing.');
    }

    if (!WHATSAPP_CONNECT_WEB_URL) {
      throw new Error('WhatsApp HTTPS connect URL is missing.');
    }

    if (!WHATSAPP_APP_CALLBACK_SCHEME.startsWith('aarnamarket://')) {
      throw new Error('Invalid WhatsApp APK callback scheme.');
    }

    const sessionRes = await apiPost('/whatsapp/session', {
      bannerId,
      callbackUrl: WHATSAPP_APP_CALLBACK_SCHEME,
    });

    if (!sessionRes?.success || !sessionRes?.sessionId) {
      throw new Error(
        sessionRes?.message || 'Could not create WhatsApp connection session'
      );
    }

    const sessionId = encodeURIComponent(String(sessionRes.sessionId));

    const separator = WHATSAPP_CONNECT_WEB_URL.includes('?') ? '&' : '?';

    const launchUrl =
      `${WHATSAPP_CONNECT_WEB_URL}${separator}` +
      `session=${sessionId}` +
      `&config_id=${encodeURIComponent(WHATSAPP_CONFIG_ID)}` +
      `&app_id=${encodeURIComponent(META_APP_ID)}`;

    localStorage.setItem(
      'pending_whatsapp_connect',
      JSON.stringify({
        sessionId: String(sessionRes.sessionId),
        bannerId,
      })
    );

    await Browser.open({
      url: launchUrl,
      presentationStyle: 'fullscreen',
    });
  };

<<<<<<< HEAD
=======
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

>>>>>>> 3a2ff898c62aaf09d7ddbe58c16c695fa7b8c867
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
<<<<<<< HEAD
    setSelectedLinkedInOwnerUrns([]);
    void checkPlatformConnection('linkedin');
  };

  const toggleLinkedInTarget = (urn: string) => {
    setSelectedLinkedInOwnerUrns((prev) =>
      prev.includes(urn)
        ? prev.filter((item) => item !== urn)
        : [...prev, urn]
    );
=======

    // Reset to the account's saved default selection each time the sheet
    // opens, rather than carrying over whatever was picked last time.
    const defaultPersonal = linkedinTargets.find((t) => t.type === 'personal');
    setSelectedLinkedinTargets(defaultPersonal ? [defaultPersonal.urn] : []);

    // Facebook/Instagram — default to every connected Page/account selected.
    setSelectedFacebookTargets(facebookTargets.map((t) => t.urn));
    setSelectedInstagramTargets(instagramTargets.map((t) => t.urn));
>>>>>>> 3a2ff898c62aaf09d7ddbe58c16c695fa7b8c867
  };

  const togglePlatform = (platform: PlatformKey) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const toggleLinkedinTarget = (targetKey: string) => {
    setSelectedLinkedinTargets((prev) =>
      prev.includes(targetKey)
        ? prev.filter((t) => t !== targetKey)
        : [...prev, targetKey]
    );
  };

  const toggleFacebookTarget = (targetKey: string) => {
    setSelectedFacebookTargets((prev) =>
      prev.includes(targetKey)
        ? prev.filter((t) => t !== targetKey)
        : [...prev, targetKey]
    );
  };

  const toggleInstagramTarget = (targetKey: string) => {
    setSelectedInstagramTargets((prev) =>
      prev.includes(targetKey)
        ? prev.filter((t) => t !== targetKey)
        : [...prev, targetKey]
    );
  };

  /* =========================================================
     OAUTH CALLBACK HANDLING (Facebook / Instagram only)

     WhatsApp never redirects the browser, so it never hits
     this handler — its whole flow (popup -> connect -> publish)
     resolves in memory inside connectWhatsAppAndPost above.

     Backend should redirect back with a query param named
     after the platform, e.g.:
       ?instagram=connected
       ?facebook=connected
     with possible values: connected, cancelled, no_account,
     error, invalid_state, expired.
  ========================================================= */
  /*
   * Receive the result from the HTTPS WhatsApp signup page.
   * The page redirects to:
   *   aarnamarket://whatsapp-callback?session=...&status=success
   */
  useEffect(() => {
    let listenerHandle: { remove: () => Promise<void> } | null = null;

    const setupAppUrlListener = async () => {
      listenerHandle = await App.addListener('appUrlOpen', async ({ url }) => {
        if (!url.startsWith(WHATSAPP_APP_CALLBACK_SCHEME)) {
          return;
        }

        try {
          await Browser.close().catch(() => undefined);
        } catch {
          // Browser may already be closed by Android.
        }

        const parsed = new URL(url);
        const status = parsed.searchParams.get('status');
        const sessionId = parsed.searchParams.get('session');
        const message = parsed.searchParams.get('message');

        const pendingRaw = localStorage.getItem('pending_whatsapp_connect');

        let pending: {
          sessionId?: string;
          bannerId?: number;
        } | null = null;

        try {
          pending = pendingRaw ? JSON.parse(pendingRaw) : null;
        } catch {
          pending = null;
        }

        if (!sessionId || sessionId !== pending?.sessionId) {
          setError('Invalid WhatsApp connection session.');
          return;
        }

        if (status !== 'success') {
          localStorage.removeItem('pending_whatsapp_connect');
          setError(
            message
              ? decodeURIComponent(message)
              : 'WhatsApp connection was cancelled or failed.'
          );
          return;
        }

        const bannerId = pending.bannerId;

        if (!bannerId) {
          localStorage.removeItem('pending_whatsapp_connect');
          setError('WhatsApp connected, but the pending banner was not found.');
          return;
        }

        try {
          setPosting(true);

          const statusRes = await apiGet(
            `/whatsapp/session/status?sessionId=${encodeURIComponent(sessionId)}`
          );

          if (!statusRes?.success || statusRes?.connected !== true) {
            throw new Error(
              statusRes?.message ||
                'WhatsApp signup finished, but the connection is not ready yet.'
            );
          }

          const publishRes = await apiPost('/banners/publish', {
            bannerId,
            platforms: ['whatsapp'],
          });

          if (!publishRes?.success) {
            throw new Error(
              publishRes?.message || 'Failed to publish banner to WhatsApp'
            );
          }

          await checkPlatformConnection('whatsapp');

          localStorage.removeItem('pending_whatsapp_connect');

          setSuccessMsg('WhatsApp connected and banner posted successfully');
          setActiveBanner(null);
          setSelectedPlatforms([]);

          setBanners((prev) => prev.filter((banner) => banner.id !== bannerId));
        } catch (error: any) {
          console.error('WhatsApp callback error:', error);

          setError(
            error?.message ||
              'WhatsApp connected, but publishing the banner failed.'
          );
        } finally {
          setPosting(false);
        }
      });
    };

    setupAppUrlListener().catch((error) => {
      console.error('Failed to register Android app URL listener:', error);
    });

    return () => {
      if (listenerHandle) {
        listenerHandle.remove().catch(() => undefined);
      }
    };
  }, []);

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

        /*
         * Publish the banner that user selected
         * before OAuth started (may need more than
         * one platform connected before it can post).
         */
        const pending = localStorage.getItem('pending_banner_publish');

        if (pending) {
          try {
            const data = JSON.parse(pending);
            const pendingPlatforms: PlatformKey[] = data.platforms;

<<<<<<< HEAD
            // Check that every selected platform is now connected
            // before trying to publish again.
=======
            // Saved alongside platforms when the connect chain started —
            // see handleConnectAndPost below. Real urn:li:person:*/
            // urn:li:organization:* strings. Falls back to whatever the
            // account's LinkedIn status just reported as selected.
            const pendingLinkedinOwnerUrns: string[] | undefined =
              data.linkedinOwnerUrns;

            // Real Facebook pageIds / Instagram business-account IDs,
            // saved the same way.
            const pendingFacebookPageIds: string[] | undefined =
              data.facebookPageIds;
            const pendingInstagramAccountIds: string[] | undefined =
              data.instagramAccountIds;

>>>>>>> 3a2ff898c62aaf09d7ddbe58c16c695fa7b8c867
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
                  linkedinOwnerUrns: pendingLinkedinOwnerUrns,
                  facebookPageIds: pendingFacebookPageIds,
                  instagramAccountIds: pendingInstagramAccountIds,
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

<<<<<<< HEAD
            if (pendingPlatforms.includes('linkedin')) {
              const targetUrns = Array.isArray(data.linkedinOwnerUrns)
                ? data.linkedinOwnerUrns.filter(
                    (value: unknown): value is string => typeof value === 'string'
                  )
                : [];

              if (targetUrns.length === 0) {
                const pendingBanner = banners.find(
                  (banner) => banner.id === Number(data.bannerId)
                );

                if (pendingBanner) {
                  setActiveBanner(pendingBanner);
                  setSelectedPlatforms(pendingPlatforms);
                  setSelectedLinkedInOwnerUrns([]);
                  localStorage.removeItem('pending_banner_publish');
                  setError(
                    'LinkedIn connected. Choose Personal Profile, AarnexAI, or Both, then tap Post Now.'
                  );
                  return;
                }
              }
            }

            await apiPost('/banners/publish', {
              bannerId: data.bannerId,
              platforms: pendingPlatforms,
              ...(pendingPlatforms.includes('linkedin')
                ? { linkedinOwnerUrns: Array.isArray(data.linkedinOwnerUrns) ? data.linkedinOwnerUrns : [] }
                : {}),
            });
=======
            const publishRes = await publishBanner(
              data.bannerId,
              pendingPlatforms,
              pendingLinkedinOwnerUrns ??
                (pendingPlatforms.includes('linkedin')
                  ? selectedLinkedinTargets
                  : undefined),
              pendingFacebookPageIds ??
                (pendingPlatforms.includes('facebook')
                  ? selectedFacebookTargets
                  : undefined),
              pendingInstagramAccountIds ??
                (pendingPlatforms.includes('instagram')
                  ? selectedInstagramTargets
                  : undefined)
            );
>>>>>>> 3a2ff898c62aaf09d7ddbe58c16c695fa7b8c867

            localStorage.removeItem('pending_banner_publish');

            setSuccessMsg(
              `${platformLabel} connected and banner posted successfully`
            );

            if (pendingPlatforms.includes('facebook')) {
              const postUrl = extractFacebookPostUrl(publishRes);
              if (postUrl) setFacebookShareUrl(postUrl);
            }

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
          `No ${platformLabel} professional account was found for this Meta account.`
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

<<<<<<< HEAD
  const getPublishPayload = (bannerId: number, platforms: PlatformKey[]) => ({
    bannerId,
    platforms,
    ...(platforms.includes('linkedin')
      ? { linkedinOwnerUrns: selectedLinkedInOwnerUrns }
      : {}),
  });

=======
>>>>>>> 3a2ff898c62aaf09d7ddbe58c16c695fa7b8c867
  const handleConnectAndPost = async () => {
    if (!activeBanner || selectedPlatforms.length === 0) {
      return;
    }

    // If LinkedIn is one of the chosen platforms but the account is
    // already connected, require at least one target (personal/company)
    // so we never silently post nowhere or to the wrong place.
    if (
      selectedPlatforms.includes('linkedin') &&
      connectionStatus.linkedin &&
      selectedLinkedinTargets.length === 0
    ) {
      setError('Choose where to post on LinkedIn — personal profile, page, or both.');
      return;
    }

    if (
      selectedPlatforms.includes('facebook') &&
      connectionStatus.facebook &&
      selectedFacebookTargets.length === 0
    ) {
      setError('Choose at least one Facebook Page to post to.');
      return;
    }

    if (
      selectedPlatforms.includes('instagram') &&
      connectionStatus.instagram &&
      selectedInstagramTargets.length === 0
    ) {
      setError('Choose at least one Instagram account to post to.');
      return;
    }

    try {
      setPosting(true);

      const bannerId = activeBanner.id;

      if (selectedPlatforms.includes('linkedin')) {
        if (!connectionStatus.linkedin) {
          localStorage.setItem(
            'pending_banner_publish',
            JSON.stringify({
              bannerId,
              platforms: selectedPlatforms,
              linkedinOwnerUrns: selectedLinkedInOwnerUrns,
            })
          );

          const authUrl = await startPlatformConnect(
            'linkedin',
            bannerId,
            selectedPlatforms
          );
          window.location.href = authUrl;
          return;
        }

        if (selectedLinkedInOwnerUrns.length === 0) {
          throw new Error(
            'Please choose where to publish on LinkedIn: Personal Profile, AarnexAI, or Both.'
          );
        }
      }

      /*
       * WhatsApp always needs its own Embedded Signup popup —
       * handle it separately, before touching the Facebook/
       * Instagram redirect flow below.
       */
      if (selectedPlatforms.includes('whatsapp')) {
        const alreadyConnected =
          connectionStatus.whatsapp || (await checkPlatformConnection('whatsapp'));

        if (!alreadyConnected) {
          await connectWhatsAppAndPost(bannerId);
        } else {
          const publishRes = await apiPost('/banners/publish', {
            bannerId,
            platforms: ['whatsapp'],
          });

          if (!publishRes?.success) {
            throw new Error(publishRes?.message || 'Failed to publish banner');
          }
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
              JSON.stringify({
                bannerId,
                platforms: otherPlatforms,
                linkedinOwnerUrns: otherPlatforms.includes('linkedin')
                  ? selectedLinkedinTargets
                  : undefined,
                facebookPageIds: otherPlatforms.includes('facebook')
                  ? selectedFacebookTargets
                  : undefined,
                instagramAccountIds: otherPlatforms.includes('instagram')
                  ? selectedInstagramTargets
                  : undefined,
              })
            );
            const authUrl = await startPlatformConnect(platform, bannerId, otherPlatforms);
            window.location.href = authUrl;
            return; // browser is navigating away — nothing more to do here
          }
        }

        if (otherPlatforms.length > 0) {
<<<<<<< HEAD
          const response = await apiPost(
            '/banners/publish',
            getPublishPayload(bannerId, otherPlatforms)
          );

          if (!response?.success) {
            throw new Error(response?.message || 'Failed to publish banner');
=======
          const publishRes = await publishBanner(
            bannerId,
            otherPlatforms,
            otherPlatforms.includes('linkedin') ? selectedLinkedinTargets : undefined,
            otherPlatforms.includes('facebook') ? selectedFacebookTargets : undefined,
            otherPlatforms.includes('instagram') ? selectedInstagramTargets : undefined
          );

          if (otherPlatforms.includes('facebook')) {
            const postUrl = extractFacebookPostUrl(publishRes);
            if (postUrl) setFacebookShareUrl(postUrl);
>>>>>>> 3a2ff898c62aaf09d7ddbe58c16c695fa7b8c867
          }
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
       * Facebook / Instagram only — unchanged original flow.
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
              linkedinOwnerUrns: selectedPlatforms.includes('linkedin')
                ? selectedLinkedinTargets
                : undefined,
              facebookPageIds: selectedPlatforms.includes('facebook')
                ? selectedFacebookTargets
                : undefined,
              instagramAccountIds: selectedPlatforms.includes('instagram')
                ? selectedInstagramTargets
                : undefined,
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
<<<<<<< HEAD
      const response = await apiPost(
        '/banners/publish',
        getPublishPayload(bannerId, selectedPlatforms)
      );

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to publish banner');
=======
      const publishRes = await publishBanner(
        bannerId,
        selectedPlatforms,
        selectedPlatforms.includes('linkedin') ? selectedLinkedinTargets : undefined,
        selectedPlatforms.includes('facebook') ? selectedFacebookTargets : undefined,
        selectedPlatforms.includes('instagram') ? selectedInstagramTargets : undefined
      );

      if (selectedPlatforms.includes('facebook')) {
        const postUrl = extractFacebookPostUrl(publishRes);
        if (postUrl) setFacebookShareUrl(postUrl);
>>>>>>> 3a2ff898c62aaf09d7ddbe58c16c695fa7b8c867
      }

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
        </div>

<<<<<<< HEAD
        {/* Facebook / Instagram / WhatsApp connect sheet */}
=======
        {/* Optional "Share to Personal Profile" prompt — shown right after
            a Facebook Page post succeeds. Purely optional and manual: it
            never auto-posts anything, it just opens Facebook's own share
            dialog so the user can choose to share the Page post to their
            personal profile themselves. */}
        {facebookShareUrl && (
          <div
            style={{
              position: 'fixed',
              left: 16,
              right: 16,
              bottom: 24,
              zIndex: 20,
              background: '#FFFFFF',
              borderRadius: 14,
              border: `1px solid ${brand.border}`,
              boxShadow: '0 8px 24px rgba(15,42,74,0.18)',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <IonIcon icon={logoFacebook} style={{ fontSize: 24, color: brand.fb, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12.5, fontWeight: 700, color: brand.navy, margin: 0 }}>
                Posted to your Facebook Page
              </p>
              <p style={{ fontSize: 11, color: brand.ink, margin: '2px 0 0' }}>
                Want to also share it to your personal profile?
              </p>
            </div>
            <IonButton
              size="small"
              fill="solid"
              style={{ '--background': brand.fb, '--border-radius': '10px' } as React.CSSProperties}
              onClick={() => {
                shareFacebookPagePost(facebookShareUrl);
                setFacebookShareUrl(null);
              }}
            >
              <IonIcon icon={shareSocialOutline} slot="start" style={{ fontSize: 15 }} />
              Share
            </IonButton>
            <IonIcon
              icon={closeOutline}
              style={{ fontSize: 18, color: brand.ink, cursor: 'pointer', flexShrink: 0 }}
              onClick={() => setFacebookShareUrl(null)}
            />
          </div>
        )}

        {/* Platform picker sheet for posting a specific banner.
            Header / list / footer are separate flex sections inside a
            fixed-height wrapper, with the list as the only scrollable
            area, so "Post Now" in the footer is always visible. */}
>>>>>>> 3a2ff898c62aaf09d7ddbe58c16c695fa7b8c867
        <IonModal
          isOpen={!!activeBanner}
          initialBreakpoint={0.55}
          breakpoints={[0, 0.55]}
          onDidDismiss={() => setActiveBanner(null)}
        >
          <div style={{ padding: '20px 20px 24px' }}>
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
            <p style={{ fontSize: 12, color: brand.ink, margin: '0 0 16px' }}>
              Choose one or more platforms to connect and publish.
            </p>

<<<<<<< HEAD
            {PLATFORMS.map((platform) => (
              <PlatformRow
                key={platform.key}
                icon={platform.icon}
                iconColor={platform.iconColor}
                label={platform.label}
                checked={selectedPlatforms.includes(platform.key)}
                onToggle={() => togglePlatform(platform.key)}
              />
            ))}

            {selectedPlatforms.includes('linkedin') && (
              <div
=======
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
                <React.Fragment key={platform.key}>
                  <PlatformRow
                    icon={platform.icon}
                    iconColor={platform.iconColor}
                    label={platform.label}
                    disabled={platform.key === 'youtube'}
                    disabledReason={platform.key === 'youtube' ? 'Video required' : undefined}
                    checked={selectedPlatforms.includes(platform.key)}
                    onToggle={() => togglePlatform(platform.key)}
                  />

                  {/* LinkedIn target sub-picker — only shown once LinkedIn
                      is selected AND the account is already connected (if
                      it isn't connected yet, the backend's own default
                      applies and the user can change it afterwards from
                      "Connected accounts"). */}
                  {platform.key === 'linkedin' &&
                    selectedPlatforms.includes('linkedin') &&
                    connectionStatus.linkedin && (
                      <TargetSubPicker
                        targets={linkedinTargets}
                        selected={selectedLinkedinTargets}
                        onToggle={toggleLinkedinTarget}
                        accentColor={brand.li}
                        emptyMessage="No LinkedIn pages found — will post to your personal profile."
                        showTypeIcon
                      />
                    )}

                  {/* Facebook Page sub-picker — same pattern as LinkedIn. */}
                  {platform.key === 'facebook' &&
                    selectedPlatforms.includes('facebook') &&
                    connectionStatus.facebook && (
                      <TargetSubPicker
                        targets={facebookTargets}
                        selected={selectedFacebookTargets}
                        onToggle={toggleFacebookTarget}
                        accentColor={brand.fb}
                        emptyMessage="No Facebook Pages found."
                      />
                    )}

                  {/* Instagram business-account sub-picker — same pattern. */}
                  {platform.key === 'instagram' &&
                    selectedPlatforms.includes('instagram') &&
                    connectionStatus.instagram && (
                      <TargetSubPicker
                        targets={instagramTargets}
                        selected={selectedInstagramTargets}
                        onToggle={toggleInstagramTarget}
                        accentColor={brand.ig2}
                        emptyMessage="No Instagram accounts found."
                      />
                    )}
                </React.Fragment>
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
                  selectedPlatforms.length === 0 ||
                  posting ||
                  checkingConnections ||
                  (selectedPlatforms.includes('linkedin') &&
                    connectionStatus.linkedin &&
                    selectedLinkedinTargets.length === 0) ||
                  (selectedPlatforms.includes('facebook') &&
                    connectionStatus.facebook &&
                    selectedFacebookTargets.length === 0) ||
                  (selectedPlatforms.includes('instagram') &&
                    connectionStatus.instagram &&
                    selectedInstagramTargets.length === 0)
                }
                onClick={handleConnectAndPost}
>>>>>>> 3a2ff898c62aaf09d7ddbe58c16c695fa7b8c867
                style={{
                  marginTop: 16,
                  padding: 14,
                  borderRadius: 14,
                  background: '#F8FAFC',
                  border: `1px solid ${brand.border}`,
                }}
              >
                <div style={{ marginBottom: 10 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: brand.navy }}>
                    Where should LinkedIn publish?
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: brand.ink }}>
                    Choose Personal Profile, AarnexAI, or Both.
                  </p>
                </div>

                {linkedinTargets.length === 0 ? (
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      background: '#FFFFFF',
                      color: brand.ink,
                      fontSize: 11,
                    }}
                  >
                    No LinkedIn targets are available yet. Reconnect LinkedIn after granting organization posting access so AarnexAI can appear here.
                  </div>
                ) : (
                  linkedinTargets.map((target) => (
                    <div
                      key={target.urn}
                      onClick={() => toggleLinkedInTarget(target.urn)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        marginBottom: 8,
                        borderRadius: 10,
                        border: `1px solid ${selectedLinkedInOwnerUrns.includes(target.urn) ? brand.blue : brand.border}`,
                        background: selectedLinkedInOwnerUrns.includes(target.urn) ? '#EFF6FF' : '#FFFFFF',
                        cursor: 'pointer',
                      }}
                    >
                      <div>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: brand.navy }}>
                          {target.name}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 10, color: brand.ink }}>
                          {target.type === 'organization'
                            ? `Company Page${target.role ? ` • ${target.role}` : ''}`
                            : 'Personal LinkedIn Profile'}
                        </p>
                      </div>
                      <IonCheckbox
                        checked={selectedLinkedInOwnerUrns.includes(target.urn)}
                        onIonChange={(event) => {
                          event.stopPropagation();
                          toggleLinkedInTarget(target.urn);
                        }}
                      />
                    </div>
                  ))
                )}

                {linkedinTargets.length >= 2 && (
                  <IonButton
                    fill="clear"
                    size="small"
                    onClick={() =>
                      setSelectedLinkedInOwnerUrns(
                        linkedinTargets.map((target) => target.urn)
                      )
                    }
                    style={{ marginTop: 2 }}
                  >
                    Select Both
                  </IonButton>
                )}
              </div>
            )}

            <IonButton
              expand="block"
              disabled={
                selectedPlatforms.length === 0 || posting || checkingConnections
              }
              onClick={handleConnectAndPost}
              style={{
                marginTop: 20,
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
        </IonModal>

        <IonToast
          isOpen={!!error}
          message={error}
          duration={3000}
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
      <BottomTabBar />
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

<<<<<<< HEAD
=======
// The IonCheckbox is purely decorative (pointerEvents: 'none'). The row's
// onClick is the single source of truth for toggling, so a tap never fires
// two competing handlers.
>>>>>>> 3a2ff898c62aaf09d7ddbe58c16c695fa7b8c867
const PlatformRow: React.FC<{
  icon: string;
  iconColor: string;
  label: string;
  checked: boolean;
  onToggle: () => void;
}> = ({ icon, iconColor, label, checked, onToggle }) => (
  <div
    onClick={onToggle}
    className="flex items-center justify-between"
    style={{
      padding: '12px 14px',
      borderRadius: 12,
      border: `1px solid ${checked ? brand.blue : brand.border}`,
      background: checked ? '#EFF6FF' : '#FFFFFF',
      marginBottom: 10,
      cursor: 'pointer',
    }}
  >
    <div className="flex items-center gap-3">
      <IonIcon icon={icon} style={{ fontSize: 22, color: iconColor }} />
      <span style={{ fontSize: 14, fontWeight: 600, color: brand.navy }}>{label}</span>
    </div>
<<<<<<< HEAD
    <IonCheckbox checked={checked} onIonChange={onToggle} />
  </div>
);
=======
    <IonCheckbox checked={checked} disabled={disabled} style={{ pointerEvents: 'none' }} />
  </div>
);

// Nested picker shown right under a platform row once it's selected: lets
// the user choose one or more targets for that platform (LinkedIn:
// personal profile / company page(s); Facebook: Page(s); Instagram:
// business account(s)). Same decorative-checkbox pattern as PlatformRow,
// just smaller and indented so it visually reads as "part of" the row
// above it.
const TargetSubPicker: React.FC<{
  targets: LinkedInTarget[];
  selected: string[];
  onToggle: (targetKey: string) => void;
  accentColor: string;
  emptyMessage: string;
  // Only LinkedIn actually needs a person-vs-building icon distinction
  // (personal profile vs company page). Facebook Pages and Instagram
  // accounts are always the same "kind" of thing, so they skip the icon.
  showTypeIcon?: boolean;
}> = ({ targets, selected, onToggle, accentColor, emptyMessage, showTypeIcon = false }) => {
  if (targets.length === 0) {
    return (
      <div
        style={{
          margin: '-4px 0 10px 14px',
          paddingLeft: 12,
          borderLeft: `2px solid ${brand.border}`,
          fontSize: 11.5,
          color: brand.ink,
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      style={{
        margin: '-4px 0 10px 14px',
        paddingLeft: 12,
        borderLeft: `2px solid ${brand.border}`,
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: '#A9B6C2',
          margin: '0 0 6px',
          textTransform: 'uppercase',
          letterSpacing: 0.3,
        }}
      >
        Post to
      </p>

      {targets.map((target) => {
        const isChecked = selected.includes(target.urn);
        return (
          <div
            key={target.urn}
            onClick={() => onToggle(target.urn)}
            className="flex items-center justify-between"
            style={{
              padding: '8px 10px',
              borderRadius: 10,
              border: `1px solid ${isChecked ? accentColor : brand.border}`,
              background: isChecked ? '#F0F6FF' : '#FFFFFF',
              marginBottom: 6,
              cursor: 'pointer',
            }}
          >
            <div className="flex items-center gap-2">
              {showTypeIcon && (
                <IonIcon
                  icon={target.type === 'personal' ? personOutline : businessOutline}
                  style={{ fontSize: 15, color: accentColor }}
                />
              )}
              <span style={{ fontSize: 12.5, fontWeight: 600, color: brand.navy }}>
                {target.type === 'personal' ? 'Personal profile' : target.name}
              </span>
            </div>
            <IonCheckbox checked={isChecked} style={{ pointerEvents: 'none' }} />
          </div>
        );
      })}
    </div>
  );
};
>>>>>>> 3a2ff898c62aaf09d7ddbe58c16c695fa7b8c867

export default Posters;