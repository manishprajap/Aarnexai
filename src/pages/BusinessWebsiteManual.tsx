import React, { useEffect, useState } from 'react';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonSpinner,
  IonToolbar,
} from '@ionic/react';
import { arrowBackOutline, cloudUploadOutline, imageOutline, saveOutline } from 'ionicons/icons';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../api';

interface ManualWebsiteContent {
  aboutUs: string;
  logoUrl: string | null;
}

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const BusinessWebsiteManual: React.FC = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState<ManualWebsiteContent>({ aboutUs: '', logoUrl: null });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentLoaded, setContentLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void apiGet<ManualWebsiteContent>('/business/website/content')
      .then((response) => {
        if (active) {
          setContent(response);
          setContentLoaded(true);
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load manual website content.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!logoFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(logoFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [logoFile]);

  const chooseLogo = (file: File | undefined) => {
    setError('');
    if (!file) return;
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setLogoFile(null);
      setError('Choose a JPG, PNG, WEBP or GIF logo.');
      return;
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setLogoFile(null);
      setError('Logo must be 5MB or smaller.');
      return;
    }
    setLogoFile(file);
  };

  const saveContent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const formData = new FormData();
      formData.set('aboutUs', content.aboutUs);
      if (logoFile) formData.set('logo', logoFile);

      await apiPost<ManualWebsiteContent & { message?: string }>(
        '/business/website/content',
        formData,
      );
      navigate('/business-website');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save your website content.');
    } finally {
      setSaving(false);
    }
  };

  const shownLogo = previewUrl || content.logoUrl;

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2">
            <IonButton
              fill="clear"
              onClick={() => navigate('/business-website')}
              aria-label="Back to business website"
            >
              <IonIcon slot="icon-only" icon={arrowBackOutline} />
            </IonButton>
            <h1 className="m-0 text-lg font-bold text-gray-900">Manual website content</h1>
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent className="bg-gray-50">
        <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6">
              <p className="m-0 text-sm font-bold uppercase tracking-widest text-green-700">Customize your page</p>
              <h2 className="mb-2 mt-2 text-2xl font-bold text-gray-900">Make it yours</h2>
              <p className="m-0 text-sm leading-6 text-gray-600">
                Add your business logo and tell visitors what makes your business special.
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-10"><IonSpinner /></div>
            ) : !contentLoaded ? (
              <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
                Manual content could not be loaded. Return to the website settings and try again.
              </p>
            ) : (
              <form className="space-y-6" onSubmit={(event) => void saveContent(event)}>
                <div>
                  <label htmlFor="business-website-logo" className="mb-2 block text-sm font-semibold text-gray-800">
                    Business logo
                  </label>
                  <div className="flex flex-col gap-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 sm:flex-row sm:items-center">
                    <div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-xl border border-gray-200 bg-white text-4xl text-green-700">
                      {shownLogo ? (
                        <img src={shownLogo} alt="Business logo preview" className="h-full w-full object-contain p-2" />
                      ) : (
                        <IonIcon icon={imageOutline} />
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="m-0 text-sm font-semibold text-gray-800">Upload a clear logo</p>
                      <p className="m-0 text-xs leading-5 text-gray-500">JPG, PNG, WEBP or GIF, up to 5MB.</p>
                      <label
                        htmlFor="business-website-logo"
                        className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg bg-green-700 px-4 text-sm font-semibold text-white transition hover:bg-green-800"
                      >
                        <IonIcon icon={cloudUploadOutline} />
                        Choose image
                      </label>
                      <input
                        id="business-website-logo"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="sr-only"
                        onChange={(event) => {
                          chooseLogo(event.target.files?.[0]);
                          event.target.value = '';
                        }}
                      />
                      {logoFile && <p className="m-0 text-xs text-gray-600">{logoFile.name}</p>}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label htmlFor="business-website-about" className="text-sm font-semibold text-gray-800">
                      About us
                    </label>
                    <span className="text-xs text-gray-500">{content.aboutUs.length}/5000</span>
                  </div>
                  <textarea
                    id="business-website-about"
                    rows={9}
                    maxLength={5000}
                    value={content.aboutUs}
                    onChange={(event) => setContent((current) => ({ ...current, aboutUs: event.target.value }))}
                    placeholder="Share your story, what you offer, and why customers choose your business."
                    className="w-full resize-y rounded-xl border border-gray-300 bg-white p-4 text-sm leading-6 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-100"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <IonButton type="submit" disabled={saving}>
                    {saving ? <IonSpinner name="crescent" /> : <><IonIcon slot="start" icon={saveOutline} /> Save changes</>}
                  </IonButton>
                  <IonButton type="button" fill="outline" disabled={saving} onClick={() => navigate('/business-website')}>
                    Cancel
                  </IonButton>
                </div>
              </form>
            )}
          </section>

          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        </main>
      </IonContent>
    </IonPage>
  );
};

export default BusinessWebsiteManual;
