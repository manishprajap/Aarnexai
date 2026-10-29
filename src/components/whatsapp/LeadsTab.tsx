// File: src/components/whatsapp/LeadsTab.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IonIcon, IonSpinner } from '@ionic/react';
import {
  callOutline,
  chatbubbleEllipsesOutline,
  checkmarkCircleOutline,
  createOutline,
  peopleOutline,
  refreshOutline,
  searchOutline,
} from 'ionicons/icons';
import {
  LEAD_STAGES,
  LeadStage,
  WhatsAppLead,
  getWhatsAppLeads,
  updateWhatsAppLead,
} from '../../services/whatsappLeads';
import './LeadsTab.css';

interface LeadsTabProps {
  onOpenChat: (conversationId: number) => void;
}

const STAGE_LABELS: Record<LeadStage, string> = {
  new: 'New',
  interested: 'Interested',
  follow_up: 'Follow-up',
  won: 'Won',
  lost: 'Lost',
};

const POLL_INTERVAL_MS = 15000;
const PAGE_SIZE = 20;

const sourceLabel = (source: string) => {
  if (source === 'ad') return 'Ad click';
  if (source === 'direct') return 'Direct message';
  return `Source: ${source}`;
};

const formatWhen = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const displayPhone = (phone: string) => (/^\d+$/.test(phone) ? `+${phone}` : phone);

const LeadsTab: React.FC<LeadsTabProps> = ({ onOpenChat }) => {
  const [leads, setLeads] = useState<WhatsAppLead[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [sources, setSources] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [stage, setStage] = useState<LeadStage | 'all'>('all');
  const [source, setSource] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openNotesId, setOpenNotesId] = useState<number | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(
    async (silent = false) => {
      const requestId = ++requestRef.current;
      if (!silent) setLoading(true);
      try {
        const result = await getWhatsAppLeads({ stage, source, q: query, limit });
        if (requestId !== requestRef.current) return; // a newer request replaced this one
        setLeads(result.leads);
        setCounts(result.counts);
        setSources(result.sources);
        setTotal(result.total);
        setError('');
      } catch (loadError) {
        if (requestId !== requestRef.current) return;
        setError(loadError instanceof Error ? loadError.message : 'Could not load leads.');
      } finally {
        if (requestId === requestRef.current && !silent) setLoading(false);
      }
    },
    [stage, source, query, limit],
  );

  // Debounce the search box.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim());
      setLimit(PAGE_SIZE);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  // New leads arrive through the webhook, so refresh quietly in the background.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) void load(true);
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const handleStageChange = async (lead: WhatsAppLead, next: LeadStage) => {
    setLeads((current) => current.map((item) => (item.id === lead.id ? { ...item, stage: next } : item)));
    try {
      await updateWhatsAppLead(lead.id, { stage: next });
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Could not update the lead.');
    } finally {
      void load(true);
    }
  };

  const openNotes = (lead: WhatsAppLead) => {
    if (openNotesId === lead.id) {
      setOpenNotesId(null);
      return;
    }
    setOpenNotesId(lead.id);
    setNotesDraft(lead.notes ?? '');
  };

  const saveNotes = async (lead: WhatsAppLead) => {
    setSavingId(lead.id);
    try {
      await updateWhatsAppLead(lead.id, { notes: notesDraft });
      setLeads((current) =>
        current.map((item) => (item.id === lead.id ? { ...item, notes: notesDraft.trim() || null } : item)),
      );
      setOpenNotesId(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save notes.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="wa-section">
      <div className="wa-page-heading">
        <div>
          <p className="wa-eyebrow">WHATSAPP LEADS</p>
          <h1>Leads</h1>
          <p>Everyone who messages your WhatsApp number is saved here automatically.</p>
        </div>
        <button type="button" className="wa-icon-button" onClick={() => void load()} aria-label="Refresh leads">
          <IonIcon icon={refreshOutline} />
        </button>
      </div>

      {error && (
        <div className="wa-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="Dismiss error">×</button>
        </div>
      )}

      <div className="wa-leads-chips" role="tablist" aria-label="Lead stages">
        <button
          type="button"
          className={stage === 'all' ? 'is-active' : ''}
          onClick={() => { setStage('all'); setLimit(PAGE_SIZE); }}
        >
          All <span>{counts.all ?? 0}</span>
        </button>
        {LEAD_STAGES.map((item) => (
          <button
            key={item}
            type="button"
            className={stage === item ? 'is-active' : ''}
            onClick={() => { setStage(item); setLimit(PAGE_SIZE); }}
          >
            {STAGE_LABELS[item]} <span>{counts[item] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="wa-leads-toolbar">
        <div className="wa-search">
          <IonIcon icon={searchOutline} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, number or message"
            aria-label="Search leads"
          />
        </div>
        {sources.length > 1 && (
          <select
            value={source}
            onChange={(event) => { setSource(event.target.value); setLimit(PAGE_SIZE); }}
            aria-label="Filter by source"
          >
            <option value="">All sources</option>
            {sources.map((item) => (
              <option key={item} value={item}>{sourceLabel(item)}</option>
            ))}
          </select>
        )}
      </div>

      {loading && leads.length === 0 ? (
        <div className="wa-loading"><IonSpinner /><span>Loading leads...</span></div>
      ) : leads.length === 0 ? (
        <div className="wa-empty">
          <IonIcon icon={peopleOutline} />
          <h2>{query || stage !== 'all' || source ? 'No matching leads' : 'No leads yet'}</h2>
          <p>
            {query || stage !== 'all' || source
              ? 'Try changing the filters.'
              : 'When a customer messages your WhatsApp number, they will appear here.'}
          </p>
        </div>
      ) : (
        <>
          <ul className="wa-lead-list">
            {leads.map((lead) => (
              <li className="wa-lead-card" key={lead.id}>
                <div className="wa-lead-top">
                  <span className="wa-customer-avatar">
                    {(lead.name || lead.phoneNumber).slice(0, 1).toUpperCase()}
                  </span>
                  <div className="wa-lead-id">
                    <strong>{lead.name || displayPhone(lead.phoneNumber)}</strong>
                    <small>{displayPhone(lead.phoneNumber)}</small>
                  </div>
                  <span className={`wa-lead-source${lead.source === 'ad' ? ' is-ad' : ''}`}>
                    {sourceLabel(lead.source)}
                  </span>
                </div>

                {lead.adReferral?.headline && (
                  <p className="wa-lead-ad">Ad: {lead.adReferral.headline}</p>
                )}
                <p className="wa-lead-message">{lead.firstMessage || '—'}</p>

                <div className="wa-lead-meta">
                  <span>{lead.messageCount} message{lead.messageCount === 1 ? '' : 's'}</span>
                  <span>First: {formatWhen(lead.createdAt)}</span>
                  <span>Last: {formatWhen(lead.lastMessageAt)}</span>
                </div>

                {lead.notes && openNotesId !== lead.id && <p className="wa-lead-notes">📝 {lead.notes}</p>}

                <div className="wa-lead-actions">
                  <select
                    className={`wa-lead-stage is-${lead.stage}`}
                    value={lead.stage}
                    onChange={(event) => void handleStageChange(lead, event.target.value as LeadStage)}
                    aria-label={`Stage for ${lead.name || lead.phoneNumber}`}
                  >
                    {LEAD_STAGES.map((item) => (
                      <option key={item} value={item}>{STAGE_LABELS[item]}</option>
                    ))}
                  </select>
                  {lead.conversationId !== null && (
                    <button type="button" onClick={() => onOpenChat(Number(lead.conversationId))}>
                      <IonIcon icon={chatbubbleEllipsesOutline} /> Chat
                    </button>
                  )}
                  <a href={`tel:${displayPhone(lead.phoneNumber)}`}>
                    <IonIcon icon={callOutline} /> Call
                  </a>
                  <button type="button" onClick={() => openNotes(lead)}>
                    <IonIcon icon={createOutline} /> Notes
                  </button>
                </div>

                {openNotesId === lead.id && (
                  <div className="wa-lead-notes-editor">
                    <textarea
                      rows={3}
                      maxLength={2000}
                      value={notesDraft}
                      onChange={(event) => setNotesDraft(event.target.value)}
                      placeholder="Add a note about this lead"
                    />
                    <button
                      type="button"
                      className="wa-primary-button"
                      disabled={savingId === lead.id}
                      onClick={() => void saveNotes(lead)}
                    >
                      {savingId === lead.id ? <IonSpinner name="crescent" /> : <IonIcon icon={checkmarkCircleOutline} />}
                      Save note
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {leads.length < total && (
            <button type="button" className="wa-secondary-button wa-leads-more" onClick={() => setLimit((current) => current + PAGE_SIZE)}>
              Show more ({total - leads.length} remaining)
            </button>
          )}
        </>
      )}
    </section>
  );
};

export default LeadsTab;