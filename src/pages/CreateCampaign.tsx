import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonButtons,
  IonBackButton,
  IonButton,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonTextarea,
  IonRadioGroup,
  IonRadio,
  IonSpinner,
  IonProgressBar,
  IonChip,
  useIonRouter,
} from '@ionic/react';

interface Product {
  id: number;
  title?: string;
  brand?: string;
  price?: string;
  originalImageUrl?: string;
  cleanImageUrl?: string;
  status?: string;
}

interface Creative {
  id: number;
  productId: number;
  imageUrl?: string;
  platform?: string;
  status?: string;
  presetKey?: string;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const CreateCampaign: React.FC = () => {
  const ionRouter = useIonRouter();

  const [step, setStep] = useState(1);

  const [products, setProducts] = useState<Product[]>([]);
  const [creatives, setCreatives] = useState<Creative[]>([]);

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingCreatives, setLoadingCreatives] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [productId, setProductId] = useState<number | null>(null);
  const [creativeId, setCreativeId] = useState<number | null>(null);

  const [platform, setPlatform] = useState<
    'facebook' | 'instagram' | 'whatsapp'
  >('facebook');

  const [objective, setObjective] = useState('TRAFFIC');

  const [audience, setAudience] = useState({
    location: '',
    ageMin: '18',
    ageMax: '55',
    gender: 'all',
    interests: '',
  });

  const [dailyBudget, setDailyBudget] = useState('100');
  const [duration, setDuration] = useState('7');

  const getToken = () => {
    return localStorage.getItem('token');
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (productId) {
      loadCreatives(productId);
    }
  }, [productId]);

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);

      const token = getToken();

      const response = await fetch(`${API_BASE_URL}/api/products`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load products');
      }

      const data = await response.json();

      setProducts(data.products || data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadCreatives = async (selectedProductId: number) => {
    try {
      setLoadingCreatives(true);
      setCreativeId(null);

      const token = getToken();

      const response = await fetch(
        `${API_BASE_URL}/api/creatives?productId=${selectedProductId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load creatives');
      }

      const data = await response.json();

      setCreatives(data.creatives || data.data || []);
    } catch (error) {
      console.error(error);
      setCreatives([]);
    } finally {
      setLoadingCreatives(false);
    }
  };

  const nextStep = () => {
    if (step < 7) {
      setStep((current) => current + 1);
    }
  };

  const previousStep = () => {
    if (step > 1) {
      setStep((current) => current - 1);
    } else {
      ionRouter.goBack();
    }
  };

  const canContinue = () => {
    switch (step) {
      case 1:
        return productId !== null;

      case 2:
        return creativeId !== null;

      case 3:
        return !!platform;

      case 4:
        return !!objective;

      case 5:
        return !!audience.location;

      case 6:
        return Number(dailyBudget) >= 50 && Number(duration) >= 1;

      default:
        return true;
    }
  };

  const createCampaign = async () => {
    if (!productId || !creativeId) {
      return;
    }

    try {
      setPublishing(true);

      const token = getToken();

      const response = await fetch(`${API_BASE_URL}/api/campaigns/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          adCreativeId: creativeId,
          platform,
          objective,
          audience,
          dailyBudget: Number(dailyBudget),
          durationDays: Number(duration),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Campaign creation failed');
      }

      const campaign = data.campaign || data.data;

      if (campaign?.id) {
        ionRouter.push(`/campaigns/${campaign.id}`, 'forward', 'replace');
      } else {
        ionRouter.push('/campaigns', 'forward', 'replace');
      }
    } catch (error: any) {
      console.error(error);

      alert(error?.message || 'Unable to create campaign. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const selectedProduct = products.find((item) => item.id === productId);

  const selectedCreative = creatives.find((item) => item.id === creativeId);

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <h2 className="mb-1 text-lg font-bold text-gray-900">
              Select Product
            </h2>

            <p className="mb-4 text-sm text-gray-500">
              Choose the product you want to advertise.
            </p>

            {loadingProducts ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <IonSpinner />
                <p className="text-sm text-gray-500">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <p className="mb-3 text-sm text-red-600">
                  You don't have any products yet.
                </p>

                <IonButton expand="block" onClick={() => ionRouter.push('/upload', 'forward')}>
                  Add Product
                </IonButton>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {products.map((product) => {
                  const image = product.cleanImageUrl || product.originalImageUrl;
                  const selected = productId === product.id;

                  return (
                    <button
                      type="button"
                      key={product.id}
                      onClick={() => setProductId(product.id)}
                      className={`w-full rounded-2xl border bg-white p-4 text-left ${
                        selected
                          ? 'border-2 border-indigo-500'
                          : 'border-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {image && (
                          <img
                            src={image}
                            alt={product.title || 'Product'}
                            className="h-[75px] w-[75px] flex-none rounded-xl object-cover"
                          />
                        )}

                        <div className="min-w-0">
                          <h3 className="m-0 truncate font-bold text-gray-900">
                            {product.title || 'Unnamed Product'}
                          </h3>

                          {product.brand && (
                            <p className="my-1 text-sm text-gray-500">
                              {product.brand}
                            </p>
                          )}

                          {product.price && (
                            <strong className="text-gray-900">
                              ₹{product.price}
                            </strong>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        );

      case 2:
        return (
          <>
            <h2 className="mb-1 text-lg font-bold text-gray-900">
              Select AI Creative
            </h2>

            <p className="mb-4 text-sm text-gray-500">
              Select the poster/creative to use in your campaign.
            </p>

            {loadingCreatives ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <IonSpinner />
                <p className="text-sm text-gray-500">Loading creatives...</p>
              </div>
            ) : creatives.length === 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <p className="mb-3 text-sm text-orange-500">
                  No creatives found for this product.
                </p>

                <IonButton
                  expand="block"
                  onClick={() =>
                    ionRouter.push(`/products/${productId}/customize`, 'forward')
                  }
                >
                  Create AI Creative
                </IonButton>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {creatives.map((creative) => {
                  const selected = creativeId === creative.id;

                  return (
                    <button
                      type="button"
                      key={creative.id}
                      onClick={() => setCreativeId(creative.id)}
                      className={`overflow-hidden rounded-2xl border bg-white text-left ${
                        selected
                          ? 'border-2 border-indigo-500'
                          : 'border-gray-100'
                      }`}
                    >
                      {creative.imageUrl && (
                        <img
                          src={creative.imageUrl}
                          alt="AI Creative"
                          className="block aspect-square w-full object-cover"
                        />
                      )}

                      <div className="flex items-center gap-2 p-2.5">
                        <strong className="text-sm text-gray-900">
                          {creative.presetKey || 'AI Creative'}
                        </strong>

                        {selected && (
                          <IonChip color="primary">
                            <IonLabel>Selected</IonLabel>
                          </IonChip>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        );

      case 3:
        return (
          <>
            <h2 className="mb-1 text-lg font-bold text-gray-900">
              Choose Platform
            </h2>

            <p className="mb-4 text-sm text-gray-500">
              Where do you want to run this campaign?
            </p>

            <div className="mb-4 overflow-hidden rounded-2xl border border-gray-100 bg-white">
              <IonRadioGroup
                value={platform}
                onIonChange={(event) => setPlatform(event.detail.value)}
              >
                <IonItem>
                  <IonRadio slot="start" value="facebook" />
                  <IonLabel>
                    <strong>Facebook</strong>
                    <p>Reach Facebook users.</p>
                  </IonLabel>
                </IonItem>

                <IonItem>
                  <IonRadio slot="start" value="instagram" />
                  <IonLabel>
                    <strong>Instagram</strong>
                    <p>Promote on Instagram.</p>
                  </IonLabel>
                </IonItem>

                <IonItem lines="none">
                  <IonRadio slot="start" value="whatsapp" />
                  <IonLabel>
                    <strong>WhatsApp</strong>
                    <p>Send promotional messages.</p>
                  </IonLabel>
                </IonItem>
              </IonRadioGroup>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="text-sm text-gray-500">
                Note: Facebook and Instagram paid advertising use Meta Ads.
                WhatsApp messaging is a separate marketing flow.
              </p>
            </div>
          </>
        );

      case 4:
        return (
          <>
            <h2 className="mb-1 text-lg font-bold text-gray-900">
              Campaign Objective
            </h2>

            <p className="mb-4 text-sm text-gray-500">
              What do you want customers to do?
            </p>

            <div className="mb-4 overflow-hidden rounded-2xl border border-gray-100 bg-white">
              <IonItem lines="none">
                <IonLabel>Objective</IonLabel>

                <IonSelect
                  value={objective}
                  onIonChange={(event) => setObjective(event.detail.value)}
                >
                  <IonSelectOption value="TRAFFIC">
                    Get Website Visitors
                  </IonSelectOption>

                  <IonSelectOption value="MESSAGES">
                    Get Messages
                  </IonSelectOption>

                  <IonSelectOption value="LEADS">Get Leads</IonSelectOption>

                  <IonSelectOption value="SALES">Get Sales</IonSelectOption>

                  <IonSelectOption value="AWARENESS">
                    Brand Awareness
                  </IonSelectOption>
                </IonSelect>
              </IonItem>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <h3 className="m-0 font-bold text-gray-900">
                {objective === 'TRAFFIC'
                  ? 'Website Visitors'
                  : objective === 'MESSAGES'
                  ? 'Messages'
                  : objective === 'LEADS'
                  ? 'Leads'
                  : objective === 'SALES'
                  ? 'Sales'
                  : 'Brand Awareness'}
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Your campaign will be configured around this objective.
              </p>
            </div>
          </>
        );

      case 5:
        return (
          <>
            <h2 className="mb-1 text-lg font-bold text-gray-900">
              Target Audience
            </h2>

            <p className="mb-4 text-sm text-gray-500">
              Tell us who should see your advertisement.
            </p>

            <div className="flex flex-col gap-3 overflow-hidden rounded-2xl border border-gray-100 bg-white">
              <IonItem>
                <IonLabel position="stacked">Location</IonLabel>

                <IonInput
                  value={audience.location}
                  placeholder="e.g. Lucknow, Uttar Pradesh"
                  onIonInput={(event) =>
                    setAudience({
                      ...audience,
                      location: event.detail.value || '',
                    })
                  }
                />
              </IonItem>

              <IonItem>
                <IonLabel position="stacked">Minimum Age</IonLabel>

                <IonInput
                  type="number"
                  value={audience.ageMin}
                  onIonInput={(event) =>
                    setAudience({
                      ...audience,
                      ageMin: event.detail.value || '18',
                    })
                  }
                />
              </IonItem>

              <IonItem>
                <IonLabel position="stacked">Maximum Age</IonLabel>

                <IonInput
                  type="number"
                  value={audience.ageMax}
                  onIonInput={(event) =>
                    setAudience({
                      ...audience,
                      ageMax: event.detail.value || '55',
                    })
                  }
                />
              </IonItem>

              <IonItem>
                <IonLabel>Gender</IonLabel>

                <IonSelect
                  value={audience.gender}
                  onIonChange={(event) =>
                    setAudience({
                      ...audience,
                      gender: event.detail.value,
                    })
                  }
                >
                  <IonSelectOption value="all">Everyone</IonSelectOption>
                  <IonSelectOption value="male">Men</IonSelectOption>
                  <IonSelectOption value="female">Women</IonSelectOption>
                </IonSelect>
              </IonItem>

              <IonItem lines="none">
                <IonLabel position="stacked">Interests</IonLabel>

                <IonTextarea
                  value={audience.interests}
                  placeholder="e.g. Shopping, Fashion, Beauty"
                  onIonInput={(event) =>
                    setAudience({
                      ...audience,
                      interests: event.detail.value || '',
                    })
                  }
                />
              </IonItem>
            </div>
          </>
        );

      case 6:
        return (
          <>
            <h2 className="mb-1 text-lg font-bold text-gray-900">
              Budget & Duration
            </h2>

            <p className="mb-4 text-sm text-gray-500">
              Set how much you want to spend.
            </p>

            <div className="mb-4 flex flex-col gap-3 overflow-hidden rounded-2xl border border-gray-100 bg-white">
              <IonItem>
                <IonLabel position="stacked">Daily Budget (₹)</IonLabel>

                <IonInput
                  type="number"
                  min="50"
                  value={dailyBudget}
                  onIonInput={(event) =>
                    setDailyBudget(event.detail.value || '100')
                  }
                />
              </IonItem>

              <IonItem lines="none">
                <IonLabel position="stacked">Duration (Days)</IonLabel>

                <IonInput
                  type="number"
                  min="1"
                  value={duration}
                  onIonInput={(event) =>
                    setDuration(event.detail.value || '7')
                  }
                />
              </IonItem>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <h3 className="m-0 font-bold text-gray-900">
                Estimated Budget
              </h3>

              <div className="mt-1 text-2xl font-bold text-gray-900">
                ₹{Number(dailyBudget || 0) * Number(duration || 0)}
              </div>

              <p className="mt-1 text-sm text-gray-500">
                ₹{dailyBudget}/day × {duration} days
              </p>
            </div>
          </>
        );

      case 7:
        return (
          <>
            <h2 className="mb-1 text-lg font-bold text-gray-900">
              Review Campaign
            </h2>

            <p className="mb-4 text-sm text-gray-500">
              Check everything before creating your campaign.
            </p>

            <div className="flex flex-col gap-3">
              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <h3 className="m-0 mb-1 font-bold text-gray-900">Product</h3>
                <p className="m-0 text-sm text-gray-600">
                  {selectedProduct?.title || 'Selected product'}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <h3 className="m-0 mb-2 font-bold text-gray-900">Platform</h3>
                <IonChip color="primary">
                  <IonLabel>{platform.toUpperCase()}</IonLabel>
                </IonChip>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <h3 className="m-0 mb-1 font-bold text-gray-900">
                  Objective
                </h3>
                <p className="m-0 text-sm text-gray-600">{objective}</p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <h3 className="m-0 mb-2 font-bold text-gray-900">Audience</h3>

                <p className="m-0 text-sm text-gray-600">
                  <strong>Location:</strong> {audience.location}
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  <strong>Age:</strong> {audience.ageMin} - {audience.ageMax}
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  <strong>Gender:</strong> {audience.gender}
                </p>

                {audience.interests && (
                  <p className="mt-1 text-sm text-gray-600">
                    <strong>Interests:</strong> {audience.interests}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <h3 className="m-0 mb-2 font-bold text-gray-900">Budget</h3>

                <p className="m-0 text-sm text-gray-600">
                  ₹{dailyBudget}/day for {duration} days
                </p>

                <strong className="mt-2 block text-xl text-gray-900">
                  Total: ₹{Number(dailyBudget) * Number(duration)}
                </strong>
              </div>

              {selectedCreative?.imageUrl && (
                <div className="rounded-2xl border border-gray-100 bg-white p-4">
                  <h3 className="m-0 mb-2 font-bold text-gray-900">
                    Creative
                  </h3>

                  <img
                    src={selectedCreative.imageUrl}
                    alt="Campaign Creative"
                    className="w-full rounded-xl"
                  />
                </div>
              )}
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="app-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/campaigns" />
          </IonButtons>

          <div className="px-4 py-2 text-center font-bold text-gray-900">
            Create Campaign
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="bg-gray-50">
        <div className="mx-auto max-w-[700px] px-4 pb-10 pt-4">
          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <strong className="text-gray-900">Step {step} of 7</strong>
              <span className="text-gray-500">
                {Math.round((step / 7) * 100)}%
              </span>
            </div>

            <IonProgressBar value={step / 7} />
          </div>

          {renderStep()}

          <div className="mt-8 flex gap-2.5">
            <IonButton
              fill="outline"
              onClick={previousStep}
              style={{ flex: 1 }}
            >
              Back
            </IonButton>

            {step < 7 ? (
              <IonButton
                onClick={nextStep}
                disabled={!canContinue()}
                style={{ flex: 2 }}
              >
                Continue
              </IonButton>
            ) : (
              <IonButton
                onClick={createCampaign}
                disabled={publishing}
                style={{ flex: 2 }}
              >
                {publishing ? (
                  <>
                    <IonSpinner name="crescent" className="mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Campaign'
                )}
              </IonButton>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default CreateCampaign;