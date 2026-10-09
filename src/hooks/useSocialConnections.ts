// src/hooks/useSocialConnections.ts
import { useCallback, useEffect, useState } from 'react';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';

import { apiGet, apiPost } from '../api';
import { startWhatsAppPolling, checkPendingWhatsApp } from '../services/whatsappResume';

/* =========================================================
   ENV
========================================================= */

const META_APP_ID =
  (import.meta.env.VITE_META_APP_ID as string | undefined)?.trim() ?? '';

const WHATSAPP_CONFIG_ID =
  (import.meta.env.VITE_META_WHATSAPP_CONFIG_ID as string | undefined)?.trim() ?? '';

const WHATSAPP_CONNECT_WEB_URL =
  (import.meta.env.VITE_WHATSAPP_CONNECT_WEB_URL as string | undefined)?.trim() ||
  `${typeof window !== 'undefined' ? window.location.origin : ''}/whatsapp-connect.html`;

const WHATSAPP_APP_CALLBACK_SCHEME =
  (import.meta.env.VITE_WHATSAPP_APP_CALLBACK_SCHEME as string | undefined)?.trim() ||
  'aarnamarket://whatsapp-callback';

const PENDING_KEY = 'pending_whatsapp_connect';

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

// Generic multi-target shape — LinkedIn (personal/organization),
// Facebook (page) aur Instagram (account) teeno isi shape ko follow karte hain.
export type ConnectionTarget = {
  type: 'personal' | 'organization' | 'page' | 'account';
  urn: string;
  name: string;
};

export type YouTubeChannel = {
  id: string;
  title: string;
  customUrl: string | null;
  thumbnailUrl: string | null;
};

// Purana naam alias ke taur par rakha, kahin aur import ho raha ho to na tute.
export type LinkedInTarget = ConnectionTarget;

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
  const root = response && typeof response === 'object' ? (response as Record<string, unknown>) : {};
  const data = root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : {};
  const connection =
    root.connection && typeof root.connection === 'object' ? (root.connection as Record<string, unknown>) : {};
  const value = root.connected ?? data.connected ?? connection.connected ?? connection.status;

  return value === true || value === 1 || value === '1' || value === 'true' || value === 'connected';
}

// targets/selectedTargets ka generic parser — facebook/instagram/linkedin
// teeno status routes isi shape ({ targets, selectedTargets }) me return karte hain.
function parseTargetsResponse(response: unknown): { targets: ConnectionTarget[]; selected: string[] } {
  const root = response && typeof response === 'object' ? (response as Record<string, any>) : {};

  const targets: ConnectionTarget[] = Array.isArray(root.targets)
    ? root.targets
        .map(
          (t: any): ConnectionTarget => ({
            type:
              t?.type === 'organization'
                ? 'organization'
                : t?.type === 'page'
                ? 'page'
                : t?.type === 'account'
                ? 'account'
                : 'personal',
            urn: String(t?.urn ?? ''),
            name: String(t?.name ?? ''),
          })
        )
        .filter((t: ConnectionTarget) => t.urn.length > 0)
    : [];

  const rawSelected: string[] = Array.isArray(root.selectedTargets)
    ? root.selectedTargets.filter((t: unknown) => typeof t === 'string')
    : targets.map((t) => t.urn); // fallback for status responses without a selection

  const personalTarget = targets.find((target) => target.type === 'personal');
  const selected = rawSelected
    .map((target) => target === 'personal' ? personalTarget?.urn : target)
    .filter((target): target is string => typeof target === 'string');

  return { targets, selected };
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

  /* ---------- LINKEDIN ---------- */
  const [linkedinTargets, setLinkedinTargets] = useState<ConnectionTarget[]>([]);
  const [selectedLinkedinTargets, setSelectedLinkedinTargets] = useState<string[]>([]);

  /* ---------- FACEBOOK ---------- */
  const [facebookTargets, setFacebookTargets] = useState<ConnectionTarget[]>([]);
  const [selectedFacebookTargets, setSelectedFacebookTargets] = useState<string[]>([]);

  /* ---------- INSTAGRAM ---------- */
  const [instagramTargets, setInstagramTargets] = useState<ConnectionTarget[]>([]);
  const [selectedInstagramTargets, setSelectedInstagramTargets] = useState<string[]>([]);

  /* ---------- YOUTUBE ---------- */
  const [youtubeChannels, setYoutubeChannels] = useState<YouTubeChannel[]>([]);
  const [youtubeNeedsSelection, setYoutubeNeedsSelection] = useState(false);
  const [selectedYoutubeChannelId, setSelectedYoutubeChannelId] = useState('');

  /* ---------- status ---------- */

  const checkOne = useCallback(async (platform: PlatformKey): Promise<boolean> => {
    try {
      const response = await apiGet(`/${platform}/status`);
      const isConnected = isConnectedResponse(response);

      const name =
        response?.profile?.businessName ??
        response?.profile?.phoneNumber ??
        response?.connection?.pageName ??
        response?.connection?.accountName ??
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
        [platform]: typeof name === 'string' && name.trim() ? name.trim() : null,
      }));

      if (platform === 'linkedin') {
        const { targets, selected } = parseTargetsResponse(response);
        setLinkedinTargets(targets);
        setSelectedLinkedinTargets(selected);
      }

      if (platform === 'facebook') {
        const { targets, selected } = parseTargetsResponse(response);
        setFacebookTargets(targets);
        setSelectedFacebookTargets(selected);
      }

      if (platform === 'instagram') {
        const { targets, selected } = parseTargetsResponse(response);
        setInstagramTargets(targets);
        setSelectedInstagramTargets(selected);
      }

      if (platform === 'youtube') {
        setYoutubeChannels(Array.isArray(response?.channels) ? response.channels : []);
        setYoutubeNeedsSelection(response?.needsChannelSelection === true);
        setSelectedYoutubeChannelId(
          typeof response?.connection?.channelId === 'string'
            ? response.connection.channelId
            : ''
        );
      }

      return isConnected;
    } catch (err) {
      console.error(`Failed to check ${platform} connection:`, err);
      return false;
    }
  }, []);

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
    if (!META_APP_ID) throw new Error('WhatsApp configuration error: VITE_META_APP_ID is missing.');
    if (!WHATSAPP_CONFIG_ID) throw new Error('WhatsApp configuration error: VITE_META_WHATSAPP_CONFIG_ID is missing.');

    const sessionResponse = await apiPost('/whatsapp/session', { callbackUrl: WHATSAPP_APP_CALLBACK_SCHEME });
    const sessionId = sessionResponse?.sessionId ?? sessionResponse?.session;
    const callbackHttpsUrl = sessionResponse?.callbackHttpsUrl;

    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      throw new Error('WhatsApp session was not created by the server.');
    }
    if (typeof callbackHttpsUrl !== 'string' || !callbackHttpsUrl.trim()) {
      throw new Error('WhatsApp callback URL was not created by the server.');
    }

    localStorage.setItem(PENDING_KEY, JSON.stringify({ sessionId, startedAt: Date.now() }));

    const params = new URLSearchParams({
      session: sessionId,
      config_id: WHATSAPP_CONFIG_ID,
      app_id: META_APP_ID,
      callback_url: callbackHttpsUrl,
    });

    await Browser.open({ url: `${WHATSAPP_CONNECT_WEB_URL}?${params.toString()}` });

    // Ye zaroori hai — bina iske /whatsapp/claim kabhi call nahi hota
    startWhatsAppPolling();
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
        const authUrl = response?.redirectUrl ?? response?.authUrl ?? response?.url;

        if (typeof authUrl !== 'string' || !authUrl.trim()) {
          throw new Error(`${LABELS[platform]} authorization URL was not returned by the server.`);
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
        throw new Error(response?.message || `Failed to disconnect ${LABELS[platform]}.`);
      }

      setConnected((prev) => ({ ...prev, [platform]: false }));
      setUsernames((prev) => ({ ...prev, [platform]: null }));

      if (platform === 'linkedin') {
        setLinkedinTargets([]);
        setSelectedLinkedinTargets([]);
      }
      if (platform === 'facebook') {
        setFacebookTargets([]);
        setSelectedFacebookTargets([]);
      }
      if (platform === 'instagram') {
        setInstagramTargets([]);
        setSelectedInstagramTargets([]);
      }
      if (platform === 'youtube') {
        setYoutubeChannels([]);
        setYoutubeNeedsSelection(false);
        setSelectedYoutubeChannelId('');
      }

      if (platform === 'whatsapp') {
        localStorage.removeItem(PENDING_KEY);
      }

      setSuccess(`${LABELS[platform]} disconnected.`);
    } catch (err) {
      console.error(`Failed to disconnect ${platform}:`, err);
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }, []);

  const saveYoutubeChannelSelection = useCallback(async () => {
    if (!selectedYoutubeChannelId) {
      setError('Select a YouTube channel first.');
      return;
    }

    setError(null);
    setBusy('youtube');
    try {
      const response = await apiPost('/youtube/select-channel', {
        channelId: selectedYoutubeChannelId,
      });
      if (!response?.success) {
        throw new Error(response?.message || 'Could not save the YouTube channel selection.');
      }

      await checkOne('youtube');
      setSuccess('YouTube channel connected successfully.');
    } catch (err) {
      console.error('Failed to save YouTube channel selection:', err);
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }, [checkOne, selectedYoutubeChannelId]);

  /* ---------- generic target-selection saver (linkedin/facebook/instagram) ---------- */

  const saveTargetSelection = useCallback(
    (platform: 'linkedin' | 'facebook' | 'instagram', setter: React.Dispatch<React.SetStateAction<string[]>>) =>
      async (targetKeys: string[]) => {
        setter(targetKeys);
        try {
          const targets = platform === 'linkedin'
            ? targetKeys.map((target) => target.startsWith('urn:li:person:') ? 'personal' : target)
            : targetKeys;
          await apiPost(`/${platform}/select-targets`, { targets });
        } catch (err) {
          console.error(`Failed to save ${platform} target selection:`, err);
          setError(`Could not save your ${LABELS[platform]} posting selection.`);
        }
      },
    []
  );

  const toggleLinkedInTarget = useCallback(
    async (targetKey: string) => {
      const next = selectedLinkedinTargets.includes(targetKey)
        ? selectedLinkedinTargets.filter((t) => t !== targetKey)
        : [...selectedLinkedinTargets, targetKey];
      await saveTargetSelection('linkedin', setSelectedLinkedinTargets)(next);
    },
    [selectedLinkedinTargets, saveTargetSelection]
  );

  const setLinkedInTargets = useCallback(
    (targetKeys: string[]) => saveTargetSelection('linkedin', setSelectedLinkedinTargets)(targetKeys),
    [saveTargetSelection]
  );

  const toggleFacebookTarget = useCallback(
    async (targetKey: string) => {
      const next = selectedFacebookTargets.includes(targetKey)
        ? selectedFacebookTargets.filter((t) => t !== targetKey)
        : [...selectedFacebookTargets, targetKey];
      await saveTargetSelection('facebook', setSelectedFacebookTargets)(next);
    },
    [selectedFacebookTargets, saveTargetSelection]
  );

  const setFacebookTargetSelection = useCallback(
    (targetKeys: string[]) => saveTargetSelection('facebook', setSelectedFacebookTargets)(targetKeys),
    [saveTargetSelection]
  );

  const toggleInstagramTarget = useCallback(
    async (targetKey: string) => {
      const next = selectedInstagramTargets.includes(targetKey)
        ? selectedInstagramTargets.filter((t) => t !== targetKey)
        : [...selectedInstagramTargets, targetKey];
      await saveTargetSelection('instagram', setSelectedInstagramTargets)(next);
    },
    [selectedInstagramTargets, saveTargetSelection]
  );

  const setInstagramTargetSelection = useCallback(
    (targetKeys: string[]) => saveTargetSelection('instagram', setSelectedInstagramTargets)(targetKeys),
    [saveTargetSelection]
  );

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
          throw new Error(failedTargets[0] || response?.message || 'LinkedIn post failed.');
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

  /* ---------- OAuth return (facebook/instagram/google/linkedin...) ---------- */

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const platform = (
      ['facebook', 'instagram', 'google_business', 'youtube', 'linkedin', 'google_analytics', 'youtube_analytics'] as PlatformKey[]
    ).find((p) => params.has(p));

    if (!platform) return;

    const status = params.get(platform);
    const label = LABELS[platform];

    window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.hash}`);

    if (status === 'connected') {
      setSuccess(`${label} connected successfully.`);
      void checkOne(platform);
    } else if (platform === 'youtube' && status === 'select') {
      setSuccess('Choose the YouTube channel you want to connect.');
      void checkOne('youtube');
    } else if (status === 'cancelled') {
      setError(`${label} connection was cancelled.`);
    } else if (status === 'no_account') {
      setError(
        platform === 'youtube'
          ? 'No YouTube channel was found for the selected Google account.'
          : `No eligible ${label} account/page was found.`
      );
    } else if (status === 'invalid_state') {
      setError('OAuth security state is invalid. Please try connecting again.');
    } else if (status === 'expired') {
      setError('The OAuth session expired. Please try connecting again.');
    } else if (status === 'error') {
      setError(
        platform === 'youtube' && params.get('message') === 'channel_lookup_failed'
          ? 'Could not load your YouTube channels. Check that YouTube Data API v3 is enabled, then reconnect.'
          : `${label} connection failed.`
      );
    } else {
      setError(`${label} returned an unexpected callback status.`);
    }
  }, [checkOne]);

  /* ---------- WhatsApp claim result (whatsappResume service se) ---------- */

  useEffect(() => {
    const onLinked = () => {
      void Browser.close().catch(() => {});
      void checkOne('whatsapp');
      setSuccess('WhatsApp connected successfully.');
    };

    const onFailed = (e: Event) => {
      const message = (e as CustomEvent<{ message?: string }>).detail?.message;
      setError(message || 'WhatsApp connection failed.');
    };

    window.addEventListener('whatsapp-linked', onLinked);
    window.addEventListener('whatsapp-link-failed', onFailed);

    return () => {
      window.removeEventListener('whatsapp-linked', onLinked);
      window.removeEventListener('whatsapp-link-failed', onFailed);
    };
  }, [checkOne]);

  /* ---------- WhatsApp deep-link (callback scheme se app khule to turant claim check) ---------- */

  useEffect(() => {
    let active = true;
    let handle: { remove: () => Promise<void> | void } | null = null;

    void App.addListener('appUrlOpen', ({ url }) => {
      if (!url) return;

      try {
        const callback = new URL(url);
        if (
          callback.protocol !== 'aarnamarket:' ||
          callback.hostname !== 'whatsapp-callback' ||
          callback.searchParams.get('status') !== 'pending'
        ) return;

        const pendingRaw = localStorage.getItem(PENDING_KEY);
        if (!pendingRaw) return;

        const pending = JSON.parse(pendingRaw) as { sessionId?: string };
        if (!pending.sessionId || pending.sessionId !== callback.searchParams.get('session')) return;

        void Browser.close().catch(() => {});
        void checkPendingWhatsApp();
      } catch (callbackError) {
        console.error('Invalid WhatsApp app callback URL:', callbackError);
      }
    }).then((h) => {
      if (active) handle = h;
      else void h.remove();
    });

    return () => {
      active = false;
      if (handle) void handle.remove();
    };
  }, []);

  /* ---------- derived ---------- */

  const connectedCount = CONNECTABLE_PLATFORMS.filter((p) => connected[p]).length;

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
    disconnect,
    youtubeChannels,
    youtubeNeedsSelection,
    selectedYoutubeChannelId,
    setSelectedYoutubeChannelId,
    saveYoutubeChannelSelection,

    /* LINKEDIN */
    linkedinTargets,
    selectedLinkedinTargets,
    toggleLinkedInTarget,
    setLinkedInTargets,
    postToLinkedIn,

    /* FACEBOOK */
    facebookTargets,
    selectedFacebookTargets,
    toggleFacebookTarget,
    setFacebookTargetSelection,

    /* INSTAGRAM */
    instagramTargets,
    selectedInstagramTargets,
    toggleInstagramTarget,
    setInstagramTargetSelection,
  };
}