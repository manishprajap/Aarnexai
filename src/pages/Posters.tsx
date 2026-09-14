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
} from '@ionic/react';
import { imagesOutline, calendarOutline } from 'ionicons/icons';
import { apiGet } from '../api';

interface BannerItem {
  id: number;
  productId: number;
  productName: string | null;
  productImageUrl: string | null;
  day: number;
  theme: string | null;
  imageUrl: string;
  caption: string | null;
  createdAt: string;
}

const brand = {
  navy: '#0F2A4A',
  blue: '#1E7FE0',
  teal: '#12A19C',
  ink: '#5A6B7B',
  border: '#E1E8EE',
};

const Posters: React.FC = () => {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await apiGet('/banners');
        setBanners(res?.banners ?? []);
      } catch (e: any) {
        setError(e?.message || 'Unable to load posters');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Group flat banner list into { day: BannerItem[] }, sorted by day ascending.
  const groupedByDay = useMemo(() => {
    const map = new Map<number, BannerItem[]>();
    for (const banner of banners) {
      const list = map.get(banner.day) ?? [];
      list.push(banner);
      map.set(banner.day, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [banners]);

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

      <IonContent fullscreen style={{ '--background': '#F7FAFC' } as React.CSSProperties}>
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
            groupedByDay.map(([day, items]) => (
              <div key={day} style={{ marginBottom: 24 }}>
                <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
                  <IonIcon icon={calendarOutline} style={{ fontSize: 16, color: brand.blue }} />
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: brand.navy, margin: 0 }}>
                    Day {day}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {items.map((banner) => (
                    <div
                      key={banner.id}
                      className="overflow-hidden rounded-xl"
                      style={{ border: `1px solid ${brand.border}`, background: '#FFFFFF' }}
                    >
                      <img
                        src={banner.imageUrl}
                        alt={banner.theme || `Day ${banner.day} poster`}
                        className="w-full object-cover"
                        style={{ aspectRatio: '1 / 1' }}
                      />
                      <div style={{ padding: '8px 10px' }}>
                        {banner.theme && (
                          <p
                            className="truncate"
                            style={{ fontSize: 12, fontWeight: 600, color: brand.navy, margin: 0 }}
                          >
                            {banner.theme}
                          </p>
                        )}
                        {banner.productName && (
                          <p
                            className="truncate"
                            style={{ fontSize: 11, color: brand.ink, margin: '2px 0 0' }}
                          >
                            {banner.productName}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>

        <IonToast
          isOpen={!!error}
          message={error}
          duration={3000}
          color="danger"
          onDidDismiss={() => setError('')}
        />
      </IonContent>
    </IonPage>
  );
};

export default Posters;