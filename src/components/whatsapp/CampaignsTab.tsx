import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { IonIcon, IonSpinner } from '@ionic/react';
import {
  addOutline,
  closeOutline,
  cloudUploadOutline,
  informationCircleOutline,
  megaphoneOutline,
  refreshOutline,
  sendOutline,
} from 'ionicons/icons';
import {
  WhatsAppConnection,
  WhatsAppConversation,
  WhatsAppMessageTemplate,
} from '../../services/whatsappCommerce';
import {
  Campaign,
  CampaignQuota,
  CampaignRecipient,
  cancelCampaign,
  createCampaign,
  getCampaignQuota,
  getCampaigns,
  retryCampaignFailures,
} from '../../services/whatsappCampaigns';
import UpgradeGate from './UpgradeGate';

interface CampaignsTabProps {
  isPaid: boolean;
  connection: WhatsAppConnection | null;
  templates: WhatsAppMessageTemplate[];
  conversations: WhatsAppConversation[];
  onUpgrade: () => void;
}

const MAX_CUSTOM_MESSAGE_LENGTH = 1000;

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : 'Request failed. Please try again.';

const normalizePhone = (raw: string): string | null => {
  let digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`; // default to India
  return digits.length >= 11 && digits.length <= 15 ? digits : null;
};

/** Highest {{n}} placeholder found in a template body (0 if none). */
const countPlaceholders = (body?: string | null): number => {
  const nums = Array.from((body ?? '').matchAll(/\{\{\s*(\d+)\s*\}\}/g)).map((m) => Number(m[1]));
  return nums.length ? Math.max(...nums) : 0;
};

/** Trust parameterCount from the API, but fall back to counting placeholders in the body. */
const getParamCount = (template?: WhatsAppMessageTemplate | null): number => {
  if (!template) return 0;
  const fromApi = Number(template.parameterCount ?? 0);
  return fromApi > 0 ? fromApi : countPlaceholders(template.bodyText);
};

// Accepts lines like "9876543210", "9876543210,Asha" or "9876543210<tab>Asha"
const parseRecipients = (text: string): { valid: CampaignRecipient[]; invalid: number } => {
  const seen = new Set<string>();
  const valid: CampaignRecipient[] = [];
  let invalid = 0;
  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const [first, ...rest] = trimmed.split(/[,;\t]/);
    const phone = normalizePhone(first);
    if (!phone) {
      // Skip a header row silently, count anything else as invalid
      if (/[a-z]/i.test(first) && valid.length === 0 && invalid === 0) return;
      invalid += 1;
      return;
    }
    if (seen.has(phone)) return;
    seen.add(phone);
    valid.push({ phone, name: rest.join(' ').trim() || undefined });
  });
  return { valid, invalid };
};

const statusLabel: Record<Campaign['status'], string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  sending: 'Sending',
  completed: 'Completed',
  cancelled: 'Cancelled',
  failed: 'Failed',
};

const formatDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const CampaignsTab: React.FC<CampaignsTabProps> = ({
  isPaid,
  connection,
  templates,
  conversations,
  onUpgrade,
}) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [quota, setQuota] = useState<CampaignQuota | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState<string | number | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [parameters, setParameters] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [recipientText, setRecipientText] = useState('');
  const [pickedPhones, setPickedPhones] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [optIn, setOptIn] = useState(false);

  const approvedTemplates = useMemo(
    () => templates.filter((template) => template.status === 'APPROVED'),
    [templates],
  );
  const selectedTemplate = approvedTemplates.find((template) => String(template.id) === templateId);
  const paramCount = getParamCount(selectedTemplate);

  // Keep the number of value inputs in sync with the template (also covers templates loading late).
  useEffect(() => {
    setParameters((current) =>
      current.length === paramCount
        ? current
        : Array.from({ length: paramCount }, (_, i) => current[i] ?? ''),
    );
  }, [paramCount, templateId]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [list, limits] = await Promise.all([getCampaigns(), getCampaignQuota()]);
      setCampaigns(list);
      setQuota(limits);
    } catch (err) {
      setError(errorText(err));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Poll while something is sending so progress updates live
  const hasActive = campaigns.some((c) => c.status === 'sending' || c.status === 'scheduled');
  useEffect(() => {
    if (!hasActive) return undefined;
    const timer = window.setInterval(() => {
      if (!document.hidden) void load(true);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [hasActive, load]);

  const parsed = useMemo(() => parseRecipients(recipientText), [recipientText]);

  const allRecipients = useMemo(() => {
    const map = new Map<string, CampaignRecipient>();
    const picked = new Set(
      pickedPhones
        .map((phone) => normalizePhone(phone))
        .filter((phone): phone is string => Boolean(phone)),
    );

    conversations.forEach((conversation) => {
      const phone = normalizePhone(conversation.phoneNumber);
      if (phone && picked.has(phone)) {
        map.set(phone, { phone, name: conversation.customerName || undefined });
      }
    });

    // Pasted/CSV recipients are merged with selected conversations and deduplicated.
    parsed.valid.forEach((recipient) => {
      const existing = map.get(recipient.phone);
      map.set(recipient.phone, {
        phone: recipient.phone,
        name: recipient.name || existing?.name,
      });
    });

    return Array.from(map.values());
  }, [conversations, pickedPhones, parsed.valid]);

  // Live preview of the template using the first recipient's name
  const previewText = useMemo(() => {
    if (!selectedTemplate?.bodyText) return '';
    const sampleName = allRecipients[0]?.name || 'there';
    return selectedTemplate.bodyText.replace(/\{\{\s*(\d+)\s*\}\}/g, (_m, n) => {
      const raw = parameters[Number(n) - 1];
      if (!raw || !raw.trim()) return `{{${n}}}`;
      return raw.replace(/\{\{\s*name\s*\}\}/gi, sampleName);
    });
  }, [selectedTemplate, parameters, allRecipients]);

  // Live preview of the custom follow-up (only sent to recipients inside the 24h window)
  const customPreview = useMemo(() => {
    const text = customMessage.trim();
    if (!text) return '';
    const sampleName = allRecipients[0]?.name || 'there';
    return text.replace(/\{\{\s*name\s*\}\}/gi, sampleName);
  }, [customMessage, allRecipients]);

  const hasCustomMessage = customMessage.trim().length > 0;

  const remaining =
    !quota || quota.monthlyLimit === null
      ? Infinity
      : Math.max(0, quota.monthlyLimit - quota.usedThisMonth);
  const activeBlocked =
    !!quota && quota.activeLimit !== null && quota.activeCount >= quota.activeLimit;
  const overLimit = allRecipients.length > remaining;

  const resetForm = () => {
    setName('');
    setTemplateId('');
    setParameters([]);
    setCustomMessage('');
    setRecipientText('');
    setPickedPhones([]);
    setScheduledAt('');
    setOptIn(false);
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (!isPaid) {
      setError('CSV upload is a Pro feature.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setRecipientText((current) => `${current}${current ? '\n' : ''}${String(reader.result ?? '')}`);
    };
    reader.readAsText(file);
  };

  const togglePicked = (phone: string) =>
    setPickedPhones((current) =>
      current.includes(phone) ? current.filter((item) => item !== phone) : [...current, phone],
    );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (connection && !connection.connected) {
      setError('WhatsApp is not connected. Connect your number before sending campaigns.');
      return;
    }
    if (!name.trim()) return setError('Give your campaign a name.');
    if (!selectedTemplate) return setError('Choose an approved template.');
    if (parameters.length !== paramCount || parameters.some((value) => !value.trim())) {
      return setError('Fill in all template values.');
    }
    if (customMessage.length > MAX_CUSTOM_MESSAGE_LENGTH) {
      return setError(`Custom message must be ${MAX_CUSTOM_MESSAGE_LENGTH} characters or fewer.`);
    }
    if (allRecipients.length === 0) return setError('Add at least one recipient.');
    if (overLimit) {
      return setError(
        `Your free plan has ${remaining} recipient${remaining === 1 ? '' : 's'} left this month. Remove some or upgrade.`,
      );
    }
    if (activeBlocked) return setError('Free plan allows 1 active campaign. Wait for it to finish or upgrade.');
    if (scheduledAt && !isPaid) return setError('Scheduling is a Pro feature.');
    if (scheduledAt && new Date(scheduledAt).getTime() < Date.now() + 60_000) {
      return setError('Choose a schedule time at least a minute from now.');
    }
    if (!optIn) return setError('Confirm that all recipients have opted in to receive messages.');

    setSaving(true);
    try {
      await createCampaign({
        name: name.trim(),
        templateId: selectedTemplate.id,
        parameters: parameters.map((value) => value.trim()),
        customMessage: customMessage.trim() || null,
        recipients: allRecipients,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        optInConfirmed: true,
      });
      setNotice(scheduledAt ? 'Campaign scheduled.' : 'Campaign started. Messages are being sent.');
      resetForm();
      setCreating(false);
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (campaign: Campaign) => {
    setBusyId(campaign.id);
    setError('');
    try {
      await cancelCampaign(campaign.id);
      setNotice('Campaign cancelled.');
      await load(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleRetry = async (campaign: Campaign) => {
    setBusyId(campaign.id);
    setError('');
    try {
      await retryCampaignFailures(campaign.id);
      setNotice('Retrying failed messages.');
      await load(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusyId(null);
    }
  };

  /* ------------------------------ Render ------------------------------ */

  return (
    <section className="wa-section">
      <div className="wa-page-heading">
        <div>
          <p className="wa-eyebrow">BULK MESSAGING</p>
          <h1>Campaigns</h1>
          <p>Send an approved template to many customers at once.</p>
        </div>
        <div className="wa-heading-actions">
          <button type="button" className="wa-icon-button" onClick={() => void load()} aria-label="Refresh campaigns">
            <IonIcon icon={refreshOutline} />
          </button>
          {!creating && (
            <button type="button" className="wa-primary-icon" onClick={() => setCreating(true)} aria-label="New campaign" title="New campaign">
              <IonIcon icon={addOutline} />
            </button>
          )}
        </div>
      </div>

      {quota && (
        <div className="wa-camp-quota">
          <span className={`wa-camp-plan${isPaid ? ' is-pro' : ''}`}>{isPaid ? 'Pro' : 'Free'}</span>
          {quota.monthlyLimit === null ? (
            <span>Unlimited recipients · {quota.usedThisMonth} sent this month</span>
          ) : (
            <>
              <span>{quota.usedThisMonth} of {quota.monthlyLimit} recipients used this month</span>
              <div className="wa-camp-meter" aria-hidden="true">
                <div style={{ width: `${Math.min(100, (quota.usedThisMonth / quota.monthlyLimit) * 100)}%` }} />
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="wa-error" role="alert">
          <IonIcon icon={informationCircleOutline} />
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="Dismiss error"><IonIcon icon={closeOutline} /></button>
        </div>
      )}
      {notice && <div className="wa-camp-notice" role="status">{notice}</div>}

      {creating && (
        <form className="wa-camp-form" onSubmit={(event) => void handleSubmit(event)}>
          <div className="wa-camp-form-head">
            <h2>New campaign</h2>
            <button type="button" className="wa-icon-button" onClick={() => { setCreating(false); resetForm(); }} aria-label="Close form">
              <IonIcon icon={closeOutline} />
            </button>
          </div>

          <label>Campaign name (internal, customers do not see this)
            <input required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Diwali offer" />
          </label>

          <label>Message template
            <select
              value={templateId}
              onChange={(e) => {
                const next = e.target.value;
                const template = approvedTemplates.find((item) => String(item.id) === next);
                setTemplateId(next);
                setParameters(Array.from({ length: getParamCount(template) }, () => ''));
              }}
            >
              <option value="">{approvedTemplates.length ? 'Choose an approved template' : 'No approved templates available'}</option>
              {approvedTemplates.map((template) => (
                <option key={template.id} value={String(template.id)}>{template.displayName}</option>
              ))}
            </select>
          </label>

          {selectedTemplate?.bodyText && (
            <p className="wa-template-preview">{previewText || selectedTemplate.bodyText}</p>
          )}
          {parameters.map((value, index) => (
            <input
              key={`${templateId}-${index}`}
              required
              value={value}
              onChange={(e) => setParameters((cur) => cur.map((item, i) => (i === index ? e.target.value : item)))}
              placeholder={`Value for {{${index + 1}}} (use {{name}} for the customer's name)`}
              aria-label={`Template value ${index + 1}`}
            />
          ))}

          <label>Custom message (optional)
            <textarea
              rows={3}
              maxLength={MAX_CUSTOM_MESSAGE_LENGTH}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder={'Sent as an extra message (free) only to customers who messaged you in the last 24 hours. Everyone gets the template above.\ne.g. Namaste {{name}}, Diwali offer: 20% discount!'}
            />
            <small className="wa-muted-message">
              {customMessage.length}/{MAX_CUSTOM_MESSAGE_LENGTH} · use {'{{name}}'} for the customer&apos;s name
            </small>
          </label>
          {customPreview && <p className="wa-camp-custom-preview">{customPreview}</p>}

          <label>Recipients
            <textarea
              rows={4}
              value={recipientText}
              onChange={(e) => setRecipientText(e.target.value)}
              placeholder={'One per line: phone, name (optional)\n9876543210, Asha\n919811122233'}
            />
          </label>

          <div className="wa-camp-upload">
            {isPaid ? (
              <label className="wa-secondary-button">
                <IonIcon icon={cloudUploadOutline} /> Upload CSV
                <input type="file" accept=".csv,text/csv,.txt" hidden onChange={(e) => { handleFile(e.target.files?.[0] ?? null); e.target.value = ''; }} />
              </label>
            ) : (
              <UpgradeGate compact feature="CSV upload" description="Import contacts from a file on Pro." onUpgrade={onUpgrade} />
            )}
            {parsed.invalid > 0 && <small className="wa-camp-warn">{parsed.invalid} invalid number{parsed.invalid === 1 ? '' : 's'} skipped</small>}
          </div>

          {conversations.length > 0 && (
            <fieldset className="wa-camp-contacts">
              <legend>Select WhatsApp numbers from your conversations</legend>
              <div>
                {conversations.map((c) => (
                  <label key={c.id} className="wa-camp-chip">
                    <input type="checkbox" checked={pickedPhones.includes(c.phoneNumber)} onChange={() => togglePicked(c.phoneNumber)} />
                    <span>{c.customerName || c.phoneNumber}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className={`wa-camp-count${overLimit ? ' is-over' : ''}`}>
            <strong>{allRecipients.length} recipient{allRecipients.length === 1 ? '' : 's'} selected</strong>
            {Number.isFinite(remaining) && (
              <span> · {remaining} recipient{remaining === 1 ? '' : 's'} remaining this month</span>
            )}
            {allRecipients.length > 0 && (
              <details className="wa-camp-recipient-preview">
                <summary>Review recipient numbers</summary>
                <ul>
                  {allRecipients.map((recipient) => (
                    <li key={recipient.phone}>
                      <span>{recipient.name || 'WhatsApp contact'}</span>
                      <code>+{recipient.phone}</code>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          <label>Send time
            {isPaid ? (
              <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            ) : (
              <small className="wa-muted-message">Sends immediately. Scheduling is available on Pro.</small>
            )}
          </label>

          <label className="wa-camp-optin">
            <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
            <span>I confirm every recipient has agreed to receive WhatsApp messages from my business.</span>
          </label>

          {!approvedTemplates.length && (
            <p className="wa-camp-warn">
              No approved templates are available. Create and get a template approved in WhatsApp Manager, then refresh templates.
            </p>
          )}
          <p className="wa-camp-delivery-note">
            The approved template will be sent to {allRecipients.length} recipient
            {allRecipients.length === 1 ? '' : 's'} with your values filled in.
            {hasCustomMessage
              ? ' Customers who messaged you in the last 24 hours will also get your custom message right after it.'
              : ''}{' '}
            Delivery also depends on WhatsApp eligibility and Meta delivery status.
          </p>
          <button type="submit" className="wa-primary-button" disabled={saving || !approvedTemplates.length}>
            {saving ? <IonSpinner name="crescent" /> : <IonIcon icon={sendOutline} />}
            {saving ? 'Starting…' : scheduledAt ? 'Schedule campaign' : 'Send campaign'}
          </button>
        </form>
      )}

      {loading && campaigns.length === 0 ? (
        <div className="wa-loading"><IonSpinner /><span>Loading campaigns…</span></div>
      ) : campaigns.length === 0 && !creating ? (
        <div className="wa-empty">
          <IonIcon icon={megaphoneOutline} />
          <h2>No campaigns yet</h2>
          <p>Create your first campaign to message many customers with an approved template.</p>
          <button type="button" className="wa-primary-button" onClick={() => setCreating(true)}><IonIcon icon={addOutline} /> New campaign</button>
        </div>
      ) : (
        <ul className="wa-camp-list">
          {campaigns.map((campaign) => {
            const done = campaign.sent + campaign.failed;
            const pct = campaign.total ? Math.min(100, Math.round((done / campaign.total) * 100)) : 0;
            const cancellable = campaign.status === 'scheduled' || campaign.status === 'sending';
            return (
              <li key={campaign.id} className="wa-camp-item">
                <div className="wa-camp-item-head">
                  <div className="wa-camp-item-title">
                    <strong title={campaign.name}>{campaign.name}</strong>
                    <small>{campaign.templateName} · {formatDate(campaign.scheduledAt || campaign.createdAt)}</small>
                  </div>
                  <span className={`wa-camp-status is-${campaign.status}`}>{statusLabel[campaign.status]}</span>
                </div>
                {campaign.customMessage && (
                  <p className="wa-camp-custom">
                    <span>Custom message</span>
                    {campaign.customMessage}
                  </p>
                )}
                <div className="wa-camp-progress">
                  <div className="wa-camp-progress-top">
                    <span>{done} of {campaign.total} processed</span>
                    <strong>{pct}%</strong>
                  </div>
                  <div
                    className="wa-camp-meter"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={pct}
                    aria-label={`${pct}% processed`}
                  >
                    <div style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <dl className="wa-camp-stats">
                  <div className="is-total"><dt>Total</dt><dd>{campaign.total}</dd></div>
                  <div className="is-sent"><dt>Sent</dt><dd>{campaign.sent}</dd></div>
                  <div className="is-delivered"><dt>Delivered</dt><dd>{campaign.delivered}</dd></div>
                  <div className="is-read"><dt>Read</dt><dd>{campaign.read}</dd></div>
                  <div className={`is-failed${campaign.failed > 0 ? ' has-value' : ''}`}><dt>Failed</dt><dd>{campaign.failed}</dd></div>
                </dl>
                <div className="wa-camp-actions">
                  {cancellable && (
                    <button type="button" className="wa-secondary-button" disabled={busyId === campaign.id} onClick={() => void handleCancel(campaign)}>
                      Cancel campaign
                    </button>
                  )}
                  {campaign.failed > 0 && campaign.status !== 'sending' && (
                    isPaid ? (
                      <button type="button" className="wa-secondary-button" disabled={busyId === campaign.id} onClick={() => void handleRetry(campaign)}>
                        {busyId === campaign.id ? <IonSpinner name="crescent" /> : <IonIcon icon={refreshOutline} />} Retry failed
                      </button>
                    ) : (
                      <button type="button" className="wa-secondary-button" onClick={onUpgrade}>Retry failed (Pro)</button>
                    )
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default CampaignsTab;