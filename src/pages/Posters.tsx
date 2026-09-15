import React, { useEffect, useMemo, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonIcon,
  IonSpinner,
  IonToast,
  IonModal,
  IonCheckbox,
  IonButton,
} from '@ionic/react';
import {
  imagesOutline,
  calendarOutline,
  logoFacebook,
  logoInstagram,
  logoWhatsapp,
  chevronDownOutline,
  chevronUpOutline,
  checkmarkCircle,
  closeOutline,
  lockClosedOutline,
} from 'ionicons/icons';
import { apiGet, apiPost } from '../api';

interface BannerItem {
  id: number;
  productId: number;
  productName: string | null;
  productImageUrl: string | null;
  day: number;
  theme: string | null;
  imageUrl: string;
  caption: string | null;
  description?: string | null;
  features?: string | null; // JSON string array
  hashtags?: string | null; // JSON string array
  keywords?: string | null; // JSON string array
  visibleText?: string | null; // JSON string array
  metaDescription?: string | null;
  createdAt: string;
}

const brand = {
  navy: '#0F2A4A',
  blue: '#1E7FE0',
  teal: '#12A19C',
  ink: '#5A6B7B',
  border: '#E1E8EE',
  bg: '#F7FAFC',
  fb: '#1877F2',
  ig1: '#F58529',
  ig2: '#DD2A7B',
  ig3: '#8134AF',
  wa: '#25D366',
};

/* =========================================================
   PLATFORM CONFIG
   Same connect/status/callback pattern for all three
   platforms — Instagram was the original; Facebook and
   WhatsApp follow the exact same shape.
========================================================= */

type PlatformKey = 'facebook' | 'instagram' | 'whatsapp';

interface PlatformConfig {
  key: PlatformKey;
  label: string;
  icon: string;
  iconColor: string;
  statusEndpoint: string;
  connectUrl: string;
}

const PLATFORMS: PlatformConfig[] = [
  {
    key: 'facebook',
    label: 'Facebook',
    icon: logoFacebook,
    iconColor: brand.fb,
    statusEndpoint: '/facebook/status',
    connectUrl: 'https://aarnatechxperts.in/bizmyntra/api/facebook/connect',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    icon: logoInstagram,
    iconColor: brand.ig2,
    statusEndpoint: '/instagram/status',
    connectUrl: 'https://aarnatechxperts.in/bizmyntra/api/instagram/connect',
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    icon: logoWhatsapp,
    iconColor: brand.wa,
    statusEndpoint: '/whatsapp/status',
    connectUrl: 'https://aarnatechxperts.in/bizmyntra/api/whatsapp/connect',
  },
];

const PLATFORM_BY_KEY: Record<PlatformKey, PlatformConfig> = PLATFORMS.reduce(
  (acc, p) => {
    acc[p.key] = p;
    return acc;
  },
  {} as Record<PlatformKey, PlatformConfig>
);

// Safely parse a field that may arrive as a JSON-stringified array.
function parseList(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

const Posters: React.FC = () => {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Which day's "details" accordion is open.
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  // Platform-select modal state.
  const [activeBanner, setActiveBanner] = useState<BannerItem | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformKey[]>([]);
  const [posting, setPosting] = useState(false);

  // Connection status + username, keyed by platform.
  const [connectionStatus, setConnectionStatus] = useState<
    Record<PlatformKey, boolean>
  >({
    facebook: false,
    instagram: false,
    whatsapp: false,
  });

  const [connectionUsername, setConnectionUsername] = useState<
    Record<PlatformKey, string | null>
  >({
    facebook: null,
    instagram: null,
    whatsapp: null,
  });

  const [checkingConnections, setCheckingConnections] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const [bannerRes] = await Promise.all([
          apiGet('/banners'),
          checkAllConnections(),
        ]);

        setBanners(bannerRes?.banners ?? []);
      } catch (e: any) {
        setError(e?.message || 'Unable to load posters');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const checkPlatformConnection = async (platform: PlatformKey) => {
    try {
      const res = await apiGet(PLATFORM_BY_KEY[platform].statusEndpoint);

      const connected = res?.connected === true;

      setConnectionStatus((prev) => ({
        ...prev,
        [platform]: connected,
      }));

      setConnectionUsername((prev) => ({
        ...prev,
        [platform]:
          res?.[platform]?.username ??
          res?.username ??
          null,
      }));

      return connected;
    } catch (error) {
      console.error(`${platform} status error:`, error);

      setConnectionStatus((prev) => ({
        ...prev,
        [platform]: false,
      }));

      return false;
    }
  };

  const checkAllConnections = async () => {
    try {
      setCheckingConnections(true);

      await Promise.all(
        PLATFORMS.map((p) => checkPlatformConnection(p.key))
      );
    } finally {
      setCheckingConnections(false);
    }
  };

  const groupedByDay = useMemo(() => {
    const map = new Map<number, BannerItem[]>();
    for (const banner of banners) {
      const list = map.get(banner.day) ?? [];
      list.push(banner);
      map.set(banner.day, list);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, items]) => {
        const [highlight, ...rest] = items;
        return { day, highlight, rest };
      });
  }, [banners]);

  const activeDay = groupedByDay[0]?.day ?? null;

  const openPlatformPicker = (banner: BannerItem) => {
    setActiveBanner(banner);
    setSelectedPlatforms([]);
  };

  const togglePlatform = (platform: PlatformKey) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  /* =========================================================
     OAUTH CALLBACK HANDLING (generalized for all platforms)

     Backend should redirect back with a query param named
     after the platform, e.g.:
       ?instagram=connected
       ?facebook=connected
       ?whatsapp=connected
     with the same possible values as before: connected,
     cancelled, no_account, error, invalid_state, expired.
  ========================================================= */
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);

      let matchedPlatform: PlatformKey | null = null;
      let result: string | null = null;

      for (const platform of PLATFORMS) {
        const value = params.get(platform.key);
        if (value) {
          matchedPlatform = platform.key;
          result = value;
          break;
        }
      }

      if (!matchedPlatform || !result) return;

      const platformLabel = PLATFORM_BY_KEY[matchedPlatform].label;

      if (result === 'connected') {
        setSuccessMsg(`${platformLabel} connected successfully`);

        await checkPlatformConnection(matchedPlatform);

        /*
         * Publish the banner that user selected
         * before OAuth started (may need more than
         * one platform connected before it can post).
         */
        const pending = localStorage.getItem('pending_banner_publish');

        if (pending) {
          try {
            const data = JSON.parse(pending);
            const pendingPlatforms: PlatformKey[] = data.platforms;

            // Check that every selected platform is now connected
            // before trying to publish again.
            const stillNeeded: PlatformKey[] = [];

            for (const platform of pendingPlatforms) {
              const connected = await checkPlatformConnection(platform);
              if (!connected) stillNeeded.push(platform);
            }

            if (stillNeeded.length > 0) {
              // Continue the connect chain with the next platform.
              localStorage.setItem(
                'pending_banner_publish',
                JSON.stringify({
                  bannerId: data.bannerId,
                  platforms: pendingPlatforms,
                })
              );

              window.location.href =
                PLATFORM_BY_KEY[stillNeeded[0]].connectUrl;

              return;
            }

            await apiPost('/banners/publish', {
              bannerId: data.bannerId,
              platforms: pendingPlatforms,
            });

            localStorage.removeItem('pending_banner_publish');

            setSuccessMsg(
              `${platformLabel} connected and banner posted successfully`
            );

            setBanners((prev) =>
              prev.filter((banner) => banner.id !== data.bannerId)
            );
          } catch (error: any) {
            setError(
              error?.message ||
                `${platformLabel} connected, but posting failed`
            );
          }
        }
      }

      if (result === 'cancelled') {
        setError(`${platformLabel} connection was cancelled`);
      }

      if (result === 'no_account') {
        setError(
          `No ${platformLabel} professional account was found for this Meta account.`
        );
      }

      if (
        result === 'error' ||
        result === 'invalid_state' ||
        result === 'expired'
      ) {
        setError(`${platformLabel} connection failed. Please try again.`);
      }

      // Remove OAuth query parameters.
      window.history.replaceState({}, document.title, window.location.pathname);
    };

    handleOAuthCallback();
  }, []);

  const handleConnectAndPost = async () => {
    if (!activeBanner || selectedPlatforms.length === 0) {
      return;
    }

    try {
      setPosting(true);

      const bannerId = activeBanner.id;

      /*
       * Make sure every selected platform is connected.
       * If any isn't, save what the user was trying to do
       * and kick off OAuth for the first missing one — the
       * callback handler above will chain through the rest.
       */
      for (const platform of selectedPlatforms) {
        let connected = connectionStatus[platform];

        try {
          connected = await checkPlatformConnection(platform);
        } catch {
          connected = false;
        }

        if (!connected) {
          localStorage.setItem(
            'pending_banner_publish',
            JSON.stringify({
              bannerId,
              platforms: selectedPlatforms,
            })
          );

          window.location.href = PLATFORM_BY_KEY[platform].connectUrl;
          return;
        }
      }

      /*
       * Every selected platform is connected — publish directly.
       */
      const response = await apiPost('/banners/publish', {
        bannerId,
        platforms: selectedPlatforms,
      });

      if (!response?.success) {
        throw new Error(response?.message || 'Failed to publish banner');
      }

      const postedDay = activeBanner.day;

      setSuccessMsg(
        `Posted to ${selectedPlatforms
          .map((platform) => PLATFORM_BY_KEY[platform].label)
          .join(' & ')}`
      );

      setActiveBanner(null);
      setSelectedPlatforms([]);

      /*
       * Remove the posted day from the UI.
       */
      setBanners((prev) => prev.filter((banner) => banner.day !== postedDay));
    } catch (error: any) {
      console.error('Connect & Post error:', error);

      setError(error?.message || 'Failed to connect or publish banner');
    } finally {
      setPosting(false);
    }
  };

  const buttonLabel = () => {
    if (posting || checkingConnections) return null;

    const disconnected = selectedPlatforms.filter(
      (p) => !connectionStatus[p]
    );

    if (disconnected.length > 0) {
      return `Connect ${PLATFORM_BY_KEY[disconnected[0]].label} & Post`;
    }

    return `Post Now${
      selectedPlatforms.length ? ` (${selectedPlatforms.length})` : ''
    }`;
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" text="" />
          </IonButtons>
          <IonTitle>AI posters</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen style={{ '--background': brand.bg } as React.CSSProperties}>
        <div style={{ padding: '16px' }}>
          {loading && (
            <div className="flex flex-col items-center justify-center" style={{ paddingTop: 80 }}>
              <IonSpinner name="crescent" />
              <p style={{ color: brand.ink, fontSize: 13, marginTop: 10 }}>Loading your posters...</p>
            </div>
          )}

          {!loading && !error && groupedByDay.length === 0 && (
            <div
              className="flex flex-col items-center justify-center rounded-2xl"
              style={{ padding: '48px 20px', border: `1px dashed ${brand.border}`, background: '#FFFFFF' }}
            >
              <IonIcon icon={imagesOutline} style={{ fontSize: 32, color: '#A9B6C2' }} />
              <h4 style={{ fontSize: 15, fontWeight: 700, color: brand.navy, margin: '12px 0 4px' }}>
                No posters yet
              </h4>
              <p style={{ fontSize: 13, color: brand.ink, textAlign: 'center', maxWidth: 260 }}>
                Upload a product to generate your first 10-day AI poster campaign.
              </p>
            </div>
          )}

          {!loading &&
            groupedByDay.map(({ day, highlight, rest }) => {
              const features = parseList(highlight.features);
              const hashtags = parseList(highlight.hashtags);
              const keywords = parseList(highlight.keywords);
              const isExpanded = expandedDay === day;
              const isActive = day === activeDay;

              // Every day except the current active one is locked: blurred,
              // not clickable, no details, no variants — just a preview.
              if (!isActive) {
                return (
                  <div key={day} style={{ marginBottom: 20 }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
                      <IonIcon icon={calendarOutline} style={{ fontSize: 16, color: '#A9B6C2' }} />
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#8A97A6', margin: 0 }}>
                        Day {day}
                      </h3>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#8A97A6',
                          background: '#EDF1F5',
                          borderRadius: 999,
                          padding: '2px 8px',
                          marginLeft: 4,
                        }}
                      >
                        UPCOMING
                      </span>
                    </div>
                    <div
                      style={{
                        position: 'relative',
                        borderRadius: 16,
                        overflow: 'hidden',
                        border: `1px solid ${brand.border}`,
                        background: '#FFFFFF',
                        cursor: 'not-allowed',
                      }}
                    >
                      <img
                        src={highlight.imageUrl}
                        alt={highlight.theme || `Day ${day} poster`}
                        style={{
                          width: '100%',
                          aspectRatio: '1 / 1',
                          objectFit: 'cover',
                          display: 'block',
                          filter: 'blur(8px)',
                          transform: 'scale(1.05)',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(15,42,74,0.35)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          padding: 16,
                          textAlign: 'center',
                        }}
                      >
                        <IonIcon icon={lockClosedOutline} style={{ fontSize: 22, color: '#FFFFFF' }} />
                        <p
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#FFFFFF',
                            margin: 0,
                            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                          }}
                        >
                          {highlight.theme || highlight.caption || `Day ${day} poster`}
                        </p>
                        <p style={{ fontSize: 10.5, color: '#E2E8F0', margin: 0 }}>
                          Unlocks after Day {activeDay} is posted
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={day} style={{ marginBottom: 28 }}>
                  {/* Day header */}
                  <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
                    <IonIcon icon={calendarOutline} style={{ fontSize: 16, color: brand.blue }} />
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: brand.navy, margin: 0 }}>
                      Day {day}
                    </h3>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: brand.teal,
                        background: '#E4F7F5',
                        borderRadius: 999,
                        padding: '2px 8px',
                        marginLeft: 4,
                      }}
                    >
                      READY TO POST
                    </span>
                  </div>

                  {/* Highlight card — the one meant to be posted; only this is clickable */}
                  <div
                    onClick={() => openPlatformPicker(highlight)}
                    role="button"
                    style={{
                      borderRadius: 16,
                      overflow: 'hidden',
                      background: '#FFFFFF',
                      border: `1px solid ${brand.border}`,
                      boxShadow: '0 4px 14px rgba(15,42,74,0.08)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ position: 'relative' }}>
                      <img
                        src={highlight.imageUrl}
                        alt={highlight.theme || `Day ${day} poster`}
                        style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          right: 10,
                          bottom: 10,
                          background: 'rgba(15,42,74,0.85)',
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 600,
                          borderRadius: 999,
                          padding: '6px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <IonIcon icon={logoFacebook} style={{ fontSize: 13 }} />
                        <IonIcon icon={logoInstagram} style={{ fontSize: 13 }} />
                        <IonIcon icon={logoWhatsapp} style={{ fontSize: 13 }} />
                        Tap to post
                      </div>
                    </div>

                    <div style={{ padding: '12px 14px' }}>
                      {highlight.theme && (
                        <p style={{ fontSize: 13, fontWeight: 700, color: brand.navy, margin: 0 }}>
                          {highlight.theme}
                        </p>
                      )}
                      {highlight.productName && (
                        <p style={{ fontSize: 12, color: brand.ink, margin: '2px 0 0' }}>
                          {highlight.productName}
                        </p>
                      )}
                      {highlight.description && (
                        <p style={{ fontSize: 12, color: brand.ink, margin: '6px 0 0', lineHeight: 1.4 }}>
                          {highlight.description}
                        </p>
                      )}
                      <p style={{ fontSize: 10, color: '#A9B6C2', margin: '8px 0 0' }}>
                        Created {formatDate(highlight.createdAt)}
                      </p>

                      {/* Full-details toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedDay(isExpanded ? null : day);
                        }}
                        style={{
                          marginTop: 10,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          color: brand.blue,
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                        }}
                      >
                        {isExpanded ? 'Hide details' : 'View all details'}
                        <IonIcon icon={isExpanded ? chevronUpOutline : chevronDownOutline} style={{ fontSize: 14 }} />
                      </button>

                      {isExpanded && (
                        <div
                          style={{
                            marginTop: 10,
                            paddingTop: 10,
                            borderTop: `1px solid ${brand.border}`,
                          }}
                        >
                          {highlight.caption && (
                            <DetailRow label="Caption" value={highlight.caption} />
                          )}
                          {highlight.metaDescription && (
                            <DetailRow label="Meta description" value={highlight.metaDescription} />
                          )}
                          {features.length > 0 && <ChipRow label="Features" items={features} />}
                          {keywords.length > 0 && <ChipRow label="Keywords" items={keywords} />}
                          {hashtags.length > 0 && (
                            <ChipRow label="Hashtags" items={hashtags} chipColor={brand.blue} />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Secondary variants for the day — blurred, short caption only, not clickable */}
                  {rest.length > 0 && (
                    <div className="grid grid-cols-2 gap-3" style={{ marginTop: 10 }}>
                      {rest.map((banner) => (
                        <div
                          key={banner.id}
                          style={{
                            position: 'relative',
                            borderRadius: 12,
                            overflow: 'hidden',
                            border: `1px solid ${brand.border}`,
                            background: '#FFFFFF',
                            cursor: 'default',
                          }}
                        >
                          <img
                            src={banner.imageUrl}
                            alt={banner.theme || `Day ${banner.day} alt poster`}
                            style={{
                              width: '100%',
                              aspectRatio: '1 / 1',
                              objectFit: 'cover',
                              display: 'block',
                              filter: 'blur(6px)',
                              transform: 'scale(1.05)',
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(15,42,74,0.28)',
                              display: 'flex',
                              alignItems: 'flex-end',
                              padding: 8,
                            }}
                          >
                            <p
                              className="truncate"
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#FFFFFF',
                                margin: 0,
                                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                              }}
                            >
                              {banner.theme || banner.caption || 'Alternate variant'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Facebook / Instagram / WhatsApp connect sheet */}
        <IonModal
          isOpen={!!activeBanner}
          initialBreakpoint={0.55}
          breakpoints={[0, 0.55]}
          onDidDismiss={() => setActiveBanner(null)}
        >
          <div style={{ padding: '20px 20px 24px' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: brand.navy, margin: 0 }}>
                Post this banner
              </h3>
              <IonIcon
                icon={closeOutline}
                style={{ fontSize: 20, color: brand.ink, cursor: 'pointer' }}
                onClick={() => setActiveBanner(null)}
              />
            </div>
            <p style={{ fontSize: 12, color: brand.ink, margin: '0 0 16px' }}>
              Choose one or more platforms to connect and publish.
            </p>

            {PLATFORMS.map((platform) => (
              <PlatformRow
                key={platform.key}
                icon={platform.icon}
                iconColor={platform.iconColor}
                label={platform.label}
                checked={selectedPlatforms.includes(platform.key)}
                onToggle={() => togglePlatform(platform.key)}
              />
            ))}

            <IonButton
              expand="block"
              disabled={
                selectedPlatforms.length === 0 || posting || checkingConnections
              }
              onClick={handleConnectAndPost}
              style={{
                marginTop: 20,
                '--border-radius': '12px',
              } as React.CSSProperties}
            >
              {posting || checkingConnections ? (
                <IonSpinner name="dots" />
              ) : (
                buttonLabel()
              )}
            </IonButton>
          </div>
        </IonModal>

        <IonToast
          isOpen={!!error}
          message={error}
          duration={3000}
          color="danger"
          onDidDismiss={() => setError('')}
        />
        <IonToast
          isOpen={!!successMsg}
          message={successMsg}
          duration={2500}
          color="success"
          icon={checkmarkCircle}
          onDidDismiss={() => setSuccessMsg('')}
        />
      </IonContent>
    </IonPage>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ marginBottom: 8 }}>
    <p style={{ fontSize: 10, fontWeight: 700, color: '#A9B6C2', margin: 0, textTransform: 'uppercase', letterSpacing: 0.3 }}>
      {label}
    </p>
    <p style={{ fontSize: 12, color: brand.navy, margin: '2px 0 0', lineHeight: 1.4 }}>{value}</p>
  </div>
);

const ChipRow: React.FC<{ label: string; items: string[]; chipColor?: string }> = ({
  label,
  items,
  chipColor = brand.ink,
}) => (
  <div style={{ marginBottom: 8 }}>
    <p style={{ fontSize: 10, fontWeight: 700, color: '#A9B6C2', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.3 }}>
      {label}
    </p>
    <div className="flex flex-wrap gap-1">
      {items.map((item, i) => (
        <span
          key={i}
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            color: chipColor,
            background: '#F1F5F9',
            borderRadius: 999,
            padding: '3px 9px',
          }}
        >
          {item}
        </span>
      ))}
    </div>
  </div>
);

const PlatformRow: React.FC<{
  icon: string;
  iconColor: string;
  label: string;
  checked: boolean;
  onToggle: () => void;
}> = ({ icon, iconColor, label, checked, onToggle }) => (
  <div
    onClick={onToggle}
    className="flex items-center justify-between"
    style={{
      padding: '12px 14px',
      borderRadius: 12,
      border: `1px solid ${checked ? brand.blue : brand.border}`,
      background: checked ? '#EFF6FF' : '#FFFFFF',
      marginBottom: 10,
      cursor: 'pointer',
    }}
  >
    <div className="flex items-center gap-3">
      <IonIcon icon={icon} style={{ fontSize: 22, color: iconColor }} />
      <span style={{ fontSize: 14, fontWeight: 600, color: brand.navy }}>{label}</span>
    </div>
    <IonCheckbox checked={checked} onIonChange={onToggle} />
  </div>
);

export default Posters;