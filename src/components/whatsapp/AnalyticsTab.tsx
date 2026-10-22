import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IonIcon, IonSpinner } from '@ionic/react';
import { downloadOutline, informationCircleOutline, refreshOutline } from 'ionicons/icons';
import { WhatsAppConversation } from '../../services/whatsappCommerce';
import { AnalyticsSummary, getWhatsAppAnalytics } from '../../services/whatsappCampaigns';
import UpgradeGate from './UpgradeGate';

interface AnalyticsTabProps {
  isPaid: boolean;
  conversations: WhatsAppConversation[];
  onUpgrade: () => void;
}

const RANGES = [7, 30, 90];

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ isPaid, conversations, onUpgrade }) => {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getWhatsAppAnalytics(isPaid ? days : 7));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load analytics.');
    } finally {
      setLoading(false);
    }
  }, [days, isPaid]);

  useEffect(() => {
    void load();
  }, [load]);

  const unread = useMemo(
    () => conversations.reduce((total, c) => total + (c.unreadCount || 0), 0),
    [conversations],
  );

  const maxDaily = useMemo(
    () => Math.max(1, ...(data?.daily ?? []).map((d) => Math.max(d.sent, d.received))),
    [data],
  );

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ['date', 'sent', 'received'],
      ...data.daily.map((d) => [d.date, String(d.sent), String(d.received)]),
    ];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `whatsapp-analytics-${data.days}d.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const advanced = data?.advanced;

  return (
    <section className="wa-section">
      <div className="wa-page-heading">
        <div>
          <p className="wa-eyebrow">PERFORMANCE</p>
          <h1>Analytics</h1>
          <p>{isPaid ? `Last ${days} days of messaging activity.` : 'Last 7 days of messaging activity.'}</p>
        </div>
        <div className="wa-heading-actions">
          <button type="button" className="wa-icon-button" onClick={() => void load()} aria-label="Refresh analytics">
            <IonIcon icon={refreshOutline} />
          </button>
          {isPaid && (
            <button type="button" className="wa-icon-button" onClick={exportCsv} disabled={!data} aria-label="Export CSV" title="Export CSV">
              <IonIcon icon={downloadOutline} />
            </button>
          )}
        </div>
      </div>

      <div className="wa-an-ranges" role="group" aria-label="Date range">
        {RANGES.map((range) => {
          const locked = !isPaid && range !== 7;
          return (
            <button
              key={range}
              type="button"
              className={days === range || (!isPaid && range === 7) ? 'is-active' : ''}
              onClick={() => (locked ? onUpgrade() : setDays(range))}
            >
              {range} days{locked ? ' 🔒' : ''}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="wa-error" role="alert">
          <IonIcon icon={informationCircleOutline} /><span>{error}</span>
        </div>
      )}

      {loading && !data ? (
        <div className="wa-loading"><IonSpinner /><span>Loading analytics…</span></div>
      ) : data ? (
        <>
          <div className="wa-an-grid">
            <div className="wa-an-card"><small>Messages sent</small><strong>{data.sent}</strong></div>
            <div className="wa-an-card"><small>Messages received</small><strong>{data.received}</strong></div>
            <div className="wa-an-card"><small>Delivered</small><strong>{pct(data.delivered, data.sent)}%</strong></div>
            <div className="wa-an-card"><small>Read</small><strong>{pct(data.read, data.sent)}%</strong></div>
            <div className="wa-an-card"><small>Active conversations</small><strong>{data.activeConversations}</strong></div>
            <div className="wa-an-card"><small>Unread now</small><strong>{unread}</strong></div>
            <div className="wa-an-card"><small>Failed</small><strong>{data.failed}</strong></div>
          </div>

          <div className="wa-an-panel">
            <h2>Messages per day</h2>
            <div className="wa-an-chart" role="img" aria-label="Messages sent and received per day">
              {data.daily.map((d) => (
                <div key={d.date} className="wa-an-day" title={`${d.date}: ${d.sent} sent, ${d.received} received`}>
                  <div className="wa-an-bars">
                    <span className="is-sent" style={{ height: `${(d.sent / maxDaily) * 100}%` }} />
                    <span className="is-received" style={{ height: `${(d.received / maxDaily) * 100}%` }} />
                  </div>
                  <small>{new Date(d.date).toLocaleDateString([], { day: 'numeric', month: 'short' })}</small>
                </div>
              ))}
            </div>
            <div className="wa-an-legend"><span className="is-sent">Sent</span><span className="is-received">Received</span></div>
          </div>

          {isPaid && advanced ? (
            <>
              <div className="wa-an-panel">
                <h2>Response time</h2>
                <p className="wa-an-big">
                  {advanced.avgResponseMinutes === null ? '—' : `${advanced.avgResponseMinutes} min`}
                </p>
                <small>Average time to reply to a customer message</small>
              </div>

              <div className="wa-an-panel">
                <h2>Campaign performance</h2>
                {advanced.campaigns.length ? (
                  <table className="wa-an-table">
                    <thead><tr><th>Campaign</th><th>Sent</th><th>Delivered</th><th>Read</th><th>Failed</th></tr></thead>
                    <tbody>
                      {advanced.campaigns.map((c) => (
                        <tr key={c.id}><td>{c.name}</td><td>{c.sent}</td><td>{pct(c.delivered, c.sent)}%</td><td>{pct(c.read, c.sent)}%</td><td>{c.failed}</td></tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="wa-muted-message">No campaigns in this period.</p>}
              </div>

              <div className="wa-an-panel">
                <h2>Template performance</h2>
                {advanced.topTemplates.length ? (
                  <table className="wa-an-table">
                    <thead><tr><th>Template</th><th>Sent</th><th>Read rate</th></tr></thead>
                    <tbody>
                      {advanced.topTemplates.map((t) => (
                        <tr key={t.name}><td>{t.name}</td><td>{t.sent}</td><td>{Math.round(t.readRate)}%</td></tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="wa-muted-message">No template messages in this period.</p>}
              </div>

              <div className="wa-an-panel">
                <h2>Most shared products</h2>
                {advanced.topProducts.length ? (
                  <ul className="wa-category-list">
                    {advanced.topProducts.map((p) => (
                      <li key={p.name}><span>{p.name}</span><small>{p.shares} shares</small></li>
                    ))}
                  </ul>
                ) : <p className="wa-muted-message">No products shared in this period.</p>}
              </div>
            </>
          ) : (
            <UpgradeGate
              feature="Advanced analytics"
              description="Get 30 and 90 day history, campaign and template performance, response time, top products and CSV export."
              onUpgrade={onUpgrade}
            />
          )}
        </>
      ) : null}
    </section>
  );
};

export default AnalyticsTab;