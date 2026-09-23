import React, { useCallback, useEffect, useState } from 'react';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import {
  arrowBackOutline,
  eyeOutline,
  peopleOutline,
  refreshOutline,
  trendingUpOutline,
  logoGoogle,
  logoYoutube,
} from 'ionicons/icons';
import { useIonRouter } from '@ionic/react';
import { apiGet } from '../api';
import BottomTabBar from '../components/BottomTabBar';

type PlatformKey = 'google_business' | 'youtube';

type AnalyticsItem = {
  platform?: string;
  impressions?: number;
  reach?: number;
  views?: number;
  clicks?: number;
  engagement?: number;
  posts?: number;
  [key: string]: unknown;
};

const PLATFORM_DETAILS: Record<PlatformKey, {
  label: string;
  icon: string;
  color: string;
  background: string;
}> = {
  google_business: {
    label: 'Google Business',
    icon: logoGoogle,
    color: '#4285F4',
    background: '#EEF5FF',
  },
  youtube: {
    label: 'YouTube',
    icon: logoYoutube,
    color: '#FF0000',
    background: '#FFF0F0',
  },
};

function numberValue(item: AnalyticsItem, keys: string[]): number {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return 0;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function normalizeAnalytics(response: unknown): AnalyticsItem[] {
  if (Array.isArray(response)) return response as AnalyticsItem[];
  if (!response || typeof response !== 'object') return [];

  const root = response as Record<string, unknown>;
  const candidates = [root.analytics, root.data, root.results];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as AnalyticsItem[];
    if (candidate && typeof candidate === 'object') {
      return Object.entries(candidate).map(([platform, value]) => ({
        ...(value && typeof value === 'object' ? value : {}),
        platform,
      })) as AnalyticsItem[];
    }
  }
  return [];
}

const Analytics: React.FC = () => {
  const router = useIonRouter();
  const [items, setItems] = useState<AnalyticsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiGet('/banners/analytics');
      setItems(normalizeAnalytics(response));
    } catch (err: any) {
      setError(err?.message || 'Unable to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const getItem = (platform: PlatformKey) =>
    items.find((item) =>
      String(item.platform || '').toLowerCase() === platform
    );

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButton slot="start" fill="clear" aria-label="Back" onClick={() => router.back()}>
            <IonIcon icon={arrowBackOutline} />
          </IonButton>
          <IonTitle>Analytics</IonTitle>
          <IonButton slot="end" fill="clear" aria-label="Refresh analytics" onClick={() => void loadAnalytics()}>
            <IonIcon icon={refreshOutline} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ '--background': '#F7FAFC' } as React.CSSProperties}>
        <main style={{ padding: '18px 16px 88px' }}>
          <section style={{ marginBottom: 20 }}>
            <p style={{ margin: 0, color: '#5A6B7B', fontSize: 12, fontWeight: 700, letterSpacing: 0.6 }}>
              PERFORMANCE OVERVIEW
            </p>
            <h1 style={{ margin: '5px 0 6px', color: '#0F2A4A', fontSize: 25 }}>Google and YouTube</h1>
            <p style={{ margin: 0, color: '#5A6B7B', fontSize: 13 }}>
              Track the reach and response of your connected channels.
            </p>
          </section>

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
              <IonSpinner name="crescent" />
            </div>
          )}

          {!loading && error && (
            <section style={{ padding: 18, borderRadius: 14, background: '#FFF3F2', border: '1px solid #FFD5D2', color: '#9F2D25' }}>
              <strong>Analytics unavailable</strong>
              <p style={{ margin: '7px 0 12px', fontSize: 13 }}>{error}</p>
              <IonButton size="small" fill="outline" onClick={() => void loadAnalytics()}>Try again</IonButton>
            </section>
          )}

          {!loading && !error && (
            <div style={{ display: 'grid', gap: 14 }}>
              {(Object.keys(PLATFORM_DETAILS) as PlatformKey[]).map((platform) => {
                const details = PLATFORM_DETAILS[platform];
                const item = getItem(platform);
                const reach = numberValue(item || {}, ['reach', 'impressions', 'views']);
                const engagement = numberValue(item || {}, ['engagement', 'clicks']);
                const posts = numberValue(item || {}, ['posts', 'postCount']);

                return (
                  <section key={platform} style={{ background: '#FFFFFF', border: '1px solid #E1E8EE', borderRadius: 16, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16 }}>
                      <span style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', color: details.color, background: details.background }}>
                        <IonIcon icon={details.icon} style={{ fontSize: 22 }} />
                      </span>
                      <div>
                        <h2 style={{ margin: 0, color: '#0F2A4A', fontSize: 16 }}>{details.label}</h2>
                        <p style={{ margin: '3px 0 0', color: '#5A6B7B', fontSize: 12 }}>{item ? 'Connected analytics' : 'No analytics recorded yet'}</p>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      <Metric icon={eyeOutline} label={platform === 'youtube' ? 'Views' : 'Reach'} value={reach} />
                      <Metric icon={trendingUpOutline} label="Engagement" value={engagement} />
                      <Metric icon={peopleOutline} label="Posts" value={posts} />
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </main>
      </IonContent>
      <BottomTabBar />
    </IonPage>
  );
};

const Metric: React.FC<{ icon: string; label: string; value: number }> = ({ icon, label, value }) => (
  <div style={{ padding: '11px 8px', borderRadius: 10, background: '#F7FAFC', textAlign: 'center' }}>
    <IonIcon icon={icon} style={{ color: '#1E7FE0', fontSize: 16 }} />
    <strong style={{ display: 'block', marginTop: 4, color: '#0F2A4A', fontSize: 15 }}>{formatNumber(value)}</strong>
    <span style={{ color: '#7A8998', fontSize: 10 }}>{label}</span>
  </div>
);

export default Analytics;
