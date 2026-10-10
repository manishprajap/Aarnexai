import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IonIcon, IonSpinner } from '@ionic/react';
import {
  locationOutline,
  logoFacebook,
  logoGoogle,
  logoInstagram,
  logoLinkedin,
  logoWhatsapp,
  logoYoutube,
  refreshOutline,
} from 'ionicons/icons';

import { apiGet } from '../api';
import './DashboardAnalyticsCharts.css';

type PlatformKey =
  | 'facebook'
  | 'instagram'
  | 'google_business'
  | 'youtube'
  | 'linkedin'
  | 'whatsapp';

type ChartResponse = {
  success: boolean;
  message?: string;
  mode: 'month' | 'year';
  year: number;
  month: number;
  labels: string[];
  platforms: Partial<Record<PlatformKey, number[]>>;
  years: number[];
  location?: {
    city: string;
    state: string;
    country: string;
  };
};

const PLATFORM_ORDER: PlatformKey[] = [
  'facebook',
  'instagram',
  'google_business',
  'youtube',
  'linkedin',
  'whatsapp',
];

const PLATFORM_DETAILS: Record<PlatformKey, { label: string; color: string; icon: string }> = {
  facebook: { label: 'Facebook', color: '#1877F2', icon: logoFacebook },
  instagram: { label: 'Instagram', color: '#C13584', icon: logoInstagram },
  google_business: { label: 'Google Business', color: '#4285F4', icon: logoGoogle },
  youtube: { label: 'YouTube', color: '#FF0000', icon: logoYoutube },
  linkedin: { label: 'LinkedIn', color: '#0A66C2', icon: logoLinkedin },
  whatsapp: { label: 'WhatsApp', color: '#168A4A', icon: logoWhatsapp },
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const numberFormat = new Intl.NumberFormat();

const DashboardAnalyticsCharts = () => {
  const currentDate = new Date();
  const [mode, setMode] = useState<'month' | 'year'>('month');
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [data, setData] = useState<ChartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const loadCharts = useCallback(async () => {
    const activeRequest = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({
        mode,
        year: String(year),
        month: String(month),
      });
      const response = await apiGet<ChartResponse>(`/analytics/dashboard-charts?${query}`);
      if (!response?.success || !Array.isArray(response.labels) || !response.platforms) {
        throw new Error(response?.message || 'Analytics chart data is incomplete.');
      }
      const bucketCount = mode === 'year' ? 12 : response.labels.length;
      const labels = Array.from({ length: bucketCount }, (_, index) =>
        String(response.labels[index] ?? (mode === 'year' ? String(index + 1).padStart(2, '0') : index + 1))
      );
      const platformCounts = Object.fromEntries(
        PLATFORM_ORDER.map((platform) => [
          platform,
          Array.from({ length: bucketCount }, (_, index) => {
            const value = response.platforms?.[platform]?.[index];
            return typeof value === 'number' && Number.isFinite(value) && value > 0
              ? value
              : 0;
          }),
        ])
      ) as Record<PlatformKey, number[]>;
      if (activeRequest !== requestId.current) return;
      setData({
        ...response,
        labels,
        platforms: platformCounts,
      });
    } catch (loadError) {
      if (activeRequest === requestId.current) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load analytics charts.');
      }
    } finally {
      if (activeRequest === requestId.current) setLoading(false);
    }
  }, [mode, year, month]);

  useEffect(() => {
    void loadCharts();
  }, [loadCharts]);

  const platformTotals = useMemo(
    () =>
      PLATFORM_ORDER.map((platform) => ({
        platform,
        count: (data?.platforms?.[platform] ?? []).reduce((sum, value) => sum + value, 0),
      })),
    [data]
  );
  const totalPosts = platformTotals.reduce((sum, item) => sum + item.count, 0);
  const bucketTotals = data?.labels.map((_, index) =>
    PLATFORM_ORDER.reduce((sum, platform) => sum + (data.platforms[platform]?.[index] ?? 0), 0)
  ) ?? [];
  const maxBucketTotal = Math.max(1, ...bucketTotals);
  let pieOffset = 0;
  const pieGradient = platformTotals
    .filter(({ count }) => count > 0)
    .map(({ platform, count }) => {
      const start = pieOffset;
      pieOffset += (count / (totalPosts || 1)) * 100;
      return `${PLATFORM_DETAILS[platform].color} ${start}% ${pieOffset}%`;
    })
    .join(', ');
  const location = [
    data?.location?.city,
    data?.location?.state,
    data?.location?.country,
  ].filter((part): part is string => Boolean(part?.trim())).join(', ');

  const displayMode = data?.mode ?? mode;
  const displayYear = data?.year ?? year;
  const displayMonth = data?.month ?? month;
  const periodLabel = displayMode === 'month'
    ? `${MONTHS[displayMonth - 1] ?? 'Month'} ${displayYear}`
    : String(displayYear);

  return (
    <section className="dashboard-analytics" aria-label="Dashboard analytics charts">
      <div className="dashboard-analytics-heading">
        <div>
          <p className="dashboard-kicker">ANALYTICS</p>
          <h2>Performance charts</h2>
          <p>Compare publishing activity across all channels in one chart.</p>
        </div>
        <button
          type="button"
          className="dashboard-chart-refresh"
          aria-label="Refresh dashboard charts"
          onClick={() => void loadCharts()}
          disabled={loading}
        >
          <IonIcon icon={refreshOutline} />
        </button>
      </div>

      <div className="dashboard-chart-filters" aria-label="Chart time range">
        <div className="dashboard-chart-mode" role="group" aria-label="Choose chart period">
          <button
            type="button"
            className={mode === 'month' ? 'is-active' : ''}
            aria-pressed={mode === 'month'}
            onClick={() => setMode('month')}
          >
            Month
          </button>
          <button
            type="button"
            className={mode === 'year' ? 'is-active' : ''}
            aria-pressed={mode === 'year'}
            onClick={() => setMode('year')}
          >
            Year
          </button>
        </div>
        {mode === 'month' && (
          <label>
            <span className="ion-visually-hidden">Select month</span>
            <select value={month} onChange={(event) => setMonth(Number(event.target.value))}>
              {MONTHS.map((name, index) => (
                <option key={name} value={index + 1}>{name}</option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span className="ion-visually-hidden">Select year</span>
          <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
            {(data?.years?.length ? data.years : [currentDate.getFullYear()]).map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>

      {loading && (
        <div className="dashboard-charts-state" role="status">
          <IonSpinner name="crescent" />
          <span>Loading {periodLabel} charts…</span>
        </div>
      )}
      {!loading && error && (
        <div className="dashboard-charts-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => void loadCharts()}>Try again</button>
        </div>
      )}
      {loading && data && (
        <div className="dashboard-chart-refreshing" role="status">
          <span>Showing the last available chart. {error}</span>
        </div>
      )}
      {loading && data && (
        <div className="dashboard-chart-refreshing" role="status">
          <IonSpinner name="crescent" />
          <span>Updating chart…</span>
        </div>
      )}

      {data && (
        <article className="dashboard-chart-card">
          <div className="dashboard-chart-card-heading">
            <div>
              <h3>Published posts</h3>
              <p>{periodLabel} · {numberFormat.format(totalPosts)} posts across all platforms</p>
            </div>
          </div>

          {totalPosts > 0 ? (
            <div className="dashboard-chart-visuals">
              <div
                className={`dashboard-chart-bars ${displayMode === 'month' ? 'is-daily' : 'is-monthly'}`}
                role="img"
                aria-label={`Stacked bar chart of published posts by platform for ${periodLabel}`}
              >
                {data.labels.map((label, index) => {
                  const bucketTotal = bucketTotals[index] ?? 0;
                  const tickLabel = displayMode === 'month'
                    ? (index === 0 || (index + 1) % 5 === 0 || index === data.labels.length - 1
                      ? String(index + 1)
                      : '')
                    : MONTHS[index]?.slice(0, 1) ?? label;
                  return (
                    <div className="dashboard-chart-bar-column" key={label} title={`${label}: ${bucketTotal} posts`}>
                      <span className="dashboard-chart-bar-value">
                        {bucketTotal > 0 ? numberFormat.format(bucketTotal) : ''}
                      </span>
                      <div className="dashboard-chart-bar-track">
                        {PLATFORM_ORDER.map((platform) => {
                          const value = data.platforms[platform]?.[index] ?? 0;
                          if (!value) return null;
                          return (
                            <div
                              className="dashboard-chart-bar-segment"
                              key={platform}
                              style={{
                                height: `${(value / maxBucketTotal) * 100}%`,
                                background: PLATFORM_DETAILS[platform].color,
                              }}
                            />
                          );
                        })}
                      </div>
                      <span className="dashboard-chart-bar-label">{tickLabel}</span>
                    </div>
                  );
                })}
              </div>
              <div className="dashboard-chart-pie-wrap">
                <div
                  className="dashboard-chart-pie"
                  role="img"
                  aria-label={`Pie chart showing ${numberFormat.format(totalPosts)} posts by platform`}
                  style={{ background: `conic-gradient(${pieGradient})` }}
                >
                  <div>
                    <strong>{numberFormat.format(totalPosts)}</strong>
                    <span>posts</span>
                  </div>
                </div>
                <span>Platform mix</span>
              </div>
            </div>
          ) : (
            <p className="dashboard-chart-empty">No published posts in this period.</p>
          )}

          <div className="dashboard-chart-legend" aria-label="Platforms">
            {platformTotals.map(({ platform, count }) => (
              <span key={platform}>
                <i style={{ background: PLATFORM_DETAILS[platform].color }} />
                {PLATFORM_DETAILS[platform].label}
                <strong>{numberFormat.format(count)}</strong>
              </span>
            ))}
          </div>

          {location && (
            <div className="dashboard-chart-location">
              <IonIcon icon={locationOutline} aria-hidden="true" />
              <span>{location}</span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
                target="_blank"
                rel="noreferrer"
              >
                Maps
              </a>
            </div>
          )}
        </article>
      )}
    </section>
  );
};

export default DashboardAnalyticsCharts;
