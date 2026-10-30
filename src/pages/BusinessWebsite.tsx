///src/pages/BusinessWebsite.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonSpinner,
  IonToolbar,
} from '@ionic/react';
import { arrowBackOutline, globeOutline, openOutline } from 'ionicons/icons';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../api';

interface WebsiteStatus {
  slug: string | null;
  url: string | null;
  published: boolean;
  subscription: { active: boolean; endDate: string | null; status?: string | null };
  business: { name: string | null; category: string | null; city: string | null };
}

interface RazorpayCheckoutResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

const CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

// Public websites are served by the Next.js backend on the real domain.
// Never use window.location.origin here: inside the app / dev server it is
// http://localhost:8100, which is not where the public page lives.
const PUBLIC_SITE_BASE = 'https://aarnexai.com/aarnexai-backend';

const getPublicWebsiteUrl = (slug: string | null) =>
  slug ? `${PUBLIC_SITE_BASE}/${encodeURIComponent(slug)}` : null;

async function loadCheckout() {
  if (window.Razorpay) return true;
  return new Promise<boolean>((resolve) => {
    const script = document.createElement('script');
    script.src = CHECKOUT_SCRIPT;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const BusinessWebsite: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<WebsiteStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadStatus = useCallback(async () => {
    setError('');
    try {
      const response = await apiGet<WebsiteStatus>('/business/website');
      setStatus(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load website status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const startSubscription = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (!(await loadCheckout()) || !window.Razorpay) {
        throw new Error('Could not load the payment gateway. Check your connection and try again.');
      }

      const order = await apiPost<{
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
      }>('/business/website/order', {});

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'AarnexAi',
        description: 'Business website — ₹599 for one year',
        handler: async (payment: RazorpayCheckoutResult) => {
          try {
            await apiPost('/subscription/verify', payment);
            setNotice('Website subscription is active. You can now publish your website.');
            await loadStatus();
          } catch (verifyError) {
            setError(verifyError instanceof Error ? verifyError.message : 'Could not verify payment.');
          } finally {
            setSaving(false);
          }
        },
        modal: {
          ondismiss: () => setSaving(false),
        },
        theme: { color: '#168b58' },
      });
      checkout.on('payment.failed', (payment: { error?: { description?: string } }) => {
        setError(payment.error?.description || 'Payment failed. Please try again.');
        setSaving(false);
      });
      checkout.open();
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Could not start payment.');
      setSaving(false);
    }
  };

  const setPublished = async (published: boolean) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await apiPost('/business/website', { published });
      setNotice(published ? 'Your website is now published.' : 'Your website has been unpublished.');
      await loadStatus();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Could not update publishing status.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Not active';
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? 'Not active' : parsed.toLocaleDateString();
  };
  const publicWebsiteUrl = getPublicWebsiteUrl(status?.slug ?? null);

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2">
            <IonButton fill="clear" onClick={() => navigate('/settings')} aria-label="Back to settings">
              <IonIcon slot="icon-only" icon={arrowBackOutline} />
            </IonButton>
            <h1 className="m-0 text-lg font-bold text-gray-900">Business Website</h1>
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent className="bg-gray-50">
        <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-green-50 text-2xl text-green-700">
                <IonIcon icon={globeOutline} />
              </span>
              <div>
                <h2 className="m-0 text-xl font-bold text-gray-900">Your professional landing page</h2>
                <p className="m-0 mt-1 text-sm text-gray-500">A public page with your business profile and products.</p>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-8"><IonSpinner /></div>
            ) : status ? (
              <>
                <div className="space-y-2 rounded-xl bg-gray-50 p-4 text-sm">
                  <p className="m-0"><strong>Business:</strong> {status.business.name || 'Complete your business profile'}</p>
                  <p className="m-0 break-all"><strong>Website address:</strong> {publicWebsiteUrl || 'Available after business setup'}</p>
                  <p className="m-0"><strong>Subscription:</strong> {status.subscription.active ? `Active until ${formatDate(status.subscription.endDate)}` : 'Inactive'}</p>
                  <p className="m-0"><strong>Publishing:</strong> {status.published ? 'Live' : 'Not published'}</p>
                </div>

                {!status.subscription.active ? (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600">Website access is a separate subscription from your AI plan. Pay ₹599 for one year; the public website is disabled when the subscription expires.</p>
                    <IonButton expand="block" disabled={saving || !status.slug} onClick={() => void startSubscription()}>
                      {saving ? <IonSpinner name="crescent" /> : 'Activate website — ₹599 / year'}
                    </IonButton>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <IonButton disabled={saving} onClick={() => void setPublished(!status.published)}>
                      {saving ? <IonSpinner name="crescent" /> : status.published ? 'Unpublish website' : 'Publish website'}
                    </IonButton>
                    {status.published && publicWebsiteUrl && (
                      <IonButton fill="outline" href={publicWebsiteUrl} target="_blank" rel="noreferrer">
                        <IonIcon slot="end" icon={openOutline} /> View website
                      </IonButton>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </section>

          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
          {notice && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800" role="status">{notice}</p>}
        </main>
      </IonContent>
    </IonPage>
  );
};

export default BusinessWebsite;