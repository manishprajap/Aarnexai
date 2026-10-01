// src/services/whatsappResume.ts
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import type { PluginListenerHandle } from '@capacitor/core';

import { apiPost } from '../api';

const PENDING_KEY = 'pending_whatsapp_connect';
const POLL_MS = 4000;
const MAX_MS = 10 * 60 * 1000;
const MAX_SOFT_FAILURES = 4;

type ClaimResponse = {
  success?: boolean;
  state?: 'linked' | 'waiting' | 'error';
  message?: string;
  step?: string;
  data?: unknown;
};

type ClaimResult =
  | { state: 'linked'; data: unknown }
  | { state: 'waiting' }
  | { state: 'soft-error'; message: string } // network / thrown error, retry karo
  | { state: 'error'; message: string }; // server ne clear error diya, band karo

type Pending = { sessionId?: string; startedAt?: number };

function readPending(): Pending | null {
  const raw = localStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Pending;
  } catch {
    return {};
  }
}

// NOTE: apiPost parsed JSON return karta hai (Response nahi), aur auth header khud lagata hai.
// Path me "/api" mat lagao — baaki hook bhi '/whatsapp/...' use karta hai.
async function claimOnce(): Promise<ClaimResult> {
  try {
    const res = (await apiPost('/whatsapp/claim', {})) as ClaimResponse;
    console.log('[WA claim]', res);

    if (res?.success || res?.state === 'linked') return { state: 'linked', data: res };
    if (res?.state === 'waiting' || res?.step === 'no_new_account') return { state: 'waiting' };

    return { state: 'error', message: res?.message || 'WhatsApp claim failed' };
  } catch (e) {
    console.error('[WA claim] request failed', e);
    return { state: 'soft-error', message: e instanceof Error ? e.message : 'Network error' };
  }
}

let checking = false;
let softFailures = 0;
let pollTimer: number | undefined;

function finish(kind: 'linked' | 'failed', detail: unknown) {
  localStorage.removeItem(PENDING_KEY);
  stopWhatsAppPolling();
  softFailures = 0;
  window.dispatchEvent(
    new CustomEvent(kind === 'linked' ? 'whatsapp-linked' : 'whatsapp-link-failed', { detail })
  );
}

export function stopWhatsAppPolling() {
  if (pollTimer) window.clearTimeout(pollTimer);
  pollTimer = undefined;
}

export async function checkPendingWhatsApp(): Promise<'linked' | 'waiting' | 'error' | 'none'> {
  if (checking) return 'waiting';

  const pending = readPending();
  if (!pending) return 'none';

  if (pending.startedAt && Date.now() - pending.startedAt > MAX_MS) {
    finish('failed', { message: 'WhatsApp connection timed out. Please try again.' });
    return 'error';
  }

  checking = true;
  try {
    const r = await claimOnce();

    if (r.state === 'linked') {
      finish('linked', r.data);
      return 'linked';
    }

    if (r.state === 'error') {
      finish('failed', { message: r.message });
      return 'error';
    }

    if (r.state === 'soft-error') {
      softFailures += 1;
      if (softFailures >= MAX_SOFT_FAILURES) {
        finish('failed', { message: r.message });
        return 'error';
      }
      return 'waiting';
    }

    softFailures = 0;
    return 'waiting';
  } finally {
    checking = false;
  }
}

// Connect dabane ke baad (pending key set hone ke baad) call karo
export function startWhatsAppPolling() {
  stopWhatsAppPolling();

  const tick = async () => {
    const r = await checkPendingWhatsApp();
    if (r !== 'waiting') return;
    pollTimer = window.setTimeout(tick, POLL_MS);
  };

  pollTimer = window.setTimeout(tick, POLL_MS);
}

// App.tsx me use hota hai
export function startWhatsAppResumeWatcher(): () => void {
  if (readPending()) {
    void checkPendingWhatsApp();
    startWhatsAppPolling();
  }

  let stateHandle: PluginListenerHandle | undefined;
  let browserHandle: PluginListenerHandle | undefined;
  let removed = false;

  void App.addListener('appStateChange', ({ isActive }) => {
    if (isActive && readPending()) {
      void checkPendingWhatsApp();
      if (!pollTimer) startWhatsAppPolling();
    }
  }).then((h) => {
    if (removed) void h.remove();
    else stateHandle = h;
  });

  // User in-app browser band kare to turant check karo
  void Browser.addListener('browserFinished', () => {
    if (readPending()) {
      void checkPendingWhatsApp();
      if (!pollTimer) startWhatsAppPolling();
    }
  }).then((h) => {
    if (removed) void h.remove();
    else browserHandle = h;
  });

  return () => {
    removed = true;
    stopWhatsAppPolling();
    void stateHandle?.remove();
    void browserHandle?.remove();
  };
}