import React, { useCallback, useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonButton,
  IonIcon,
  IonChip,
  IonLabel,
  IonSpinner,
  useIonRouter,
} from '@ionic/react';
import {
  addOutline,
  megaphoneOutline,
  chevronForwardOutline,
  pauseOutline,
  playOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  timeOutline,
  logoWhatsapp,
} from 'ionicons/icons';

interface Campaign {
  id: number;
  objective: string;
  platform: string;
  dailyBudget?: number;
  status: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  error?: string;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const Campaigns: React.FC = () => {
  const ionRouter = useIonRouter();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const getToken = () => {
    return localStorage.getItem('token');
  };

  const loadCampaigns = useCallback(async () => {
    try {
      setLoading(true);

      const token = getToken();

      const response = await fetch(`${API_BASE_URL}/api/campaigns`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load campaigns');
      }

      const data = await response.json();

      setCampaigns(data.campaigns || data.data || []);
    } catch (error) {
      console.error('Campaign loading error:', error);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return playOutline;

      case 'paused':
        return pauseOutline;

      case 'completed':
        return checkmarkCircleOutline;

      case 'failed':
        return closeCircleOutline;

      default:
        return timeOutline;
    }
  };

  const formatPlatform = (platform: string) => {
    if (!platform) return 'Platform';

    return platform.charAt(0).toUpperCase() + platform.slice(1);
  };

  const formatObjective = (objective: string) => {
    if (!objective) return 'Advertising';

    return objective
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const goToCreate = () => ionRouter.push('/campaigns/create', 'forward');

  const openCampaign = (id: number) => {
    ionRouter.push(`/campaigns/${id}`, 'forward');
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="app-toolbar">
          <div className="px-4 py-2">
            <h1 className="m-0 text-lg font-bold text-gray-900">
              Campaigns
            </h1>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="bg-gray-50">
        <div className="mx-auto max-w-[700px] px-4 pb-24 pt-4">
          <div className="mb-5">
            <h1 className="m-0 text-2xl font-bold text-gray-900">
              Advertising campaigns
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Create and manage your Facebook and Instagram ad campaigns.
            </p>
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            <IonButton expand="block" onClick={goToCreate}>
              <IonIcon slot="start" icon={addOutline} />
              Create Ad Campaign
            </IonButton>
            <IonButton
              expand="block"
              fill="outline"
              onClick={() => ionRouter.push('/whatsapp?view=campaigns', 'forward')}
            >
              <IonIcon slot="start" icon={logoWhatsapp} />
              Create WhatsApp Campaign
            </IonButton>
          </div>

          {loading ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <IonSpinner name="crescent" />
              <p className="text-sm text-gray-500">Loading campaigns...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center">
              <IonIcon
                icon={megaphoneOutline}
                className="mb-3 text-5xl text-gray-300"
              />

              <h2 className="m-0 mb-1 text-lg font-bold text-gray-900">
                No campaigns yet
              </h2>

              <p className="mb-4 text-sm text-gray-500">
                Create your first advertising campaign to promote your products.
              </p>

              <IonButton onClick={goToCreate}>
                Create First Ad Campaign
              </IonButton>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {campaigns.map((campaign) => (
                <button
                  type="button"
                  key={campaign.id}
                  onClick={() => openCampaign(campaign.id)}
                  className="w-full rounded-2xl border border-gray-100 bg-white p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <h2 className="m-0 text-base font-bold text-gray-900">
                        Campaign #{campaign.id}
                      </h2>

                      <p className="my-2 text-sm text-gray-500">
                        {formatObjective(campaign.objective)}
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        <IonChip color="primary">
                          <IonLabel>
                            {formatPlatform(campaign.platform)}
                          </IonLabel>
                        </IonChip>

                        <IonChip color={getStatusColor(campaign.status)}>
                          <IonIcon icon={getStatusIcon(campaign.status)} />
                          <IonLabel>
                            {campaign.status.replace(/_/g, ' ')}
                          </IonLabel>
                        </IonChip>
                      </div>

                      {campaign.dailyBudget ? (
                        <p className="mt-2.5 font-semibold text-gray-900">
                          ₹{campaign.dailyBudget}/day
                        </p>
                      ) : null}
                    </div>

                    <IonIcon
                      icon={chevronForwardOutline}
                      className="mt-1 flex-none text-xl text-gray-400"
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Campaigns;