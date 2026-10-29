// src/services/whatsappCampaigns.ts

const API_BASE: string = (
  import.meta.env.VITE_API_BASE_URL ??
  'https://aarnexai.com/aarnexai-backend/api'
).replace(/\/+$/, '');

const getToken = () =>
  localStorage.getItem('token') ??
  localStorage.getItem('auth_token') ??
  localStorage.getItem('delivery_token') ??
  localStorage.getItem('access_token') ??
  '';

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers ?? {}),
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      body?.message || body?.error || 'Request failed. Please try again.',
    );
  }

  return (body?.data ?? body) as T;
}

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
  customMessage?: string | null;
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
  /**
   * Optional free-text message. Sent only to recipients who messaged the
   * business in the last 24 hours; everyone else receives the template.
   */
  customMessage?: string | null;
  recipients: CampaignRecipient[];
  scheduledAt?: string | null;
  optInConfirmed: boolean;
}

export const getCampaigns = () =>
  request<Campaign[]>('/whatsapp/campaigns');

export const getCampaignQuota = () =>
  request<CampaignQuota>('/whatsapp/campaigns/quota');

export const createCampaign = (input: CreateCampaignInput) =>
  request<Campaign>('/whatsapp/campaigns', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const cancelCampaign = (id: number | string) =>
  request<void>(
    `/whatsapp/campaigns/${encodeURIComponent(String(id))}/cancel`,
    { method: 'POST' },
  );

export const retryCampaignFailures = (id: number | string) =>
  request<void>(
    `/whatsapp/campaigns/${encodeURIComponent(String(id))}/retry`,
    { method: 'POST' },
  );

export interface AnalyticsSummary {
  days: number;
  sent: number;
  received: number;
  delivered: number;
  read: number;
  failed: number;
  activeConversations: number;
  daily: { date: string; sent: number; received: number }[];
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
    topProducts: { name: string; shares: number }[];
  };
}

export const getWhatsAppAnalytics = (days: number) => {
  const safeDays = [7, 30, 90].includes(days) ? days : 7;

  return request<AnalyticsSummary>(
    `/whatsapp/analytics?days=${safeDays}`,
  );
};