
const API_BASE = String((import.meta as any).env?.VITE_API_URL ?? '').replace(/\/+$/, '');

const getToken = (): string => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('token') ?? '';
};

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getToken();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  let body: any = {};

  if (contentType.includes('application/json')) {
    body = await response.json().catch(() => ({}));
  } else {
    body = await response.text().catch(() => '');
  }

  if (!response.ok) {
    const message =
      typeof body === 'string'
        ? body
        : body?.message || body?.error || `Request failed (${response.status}).`;

    throw new Error(message || `Request failed (${response.status}).`);
  }

  return (body?.data ?? body) as T;
}

/* ----------------------------- Campaigns ----------------------------- */

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface Campaign {
  id: number | string;
  name: string;
  templateId: number | string;
  templateName: string;
  status: CampaignStatus;
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  scheduledAt?: string | null;
  createdAt: string;
}

export interface CampaignQuota {
  plan: 'free' | 'pro';
  monthlyLimit: number | null;
  usedThisMonth: number;
  activeLimit: number | null;
  activeCount: number;
}

export interface CampaignRecipient {
  phone: string;
  name?: string;
}

export interface CreateCampaignInput {
  name: string;
  templateId: number | string;
  parameters: string[];
  recipients: CampaignRecipient[];
  scheduledAt?: string | null;
  optInConfirmed: boolean;
}

export const getCampaigns = () =>
  request<Campaign[]>('/api/whatsapp/campaigns');

export const getCampaignQuota = () =>
  request<CampaignQuota>('/api/whatsapp/campaigns/quota');

export const createCampaign = (input: CreateCampaignInput) =>
  request<Campaign>('/api/whatsapp/campaigns', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const cancelCampaign = (id: number | string) =>
  request<void>(
    `/api/whatsapp/campaigns/${encodeURIComponent(String(id))}/cancel`,
    { method: 'POST' },
  );

export const retryCampaignFailures = (id: number | string) =>
  request<void>(
    `/api/whatsapp/campaigns/${encodeURIComponent(String(id))}/retry`,
    { method: 'POST' },
  );

/* ----------------------------- Analytics ----------------------------- */

export interface AnalyticsSummary {
  days: number;
  sent: number;
  received: number;
  delivered: number;
  read: number;
  failed: number;
  activeConversations: number;
  daily: { date: string; sent: number; received: number }[];

  // Only returned when the backend allows advanced analytics.
  advanced?: {
    avgResponseMinutes: number | null;
    topTemplates: {
      name: string;
      sent: number;
      readRate: number;
    }[];
    campaigns: {
      id: number | string;
      name: string;
      sent: number;
      delivered: number;
      read: number;
      failed: number;
    }[];
    topProducts: {
      name: string;
      shares: number;
    }[];
  };
}

export const getWhatsAppAnalytics = (days: number) => {
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw new Error('Analytics days must be an integer between 1 and 365.');
  }

  return request<AnalyticsSummary>(
    `/api/whatsapp/analytics?days=${days}`,
  );
};
