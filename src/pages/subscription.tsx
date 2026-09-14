/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonLoading,
  IonToast,
  IonButtons,
  IonBackButton,
} from '@ionic/react';
import { checkmarkCircle, starOutline } from 'ionicons/icons';
import { apiPost } from '../api';

// Razorpay Checkout is loaded from their CDN script (see loadRazorpayScript
// below) rather than an npm package, since Checkout itself has to run in
// the browser/WebView, not on the server.
declare global {
  interface Window {
    Razorpay: any;
  }
}

const RAZORPAY_CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

const loadRazorpayScript = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_CHECKOUT_SRC;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const brand = {
  navy: '#0F2A4A',
  blue: '#1E7FE0',
  teal: '#12A19C',
  ink: '#5A6B7B',
  border: '#E1E8EE',
  cardBg: '#FFFFFF',
  pageBgFrom: '#EAF4FF',
  pageBgTo: '#F3FBF4',
};

// ==================================================
// PLAN DEFINITIONS
// Assumed names/poster counts — adjust to match your real `plans` table rows.
// planKey should match whatever identifier your /subscription/create-order
// endpoint expects — here it's the numeric `plans.id`, so keep this in sync
// with the actual row ids in your database.
// ==================================================

interface Plan {
  planId: number;
  name: string;
  price: number;
  posters: number;
  features: string[];
  highlighted?: boolean;
}

const PLANS: Plan[] = [
  {
    planId: 1,
    name: 'Starter',
    price: 599,
    posters: 15,
    features: [
      '15 AI ad banners / month',
      '1 business profile',
      'Standard image quality',
      'Email support',
    ],
  },
  {
    planId: 2,
    name: 'Growth',
    price: 1199,
    posters: 40,
    features: [
      '40 AI ad banners / month',
      '1 business profile',
      'HD image quality',
      'Priority email support',
      'Caption & hashtag suggestions',
    ],
    highlighted: true,
  },
  {
    planId: 3,
    name: 'Pro',
    price: 1999,
    posters: 100,
    features: [
      '100 AI ad banners / month',
      'Up to 3 business profiles',
      'HD image quality',
      'Priority chat support',
      'Caption & hashtag suggestions',
      'Early access to new features',
    ],
  },
];

const Subscription: React.FC = () => {
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<number | null>(null);
  const [error, setError] = useState('');

  const handleChoosePlan = async (plan: Plan) => {
    setLoadingPlan(plan.planId);
    setError('');

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError('Could not load payment gateway. Check your connection.');
        return;
      }

      // Step 1: create the order server-side.
      const order = await apiPost('/subscription/create-order', {
        planId: plan.planId,
      });

      // Step 2: open Razorpay Checkout with that order.
      const razorpay = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'Aarna Tech Xperts',
        description: `${plan.name} plan subscription`,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            // Step 3: verify the payment server-side once Checkout succeeds.
            await apiPost('/subscription/verify', response);
            navigate('/dashboard');
          } catch (e: any) {
            setError(e?.error || e?.message || 'Payment could not be verified.');
          } finally {
            setLoadingPlan(null);
          }
        },
        modal: {
          // Fires if the user closes the Checkout popup without paying.
          ondismiss: () => {
            setLoadingPlan(null);
          },
        },
        theme: {
          color: brand.blue,
        },
      });

      razorpay.on('payment.failed', (response: any) => {
        setError(response?.error?.description || 'Payment failed. Please try again.');
        setLoadingPlan(null);
      });

      razorpay.open();
    } catch (e: any) {
      setError(e?.error || e?.message || 'Could not start subscription. Try again.');
      setLoadingPlan(null);
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar
          style={
            {
              '--background': `linear-gradient(90deg, ${brand.blue}, ${brand.teal})`,
              '--color': '#FFFFFF',
            } as React.CSSProperties
          }
        >
          <IonButtons slot="start">
            <IonBackButton
              defaultHref="/home"
              style={{ '--color': '#FFFFFF' } as React.CSSProperties}
            />
          </IonButtons>
          <IonTitle style={{ fontWeight: 700 }}>Choose Your Plan</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent
        style={
          {
            '--background': `linear-gradient(
              180deg,
              ${brand.pageBgFrom} 0%,
              ${brand.pageBgTo} 40%,
              #FFFFFF 40%
            )`,
          } as React.CSSProperties
        }
      >
        <div style={{ padding: '20px 16px 40px' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 800,
                color: brand.navy,
              }}
            >
              Grow faster with AI ads
            </h1>
            <p
              style={{
                margin: '8px 0 0',
                fontSize: 13,
                color: brand.ink,
                lineHeight: 1.5,
              }}
            >
              Pick a plan that fits your business. Upgrade or cancel anytime.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            {PLANS.map((plan) => (
              <div
                key={plan.planId}
                style={{
                  position: 'relative',
                  background: brand.cardBg,
                  borderRadius: 20,
                  padding: '24px 20px',
                  border: plan.highlighted
                    ? `2px solid ${brand.blue}`
                    : `1px solid ${brand.border}`,
                  boxShadow: plan.highlighted
                    ? '0 18px 40px rgba(30,127,224,0.18)'
                    : '0 10px 28px rgba(15,42,74,0.08)',
                }}
              >
                {plan.highlighted && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -12,
                      left: 20,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      background: `linear-gradient(90deg, ${brand.blue}, ${brand.teal})`,
                      color: '#FFFFFF',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '5px 12px',
                      borderRadius: 999,
                      letterSpacing: 0.4,
                    }}
                  >
                    <IonIcon icon={starOutline} style={{ fontSize: 12 }} />
                    MOST POPULAR
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 6,
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 700,
                      color: brand.navy,
                    }}
                  >
                    {plan.name}
                  </h2>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: brand.teal,
                      background: '#EAFBF8',
                      padding: '3px 9px',
                      borderRadius: 999,
                    }}
                  >
                    {plan.posters} banners/mo
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 16 }}>
                  <span style={{ fontSize: 30, fontWeight: 800, color: brand.navy }}>
                    ₹{plan.price}
                  </span>
                  <span style={{ fontSize: 13, color: brand.ink }}>/ month</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {plan.features.map((feature) => (
                    <div
                      key={feature}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}
                    >
                      <IonIcon
                        icon={checkmarkCircle}
                        style={{ fontSize: 17, color: brand.teal, marginTop: 1, flexShrink: 0 }}
                      />
                      <span style={{ fontSize: 13, color: brand.navy, lineHeight: 1.4 }}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <IonButton
                  expand="block"
                  disabled={loadingPlan === plan.planId}
                  onClick={() => handleChoosePlan(plan)}
                  style={
                    {
                      '--background': plan.highlighted
                        ? `linear-gradient(90deg, ${brand.blue}, ${brand.teal})`
                        : brand.navy,
                      '--border-radius': '12px',
                      '--box-shadow': 'none',
                      fontWeight: 700,
                      margin: 0,
                    } as React.CSSProperties
                  }
                >
                  Choose {plan.name}
                </IonButton>
              </div>
            ))}
          </div>

          <p
            style={{
              textAlign: 'center',
              fontSize: 11,
              color: brand.ink,
              marginTop: 22,
            }}
          >
            All plans are billed monthly. You can cancel anytime from Settings.
          </p>
        </div>

        <IonLoading isOpen={Boolean(loadingPlan)} message="Setting up your plan..." />
        <IonToast
          isOpen={Boolean(error)}
          message={error}
          duration={2500}
          color="danger"
          onDidDismiss={() => setError('')}
        />
      </IonContent>
    </IonPage>
  );
};

export default Subscription;