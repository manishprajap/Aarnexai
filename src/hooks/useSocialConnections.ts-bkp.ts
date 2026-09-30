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

// A LinkedIn post target is either the literal string 'personal' or a
// company page URN, e.g. 'urn:li:organization:12345'.
export type LinkedInTarget = {
  type: 'personal' | 'organization';
  urn: string; // 'personal' key is looked up by matching type === 'personal'
  name: string;
};

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
     LINKEDIN TARGET STATE (multi-select: personal / page / both)
  ========================= */

  const [linkedinTargets, setLinkedinTargets] = useState<LinkedInTarget[]>([]);
  const [selectedLinkedinTargets, setSelectedLinkedinTargets] = useState<string[]>([]);
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

        if (platform === 'linkedin') {
          type RawLinkedInTarget = {
            type?: string;
            urn?: string;
            name?: string;
          };

          const targets: LinkedInTarget[] = (response?.targets ?? []).map(
            (t: RawLinkedInTarget): LinkedInTarget => ({
              type: t?.type === 'organization' ? 'organization' : 'personal',
              urn: t?.type === 'organization' ? String(t?.urn ?? '') : 'personal',
              name: String(t?.name ?? ''),
            })
          );

          const selected: string[] = Array.isArray(response?.selectedTargets)
            ? response.selectedTargets
            : targets.some((t) => t.type === 'personal')
              ? ['personal']
              : [];

          setLinkedinTargets(targets);
          setSelectedLinkedinTargets(selected);
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

  /* ---------- disconnect ---------- */

  const disconnect = useCallback(async (platform: PlatformKey) => {
    setError(null);
    setSuccess(null);
    setBusy(platform);

    try {
      const response = await apiPost(`/${platform}/disconnect`, {});

      if (response?.success === false) {
        throw new Error(
          response?.message || `Failed to disconnect ${LABELS[platform]}.`
        );
      }

      setConnected((prev) => ({ ...prev, [platform]: false }));
      setUsernames((prev) => ({ ...prev, [platform]: null }));

      if (platform === 'linkedin') {
        setLinkedinTargets([]);
        setSelectedLinkedinTargets([]);
      }

      if (platform === 'whatsapp') {
        localStorage.removeItem('pending_whatsapp_connect');
      }

      setSuccess(`${LABELS[platform]} disconnected.`);
    } catch (err) {
      console.error(`Failed to disconnect ${platform}:`, err);
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }, []);

  /* ---------- LinkedIn target selection (personal / page / both) ---------- */

  const toggleLinkedInTarget = useCallback(
    async (targetKey: string) => {
      setSelectedLinkedinTargets((prev) => {
        const next = prev.includes(targetKey)
          ? prev.filter((t) => t !== targetKey)
          : [...prev, targetKey];

        void apiPost('/linkedin/select-targets', { targets: next }).catch(
          (err) => {
            console.error('Failed to save LinkedIn target selection:', err);
            setError('Could not save your LinkedIn posting selection.');
          }
        );

        return next;
      });
    },
    []
  );

  const setLinkedInTargets = useCallback(async (targetKeys: string[]) => {
    setSelectedLinkedinTargets(targetKeys);
    try {
      await apiPost('/linkedin/select-targets', { targets: targetKeys });
    } catch (err) {
      console.error('Failed to save LinkedIn target selection:', err);
      setError('Could not save your LinkedIn posting selection.');
    }
  }, []);

  /* ---------- LinkedIn post ---------- */

  const postToLinkedIn = useCallback(
    async (text: string, imageAssetUrn?: string) => {
      setError(null);
      setSuccess(null);
      setBusy('linkedin');

      try {
        const response = await apiPost('/linkedin/post', {
          text,
          imageAssetUrn,
          targets: selectedLinkedinTargets,
        });

        if (!response?.success) {
          const failedTargets = (response?.results ?? [])
            .filter((r: any) => !r.ok)
            .map((r: any) => r.error)
            .filter(Boolean);
          throw new Error(
            failedTargets[0] || response?.message || 'LinkedIn post failed.'
          );
        }

        if (response?.partialFailure) {
          setSuccess('Posted to LinkedIn, but one target failed. Check details.');
        } else {
          setSuccess('Posted to LinkedIn successfully.');
        }

        return response;
      } catch (err) {
        setError(getErrorMessage(err));
        throw err;
      } finally {
        setBusy(null);
      }
    },
    [selectedLinkedinTargets]
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
        } catch { }

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
    disconnect, // <-- naya

    /* LINKEDIN */
    linkedinTargets,
    selectedLinkedinTargets,
    toggleLinkedInTarget,
    setLinkedInTargets,
    postToLinkedIn,
  };
}