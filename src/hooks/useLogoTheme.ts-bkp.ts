import { useCallback, useEffect, useState } from 'react';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';

import { apiGet, apiPost } from '../api';

/* =========================================================
   ENV (same values the Posters page uses)
========================================================= */

const META_APP_ID =
  (import.meta.env.VITE_META_APP_ID as string | undefined)?.trim() ?? '';

const WHATSAPP_CONFIG_ID =
  (import.meta.env.VITE_META_WHATSAPP_CONFIG_ID as string | undefined)?.trim() ??
  '';

const WHATSAPP_CONNECT_WEB_URL =
  (import.meta.env.VITE_WHATSAPP_CONNECT_WEB_URL as string | undefined)?.trim() ||
  `${typeof window !== 'undefined' ? window.location.origin : ''}/whatsapp-connect.html`;

const WHATSAPP_APP_CALLBACK_SCHEME =
  (import.meta.env.VITE_WHATSAPP_APP_CALLBACK_SCHEME as string | undefined)?.trim() ||
  'aarnamarket://whatsapp-callback';

/* =========================================================
   TYPES / CONSTANTS
========================================================= */

export type PlatformKey =
  | 'facebook'
  | 'instagram'
  | 'whatsapp'
  | 'google_business'
  | 'youtube'
  | 'linkedin'
  | 'google_analytics'
  | 'youtube_analytics';

export const CONNECTABLE_PLATFORMS: PlatformKey[] = [
  'facebook',
  'instagram',
  'whatsapp',
  'google_business',
  'youtube',
  'linkedin',
  'google_analytics',
  'youtube_analytics',
];

export const isConnectable = (id: string): id is PlatformKey =>
  (CONNECTABLE_PLATFORMS as string[]).includes(id);

const LABELS: Record<PlatformKey, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  google_business: 'Google Business Profile',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  google_analytics: 'Google Analytics',
  youtube_analytics: 'YouTube Analytics',
};

const emptyFlags = (): Record<PlatformKey, boolean> => ({
  facebook: false,
  instagram: false,
  whatsapp: false,
  google_business: false,
  youtube: false,
  linkedin: false,
  google_analytics: false,
  youtube_analytics: false,
});

const emptyNames = (): Record<PlatformKey, string | null> => ({
  facebook: null,
  instagram: null,
  whatsapp: null,
  google_business: null,
  youtube: null,
  linkedin: null,
  google_analytics: null,
  youtube_analytics: null,
});

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Something went wrong. Please try again.';
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
    root.connected ??
    data.connected ??
    connection.connected ??
    connection.status;

  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    value === 'true' ||
    value === 'connected'
  );
}

/* =========================================================
   HOOK
========================================================= */

export function useSocialConnections() {
  const [connected, setConnected] = useState(emptyFlags);
  const [usernames, setUsernames] = useState(emptyNames);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState<PlatformKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /* =========================
     LINKEDIN EXTRA STATE
  ========================= */

  const [linkedinPages, setLinkedinPages] = useState<
    { urn: string; name: string }[]
  >([]);

  const [selectedLinkedinPage, setSelectedLinkedinPage] = useState<{
    urn: string;
    name: string;
  } | null>(null);

  /* ---------- status ---------- */

  const checkOne = useCallback(
    async (platform: PlatformKey): Promise<boolean> => {
      try {
        const response = await apiGet(`/${platform}/status`);
        const isConnected = isConnectedResponse(response);

        const name =
          response?.connection?.pageName ??
          response?.connection?.username ??
          response?.connection?.businessName ??
          response?.connection?.phoneNumber ??
          response?.[platform]?.username ??
          response?.[platform]?.name ??
          response?.data?.username ??
          response?.data?.name ??
          response?.username ??
          response?.name ??
          null;

        setConnected((prev) => ({ ...prev, [platform]: isConnected }));
        setUsernames((prev) => ({
          ...prev,
          [platform]:
            typeof name === 'string' && name.trim() ? name.trim() : null,
        }));

        /* =========================
           FIX: LINKEDIN PAGE LOAD
        ========================= */

        if (platform === 'linkedin') {
          const targets = response?.targets ?? [];

          const pages = targets
            .filter((t: any) => t.type === 'organization')
            .map((t: any) => ({
              urn: t.urn,
              name: t.name,
            }));

          const savedSelected =
            response?.connection?.metadata?.selectedOrgUrn ?? null;

          const selected =
            pages.find((p: { urn: any; }) => p.urn === savedSelected) ||
            pages[0] ||
            null;

          setLinkedinPages(pages);
          setSelectedLinkedinPage(selected);
        }

        return isConnected;
      } catch (err) {
        console.error(`Failed to check ${platform} connection:`, err);
        return false;
      }
    },
    []
  );

  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      await Promise.all(CONNECTABLE_PLATFORMS.map(checkOne));
    } finally {
      setChecking(false);
    }
  }, [checkOne]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /* ---------- WhatsApp ---------- */

  const startWhatsApp = useCallback(async () => {
    if (!META_APP_ID) {
      throw new Error('WhatsApp configuration error: VITE_META_APP_ID is missing.');
    }
    if (!WHATSAPP_CONFIG_ID) {
      throw new Error(
        'WhatsApp configuration error: VITE_META_WHATSAPP_CONFIG_ID is missing.'
      );
    }

    const sessionResponse = await apiPost('/whatsapp/session', {
      callbackUrl: WHATSAPP_APP_CALLBACK_SCHEME,
    });

    const sessionId = sessionResponse?.sessionId ?? sessionResponse?.session;

    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      throw new Error('WhatsApp session was not created by the server.');
    }

    localStorage.setItem(
      'pending_whatsapp_connect',
      JSON.stringify({ sessionId })
    );

    const params = new URLSearchParams({
      session: sessionId,
      config_id: WHATSAPP_CONFIG_ID,
      app_id: META_APP_ID,
    });

    await Browser.open({
      url: `${WHATSAPP_CONNECT_WEB_URL}?${params.toString()}`,
    });
  }, []);

  /* ---------- connect ---------- */

  const connect = useCallback(
    async (platform: PlatformKey) => {
      setError(null);
      setSuccess(null);
      setBusy(platform);

      try {
        if (platform === 'whatsapp') {
          await startWhatsApp();
          return;
        }

        const response = await apiPost(`/${platform}/connect`, {});
        const authUrl =
          response?.redirectUrl ?? response?.authUrl ?? response?.url;

        if (typeof authUrl !== 'string' || !authUrl.trim()) {
          throw new Error(
            `${LABELS[platform]} authorization URL was not returned by the server.`
          );
        }

        window.location.href = authUrl;
      } catch (err) {
        console.error(`Failed to start ${platform} connect:`, err);
        setError(getErrorMessage(err));
      } finally {
        setBusy(null);
      }
    },
    [startWhatsApp]
  );

  /* ---------- LinkedIn page selector ---------- */

  const selectLinkedInPage = useCallback(
    async (page: { urn: string; name: string }) => {
      setSelectedLinkedinPage(page);

      await apiPost('/linkedin/select-organization', {
        organizationUrn: page.urn,
      });
    },
    []
  );

  /* ---------- OAuth return ---------- */

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const platform = (
      [
        'facebook',
        'instagram',
        'google_business',
        'youtube',
        'linkedin',
        'google_analytics',
        'youtube_analytics',
      ] as PlatformKey[]
    ).find((p) => params.has(p));

    if (!platform) return;

    const status = params.get(platform);
    const label = LABELS[platform];

    window.history.replaceState(
      {},
      document.title,
      `${window.location.pathname}${window.location.hash}`
    );

    if (status === 'connected') {
      setSuccess(`${label} connected successfully.`);
      void checkOne(platform);
    } else if (status === 'cancelled') {
      setError(`${label} connection was cancelled.`);
    } else if (status === 'no_account') {
      setError(`No eligible ${label} account/page was found.`);
    } else if (status === 'invalid_state') {
      setError('OAuth security state is invalid. Please try connecting again.');
    } else if (status === 'expired') {
      setError('The OAuth session expired. Please try connecting again.');
    } else if (status === 'error') {
      setError(`${label} connection failed.`);
    } else {
      setError(`${label} returned an unexpected callback status.`);
    }
  }, [checkOne]);

  /* ---------- WhatsApp deep-link ---------- */

  useEffect(() => {
    let active = true;
    let handle: { remove: () => Promise<void> | void } | null = null;

    void App.addListener('appUrlOpen', async ({ url }) => {
      try {
        if (!url || !url.startsWith(WHATSAPP_APP_CALLBACK_SCHEME)) return;

        const pendingRaw = localStorage.getItem('pending_whatsapp_connect');
        if (!pendingRaw) return;

        const pending = JSON.parse(pendingRaw);

        if (pending.bannerId) return;

        try {
          await Browser.close();
        } catch {}

        const parsed = new URL(url);
        const status = parsed.searchParams.get('status');
        const sessionId =
          parsed.searchParams.get('session') ??
          parsed.searchParams.get('sessionId');
        const message = parsed.searchParams.get('message');

        if (!sessionId || sessionId !== pending.sessionId) {
          setError('WhatsApp callback session could not be verified.');
          return;
        }

        if (status !== 'success') {
          localStorage.removeItem('pending_whatsapp_connect');
          setError(message || 'WhatsApp connection was cancelled or failed.');
          return;
        }

        const sessionStatus = await apiGet(
          `/whatsapp/session/status?sessionId=${encodeURIComponent(sessionId)}`
        );

        if (sessionStatus?.connected !== true) {
          throw new Error(sessionStatus?.message || 'WhatsApp verification failed.');
        }

        localStorage.removeItem('pending_whatsapp_connect');
        await checkOne('whatsapp');
        setSuccess('WhatsApp connected successfully.');
      } catch (err) {
        setError(getErrorMessage(err));
      }
    }).then((h) => {
      if (active) handle = h;
      else void h.remove();
    });

    return () => {
      active = false;
      if (handle) void handle.remove();
    };
  }, [checkOne]);

  /* ---------- derived ---------- */

  const connectedCount = CONNECTABLE_PLATFORMS.filter(
    (p) => connected[p]
  ).length;

  return {
    connected,
    usernames,
    connectedCount,
    checking,
    busy,
    error,
    success,
    clearError: () => setError(null),
    clearSuccess: () => setSuccess(null),
    refresh,
    connect,

    /* LINKEDIN FIX */
    linkedinPages,
    selectedLinkedinPage,
    selectLinkedInPage,
  };
}