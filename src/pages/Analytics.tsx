import React, { useCallback, useMemo, useState } from 'react';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';
import {
  arrowBackOutline,
  chatbubblesOutline,
  eyeOutline,
  imageOutline,
  logoFacebook,
  logoGoogle,
  logoInstagram,
  logoLinkedin,
  logoWhatsapp,
  logoYoutube,
  peopleOutline,
  refreshOutline,
  shareSocialOutline,
  trendingUpOutline,
} from 'ionicons/icons';
import { useIonRouter } from '@ionic/react';
import { apiGet } from '../api';
import BottomTabBar from '../components/BottomTabBar';
import './Analytics.css';

type PlatformKey =
  | 'facebook'
  | 'instagram'
  | 'google_business'
  | 'youtube'
  | 'linkedin'
  | 'whatsapp';

type PlatformAnalytics = {
  connected: boolean;
  accountName?: string | null;
  posts?: number | null;
  impressions?: number | null;
  reach?: number | null;
  clicks?: number | null;
  directions?: number | null;
  profileVisits?: number | null;
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  conversations?: number | null;
  messages?: number | null;
  unread?: number | null;
  note?: string;
  periodDays?: number;
};

type AnalyticsResponse = {
  success: boolean;
  message?: string;
  platforms?: Partial<Record<PlatformKey, PlatformAnalytics>>;
};

type PublishedPost = {
  id: string;
  bannerId: number;
  platform: string;
  externalId: string;
  permalink: string | null;
  publishedAt: string;
  caption: string | null;
  imageUrl: string | null;
  productTitle: string | null;
  insights?: {
    metrics: Record<string, number> | null;
    note?: string;
  };
};

type PublishedPostGroup = {
  platform: string;
  posts: PublishedPost[];
};

type BannerAnalytics = {
  bannerId: number;
  day?: number | null;
  theme?: string | null;
  caption?: string | null;
  imageUrl?: string | null;
  publishedAt?: string | null;
  publications?: Array<{
    id: number;
    platform: string;
    externalId: string;
    permalink: string | null;
    publishedAt: string;
    metrics?: Record<string, unknown>;
  }>;
  platforms?: Record<string, Record<string, unknown>>;
};

type YouTubeVideo = {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
  permalink: string;
  metrics: Record<string, number>;
};

type PostInsight = {
  metrics?: Record<string, number> | null;
  note?: string;
  error?: string;
  loading?: boolean;
};

type MetricItem = {
  key: keyof PlatformAnalytics;
  label: string;
  icon: string;
};

type PlatformDetails = {
  label: string;
  icon: string;
  color: string;
  background: string;
  metrics: MetricItem[];
};

const PLATFORM_DETAILS: Record<PlatformKey, PlatformDetails> = {
  facebook: {
    label: 'Facebook',
    icon: logoFacebook,
    color: '#1877F2',
    background: '#EAF2FF',
    metrics: [
      { key: 'impressions', label: 'Impressions', icon: eyeOutline },
      { key: 'reach', label: 'Reach', icon: peopleOutline },
      { key: 'clicks', label: 'Clicks', icon: trendingUpOutline },
      { key: 'posts', label: 'Published', icon: shareSocialOutline },
    ],
  },
  instagram: {
    label: 'Instagram',
    icon: logoInstagram,
    color: '#C13584',
    background: '#FFF0F7',
    metrics: [
      { key: 'impressions', label: 'Views / impressions', icon: eyeOutline },
      { key: 'reach', label: 'Reach', icon: peopleOutline },
      { key: 'profileVisits', label: 'Profile visits', icon: trendingUpOutline },
      { key: 'posts', label: 'Published', icon: shareSocialOutline },
    ],
  },
  google_business: {
    label: 'Google Business Profile',
    icon: logoGoogle,
    color: '#4285F4',
    background: '#EEF5FF',
    metrics: [
      { key: 'views', label: 'Profile views', icon: eyeOutline },
      { key: 'clicks', label: 'Clicks', icon: trendingUpOutline },
      { key: 'directions', label: 'Directions', icon: peopleOutline },
      { key: 'posts', label: 'Published', icon: shareSocialOutline },
    ],
  },
  youtube: {
    label: 'YouTube',
    icon: logoYoutube,
    color: '#FF0000',
    background: '#FFF0F0',
    metrics: [
      { key: 'views', label: 'Views · 30 days', icon: eyeOutline },
      { key: 'likes', label: 'Likes', icon: peopleOutline },
      { key: 'comments', label: 'Comments', icon: chatbubblesOutline },
      { key: 'posts', label: 'Published', icon: shareSocialOutline },
    ],
  },
  linkedin: {
    label: 'LinkedIn',
    icon: logoLinkedin,
    color: '#0A66C2',
    background: '#EAF4FC',
    metrics: [
      { key: 'impressions', label: 'Impressions', icon: eyeOutline },
      { key: 'clicks', label: 'Clicks', icon: trendingUpOutline },
      { key: 'likes', label: 'Likes', icon: peopleOutline },
      { key: 'posts', label: 'Published', icon: shareSocialOutline },
    ],
  },
  whatsapp: {
    label: 'WhatsApp Business',
    icon: logoWhatsapp,
    color: '#168A4A',
    background: '#E9F8EF',
    metrics: [
      { key: 'conversations', label: 'Conversations', icon: chatbubblesOutline },
      { key: 'messages', label: 'Messages', icon: shareSocialOutline },
      { key: 'unread', label: 'Unread', icon: peopleOutline },
    ],
  },
};

const PLATFORM_ORDER = Object.keys(PLATFORM_DETAILS) as PlatformKey[];

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat().format(Number(value));
}

function publishedTimestamp(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

const MEDIA_ORIGIN = 'https://aarnexai.com';

function resolvePosterImageUrl(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  if (raw.startsWith('//')) return `https:${raw}`;

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (url.hostname === 'aarnexai.com' && url.protocol === 'http:') {
        url.protocol = 'https:';
      }
      url.pathname = url.pathname.replace(/^\/aarnexai-backend(?=\/upload\/)/, '');
      return url.toString();
    } catch {
      return null;
    }
  }

  const path = raw
    .replace(/^\/+/, '')
    .replace(/^aarnexai-backend(?=\/upload\/)/, '');
  return `${MEDIA_ORIGIN}/${path}`;
}

const AnalyticsPostImage: React.FC<{ src: string | null; alt: string }> = ({ src, alt }) => {
  const [failed, setFailed] = React.useState(false);
  if (!src || failed) {
    return (
      <div className="analytics-post-image-fallback" role="img" aria-label={alt || 'Image unavailable'}>
        <IonIcon icon={imageOutline} aria-hidden="true" />
        <span>Image unavailable</span>
      </div>
    );
  }

  return (
    <img
      className="analytics-post-image"
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
};

const Analytics: React.FC = () => {
  const router = useIonRouter();
  const [platforms, setPlatforms] = useState<Partial<Record<PlatformKey, PlatformAnalytics>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [posts, setPosts] = useState<PublishedPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState('');
  const [postsNotice, setPostsNotice] = useState('');
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [postInsights, setPostInsights] = useState<Record<string, PostInsight>>({});

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiGet<AnalyticsResponse>('/analytics/summary');
      if (!response?.success || !response.platforms) {
        throw new Error(response?.message || 'Analytics response is incomplete.');
      }
      setPlatforms(response.platforms);
      setPostsLoading(true);
      setPostsError('');
      setPostsNotice('');
      try {
        const postResponse = await apiGet<{
          success: boolean;
          banners?: BannerAnalytics[];
          youtubeVideos?: YouTubeVideo[];
          youtubeVideosNote?: string;
          message?: string;
        }>(
          '/banners/analytics'
        );
        if (!postResponse?.success || !Array.isArray(postResponse.banners)) {
          throw new Error(postResponse?.message || 'Published post analytics response is incomplete.');
        }

        const publishedPosts = postResponse.banners.flatMap((banner): PublishedPost[] => {
            const platformMetrics = banner.platforms ?? {};
            return (banner.publications ?? []).map((publication): PublishedPost => {
              const values =
                publication.metrics ?? platformMetrics[publication.platform] ?? {};
              const metrics: Record<string, number> = {};
              const notes: string[] = [];

              for (const [key, value] of Object.entries(values)) {
                if (typeof value === 'number' && Number.isFinite(value)) {
                  metrics[key.replaceAll('_', ' ')] = value;
                } else if (typeof value === 'string' && value.trim()) {
                  notes.push(value);
                }
              }

              return {
                id: `${publication.platform}:${publication.id}`,
                bannerId: banner.bannerId,
                platform: publication.platform,
                externalId: publication.externalId,
                permalink: publication.permalink,
                publishedAt: publication.publishedAt || banner.publishedAt || '',
                caption: banner.caption || banner.theme || null,
                imageUrl: resolvePosterImageUrl(banner.imageUrl),
                productTitle: `Banner #${banner.bannerId}${banner.day ? ` · Day ${banner.day}` : ''}`,
                insights: {
                  metrics: Object.keys(metrics).length > 0 ? metrics : null,
                  note: notes.join(' ' ) || undefined,
                },
              };
            });
          })
          .concat(
            (postResponse.youtubeVideos ?? []).map((video): PublishedPost => ({
              id: `youtube:${video.id}`,
              bannerId: 0,
              platform: 'youtube',
              externalId: video.id,
              permalink: video.permalink,
              publishedAt: video.publishedAt,
              caption: video.description || null,
              imageUrl: video.thumbnailUrl || null,
              productTitle: video.title,
              insights: {
                metrics: video.metrics,
                note: postResponse.youtubeVideosNote,
              },
            }))
          )
          .sort((a, b) => publishedTimestamp(b.publishedAt) - publishedTimestamp(a.publishedAt))
          .slice(0, 30);

        setPosts(publishedPosts);
        setPostsNotice(postResponse.youtubeVideosNote || '');
      } catch (postError) {
        setPostsError(postError instanceof Error ? postError.message : 'Unable to load published posts.');
      } finally {
        setPostsLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  const togglePostInsights = useCallback((post: PublishedPost) => {
    if (expandedPostId === post.id) {
      setExpandedPostId(null);
      return;
    }

    setExpandedPostId(post.id);
    const savedInsights = post.insights;
    if (savedInsights) {
      setPostInsights((previous) => ({ ...previous, [post.id]: savedInsights }));
      return;
    }
    if (postInsights[post.id]?.metrics || postInsights[post.id]?.note) return;
    setPostInsights((previous) => ({
      ...previous,
      [post.id]: { note: 'No analytics are available for this post yet.' },
    }));
  }, [expandedPostId, postInsights]);

  useIonViewWillEnter(() => {
    void loadAnalytics();
  });

  const summary = useMemo(() => {
    let connected = 0;
    let published = 0;
    let conversations = 0;
    for (const platform of PLATFORM_ORDER) {
      const item = platforms[platform];
      if (item?.connected) connected += 1;
      published += Number(item?.posts) || 0;
    }
    conversations = Number(platforms.whatsapp?.conversations) || 0;
    return { connected, published, conversations };
  }, [platforms]);

  const postGroups = useMemo(() => {
    const groups = new Map<string, PublishedPost[]>();
    for (const post of posts) {
      const group = groups.get(post.platform) ?? [];
      group.push(post);
      groups.set(post.platform, group);
    }
    return Array.from(groups, ([platform, groupedPosts]): PublishedPostGroup => ({
      platform,
      posts: groupedPosts,
    }));
  }, [posts]);

  return (
    <IonPage className="analytics-page">
      <IonHeader className="ion-no-border">
        <IonToolbar className="analytics-toolbar">
          <IonButton
            slot="start"
            fill="clear"
            aria-label="Back"
            onClick={() => {
              if (router.canGoBack()) router.back();
              else router.push('/dashboard', 'back');
            }}
          >
            <IonIcon icon={arrowBackOutline} />
          </IonButton>
          <IonTitle>Analytics</IonTitle>
          <IonButton
            slot="end"
            fill="clear"
            aria-label="Refresh analytics"
            onClick={() => void loadAnalytics()}
            disabled={loading}
          >
            <IonIcon icon={refreshOutline} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent className="analytics-content">
        <main className="analytics-container">
          <section className="analytics-intro">
            <p className="analytics-eyebrow">YOUR BUSINESS PERFORMANCE</p>
            <h1>All channels, one view.</h1>
            <p>Private analytics for your signed-in account across connected channels.</p>
          </section>

          {!loading && !error && (
            <section className="analytics-summary" aria-label="Account analytics summary">
              <div>
                <strong>{summary.connected}<small>/6</small></strong>
                <span>Connected channels</span>
              </div>
              <div>
                <strong>{formatNumber(summary.published)}</strong>
                <span>Published posts</span>
              </div>
              <div>
                <strong>{formatNumber(summary.conversations)}</strong>
                <span>WhatsApp conversations</span>
              </div>
            </section>
          )}

          <div className="analytics-section-heading">
            <div>
              <h2>Channel performance</h2>
              <p>Publishing totals are account-wide; YouTube insights cover the last 30 days.</p>
            </div>
          </div>

          {loading && (
            <div className="analytics-loading" role="status">
              <IonSpinner name="crescent" />
              <span>Loading your channel analytics…</span>
            </div>
          )}

          {!loading && error && (
            <section className="analytics-error" role="alert">
              <strong>Analytics unavailable</strong>
              <p>{error}</p>
              <IonButton size="small" fill="outline" onClick={() => void loadAnalytics()}>
                Try again
              </IonButton>
            </section>
          )}

          {!loading && !error && (
            <div className="analytics-platform-list">
              {PLATFORM_ORDER.map((platform) => {
                const details = PLATFORM_DETAILS[platform];
                const item = platforms[platform];
                const connected = Boolean(item?.connected);

                return (
                  <section className="analytics-platform-card" key={platform}>
                    <header className="analytics-platform-header">
                      <span
                        className="analytics-platform-icon"
                        style={{ color: details.color, background: details.background }}
                      >
                        <IonIcon icon={details.icon} />
                      </span>
                      <div className="analytics-platform-title">
                        <h3>{details.label}</h3>
                        <p className={connected ? 'is-connected' : ''}>
                          <span className="analytics-status-dot" />
                          {connected
                            ? item?.accountName
                              ? `Connected · ${item.accountName}`
                              : 'Connected'
                            : 'Not connected'}
                        </p>
                      </div>
                      {!connected && (
                        <IonButton
                          size="small"
                          fill="outline"
                          onClick={() => router.push('/social-connections', 'forward')}
                        >
                          Connect
                        </IonButton>
                      )}
                    </header>

                    <div className="analytics-metrics">
                      {details.metrics.map((metric) => (
                        <div className="analytics-metric" key={metric.key}>
                          <IonIcon icon={metric.icon} aria-hidden="true" />
                          <strong>{connected ? formatNumber(item?.[metric.key] as number | null | undefined) : '—'}</strong>
                          <span>{metric.label}</span>
                        </div>
                      ))}
                    </div>
                    {connected && item?.note && <p className="analytics-note">{item.note}</p>}
                  </section>
                );
              })}
            </div>
          )}

          {!loading && !error && (
            <section className="analytics-posts-section">
              <div className="analytics-section-heading">
                <div>
                  <h2>Published post analytics</h2>
                  <p>Open a post or video to view likes, comments, views and other available metrics.</p>
                </div>
              </div>

              {postsLoading && (
                <div className="analytics-posts-loading" role="status">
                  <IonSpinner name="crescent" />
                  <span>Loading published posts…</span>
                </div>
              )}
              {!postsLoading && postsError && (
                <section className="analytics-error" role="alert">
                  <p>{postsError}</p>
                  <IonButton size="small" fill="outline" onClick={() => void loadAnalytics()}>
                    Try again
                  </IonButton>
                </section>
              )}
              {!postsLoading && !postsError && posts.length === 0 && (
                <p className="analytics-posts-empty">No published posts found for your account yet.</p>
              )}
              {!postsLoading && !postsError && postsNotice && (
                <p className="analytics-note">{postsNotice}</p>
              )}

              {!postsLoading && !postsError && posts.length > 0 && (
                <div className="analytics-post-platforms">
                  {postGroups.map((group) => {
                    const platformKey = group.platform as PlatformKey;
                    const details = PLATFORM_DETAILS[platformKey];
                    const label = details?.label ?? group.platform.replaceAll('_', ' ');

                    return (
                      <section className="analytics-post-platform-section" key={group.platform}>
                        <header className="analytics-post-platform-heading">
                          <span
                            className="analytics-post-platform-icon"
                            style={details ? { color: details.color, background: details.background } : undefined}
                          >
                            <IonIcon icon={details?.icon ?? shareSocialOutline} aria-hidden="true" />
                          </span>
                          <div>
                            <h3>{label}</h3>
                            <p>{group.posts.length} {group.posts.length === 1 ? 'published post' : 'published posts'} · Latest first</p>
                          </div>
                        </header>
                        <div className="analytics-post-slider" aria-label={`${label} published posts`}>
                          {group.posts.map((post) => {
                            const insight = postInsights[post.id];
                            const expanded = expandedPostId === post.id;
                            const postMetricEntries = Object.entries(insight?.metrics || {});

                            return (
                              <article className="analytics-post-card" key={post.id}>
                                <div className="analytics-post-main">
                                  <AnalyticsPostImage
                                    src={post.imageUrl}
                                    alt={post.productTitle || post.caption || 'Published banner'}
                                  />
                                  <div className="analytics-post-copy">
                                    <span className={`analytics-post-platform is-${post.platform}`}>
                                      {label}
                                    </span>
                                    <h3>{post.productTitle || post.caption || `Post #${post.id}`}</h3>
                                    {post.caption && post.caption !== post.productTitle && (
                                      <p>{post.caption}</p>
                                    )}
                                    {post.publishedAt && (
                                      <time dateTime={post.publishedAt}>
                                        {new Date(post.publishedAt).toLocaleString()}
                                      </time>
                                    )}
                                  </div>
                                </div>
                                {post.platform === 'youtube' && post.insights?.metrics && (
                                  <div className="analytics-youtube-metrics" aria-label="YouTube video statistics">
                                    {Object.entries(post.insights.metrics).map(([metricLabel, value]) => (
                                      <div key={metricLabel}>
                                        <IonIcon
                                          icon={metricLabel === 'views' ? eyeOutline : metricLabel === 'comments' ? chatbubblesOutline : peopleOutline}
                                          aria-hidden="true"
                                        />
                                        <strong>{formatNumber(value)}</strong>
                                        <span>{metricLabel}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="analytics-post-actions">
                                  {post.permalink && (
                                    <a href={post.permalink} target="_blank" rel="noreferrer">
                                      View post
                                    </a>
                                  )}
                                  {post.platform !== 'youtube' && (
                                    <IonButton size="small" fill="outline" onClick={() => void togglePostInsights(post)}>
                                      {expanded ? 'Hide insights' : 'View insights'}
                                    </IonButton>
                                  )}
                                </div>
                                {expanded && post.platform !== 'youtube' && (
                                  <div className="analytics-post-insights">
                                    {insight?.loading && (
                                      <div className="analytics-posts-loading" role="status">
                                        <IonSpinner name="crescent" />
                                        <span>Fetching post insights…</span>
                                      </div>
                                    )}
                                    {!insight?.loading && !insight?.error && postMetricEntries.length > 0 && (
                                      <div className="analytics-post-metrics">
                                        {postMetricEntries.map(([metricLabel, value]) => (
                                          <div key={metricLabel}>
                                            <strong>{formatNumber(value)}</strong>
                                            <span>{metricLabel.replaceAll('_', ' ')}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {!insight?.loading && !insight?.error && insight?.note && (
                                      <p className="analytics-note">{insight.note}</p>
                                    )}
                                    {!insight?.loading && !insight?.error && !insight?.note && postMetricEntries.length === 0 && (
                                      <p className="analytics-note">No post insights are available yet.</p>
                                    )}
                                  </div>
                                )}
                              </article>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </main>
      </IonContent>
      <BottomTabBar />
    </IonPage>
  );
};

export default Analytics;
