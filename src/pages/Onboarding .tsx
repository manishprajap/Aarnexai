import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonContent, IonInput,
  IonSelect, IonSelectOption, IonTextarea, IonSpinner,
} from '@ionic/react';
import {
  arrowBack, businessOutline, pricetagOutline, locationOutline, globeOutline,
  cameraOutline, peopleOutline, cubeOutline, flagOutline,
  createOutline, mapOutline,
} from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { apiGet, apiPost } from '../api';
import { useAuth } from '../context/AuthContext';
import './Onboarding.css';

/* ----------------------------- Types ----------------------------- */
interface Industry { id: number; name: string }
interface Category { id: number; name: string; industryId: number }
interface CatalogItem { id: number; name: string; businessCategoryId: number }
interface Strategy { id: number; name: string; objective: string }
interface Catalog {
  industries: Industry[]; categories: Category[]; services: CatalogItem[];
  targets: CatalogItem[]; strategies: Strategy[];
}

interface FormState {
  name: string; email: string; phone: string; businessName: string;
  country: string; state: string; city: string;
  industry_id: number | null; business_category_id: number | null;
  service_ids: number[]; target_customer_ids: number[];
  marketing_goal: string; automation_mode: 'AUTO' | 'MANUAL'; strategy_id: number | null; custom_prompt: string;
}

const GOALS = ['Generate Leads', 'Increase Sales', 'Brand Awareness', 'Engagement', 'Website Traffic', 'Local Customers', 'Customer Retention'];
const TITLES = ['Tell us about your business', 'Industry & category', 'Products / services', 'Target customers', 'Marketing strategy'];
const TOTAL_STEPS = 5;
const errorText = (e: unknown, fallback: string) => {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'error' in e && typeof e.error === 'string') return e.error;
  return fallback;
};

const EMPTY_CATALOG: Catalog = { industries: [], categories: [], services: [], targets: [], strategies: [] };

const selectedId = (value: unknown): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const selectedIds = (value: unknown): number[] =>
  Array.isArray(value)
    ? value.map(Number).filter((id) => Number.isInteger(id) && id > 0)
    : [];

const Onboarding: React.FC = () => {
  const { refreshStatus, user } = useAuth();

  const [step, setStep] = useState(1);
  const [logo, setLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [catalog, setCatalog] = useState<Catalog>(EMPTY_CATALOG);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({
    name: user?.name || '', email: user?.email || '', phone: user?.mobile || '', businessName: '',
    country: 'India', state: 'Uttar Pradesh', city: 'Lucknow',
    industry_id: null, business_category_id: null, service_ids: [], target_customer_ids: [],
    marketing_goal: 'Generate Leads', automation_mode: 'AUTO', strategy_id: null, custom_prompt: '',
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(p => ({ ...p, [key]: value }));

  /* ------------------ load dropdown data + prefill saved profile ------------------ */
  const loadData = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError('');
    try {
      const data = await apiGet('/catalog');
      setCatalog({ ...EMPTY_CATALOG, ...data });
    } catch (e: unknown) {
      setCatalogError(errorText(e, 'Could not load business options. Please try again.'));
      setCatalogLoading(false);
      return;
    }

    // Prefill from the account. Never blocks the form.
    try {
      const res = await apiGet('/business');
      const b = res?.business;
      if (b) {
        setForm(p => ({
          ...p,
          name: b.name || p.name || user?.name || '',
          email: b.email || p.email || user?.email || '',
          phone: b.mobile || p.phone || user?.mobile || '',
          businessName: b.businessName || p.businessName,
          country: b.country || p.country,
          state: b.state || p.state,
          city: b.city || p.city,
          industry_id: b.industryId ?? p.industry_id,
          business_category_id: b.businessCategoryId ?? p.business_category_id,
          automation_mode: b.automationMode === 'MANUAL' ? 'MANUAL' : p.automation_mode,
          custom_prompt: b.customPrompt || p.custom_prompt,
        }));
      }
    } catch { /* ignore, form just starts empty */ }
    setCatalogLoading(false);
  }, [user?.email, user?.mobile, user?.name]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ------------------------------ derived lists ------------------------------ */
  const categories = useMemo(() => catalog.categories.filter(c => c.industryId === form.industry_id), [catalog, form.industry_id]);
  const services = useMemo(() => catalog.services.filter(s => s.businessCategoryId === form.business_category_id), [catalog, form.business_category_id]);
  const targets = useMemo(() => catalog.targets.filter(t => t.businessCategoryId === form.business_category_id), [catalog, form.business_category_id]);

  const emailOk = !form.email.trim() || /^\S+@\S+\.\S+$/.test(form.email.trim());

  const valid = (() => {
    switch (step) {
      case 1: return !!form.name.trim() && !!form.businessName.trim() && emailOk;
      case 2: return !!form.industry_id && !!form.business_category_id;
      case 3: return form.service_ids.length > 0;
      case 4: return form.target_customer_ids.length > 0;
      default: return form.automation_mode === 'AUTO' || !!form.strategy_id;
    }
  })();

  const pickLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setError('Choose a JPG, PNG, WEBP or GIF business logo.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Business logo must be 5 MB or smaller.');
      return;
    }
    setError('');
    setLogoFile(file);
    const r = new FileReader();
    r.onload = () => setLogo(r.result as string);
    r.readAsDataURL(file);
  };

  const takeLogoPhoto = async () => {
    setError('');
    try {
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });
      if (!photo.dataUrl) throw new Error('Camera did not return an image.');
      const response = await fetch(photo.dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `business-logo.${photo.format || 'jpeg'}`, {
        type: blob.type || `image/${photo.format || 'jpeg'}`,
      });
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Business logo must be 5 MB or smaller.');
      }
      setLogoFile(file);
      setLogo(photo.dataUrl);
    } catch (cameraError) {
      console.error('[Onboarding] Could not capture business logo:', cameraError);
      setError(errorText(cameraError, 'Could not take a photo. Please choose an image from your device.'));
    }
  };

  /* --------------------------------- submit --------------------------------- */
  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload = new FormData();
      payload.append('name', form.name.trim());
      payload.append('email', form.email.trim());
      payload.append('phone', form.phone.trim());
      payload.append('businessName', form.businessName.trim());
      payload.append('country', form.country);
      payload.append('state', form.state);
      payload.append('city', form.city);
      payload.append('industry_id', String(form.industry_id));
      payload.append('business_category_id', String(form.business_category_id));
      payload.append('service_ids', JSON.stringify(form.service_ids));
      payload.append('target_customer_ids', JSON.stringify(form.target_customer_ids));
      payload.append('marketing_goal', form.marketing_goal);
      payload.append('automation_mode', form.automation_mode);
      payload.append('strategy_id', form.automation_mode === 'MANUAL' && form.strategy_id
        ? String(form.strategy_id)
        : '');
      payload.append('custom_prompt', form.custom_prompt);
      if (logoFile) payload.append('logo', logoFile);

      const response = await apiPost<{ success?: boolean }>('/business', payload);
      if (response?.success === false) {
        throw new Error('Business setup could not be saved. Please review your details and try again.');
      }

      const savedPlan = await apiGet<{ items?: unknown[] }>('/prompt-plan');
      if (!Array.isArray(savedPlan.items) || savedPlan.items.length !== 30) {
        await apiPost('/prompt-plan/generate', {});
      }
      await apiPost('/business/initial-banner', {});

      // RequireAuth sends completed onboarding directly to the dashboard.
      await refreshStatus();
    } catch (e: unknown) {
      setError(errorText(e, 'Could not save your business. Please try again.'));
      setSubmitting(false);
    }
  };

  const next = () => {
    if (!valid || submitting) return;
    setError('');
    if (step < TOTAL_STEPS) setStep(step + 1);
    else submit();
  };
  const back = () => {
    if (step > 1 && !submitting) {
      setError('');
      setStep(step - 1);
    }
  };

  const caret = { interface: 'action-sheet' as const, toggleIcon: 'caret-down-sharp' };

  /* --------------------------------- render --------------------------------- */
  return (
    <IonPage>
      <IonHeader className="ion-no-border setup-header">
        <IonToolbar className="grad-bar">
          {step > 1 && (
            <IonButtons slot="start">
              <IonButton onClick={back} disabled={submitting} aria-label="Go to previous setup step">
                <IonIcon slot="icon-only" icon={arrowBack} />
              </IonButton>
            </IonButtons>
          )}
          <div className="setup-heading">
            <div className="bar-title">{TITLES[step - 1]}</div>
            <span className="step-count">STEP {step} OF {TOTAL_STEPS}</span>
          </div>
        </IonToolbar>
        <div className="progress"><div style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} /></div>
      </IonHeader>

      <IonContent className="page-bg setup-content">
        {catalogLoading && (
          <div className="state-box"><IonSpinner name="crescent" /></div>
        )}

        {!catalogLoading && catalogError && (
          <div className="state-box">
            <p className="form-error">{catalogError}</p>
            <div className="cta-wrap" style={{ width: '100%' }}>
              <button className="cta" onClick={loadData}>TRY AGAIN</button>
            </div>
          </div>
        )}

        {!catalogLoading && !catalogError && (
          <>
            {/* STEP 1 — Business details */}
            {step === 1 && (
              <>
                <div className="logo-wrap setup-logo-wrap">
                  <div className="logo-circle">
                    {logo && <img src={logo} alt="Business logo" />}
                    <span className="cam"><IonIcon icon={cameraOutline} /></span>
                  </div>
                  <input
                    id="business-logo-file"
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    hidden
                    onChange={pickLogo}
                  />
                  <div className="logo-actions">
                    <button type="button" onClick={() => logoInputRef.current?.click()}>
                      Choose from device
                    </button>
                    <button type="button" onClick={() => void takeLogoPhoto()}>
                      Take a photo
                    </button>
                  </div>
                  <div className="logo-caption">{logoFile?.name || 'BUSINESS LOGO · OPTIONAL · MAX 5 MB'}</div>
                </div>

                <div className="sheet setup-sheet">
                  <div className="field">
                    <IonIcon icon={businessOutline} className="ico blue" />
                    <span className="lbl">Business Name *</span>
                    <IonInput value={form.businessName} placeholder="Business name" onIonInput={e => set('businessName', String(e.detail.value ?? ''))} />
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
                </div>
              </>
            )}

            {/* STEP 2 — Industry & category */}
            {step === 2 && (
              <div className="sheet top setup-sheet">
                <div className="field">
                  <IonIcon icon={businessOutline} className="ico blue" />
                  <span className="lbl">Industry *</span>
                  <IonSelect value={form.industry_id} placeholder="Select industry" {...caret}
                    onIonChange={e => {
                      const v = selectedId(e.detail.value);
                      if (v === form.industry_id) return; // ignore no-op / prefill echoes
                      setForm(p => ({ ...p, industry_id: v, business_category_id: null, service_ids: [], target_customer_ids: [] }));
                    }}>
                    {catalog.industries.map(i => <IonSelectOption key={i.id} value={i.id}>{i.name}</IonSelectOption>)}
                  </IonSelect>
                </div>
                <div className="field">
                  <IonIcon icon={pricetagOutline} className="ico teal" />
                  <span className="lbl">Business Category *</span>
                  <IonSelect value={form.business_category_id} disabled={!form.industry_id}
                    placeholder={form.industry_id ? 'Select category' : 'Select industry first'} {...caret}
                    onIonChange={e => {
                      const v = selectedId(e.detail.value);
                      if (v === form.business_category_id) return;
                      setForm(p => ({ ...p, business_category_id: v, service_ids: [], target_customer_ids: [] }));
                    }}>
                    {categories.map(c => <IonSelectOption key={c.id} value={c.id}>{c.name}</IonSelectOption>)}
                  </IonSelect>
                </div>
                {form.industry_id && <p className="note">{categories.length} business categories available.</p>}
              </div>
            )}

            {/* STEP 3 — Services */}
            {step === 3 && (
              <div className="sheet top setup-sheet">
                <div className="field">
                  <IonIcon icon={cubeOutline} className="ico blue" />
                  <span className="lbl">Products / Services *</span>
                  <IonSelect multiple value={form.service_ids} placeholder="Select one or more" interface="alert" toggleIcon="caret-down-sharp"
                    onIonChange={e => set('service_ids', selectedIds(e.detail.value))}>
                    {services.map(s => <IonSelectOption key={s.id} value={s.id}>{s.name}</IonSelectOption>)}
                  </IonSelect>
                </div>
                <p className="note">{services.length} services available. We rotate the ones you pick across the 30 days.</p>
              </div>
            )}

            {/* STEP 4 — Target customers */}
            {step === 4 && (
              <div className="sheet top setup-sheet">
                <div className="field">
                  <IonIcon icon={peopleOutline} className="ico green" />
                  <span className="lbl">Target Customers *</span>
                  <IonSelect multiple value={form.target_customer_ids} placeholder="Select one or more" interface="alert" toggleIcon="caret-down-sharp"
                    onIonChange={e => set('target_customer_ids', selectedIds(e.detail.value))}>
                    {targets.map(t => <IonSelectOption key={t.id} value={t.id}>{t.name}</IonSelectOption>)}
                  </IonSelect>
                </div>
                <p className="note">Select the audience you actually want to reach. Topics, captions and CTAs adapt to them.</p>
              </div>
            )}

            {/* STEP 5 — Strategy */}
            {step === 5 && (
              <div className="sheet top setup-sheet">
                <div className="field">
                  <IonIcon icon={flagOutline} className="ico blue" />
                  <span className="lbl">Marketing Goal</span>
                  <IonSelect value={form.marketing_goal} {...caret} onIonChange={e => set('marketing_goal', e.detail.value)}>
                    {GOALS.map(g => <IonSelectOption key={g} value={g}>{g}</IonSelectOption>)}
                  </IonSelect>
                </div>

                <div className="seg-title">Choose your marketing strategy mode</div>
                <div className="automation-options" role="group" aria-label="Marketing strategy mode">
                  <button
                    type="button"
                    aria-pressed={form.automation_mode === 'AUTO'}
                    className={`automation-option${form.automation_mode === 'AUTO' ? ' is-selected' : ''}`}
                    onClick={() => setForm(p => ({ ...p, automation_mode: 'AUTO', strategy_id: null }))}
                  >
                    <span className="automation-option-title">AarnexAi AI</span>
                    <span className="automation-option-description">Let AI plan and optimize your monthly promotions.</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={form.automation_mode === 'MANUAL'}
                    className={`automation-option${form.automation_mode === 'MANUAL' ? ' is-selected' : ''}`}
                    onClick={() => setForm(p => ({ ...p, automation_mode: 'MANUAL', strategy_id: null }))}
                  >
                    <span className="automation-option-title">Manual control</span>
                    <span className="automation-option-description">Choose the promotion strategy that suits you.</span>
                  </button>
                </div>

                {form.automation_mode === 'MANUAL' && (
                  <div className="field">
                    <IonIcon icon={pricetagOutline} className="ico teal" />
                    <span className="lbl">Monthly Promotion Strategy *</span>
                    <IonSelect value={form.strategy_id} placeholder="Select a strategy"
                      interface="alert" toggleIcon="caret-down-sharp" onIonChange={e => set('strategy_id', e.detail.value ?? null)}>
                      {catalog.strategies.map(s => <IonSelectOption key={s.id} value={s.id}>{s.name} — {s.objective}</IonSelectOption>)}
                    </IonSelect>
                  </div>
                )}
                {form.automation_mode === 'AUTO' && (
                  <p className="note automation-note">
                    AarnexAi AI will create and rotate a monthly strategy tailored to your business, audience and goals.
                  </p>
                )}

                <div className="field">
                  <IonIcon icon={createOutline} className="ico navy" />
                  <span className="lbl">Custom Prompt / Instructions</span>
                  <IonTextarea autoGrow rows={3} value={form.custom_prompt}
                    placeholder="Example: Focus on premium customers, local Lucknow audience, educational content first, avoid discounts..."
                    onIonInput={e => set('custom_prompt', String(e.detail.value ?? ''))} />
                </div>
              </div>
            )}

            <div className="cta-wrap setup-actions">
              {error && <p className="form-error">{error}</p>}
              <div className={`setup-step-actions${step === 1 ? ' is-first-step' : ''}`}>
                {step > 1 && (
                  <button type="button" className="cta cta-previous" disabled={submitting} onClick={back}>
                    Previous
                  </button>
                )}
                <button type="button" className="cta cta-next" disabled={!valid || submitting} onClick={next}>
                  {submitting
                    ? <><IonSpinner name="dots" /> Preparing your plan & first banner…</>
                    : step < TOTAL_STEPS ? 'Continue' : 'Save & continue'}
                </button>
              </div>
            </div>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Onboarding;