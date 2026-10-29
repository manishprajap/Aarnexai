import React, { useEffect, useState } from 'react';
import { IonContent, IonIcon, IonPage, IonSpinner } from '@ionic/react';
import { storefrontOutline } from 'ionicons/icons';
import { useParams } from 'react-router-dom';
import { apiGet } from '../api';

interface PublicProduct {
  id: number;
  title: string | null;
  description: string | null;
  price: string | null;
  brand: string | null;
  imageUrl: string | null;
}

interface PublicSite {
  slug: string;
  name: string | null;
  category: string | null;
  city: string | null;
  website: string | null;
  logo: string | null;
  products: PublicProduct[];
}

const PublicBusinessSite: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const [site, setSite] = useState<PublicSite | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void apiGet<{ site: PublicSite }>(`/public/business-sites/${encodeURIComponent(slug)}`)
      .then((response) => {
        if (active) setSite(response.site);
      })
      .catch(() => {
        if (active) setSite(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [slug]);

  if (loading) {
    return (
      <IonPage>
        <IonContent className="bg-white">
          <div className="flex min-h-full items-center justify-center"><IonSpinner /></div>
        </IonContent>
      </IonPage>
    );
  }

  if (!site) {
    return (
      <IonPage>
        <IonContent className="bg-white">
          <main className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center px-6 text-center">
            <IonIcon icon={storefrontOutline} className="mb-4 text-5xl text-gray-300" />
            <h1 className="text-2xl font-bold text-gray-900">Website unavailable</h1>
            <p className="text-gray-600">This business website is not published or its subscription has expired.</p>
            <a className="mt-4 text-green-700" href="https://aarnexai.com/">Powered by AarnexAi</a>
          </main>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent className="bg-white">
        <div className="min-h-full text-gray-800">
          <header className="border-b border-gray-100 bg-white">
            <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-4">
              {site.logo ? <img src={site.logo} alt="" className="h-12 w-12 rounded-xl object-contain" /> : (
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-green-50 text-2xl text-green-700"><IonIcon icon={storefrontOutline} /></span>
              )}
              <span className="text-lg font-bold">{site.name}</span>
            </div>
          </header>

          <main>
            <section className="bg-gradient-to-br from-green-50 via-white to-emerald-50">
              <div className="mx-auto grid min-h-[340px] max-w-6xl items-center gap-8 px-5 py-14 md:grid-cols-[1.4fr_0.6fr]">
                <div>
                  <p className="font-semibold uppercase tracking-widest text-green-700">{site.category || 'Local business'}</p>
                  <h1 className="mt-3 text-4xl font-extrabold leading-tight text-gray-950 md:text-6xl">{site.name}</h1>
                  <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
                    Discover {site.name}{site.category ? `, a ${site.category.toLowerCase()} business` : ''}{site.city ? ` in ${site.city}` : ''}. Explore our products and get in touch to learn more.
                  </p>
                  {site.city && <p className="mt-4 text-sm font-medium text-gray-500">{site.city}</p>}
                  {site.website && (
                    <a href={/^https?:\/\//i.test(site.website) ? site.website : `https://${site.website}`} target="_blank" rel="noreferrer" className="mt-6 inline-flex rounded-lg bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800">
                      Visit our website
                    </a>
                  )}
                </div>
                {site.logo && <img src={site.logo} alt={`${site.name} logo`} className="mx-auto max-h-64 max-w-full object-contain" />}
              </div>
            </section>

            <section className="mx-auto max-w-6xl px-5 py-14">
              <div className="mb-7">
                <p className="m-0 text-sm font-bold uppercase tracking-widest text-green-700">About us</p>
                <h2 className="mb-2 mt-2 text-3xl font-bold text-gray-950">Welcome to {site.name}</h2>
                <p className="max-w-3xl leading-7 text-gray-600">
                  {site.name}{site.category ? ` is a ${site.category.toLowerCase()} business` : ' is a local business'}{site.city ? ` based in ${site.city}` : ''}. We are pleased to share our products with you.
                </p>
              </div>
            </section>

            <section className="bg-gray-50">
              <div className="mx-auto max-w-6xl px-5 py-14">
                <p className="m-0 text-sm font-bold uppercase tracking-widest text-green-700">Our collection</p>
                <h2 className="mb-7 mt-2 text-3xl font-bold text-gray-950">Products</h2>
                {site.products.length ? (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {site.products.map((product) => (
                      <article key={product.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                        {product.imageUrl && <img src={product.imageUrl} alt={product.title || 'Product'} loading="lazy" className="aspect-[4/3] w-full object-cover" />}
                        <div className="p-5">
                          {product.brand && <p className="m-0 text-xs font-semibold uppercase tracking-wider text-green-700">{product.brand}</p>}
                          <h3 className="mb-2 mt-1 text-lg font-bold text-gray-900">{product.title || 'Product'}</h3>
                          {product.description && <p className="line-clamp-3 text-sm leading-6 text-gray-600">{product.description}</p>}
                          {product.price && <p className="mb-0 mt-4 font-bold text-gray-900">₹{product.price}</p>}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl bg-white p-5 text-gray-600">Products will be added here soon.</p>
                )}
              </div>
            </section>
          </main>

          <footer className="bg-gray-950 text-gray-300">
            <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="m-0 font-semibold text-white">{site.name}</p>
                <p className="m-0 mt-1 text-sm">{[site.category, site.city].filter(Boolean).join(' · ')}</p>
              </div>
              <a href="https://aarnexai.com/" className="text-sm text-green-300">Website powered by AarnexAi</a>
            </div>
          </footer>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PublicBusinessSite;
