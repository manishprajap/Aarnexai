
const API_BASE: string = (
  (import.meta as any).env?.VITE_API_URL ?? 'https://aarnexai.com/aarnexai-backend'
).replace(/\/+$/, '');
const getToken = () => localStorage.getItem('token') ?? '';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
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
    throw new Error(body?.message || body?.error || 'Request failed. Please try again.');
  }
  return (body?.data ?? body) as T;
}

/* ----------------------------- Campaigns ----------------------------- */

export type CampaignStatus =
  | 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled' | 'failed';

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
  monthlyLimit: number | null;   // null = unlimited
  usedThisMonth: number;
  activeLimit: number | null;    // null = unlimited
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

export const getCampaigns = () => request<Campaign[]>('/api/whatsapp/campaigns');
export const getCampaignQuota = () => request<CampaignQuota>('/api/whatsapp/campaigns/quota');
export const createCampaign = (input: CreateCampaignInput) =>
  request<Campaign>('/api/whatsapp/campaigns', { method: 'POST', body: JSON.stringify(input) });
export const cancelCampaign = (id: number | string) =>
  request<void>(`/api/s/${id}/cancel`, { method: 'POST' });
export const retryCampaignFailures = (id: number | string) =>
  request<void>(`/api/whatsapp/campaigns/${id}/retry`, { method: 'POST' });

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
  // Paid-only (server must omit these for free plans)
  advanced?: {
    avgResponseMinutes: number | null;
    topTemplates: { name: string; sent: number; readRate: number }[];
    campaigns: { id: number | string; name: string; sent: number; delivered: number; read: number; failed: number }[];
    topProducts: { name: string; shares: number }[];
  };
}

export const getWhatsAppAnalytics = (days: number) =>
  request<AnalyticsSummary>(`/api/whatsapp/analytics?days=${days}`);