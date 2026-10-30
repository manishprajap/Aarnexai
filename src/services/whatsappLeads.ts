// File: src/services/whatsappLeads.ts
import { apiGet, apiPatch } from '../api';

export const LEAD_STAGES = ['new', 'interested', 'follow_up', 'won', 'lost'] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export interface WhatsAppLead {
  id: number;
  contactId: number;
  conversationId: number | null;
  phoneNumber: string;
  name: string | null;
  source: string;
  adReferral?: {
    headline?: string;
    body?: string;
    source_url?: string;
    source_type?: string;
    source_id?: string;
  } | null;
  stage: LeadStage;
  notes: string | null;
  firstMessage: string | null;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
}

export interface WhatsAppLeadsResult {
  leads: WhatsAppLead[];
  total: number;
  counts: Record<string, number>;
  sources: string[];
}

export const getWhatsAppLeads = async (params: {
  stage?: LeadStage | 'all';
  source?: string;
  q?: string;
  limit?: number;
}): Promise<WhatsAppLeadsResult> => {
  const query = new URLSearchParams();
  if (params.stage && params.stage !== 'all') query.set('stage', params.stage);
  if (params.source) query.set('source', params.source);
  if (params.q?.trim()) query.set('q', params.q.trim());
  if (params.limit) query.set('limit', String(params.limit));

  const response: any = await apiGet(`/whatsapp/leads?${query.toString()}`);
  if (response?.success === false) {
    throw new Error(response?.message || 'Could not load leads.');
  }

  const data = response?.data ?? response;
  return {
    leads: Array.isArray(data?.leads) ? data.leads : [],
    total: Number(data?.total) || 0,
    counts: data?.counts ?? {},
    sources: Array.isArray(data?.sources) ? data.sources : [],
  };
};

export const updateWhatsAppLead = async (
  id: number,
  changes: { stage?: LeadStage; notes?: string },
): Promise<void> => {
  const response: any = await apiPatch('/whatsapp/leads', { id, ...changes });
  if (response?.success === false) {
    throw new Error(response?.message || 'Could not update the lead.');
  }
};