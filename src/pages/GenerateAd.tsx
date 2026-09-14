import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonBackButton,
  IonButtons,
  IonButton,
  IonSpinner,
  IonToast,
  IonInput,
  IonItem,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonBadge,
} from '@ionic/react';

import axios from 'axios';

const API_URL = '';

interface Suggestion {
  id: string;
  title: string;
  category: string;
  aspectRatio: string;
  requiresOffer: boolean;
}

interface GeneratedCreative {
  id: string;
  title: string;
  platform: string | null;
  aspectRatio: string;
  imageUrl: string;
}

const PLATFORMS = [
  { key: 'google', label: 'Google' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'youtube', label: 'YouTube' },
];

const GenerateAd: React.FC = () => {
 const { productId } = useParams<{ productId: string }>();

  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [platform, setPlatform] = useState<string | null>(null);

  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [cta, setCta] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedCreative | null>(null);

  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const showMessage = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
  };

  /*
  |--------------------------------------------------------------------------
  | On mount: reuse existing suggestions for this product if any exist,
  | otherwise auto-generate a fresh batch tailored to it.
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const loadOrGenerate = async () => {
      try {
        setLoadingSuggestions(true);

        const existing = await axios.get(`${API_URL}/api/products/${productId}/suggestions`);

        if (existing.data?.success && existing.data.suggestions?.length > 0) {
          setSuggestions(existing.data.suggestions);
          return;
        }

        const generated = await axios.post(`${API_URL}/api/products/suggest-ads`, { productId });

        if (!generated.data?.success) {
          throw new Error(generated.data?.message || 'Could not generate ad ideas');
        }

        setSuggestions(generated.data.suggestions);
      } catch (err: any) {
        showMessage(err?.response?.data?.message || err?.message || 'Could not load ad ideas');
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    loadOrGenerate();
  }, [productId]);

  

const handleGenerate = async () => {
  if (!productId) {
    showMessage('Product ID is missing');
    return;
  }

  if (!selected) {
    showMessage('Please select an ad concept');
    return;
  }

  if (selected.requiresOffer && !price && !discount) {
    showMessage('This concept needs a price or discount');
    return;
  }

  try {
    setGenerating(true);
    setResult(null);

    const form = new FormData();

    // productId is now guaranteed to be a string
    form.append('productId', productId);
    form.append('suggestionId', selected.id);

    if (platform) {
      form.append('platform', platform);
    }

    if (price) {
      form.append('price', price);
    }

    if (discount) {
      form.append('discount', discount);
    }

    if (phone) {
      form.append('phone', phone);
    }

    if (website) {
      form.append('website', website);
    }

    if (cta) {
      form.append('cta', cta);
    }

    if (logoFile) {
      form.append('logo', logoFile);
    }

    const res = await axios.post(
      `${API_URL}/api/products/generate-ad`,
      form
    );

    if (!res.data?.success) {
      throw new Error(
        res.data?.message || 'Generation failed'
      );
    }

    setResult(res.data.creative);
    showMessage('Ad generated!');
  } catch (err: any) {
    showMessage(
      err?.response?.data?.message ||
        err?.message ||
        'Generation failed'
    );
  } finally {
    setGenerating(false);
  }
};

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="app-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref={`/products/${productId}`} text="" />
          </IonButtons>
          <h1 className="m-0 px-2 text-lg font-bold text-gray-900">Generate Ad</h1>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="bg-gray-50">
        <div className="px-4 pb-8 pt-5">
          {loadingSuggestions ? (
            <div className="flex flex-col items-center justify-center py-14">
              <IonSpinner name="crescent" />
              <p className="mt-3 text-sm text-gray-500">Generating ad ideas for this product...</p>
            </div>
          ) : !suggestions || suggestions.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">
              Couldn't generate ad ideas. Pull to refresh or try again.
            </p>
          ) : (
            <>
              <h4 className="mb-2 text-sm font-bold text-gray-700">Pick a concept</h4>
              <div className="mb-5 flex flex-col gap-2">
                {suggestions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setSelected(s)}
                    className={`cursor-pointer rounded-xl border p-3 ${
                      selected?.id === s.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-800">{s.title}</span>
                      <IonBadge color="medium">{s.category}</IonBadge>
                    </div>
                    <span className="text-xs text-gray-400">{s.aspectRatio}</span>
                  </div>
                ))}
              </div>

              <div className="mb-5">
                <h4 className="mb-2 text-sm font-bold text-gray-700">Platform</h4>
                <IonSegment
                  value={platform || undefined}
                  onIonChange={(e) => setPlatform(e.detail.value as string)}
                >
                  {PLATFORMS.map((p) => (
                    <IonSegmentButton key={p.key} value={p.key}>
                      <IonLabel>{p.label}</IonLabel>
                    </IonSegmentButton>
                  ))}
                </IonSegment>
              </div>

              <div className="mb-5 rounded-2xl bg-white p-3 shadow-sm">
                <IonItem lines="full">
                  <IonLabel position="stacked">Price</IonLabel>
                  <IonInput value={price} onIonInput={(e) => setPrice(e.detail.value || '')} />
                </IonItem>
                <IonItem lines="full">
                  <IonLabel position="stacked">Discount (e.g. 20% OFF)</IonLabel>
                  <IonInput value={discount} onIonInput={(e) => setDiscount(e.detail.value || '')} />
                </IonItem>
                <IonItem lines="full">
                  <IonLabel position="stacked">Phone</IonLabel>
                  <IonInput value={phone} onIonInput={(e) => setPhone(e.detail.value || '')} />
                </IonItem>
                <IonItem lines="full">
                  <IonLabel position="stacked">Website</IonLabel>
                  <IonInput value={website} onIonInput={(e) => setWebsite(e.detail.value || '')} />
                </IonItem>
                <IonItem lines="none">
                  <IonLabel position="stacked">CTA (e.g. "Order Now")</IonLabel>
                  <IonInput value={cta} onIonInput={(e) => setCta(e.detail.value || '')} />
                </IonItem>
              </div>

              <div className="mb-6">
                <h4 className="mb-2 text-sm font-bold text-gray-700">Logo (optional)</h4>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                />
              </div>

              <IonButton expand="block" onClick={handleGenerate} disabled={generating}>
                {generating ? <IonSpinner slot="start" name="crescent" /> : null}
                {generating ? 'Generating...' : 'Generate Ad'}
              </IonButton>

              {result && (
                <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
                  <img src={result.imageUrl} alt={result.title} className="w-full rounded-xl" />
                  <p className="mt-3 text-sm text-gray-600">
                    {result.title} · {result.aspectRatio}
                    {result.platform ? ` · ${result.platform}` : ''}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <IonToast
          isOpen={showToast}
          message={toastMessage}
          duration={3000}
          position="bottom"
          onDidDismiss={() => setShowToast(false)}
        />
      </IonContent>
    </IonPage>
  );
};

export default GenerateAd;