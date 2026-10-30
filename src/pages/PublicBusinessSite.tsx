import React, { useEffect, useState } from 'react';
import { IonContent, IonIcon, IonPage, IonSpinner } from '@ionic/react';
import { storefrontOutline } from 'ionicons/icons';
import { useParams } from 'react-router-dom';
import { apiGet } from '../api';
import './PublicBusinessSite.css';

interface PublicProduct {
  id: number;
  title: string | null;
  description: string | null;
  price: string | null;
  brand: string | null;
  companyName: string | null;
  category: string | null;
  subcategory: string | null;
  color: string | null;
  features: string | null;
  keywords: string | null;
  hashtags: string | null;
  visibleText: string | null;
  metaDescription: string | null;
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
  const { slug = '', productId } = useParams<{ slug: string; productId?: string }>();
  const [site, setSite] = useState<PublicSite | null>(null);
  const [loading, setLoading] = useState(true);

  const productDetails = (value: string | null) =>
    value?.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean) ?? [];

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
      <IonPage className="public-site-page">
        <IonContent className="public-site-content">
          <div className="public-site-state"><IonSpinner /></div>
        </IonContent>
      </IonPage>
    );
  }

  if (!site) {
    return (
      <IonPage className="public-site-page">
        <IonContent className="public-site-content">
          <main className="public-site-state public-site-unavailable">
            <IonIcon icon={storefrontOutline} />
            <h1>Website unavailable</h1>
            <p>This business website is not published or its subscription has expired.</p>
            <a href="https://aarnexai.com/">Powered by AarnexAi</a>
          </main>
        </IonContent>
      </IonPage>
    );
  }

  if (productId) {
    const product = site.products.find((item) => String(item.id) === productId);

    if (!product) {
      return (
        <IonPage className="public-site-page">
          <IonContent className="public-site-content">
            <main className="public-site-state public-site-unavailable">
              <IonIcon icon={storefrontOutline} />
              <h1>Product unavailable</h1>
              <p>This product could not be found in this business catalog.</p>
              <a href={`/${encodeURIComponent(slug)}`}>Back to {site.name}</a>
            </main>
          </IonContent>
        </IonPage>
      );
    }

    return (
      <IonPage className="public-site-page">
        <IonContent className="public-site-content">
          <div className="public-site">
            <header className="public-site-header">
              <div className="public-site-container public-site-header-inner">
                <a className="public-site-brand-mark" href={`/${encodeURIComponent(slug)}`} aria-label={`Back to ${site.name}`}>
                  {site.logo ? <img src={site.logo} alt="" /> : <IonIcon icon={storefrontOutline} />}
                </a>
                <span className="public-site-brand-name">{site.name}</span>
              </div>
            </header>

            <main className="public-site-container public-site-detail-container">
              <a className="public-site-back-link" href={`/${encodeURIComponent(slug)}`}>
                &larr; Back to {site.name}
              </a>
              <article className="public-site-detail-card">
                <div className="public-site-detail-image">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.title || 'Product'} />
                  ) : (
                    <IonIcon icon={storefrontOutline} />
                  )}
                </div>
                <div className="public-site-detail-copy">
                  {product.brand && <p className="public-site-product-brand">{product.brand}</p>}
                  <p className="public-site-eyebrow">{product.category || site.category || 'Product'}</p>
                  <h1>{product.title || 'Product'}</h1>
                  {product.companyName && <p className="public-site-product-company">{product.companyName}</p>}
                  {product.price && <p className="public-site-detail-price">₹{product.price}</p>}
                  <p className="public-site-detail-description">
                    {product.description || product.metaDescription || 'Contact the business to learn more about this product.'}
                  </p>

                  {(product.category || product.subcategory || product.color) && (
                    <dl className="public-site-product-facts">
                      {product.category && <div><dt>Category</dt><dd>{product.category}</dd></div>}
                      {product.subcategory && <div><dt>Type</dt><dd>{product.subcategory}</dd></div>}
                      {product.color && <div><dt>Color</dt><dd>{product.color}</dd></div>}
                    </dl>
                  )}
                  {product.features && (
                    <div className="public-site-product-detail">
                      <h2>Features</h2>
                      <ul>
                        {productDetails(product.features).map((feature, index) => (
                          <li key={`${product.id}-feature-${index}`}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {product.visibleText && (
                    <div className="public-site-product-detail">
                      <h2>Product details</h2>
                      <p>{product.visibleText}</p>
                    </div>
                  )}
                  {product.metaDescription && product.metaDescription !== product.description && (
                    <div className="public-site-product-detail">
                      <h2>More information</h2>
                      <p>{product.metaDescription}</p>
                    </div>
                  )}
                  {(product.keywords || product.hashtags) && (
                    <div className="public-site-product-tags">
                      {productDetails(product.keywords).map((keyword, index) => (
                        <span key={`${product.id}-keyword-${index}`}>{keyword}</span>
                      ))}
                      {productDetails(product.hashtags).map((hashtag, index) => (
                        <span key={`${product.id}-hashtag-${index}`}>{hashtag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            </main>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage className="public-site-page">
      <IonContent className="public-site-content">
        <div className="public-site">
          <header className="public-site-header">
            <div className="public-site-container public-site-header-inner">
              <span className="public-site-brand-mark">
                {site.logo ? (
                  <img src={site.logo} alt="" />
                ) : (
                  <IonIcon icon={storefrontOutline} />
                )}
              </span>
              <span className="public-site-brand-name">{site.name}</span>
            </div>
          </header>

          <main>
            <section className="public-site-hero">
              <div className="public-site-container public-site-hero-inner">
                <div className="public-site-hero-copy">
                  <p className="public-site-eyebrow">{site.category || 'Local business'}</p>
                  <h1>{site.name}</h1>
                  <p className="public-site-intro">
                    Discover {site.name}{site.category ? `, a ${site.category.toLowerCase()} business` : ''}{site.city ? ` in ${site.city}` : ''}. Explore our products and get in touch to learn more.
                  </p>
                  {site.city && (
                    <p className="public-site-location">
                      <IonIcon icon={storefrontOutline} />
                      {site.city}
                    </p>
                  )}
                  {site.website && (
                    <a
                      href={/^https?:\/\//i.test(site.website) ? site.website : `https://${site.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="public-site-button"
                    >
                      Visit our website
                    </a>
                  )}
                </div>
                <div className="public-site-hero-art" aria-hidden="true">
                  {site.logo ? (
                    <img src={site.logo} alt="" />
                  ) : (
                    <IonIcon icon={storefrontOutline} />
                  )}
                  <span>{site.category || 'Local business'}</span>
                </div>
              </div>
            </section>

            <section className="public-site-about">
              <div className="public-site-container public-site-about-inner">
                <p className="public-site-eyebrow">About us</p>
                <h2>Welcome to {site.name}</h2>
                <p>
                  {site.name}{site.category ? ` is a ${site.category.toLowerCase()} business` : ' is a local business'}{site.city ? ` based in ${site.city}` : ''}. We are pleased to share our products with you.
                </p>
              </div>
            </section>

            <section className="public-site-products">
              <div className="public-site-container public-site-products-inner">
                <p className="public-site-eyebrow">Product catalog</p>
                <h2>Products</h2>
                {site.products.length ? (
                  <div className="public-site-product-grid">
                    {site.products.map((product) => (
                      <article key={product.id} className="public-site-product-card">
                        <div className="public-site-product-image-wrap">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.title || 'Product'}
                              loading="lazy"
                              className="public-site-product-image"
                            />
                          ) : (
                            <div className="public-site-product-image-placeholder">
                              <IonIcon icon={storefrontOutline} />
                            </div>
                          )}
                        </div>
                        <div className="public-site-product-copy">
                          <h3>{product.title || 'Product'}</h3>
                          <p className="public-site-product-description">
                            {product.description || 'Explore this product and discover more details.'}
                          </p>
                          <a
                            className="public-site-product-more"
                            href={`/${encodeURIComponent(slug)}/products/${encodeURIComponent(String(product.id))}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View more <span aria-hidden="true">&rarr;</span>
                          </a>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="public-site-empty-products">Products will be added here soon.</p>
                )}
              </div>
            </section>
          </main>

          <footer className="public-site-footer">
            <div className="public-site-container public-site-footer-inner">
              <div>
                <p className="public-site-footer-name">{site.name}</p>
                <p className="public-site-footer-meta">{[site.category, site.city].filter(Boolean).join(' · ')}</p>
              </div>
              <a href="https://aarnexai.com/">Website powered by AarnexAi</a>
            </div>
          </footer>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PublicBusinessSite;
