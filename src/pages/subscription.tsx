/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
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
import { checkmarkCircle } from 'ionicons/icons';
import { apiGet, apiPost } from '../api';
import { useAuth } from '../context/AuthContext';

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

interface Plan {
  id: number;
  name: string;
  price: number;
  posters: number;
  durationDays: number;
  features: string[];
  hasAvailableCoupons: boolean;
}

const Subscription: React.FC = () => {
  const navigate = useNavigate();
  const { refreshStatus } = useAuth();

  const [loadingPlan, setLoadingPlan] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [couponMessage, setCouponMessage] = useState('');
  const [appliedCoupons, setAppliedCoupons] = useState<Record<number, { discountAmount: number; payableAmount: number }>>({});

  useEffect(() => {
    let active = true;
    void apiGet<{ success: boolean; plans: Plan[] }>('/subscription/plans')
      .then((response) => {
        if (active) setPlans(response.plans || []);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load plans.');
      })
      .finally(() => {
        if (active) setLoadingPlans(false);
      });
    return () => { active = false; };
  }, []);

  const applyCoupon = async (plan: Plan) => {
    setCouponMessage('');
    setAppliedCoupons({});
    try {
      const result = await apiPost<{
        success: boolean;
        message?: string;
        discountAmount: number;
        payableAmount: number;
      }>('/subscription/coupons/validate', { planId: plan.id, code: couponCode });
      if (!result.success) throw new Error(result.message || 'Coupon could not be applied.');
      setAppliedCoupons({ [plan.id]: result });
      setCouponMessage(`Coupon applied to ${plan.name}. Save ₹${(result.discountAmount / 100).toFixed(2)}.`);
    } catch (couponError) {
      setCouponMessage(couponError instanceof Error ? couponError.message : 'Coupon could not be applied.');
    }
  };

  const handleChoosePlan = async (plan: Plan) => {
    setLoadingPlan(plan.id);
    setError('');

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError('Could not load payment gateway. Check your connection.');
        setLoadingPlan(null);
        return;
      }

      // Step 1: create the order server-side.
      const order = await apiPost('/subscription/create-order', {
        planId: plan.id,
        ...(appliedCoupons[plan.id] ? { couponCode: couponCode.trim() } : {}),
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
          // Step 3: verify the payment server-side once Checkout succeeds.
          try {
            await apiPost('/subscription/verify', response);
          } catch (e: any) {
            setError(e?.error || e?.message || 'Payment could not be verified.');
            setLoadingPlan(null);
            return;
          }

          // Step 4: refresh hasSubscription in AuthContext. Without this the
          // route guard still sees hasSubscription = false and bounces the
          // user straight back to /subscription.
          try {
            await refreshStatus();
            navigate('/dashboard', { replace: true });
          } catch (e: any) {
            setError(
              'Payment successful, but we could not refresh your account. Please reopen the app.'
            );
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
            {loadingPlans && <p style={{ textAlign: 'center', color: brand.ink }}>Loading plans…</p>}
            {!loadingPlans && plans.length === 0 && (
              <p style={{ textAlign: 'center', color: brand.ink }}>No subscription plans are currently available.</p>
            )}
            {plans.map((plan) => {
              const appliedCoupon = appliedCoupons[plan.id];
              return (
              <div
                key={plan.id}
                style={{
                  position: 'relative',
                  background: brand.cardBg,
                  borderRadius: 20,
                  padding: '24px 20px',
                  border: `1px solid ${brand.border}`,
                  boxShadow: '0 10px 28px rgba(15,42,74,0.08)',
                }}
              >
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
                    {appliedCoupon
                      ? `₹${(appliedCoupon.payableAmount / 100).toFixed(2)}`
                      : `₹${plan.price}`}
                  </span>
                  <span style={{ fontSize: 13, color: brand.ink }}>/{plan.durationDays} days</span>
                </div>

                {appliedCoupon && (
                  <p style={{ marginTop: -10, color: brand.teal, fontSize: 12 }}>
                    Coupon discount: ₹{(appliedCoupon.discountAmount / 100).toFixed(2)}
                  </p>
                )}
                {plan.hasAvailableCoupons && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        value={couponCode}
                        onChange={(event) => {
                          setCouponCode(event.target.value.toUpperCase());
                          setAppliedCoupons({});
                          setCouponMessage('');
                        }}
                        placeholder="Enter coupon code"
                        aria-label={`Discount coupon for ${plan.name}`}
                        style={{ minWidth: 0, flex: 1, border: `1px solid ${brand.border}`, borderRadius: 9, padding: '9px 10px' }}
                      />
                      <IonButton
                        fill="outline"
                        onClick={() => void applyCoupon(plan)}
                        disabled={!couponCode.trim() || loadingPlan !== null}
                      >
                        Apply
                      </IonButton>
                    </div>
                    {couponMessage && (
                      <p role="status" style={{ margin: '7px 2px 0', color: couponMessage.startsWith('Coupon applied') ? brand.teal : '#b42318', fontSize: 12 }}>
                        {couponMessage}
                      </p>
                    )}
                  </div>
                )}

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
                  disabled={loadingPlan !== null}
                  onClick={() => handleChoosePlan(plan)}
                  style={
                    {
                      '--background': brand.navy,
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
            );})}
          </div>
          <p
            style={{
              textAlign: 'center',
              fontSize: 11,
              color: brand.ink,
              marginTop: 22,
            }}
          >
            Plan access lasts for the duration shown above. Choose a plan to upgrade or renew.
          </p>
        </div>

        <IonLoading isOpen={loadingPlan !== null} message="Setting up your plan..." />
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