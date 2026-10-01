import React, { useMemo, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonContent, IonInput, IonSelect,
  IonSelectOption, IonTextarea, IonSegment, IonSegmentButton, IonLabel, IonSpinner,
} from '@ionic/react';
import {
  arrowBack, businessOutline, pricetagOutline, locationOutline, globeOutline, callOutline, personOutline,
  mailOutline, calendarOutline, cameraOutline, peopleOutline, cubeOutline, flagOutline, optionsOutline,
  createOutline, mapOutline,
} from 'ionicons/icons';
import './Onboarding.css';

/**
 * Frontend-only conversion of the PHP "30-Day Marketing Generator" form (5 steps).
 *   1 Business details  2 Industry & category  3 Services  4 Target customers  5 Strategy
 * Field names in the payload match the PHP $_POST names, so your backend can accept them as-is.
 * Replace the SAMPLE_* arrays with real data (the PHP loaded these from MySQL).
 */
const SAMPLE_INDUSTRIES = [
  { id: 1, name: 'Technology' },
  { id: 2, name: 'Food & Beverage' },
  { id: 3, name: 'Beauty & Wellness' },
];
const SAMPLE_CATEGORIES = [
  { id: 1, name: 'IT Services', industry_id: 1 },
  { id: 2, name: 'Restaurant', industry_id: 2 },
  { id: 3, name: 'Salon', industry_id: 3 },
];
const SAMPLE_SERVICES = [
  { id: 1, name: 'Website Development', business_category_id: 1 },
  { id: 2, name: 'Digital Marketing', business_category_id: 1 },
  { id: 3, name: 'Dine-in', business_category_id: 2 },
  { id: 4, name: 'Haircut', business_category_id: 3 },
];
const SAMPLE_TARGETS = [
  { id: 1, name: 'Small Businesses', business_category_id: 1 },
  { id: 2, name: 'Startups', business_category_id: 1 },
  { id: 3, name: 'Families', business_category_id: 2 },
  { id: 4, name: 'Young Adults', business_category_id: 3 },
];
const SAMPLE_STRATEGIES = [
  { id: 1, name: 'Awareness', objective: 'Build brand visibility' },
  { id: 2, name: 'Lead Generation', objective: 'Collect enquiries' },
  { id: 3, name: 'Festival Offers', objective: 'Seasonal promotions' },
];

const GOALS = ['Generate Leads', 'Increase Sales', 'Brand Awareness', 'Engagement', 'Website Traffic', 'Local Customers', 'Customer Retention'];
const TITLES = ['Tell us about your business', 'Industry & category', 'Products / services', 'Target customers', 'Marketing strategy'];
const TOTAL_STEPS = 5;
const today = () => new Date().toISOString().slice(0, 10);

interface FormState {
  name: string; email: string; phone: string; business_name: string;
  country: string; state: string; city: string; start_date: string;
  industry_id: number | null; business_category_id: number | null;
  service_ids: number[]; target_customer_ids: number[];
  marketing_goal: string; automation_mode: 'AUTO' | 'MANUAL'; strategy_id: number | null; custom_prompt: string;
}

const Onboarding: React.FC = () => {
  const [step, setStep] = useState(1);
  const [logo, setLogo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormState>({
    name: '', email: '', phone: '', business_name: '',
    country: 'India', state: 'Uttar Pradesh', city: 'Lucknow', start_date: today(),
    industry_id: null, business_category_id: null, service_ids: [], target_customer_ids: [],
    marketing_goal: 'Generate Leads', automation_mode: 'AUTO', strategy_id: null, custom_prompt: '',
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(p => ({ ...p, [key]: value }));

  const categories = useMemo(() => SAMPLE_CATEGORIES.filter(c => c.industry_id === form.industry_id), [form.industry_id]);
  const services = useMemo(() => SAMPLE_SERVICES.filter(s => s.business_category_id === form.business_category_id), [form.business_category_id]);
  const targets = useMemo(() => SAMPLE_TARGETS.filter(t => t.business_category_id === form.business_category_id), [form.business_category_id]);

  const emailOk = !form.email.trim() || /^\S+@\S+\.\S+$/.test(form.email.trim());

  const valid = (() => {
    switch (step) {
      case 1: return !!form.name.trim() && !!form.business_name.trim() && !!form.start_date && emailOk;
      case 2: return !!form.industry_id && !!form.business_category_id;
      case 3: return form.service_ids.length > 0;
      case 4: return form.target_customer_ids.length > 0;
      default: return form.automation_mode === 'AUTO' || !!form.strategy_id;
    }
  })();

  const pickLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setLogo(r.result as string);
    r.readAsDataURL(file);
  };

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      // TODO: send `form` to your API (same field names as the PHP $_POST)
      console.log('Payload:', form);
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (!valid || submitting) return;
    if (step < TOTAL_STEPS) setStep(step + 1);
    else submit();
  };
  const back = () => { if (step > 1) setStep(step - 1); else window.history.back(); };

  const caret = { interface: 'action-sheet' as const, toggleIcon: 'caret-down-sharp' };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="grad-bar">
          <IonButtons slot="start">
            <IonButton onClick={back}><IonIcon slot="icon-only" icon={arrowBack} /></IonButton>
          </IonButtons>
          <div className="bar-title">{TITLES[step - 1]}</div>
        </IonToolbar>
        <div className="progress"><div style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} /></div>
      </IonHeader>

      <IonContent className="page-bg">
        {/* STEP 1 — Business details */}
        {step === 1 && (
          <>
            <div className="logo-wrap">
              <label className="logo-circle">
                {logo && <img src={logo} alt="Business logo" />}
                <span className="cam"><IonIcon icon={cameraOutline} /></span>
                <input type="file" accept="image/*" hidden onChange={pickLogo} />
              </label>
              <div className="logo-caption">ADD BUSINESS LOGO (OPTIONAL)</div>
            </div>

            <div className="sheet">
              <div className="field">
                <IonIcon icon={personOutline} className="ico blue" />
                <span className="lbl">Owner / Contact Name *</span>
                <IonInput value={form.name} placeholder="Your name" onIonInput={e => set('name', String(e.detail.value ?? ''))} />
              </div>
              <div className="field">
                <IonIcon icon={mailOutline} className="ico teal" />
                <span className="lbl">Email</span>
                <IonInput type="email" value={form.email} placeholder="you@example.com" onIonInput={e => set('email', String(e.detail.value ?? ''))} />
                {!emailOk && <span className="field-err">Enter a valid email</span>}
              </div>
              <div className="field">
                <IonIcon icon={callOutline} className="ico navy" />
                <span className="lbl">Phone</span>
                <IonInput type="tel" inputmode="numeric" maxlength={15} value={form.phone} placeholder="Phone number"
                  onIonInput={e => set('phone', String(e.detail.value ?? ''))} />
              </div>
              <div className="field">
                <IonIcon icon={businessOutline} className="ico blue" />
                <span className="lbl">Business Name *</span>
                <IonInput value={form.business_name} placeholder="Business name" onIonInput={e => set('business_name', String(e.detail.value ?? ''))} />
              </div>
              <div className="field">
                <IonIcon icon={globeOutline} className="ico blue" />
                <span className="lbl">Country</span>
                <IonInput value={form.country} placeholder="Country" onIonInput={e => set('country', String(e.detail.value ?? ''))} />
              </div>
              <div className="field">
                <IonIcon icon={mapOutline} className="ico teal" />
                <span className="lbl">State</span>
                <IonInput value={form.state} placeholder="State" onIonInput={e => set('state', String(e.detail.value ?? ''))} />
              </div>
              <div className="field">
                <IonIcon icon={locationOutline} className="ico green" />
                <span className="lbl">City</span>
                <IonInput value={form.city} placeholder="City" onIonInput={e => set('city', String(e.detail.value ?? ''))} />
              </div>
              <div className="field">
                <IonIcon icon={calendarOutline} className="ico navy" />
                <span className="lbl">Start Date *</span>
                <IonInput type="date" value={form.start_date} onIonInput={e => set('start_date', String(e.detail.value ?? ''))} />
              </div>
            </div>
          </>
        )}

        {/* STEP 2 — Industry & category */}
        {step === 2 && (
          <div className="sheet top">
            <div className="field">
              <IonIcon icon={businessOutline} className="ico blue" />
              <span className="lbl">Industry *</span>
              <IonSelect value={form.industry_id} placeholder="Select industry" {...caret}
                onIonChange={e => setForm(p => ({ ...p, industry_id: e.detail.value, business_category_id: null, service_ids: [], target_customer_ids: [] }))}>
                {SAMPLE_INDUSTRIES.map(i => <IonSelectOption key={i.id} value={i.id}>{i.name}</IonSelectOption>)}
              </IonSelect>
            </div>
            <div className="field">
              <IonIcon icon={pricetagOutline} className="ico teal" />
              <span className="lbl">Business Category *</span>
              <IonSelect value={form.business_category_id} disabled={!form.industry_id}
                placeholder={form.industry_id ? 'Select category' : 'Select industry first'} {...caret}
                onIonChange={e => setForm(p => ({ ...p, business_category_id: e.detail.value, service_ids: [], target_customer_ids: [] }))}>
                {categories.map(c => <IonSelectOption key={c.id} value={c.id}>{c.name}</IonSelectOption>)}
              </IonSelect>
            </div>
            {form.industry_id && <p className="note">{categories.length} business categories available.</p>}
          </div>
        )}

        {/* STEP 3 — Services */}
        {step === 3 && (
          <div className="sheet top">
            <div className="field">
              <IonIcon icon={cubeOutline} className="ico blue" />
              <span className="lbl">Products / Services *</span>
              <IonSelect multiple value={form.service_ids} placeholder="Select one or more" interface="alert" toggleIcon="caret-down-sharp"
                onIonChange={e => set('service_ids', e.detail.value)}>
                {services.map(s => <IonSelectOption key={s.id} value={s.id}>{s.name}</IonSelectOption>)}
              </IonSelect>
            </div>
            <p className="note">{services.length} services available. We rotate the ones you pick across the 30 days.</p>
          </div>
        )}

        {/* STEP 4 — Target customers */}
        {step === 4 && (
          <div className="sheet top">
            <div className="field">
              <IonIcon icon={peopleOutline} className="ico green" />
              <span className="lbl">Target Customers *</span>
              <IonSelect multiple value={form.target_customer_ids} placeholder="Select one or more" interface="alert" toggleIcon="caret-down-sharp"
                onIonChange={e => set('target_customer_ids', e.detail.value)}>
                {targets.map(t => <IonSelectOption key={t.id} value={t.id}>{t.name}</IonSelectOption>)}
              </IonSelect>
            </div>
            <p className="note">Select the audience you actually want to reach. Topics, captions and CTAs adapt to them.</p>
          </div>
        )}

        {/* STEP 5 — Strategy */}
        {step === 5 && (
          <div className="sheet top">
            <div className="field">
              <IonIcon icon={flagOutline} className="ico blue" />
              <span className="lbl">Marketing Goal</span>
              <IonSelect value={form.marketing_goal} {...caret} onIonChange={e => set('marketing_goal', e.detail.value)}>
                {GOALS.map(g => <IonSelectOption key={g} value={g}>{g}</IonSelectOption>)}
              </IonSelect>
            </div>

            <div className="seg-title"><IonIcon icon={optionsOutline} /> Automation Mode</div>
            <IonSegment className="seg" value={form.automation_mode}
              onIonChange={e => setForm(p => ({ ...p, automation_mode: e.detail.value as 'AUTO' | 'MANUAL', strategy_id: null }))}>
              <IonSegmentButton value="AUTO"><IonLabel>Auto – we decide</IonLabel></IonSegmentButton>
              <IonSegmentButton value="MANUAL"><IonLabel>Manual – I choose</IonLabel></IonSegmentButton>
            </IonSegment>

            <div className="field">
              <IonIcon icon={pricetagOutline} className="ico teal" />
              <span className="lbl">Monthly Promotion Strategy{form.automation_mode === 'MANUAL' ? ' *' : ''}</span>
              <IonSelect value={form.strategy_id} disabled={form.automation_mode === 'AUTO'}
                placeholder={form.automation_mode === 'AUTO' ? 'Auto will choose and rotate strategies' : 'Select strategy'}
                interface="alert" toggleIcon="caret-down-sharp" onIonChange={e => set('strategy_id', e.detail.value)}>
                {SAMPLE_STRATEGIES.map(s => <IonSelectOption key={s.id} value={s.id}>{s.name} — {s.objective}</IonSelectOption>)}
              </IonSelect>
            </div>

            <div className="field">
              <IonIcon icon={createOutline} className="ico navy" />
              <span className="lbl">Custom Prompt / Instructions</span>
              <IonTextarea autoGrow rows={3} value={form.custom_prompt}
                placeholder="Example: Focus on premium customers, local Lucknow audience, educational content first, avoid discounts..."
                onIonInput={e => set('custom_prompt', String(e.detail.value ?? ''))} />
            </div>
          </div>
        )}

        <div className="cta-wrap">
          {error && <p className="form-error">{error}</p>}
          <button className="cta" disabled={!valid || submitting} onClick={next}>
            {submitting ? <IonSpinner name="dots" /> : step < TOTAL_STEPS ? 'CONTINUE' : 'GENERATE 30 DAYS'}
          </button>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Onboarding;