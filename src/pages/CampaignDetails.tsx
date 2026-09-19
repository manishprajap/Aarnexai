import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonButtons,
  IonBackButton,
  IonButton,
  IonChip,
  IonLabel,
  IonSpinner,
  IonIcon,
  IonAlert,
  useIonRouter,
} from '@ionic/react';
import {
  playOutline,
  pauseOutline,
  refreshOutline,
  megaphoneOutline,
} from 'ionicons/icons';
import { useParams } from 'react-router-dom';

interface Campaign {
  id: number;
  userId: number;
  adCreativeId: number;
  platform: string;
  objective: string;
  dailyBudget?: number;
  tierUsed?: string;
  metaCampaignId?: string;
  metaAdSetId?: string;
  metaAdId?: string;
  status: string;
  error?: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Creative {
  id: number;
  imageUrl?: string;
  platform?: string;
  price?: string;
  discount?: string;
  phone?: string;
  website?: string;
  cta?: string;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const CampaignDetails: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const ionRouter = useIonRouter();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [creative, setCreative] = useState<Creative | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [showPauseAlert, setShowPauseAlert] = useState(false);

  const getToken = () => {
    return localStorage.getItem('token');
  };

  const loadCampaign = async () => {
    try {
      setLoading(true);

      const token = getToken();

      const response = await fetch(
        `${API_BASE_URL}/api/campaigns/${campaignId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load campaign');
      }

      const data = await response.json();

      const campaignData = data.campaign || data.data;

      setCampaign(campaignData);

      if (campaignData?.adCreativeId) {
        loadCreative(campaignData.adCreativeId);
      }
    } catch (error) {
      console.error(error);
      setCampaign(null);
    } finally {
      setLoading(false);
    }
  };

  const loadCreative = async (creativeId: number) => {
    try {
      const token = getToken();

      const response = await fetch(
        `${API_BASE_URL}/api/creatives/${creativeId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) return;

      const data = await response.json();

      setCreative(data.creative || data.data || null);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadCampaign();
  }, [campaignId]);

  const performAction = async (action: 'pause' | 'resume') => {
    try {
      setActionLoading(true);

      const token = getToken();

      const response = await fetch(
        `${API_BASE_URL}/api/campaigns/${campaignId}/${action}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || `Unable to ${action} campaign`);
      }

      await loadCampaign();
    } catch (error: any) {
      console.error(error);

      alert(error?.message || `Unable to ${action} campaign`);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';

      case 'paused':
        return 'warning';

      case 'completed':
        return 'primary';

      case 'failed':
        return 'danger';

      case 'pending_review':
        return 'warning';

      default:
        return 'medium';
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';

    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar className="app-toolbar">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/campaigns" />
            </IonButtons>

            <div className="px-4 py-2 text-center font-bold text-gray-900">
              Campaign
            </div>
          </IonToolbar>
        </IonHeader>

        <IonContent className="bg-gray-50">
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <IonSpinner />
            <p className="text-sm text-gray-500">Loading campaign...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!campaign) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar className="app-toolbar">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/campaigns" />
            </IonButtons>

            <div className="px-4 py-2 text-center font-bold text-gray-900">
              Campaign
            </div>
          </IonToolbar>
        </IonHeader>

        <IonContent className="bg-gray-50">
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <IonIcon icon={megaphoneOutline} className="text-5xl text-gray-300" />

            <h2 className="m-0 text-lg font-bold text-gray-900">
              Campaign not found
            </h2>

            <IonButton onClick={() => ionRouter.push('/campaigns', 'back')}>
              Back to Campaigns
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="app-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/campaigns" />
          </IonButtons>

          <div className="flex items-center justify-between px-4 py-2">
            <span className="font-bold text-gray-900">
              Campaign #{campaign.id}
            </span>

            <IonButton slot="end" fill="clear" onClick={loadCampaign}>
              <IonIcon slot="icon-only" icon={refreshOutline} />
            </IonButton>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="bg-gray-50">
        <div className="mx-auto max-w-[700px] px-4 pb-12 pt-4">
          <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex items-center justify-between gap-2.5">
              <div>
                <h1 className="m-0 text-xl font-bold text-gray-900">
                  Campaign #{campaign.id}
                </h1>

                <p className="mb-0 mt-1 text-sm text-gray-500">
                  {campaign.objective}
                </p>
              </div>

              <IonChip color={getStatusColor(campaign.status)}>
                <IonLabel>{campaign.status.replace(/_/g, ' ')}</IonLabel>
              </IonChip>
            </div>
          </div>

          {creative?.imageUrl && (
            <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4">
              <h2 className="m-0 mb-2 text-base font-bold text-gray-900">
                Creative
              </h2>

              <img
                src={creative.imageUrl}
                alt="Campaign Creative"
                className="w-full rounded-xl"
              />

              {creative.cta && (
                <p className="mt-2 text-sm text-gray-600">
                  <strong>CTA:</strong> {creative.cta}
                </p>
              )}
            </div>
          )}

          <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4">
            <h2 className="m-0 mb-3 text-base font-bold text-gray-900">
              Campaign Details
            </h2>

            <div className="grid gap-3.5">
              <div>
                <small className="text-gray-500">Platform</small>
                <div className="font-semibold text-gray-900">
                  {campaign.platform.charAt(0).toUpperCase() +
                    campaign.platform.slice(1)}
                </div>
              </div>

              <div>
                <small className="text-gray-500">Objective</small>
                <div className="font-semibold text-gray-900">
                  {campaign.objective}
                </div>
              </div>

              <div>
                <small className="text-gray-500">Daily Budget</small>
                <div className="font-semibold text-gray-900">
                  {campaign.dailyBudget
                    ? `₹${campaign.dailyBudget}`
                    : 'Not specified'}
                </div>
              </div>

              <div>
                <small className="text-gray-500">Start Date</small>
                <div className="font-semibold text-gray-900">
                  {formatDate(campaign.startDate)}
                </div>
              </div>

              <div>
                <small className="text-gray-500">End Date</small>
                <div className="font-semibold text-gray-900">
                  {formatDate(campaign.endDate)}
                </div>
              </div>

              <div>
                <small className="text-gray-500">Created</small>
                <div className="font-semibold text-gray-900">
                  {formatDate(campaign.createdAt)}
                </div>
              </div>
            </div>
          </div>

          {campaign.error && (
            <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4">
              <h2 className="m-0 mb-1 text-base font-bold text-red-600">
                Campaign Error
              </h2>

              <p className="m-0 text-sm text-red-600">{campaign.error}</p>
            </div>
          )}

          {campaign.metaCampaignId && (
            <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4">
              <h2 className="m-0 mb-2 text-base font-bold text-gray-900">
                Meta Campaign
              </h2>

              <p className="m-0 text-sm text-gray-600">
                <strong>Campaign ID:</strong> {campaign.metaCampaignId}
              </p>

              {campaign.metaAdSetId && (
                <p className="mt-1 text-sm text-gray-600">
                  <strong>Ad Set ID:</strong> {campaign.metaAdSetId}
                </p>
              )}

              {campaign.metaAdId && (
                <p className="mt-1 text-sm text-gray-600">
                  <strong>Ad ID:</strong> {campaign.metaAdId}
                </p>
              )}
            </div>
          )}

          <div className="mt-5 grid gap-3">
            {campaign.status === 'active' && (
              <IonButton
                expand="block"
                color="warning"
                onClick={() => setShowPauseAlert(true)}
                disabled={actionLoading}
              >
                <IonIcon slot="start" icon={pauseOutline} />
                Pause Campaign
              </IonButton>
            )}

            {campaign.status === 'paused' && (
              <IonButton
                expand="block"
                color="success"
                onClick={() => performAction('resume')}
                disabled={actionLoading}
              >
                <IonIcon slot="start" icon={playOutline} />
                {actionLoading ? 'Resuming...' : 'Resume Campaign'}
              </IonButton>
            )}
          </div>
        </div>

        <IonAlert
          isOpen={showPauseAlert}
          header="Pause Campaign?"
          message="Your campaign will stop running until you resume it."
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
            },
            {
              text: 'Pause',
              role: 'destructive',
              handler: () => {
                performAction('pause');
              },
            },
          ]}
          onDidDismiss={() => setShowPauseAlert(false)}
        />
      </IonContent>
    </IonPage>
  );
};

export default CampaignDetails;