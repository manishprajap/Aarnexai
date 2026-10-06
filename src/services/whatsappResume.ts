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
  code?: string;

  data?: unknown;

  detail?: {
    code?: number;
    subcode?: number;
    fbtrace_id?: string;
  };
};

type ClaimResult =
  | {
      state: 'linked';
      data: unknown;
    }
  | {
      state: 'waiting';
    }
  | {
      state: 'soft-error';
      message: string;
    }
  | {
      state: 'error';
      message: string;
      code?: string;
    };

type Pending = {
  sessionId?: string;
  startedAt?: number;
};

type UnknownObject = Record<string, unknown>;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function isObject(value: unknown): value is UnknownObject {
  return typeof value === 'object' && value !== null;
}

function readPending(): Pending | null {
  const raw = localStorage.getItem(PENDING_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Pending;
  } catch {
    return {};
  }
}

/**
 * Recursively search an error object for a ClaimResponse.
 *
 * Your apiPost() appears to return something like:
 *
 * {
 *   message: "...",
 *   error: {
 *     success: false,
 *     state: "error",
 *     code: "SERVER_TOKEN_INVALID",
 *     ...
 *   }
 * }
 *
 * This function specifically handles that structure.
 */
function findClaimResponse(
  value: unknown,
  depth = 0
): ClaimResponse | null {
  if (!isObject(value) || depth > 6) {
    return null;
  }

  /*
   * Direct claim response.
   */
  if (
    value.code === 'SERVER_TOKEN_INVALID' ||
    value.state === 'error' ||
    value.state === 'waiting' ||
    value.state === 'linked'
  ) {
    return value as ClaimResponse;
  }

  /*
   * Search nested properties.
   */
  for (const key of Object.keys(value)) {
    const child = value[key];

    if (!isObject(child)) {
      continue;
    }

    const result = findClaimResponse(child, depth + 1);

    if (result) {
      return result;
    }
  }

  return null;
}

/**
 * Recursively find HTTP status.
 *
 * Supports structures such as:
 *
 * error.status
 * error.response.status
 * error.error.status
 * error.error.response.status
 */
function findHttpStatus(
  value: unknown,
  depth = 0
): number | undefined {
  if (!isObject(value) || depth > 6) {
    return undefined;
  }

  const directKeys = [
    'status',
    'statusCode',
    'httpStatus',
  ];

  for (const key of directKeys) {
    const candidate = value[key];

    if (
      typeof candidate === 'number' &&
      candidate >= 100 &&
      candidate <= 599
    ) {
      return candidate;
    }
  }

  for (const key of Object.keys(value)) {
    const child = value[key];

    if (!isObject(child)) {
      continue;
    }

    const result = findHttpStatus(child, depth + 1);

    if (result !== undefined) {
      return result;
    }
  }

  return undefined;
}

/**
 * Recursively search for a specific error code.
 */
function findErrorCode(
  value: unknown,
  depth = 0
): string | undefined {
  if (!isObject(value) || depth > 6) {
    return undefined;
  }

  if (typeof value.code === 'string') {
    return value.code;
  }

  for (const key of Object.keys(value)) {
    const child = value[key];

    if (!isObject(child)) {
      continue;
    }

    const result = findErrorCode(child, depth + 1);

    if (result) {
      return result;
    }
  }

  return undefined;
}

/**
 * Safely get an error message.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (isObject(error)) {
    if (typeof error.message === 'string') {
      return error.message;
    }
  }

  return 'Network error';
}

/**
 * Determine whether the error is a real server error.
 *
 * IMPORTANT:
 *
 * SERVER_TOKEN_INVALID must NEVER be retried.
 */
function isPermanentClaimError(
  error: unknown,
  status: number | undefined,
  body: ClaimResponse | null
): boolean {
  /*
   * Most important check.
   */
  if (body?.code === 'SERVER_TOKEN_INVALID') {
    return true;
  }

  /*
   * Also search the complete nested error.
   */
  const nestedCode = findErrorCode(error);

  if (nestedCode === 'SERVER_TOKEN_INVALID') {
    return true;
  }

  /*
   * Backend explicitly says state:error.
   */
  if (body?.state === 'error') {
    return true;
  }

  /*
   * Any HTTP 4xx/5xx is a server response, not a browser
   * network failure.
   */
  if (
    typeof status === 'number' &&
    status >= 400 &&
    status <= 599
  ) {
    return true;
  }

  return false;
}

/* -------------------------------------------------------------------------- */
/* Claim API                                                                  */
/* -------------------------------------------------------------------------- */

async function claimOnce(): Promise<ClaimResult> {
  try {
    const response = await apiPost('/whatsapp/claim', {});

    const res = findClaimResponse(response);

    console.log('[WA claim] response:', response);

    /*
     * ------------------------------------------------------------
     * SUCCESS
     * ------------------------------------------------------------
     */
    if (
      res?.success === true ||
      res?.state === 'linked'
    ) {
      return {
        state: 'linked',
        data: res,
      };
    }

    /*
     * ------------------------------------------------------------
     * WAITING
     * ------------------------------------------------------------
     */
    if (
      res?.state === 'waiting' ||
      res?.step === 'no_new_account'
    ) {
      return {
        state: 'waiting',
      };
    }

    /*
     * ------------------------------------------------------------
     * SERVER ERROR
     * ------------------------------------------------------------
     */
    if (res?.state === 'error') {
      console.error(
        '[WA claim] server error:',
        res
      );

      return {
        state: 'error',
        message:
          res.message ||
          'WhatsApp connection could not be completed.',
        code: res.code,
      };
    }

    /*
     * Unexpected 2xx response.
     */
    console.warn(
      '[WA claim] unexpected response:',
      response
    );

    return {
      state: 'soft-error',
      message:
        res?.message ||
        'Unexpected WhatsApp claim response',
    };
  } catch (error) {
    /*
     * apiPost() throws here for HTTP 503.
     *
     * IMPORTANT:
     * The actual backend JSON is nested inside error.error
     * in your current api.ts implementation.
     */

    const status = findHttpStatus(error);
    const body = findClaimResponse(error);
    const errorCode = findErrorCode(error);
    const message = getErrorMessage(error);

    console.error(
      '[WA claim] request failed:',
      {
        status,
        body,
        errorCode,
        message,
        error,
      }
    );

    /*
     * ------------------------------------------------------------
     * SERVER_TOKEN_INVALID
     * ------------------------------------------------------------
     *
     * This is your current error:
     *
     * code: SERVER_TOKEN_INVALID
     * detail.code: 190
     * detail.subcode: 460
     *
     * STOP POLLING.
     */
    if (
      errorCode === 'SERVER_TOKEN_INVALID' ||
      body?.code === 'SERVER_TOKEN_INVALID'
    ) {
      console.error(
        '[WA claim] SERVER_TOKEN_INVALID - stopping polling.'
      );

      return {
        state: 'error',
        code: 'SERVER_TOKEN_INVALID',
        message:
          body?.message ||
          'WhatsApp connection is temporarily unavailable. Please contact support.',
      };
    }

    /*
     * ------------------------------------------------------------
     * Any backend state:error
     * ------------------------------------------------------------
     */
    if (
      body?.state === 'error'
    ) {
      console.error(
        '[WA claim] permanent server error - stopping polling:',
        body
      );

      return {
        state: 'error',
        code: body.code,
        message:
          body.message ||
          'WhatsApp connection could not be completed.',
      };
    }

    /*
     * ------------------------------------------------------------
     * HTTP 4xx / 5xx
     * ------------------------------------------------------------
     *
     * Server responded, so don't treat it as a network retry.
     */
    if (
      typeof status === 'number' &&
      status >= 400 &&
      status <= 599
    ) {
      console.error(
        '[WA claim] HTTP server error - stopping polling:',
        status
      );

      return {
        state: 'error',
        message:
          body?.message ||
          message ||
          `WhatsApp claim failed (${status})`,
        code: body?.code,
      };
    }

    /*
     * ------------------------------------------------------------
     * REAL NETWORK ERROR
     * ------------------------------------------------------------
     *
     * Only this category should be retried.
     */
    return {
      state: 'soft-error',
      message: message || 'Network error',
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Polling state                                                              */
/* -------------------------------------------------------------------------- */

let checking = false;
let softFailures = 0;
let pollTimer: number | undefined;

/* -------------------------------------------------------------------------- */
/* Finish                                                                     */
/* -------------------------------------------------------------------------- */

function finish(
  kind: 'linked' | 'failed',
  detail: unknown
) {
  /*
   * Remove pending connection state.
   */
  localStorage.removeItem(PENDING_KEY);

  /*
   * Stop polling immediately.
   */
  stopWhatsAppPolling();

  /*
   * Reset temporary network failure count.
   */
  softFailures = 0;

  console.log(
    kind === 'linked'
      ? '[WA] WhatsApp connection completed'
      : '[WA] WhatsApp connection failed',
    detail
  );

  /*
   * Notify the application.
   */
  window.dispatchEvent(
    new CustomEvent(
      kind === 'linked'
        ? 'whatsapp-linked'
        : 'whatsapp-link-failed',
      {
        detail,
      }
    )
  );
}

/* -------------------------------------------------------------------------- */
/* Stop polling                                                               */
/* -------------------------------------------------------------------------- */

export function stopWhatsAppPolling() {
  if (pollTimer !== undefined) {
    window.clearTimeout(pollTimer);
  }

  pollTimer = undefined;
}

/* -------------------------------------------------------------------------- */
/* Check once                                                                 */
/* -------------------------------------------------------------------------- */

export async function checkPendingWhatsApp(): Promise<
  'linked' | 'waiting' | 'error' | 'none'
> {
  /*
   * Prevent simultaneous claim requests.
   */
  if (checking) {
    return 'waiting';
  }

  /*
   * Is there an active WhatsApp connection attempt?
   */
  const pending = readPending();

  if (!pending) {
    return 'none';
  }

  /*
   * Overall 10-minute timeout.
   */
  if (
    pending.startedAt &&
    Date.now() - pending.startedAt > MAX_MS
  ) {
    finish('failed', {
      message:
        'WhatsApp connection timed out. Please try again.',
    });

    return 'error';
  }

  checking = true;

  try {
    const result = await claimOnce();

    /*
     * ------------------------------------------------------------
     * LINKED
     * ------------------------------------------------------------
     */
    if (result.state === 'linked') {
      finish('linked', result.data);

      return 'linked';
    }

    /*
     * ------------------------------------------------------------
     * REAL SERVER ERROR
     * ------------------------------------------------------------
     *
     * SERVER_TOKEN_INVALID reaches here.
     *
     * NO RETRY.
     */
    if (result.state === 'error') {
      finish('failed', {
        message: result.message,
        code: result.code,
      });

      return 'error';
    }

    /*
     * ------------------------------------------------------------
     * TEMPORARY NETWORK ERROR
     * ------------------------------------------------------------
     */
    if (result.state === 'soft-error') {
      softFailures += 1;

      console.warn(
        `[WA claim] temporary failure ${softFailures}/${MAX_SOFT_FAILURES}:`,
        result.message
      );

      /*
       * Give up after four genuine network failures.
       */
      if (
        softFailures >= MAX_SOFT_FAILURES
      ) {
        finish('failed', {
          message:
            'Unable to complete WhatsApp connection. Please check your internet connection and try again.',
          reason: result.message,
        });

        return 'error';
      }

      return 'waiting';
    }

    /*
     * ------------------------------------------------------------
     * WAITING
     * ------------------------------------------------------------
     */
    softFailures = 0;

    return 'waiting';
  } finally {
    checking = false;
  }
}

/* -------------------------------------------------------------------------- */
/* Start polling                                                              */
/* -------------------------------------------------------------------------- */

export function startWhatsAppPolling() {
  /*
   * Never allow multiple timers.
   */
  stopWhatsAppPolling();

  const tick = async () => {
    /*
     * Timer has now fired.
     */
    pollTimer = undefined;

    const result =
      await checkPendingWhatsApp();

    /*
     * linked / error / none
     * => completely stop.
     */
    if (result !== 'waiting') {
      return;
    }

    /*
     * Only WAITING gets another timer.
     */
    pollTimer = window.setTimeout(
      tick,
      POLL_MS
    );
  };

  pollTimer = window.setTimeout(
    tick,
    POLL_MS
  );
}

/* -------------------------------------------------------------------------- */
/* Resume watcher                                                             */
/* -------------------------------------------------------------------------- */

export function startWhatsAppResumeWatcher(): () => void {
  let stateHandle:
    | PluginListenerHandle
    | undefined;

  let browserHandle:
    | PluginListenerHandle
    | undefined;

  let removed = false;

  /*
   * App starts with a pending WhatsApp connection.
   */
  if (readPending()) {
    void checkPendingWhatsApp();

    startWhatsAppPolling();
  }

  /*
   * App becomes active again.
   */
  void App.addListener(
    'appStateChange',
    ({ isActive }) => {
      if (
        !isActive ||
        !readPending()
      ) {
        return;
      }

      console.log(
        '[WA] App active - checking WhatsApp connection'
      );

      void checkPendingWhatsApp();

      startWhatsAppPolling();
    }
  ).then((handle) => {
    if (removed) {
      void handle.remove();
    } else {
      stateHandle = handle;
    }
  });

  /*
   * Meta browser closes.
   */
  void Browser.addListener(
    'browserFinished',
    () => {
      if (!readPending()) {
        return;
      }

      console.log(
        '[WA] Browser finished - checking WhatsApp connection'
      );

      void checkPendingWhatsApp();

      startWhatsAppPolling();
    }
  ).then((handle) => {
    if (removed) {
      void handle.remove();
    } else {
      browserHandle = handle;
    }
  });

  /*
   * Cleanup.
   */
  return () => {
    removed = true;

    stopWhatsAppPolling();

    void stateHandle?.remove();
    void browserHandle?.remove();
  };
}