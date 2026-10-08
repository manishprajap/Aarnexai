// src/utils/promptPlan.ts
//
// Server-backed prompt plan helpers. No localStorage, no hardcoded prompts.
//   GET  /prompt-plan            -> saved plan + today's prompt
//   POST /prompt-plan/generate   -> Gemini generates 30 TEMPLATE prompts + saves to DB
//
// Templates contain placeholders that are filled on the client:
//   {category}  {subcategory}  {childcategory}
// Use fillPromptTemplate() to turn a template into the final text.

import { apiGet, apiPost } from '../api';

export interface PromptPlanItem {
  day: number;
  prompt: string;
  theme?: string | null;
}

export interface PromptPlanResponse {
  items: PromptPlanItem[];
  today: PromptPlanItem | null;
  // ISO date string of when the current plan was generated/started.
  // Comes from the server (plan.startDate on GET, startDate on POST /generate).
  startDate: string | null;
}

export interface PromptPlanRegenerationState {
  locked: boolean;
  nextAvailableAt: number | null;
  daysUntilUnlock: number;
}

const PROMPT_PLAN_LOCK_MS = 30 * 24 * 60 * 60 * 1000;

export const getPromptPlanRegenerationState = (
  startDate: string | null,
  itemCount: number,
  now = Date.now(),
): PromptPlanRegenerationState => {
  if (itemCount <= 0) {
    return { locked: false, nextAvailableAt: null, daysUntilUnlock: 0 };
  }

  const startAt = startDate
    ? /^\d{4}-\d{2}-\d{2}$/.test(startDate)
      ? Date.parse(`${startDate}T00:00:00.000Z`)
      : Date.parse(startDate)
    : Number.NaN;
  const nextAvailableAt = Number.isFinite(startAt) ? startAt + PROMPT_PLAN_LOCK_MS : null;
  const locked = nextAvailableAt === null || nextAvailableAt > now;

  return {
    locked,
    nextAvailableAt,
    daysUntilUnlock: locked && nextAvailableAt !== null
      ? Math.max(1, Math.ceil((nextAvailableAt - now) / PROMPT_PLAN_LOCK_MS * 30))
      : 0,
  };
};

export const DEFAULT_LOCATION = 'Lucknow, India';

export interface GeneratePlanInput {
  categoryId?: number | string | null;
  subcategoryId?: number | string | null;
  childCategoryId?: number | string | null;
  categoryName?: string | null;
  businessName?: string | null;
  location?: string | null;
}

export interface TemplateContext {
  category?: string | null;
  subcategory?: string | null;
  childCategory?: string | null;
    location?: string | null;
}

const CHILD_TOKEN = /\{\{?\s*child[\s_-]*categor(?:y|ies)\s*\}?\}/gi;
const SUB_TOKEN = /\{\{?\s*sub[\s_-]*categor(?:y|ies)\s*\}?\}/gi;
const CAT_TOKEN = /\{\{?\s*category\s*\}?\}/gi;
const ANY_TOKEN = /\{\{?\s*(?:child[\s_-]*|sub[\s_-]*)?categor(?:y|ies)\s*\}?\}/i;
const LOC_TOKEN = /\{\{?\s*location\s*\}?\}/gi;

export const fillPromptTemplate = (prompt: string, ctx: TemplateContext = {}): string => {
  const category = ctx.category?.trim() || '';
  const sub = ctx.subcategory?.trim() || category;
  const child = ctx.childCategory?.trim() || sub;
  const location = ctx.location?.trim() || DEFAULT_LOCATION;

  return (prompt || '')
    .replace(CHILD_TOKEN, child)
    .replace(SUB_TOKEN, sub)
    .replace(CAT_TOKEN, category)
    .replace(LOC_TOKEN, location)
    .replace(/\s{2,}/g, ' ')
    .trim();
};

/** apiGet/apiPost may reject with a plain `{ error }` object; turn it into a real Error. */
const toError = (e: any): Error => {
  if (e instanceof Error) return e;
  return new Error(e?.message || e?.error || 'Request failed');
};

const hasTokens = (items: PromptPlanItem[]) => items.some((i) => ANY_TOKEN.test(i.prompt));

// In-memory only (refilled from the server). NOT localStorage.
let cache: PromptPlanResponse = { items: [], today: null, startDate: null };

export const normalizePromptPlanResponse = (response: any): PromptPlanResponse => {
  const data = response?.data ?? response;
  const plan = data?.plan ?? data;
  const rawItems = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(plan?.items)
      ? plan.items
      : [];
  const items = rawItems
    .filter((item: any) => Number.isFinite(Number(item?.day)) && typeof item?.prompt === 'string')
    .map((item: any) => ({
      day: Number(item.day),
      prompt: item.prompt,
      theme: typeof item.theme === 'string' ? item.theme : null,
    }))
    .sort((a: PromptPlanItem, b: PromptPlanItem) => a.day - b.day);

  return {
    items,
    today: data?.today ?? plan?.today ?? null,
    startDate: plan?.startDate ?? data?.startDate ?? null,
  };
};


const withTimeout = <T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
};

const GENERATE_TIMEOUT_MS = 90_000;

/** Loads the user's saved plan + today's prompt from the DB. */
export const fetchPromptPlan = async (): Promise<PromptPlanResponse> => {
  try {
    cache = normalizePromptPlanResponse(await apiGet('/prompt-plan'));
  } catch (e) {
    throw toError(e);
  }
  return cache;
};

/** Today's prompt as computed by the server. */
export const getTodayPrompt = async (): Promise<PromptPlanItem | null> => {
  return (await fetchPromptPlan()).today;
};

export const generatePromptPlan = async (
  input: GeneratePlanInput | string,
  _subcategory?: string,
  _childCategory?: string,
): Promise<PromptPlanResponse> => {
  const opts: GeneratePlanInput =
    typeof input === 'string' ? { categoryName: input } : input || {};

  const body = {
    categoryId: opts.categoryId ?? undefined,
    subcategoryId: opts.subcategoryId ?? undefined,
    childCategoryId: opts.childCategoryId ?? undefined,
    categoryName: opts.categoryName?.trim() || undefined,
    businessName: opts.businessName?.trim() || undefined,
     location: opts.location?.trim() || DEFAULT_LOCATION,
  };

  if (!body.categoryId && !body.categoryName && !body.businessName) {
    throw new Error('Category not found. Please complete Business Setup first.');
  }

  try {
    cache = normalizePromptPlanResponse(
      await withTimeout(
        apiPost('/prompt-plan/generate', body),
        GENERATE_TIMEOUT_MS,
        'Generation is taking longer than expected. Please try again in a moment.'
      )
    );
  } catch (e) {
    throw toError(e);
  }

  return cache;
};

let inflight: Promise<PromptPlanResponse> | null = null;
let regenAttempted = false;

/**
 * Returns the saved plan. If the user has no plan yet, or only an OLD plan
 * without placeholders, generates a fresh one ONCE (per app session).
 * Concurrent calls share one request, so Gemini is not hit twice.
 */
export const ensurePromptPlan = (input: GeneratePlanInput): Promise<PromptPlanResponse> => {
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const current = await fetchPromptPlan();

      if (current.items.length === 30 && hasTokens(current.items)) return current;
      if (regenAttempted) return current;

      regenAttempted = true;

      try {
        return await generatePromptPlan(input);
      } catch (err) {
        regenAttempted = false; // allow a retry on next visit
        throw err;
      }
    } finally {
      inflight = null;
    }
  })();

  return inflight;
};

/* ------------------------------------------------------------------
 * Legacy helpers, kept only so old imports never crash the app.
 * ------------------------------------------------------------------ */

/** @deprecated use fetchPromptPlan() */
export const getPromptPlan = (_userId?: string | number): PromptPlanItem[] => cache.items;

/** @deprecated the server saves the plan; no-op. */
export const savePromptPlan = (_userId?: string | number, _plan?: PromptPlanItem[]): void => {};

/** @deprecated today's day comes from the server (getTodayPrompt). */
export const getPlanDay = (_date?: Date): number => cache.today?.day ?? 1;