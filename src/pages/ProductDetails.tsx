import { useEffect, useState } from 'react';

import { useParams, useLocation } from 'react-router-dom';

import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonBackButton,
  IonButtons,
  IonSpinner,
  IonBadge,
} from '@ionic/react';

import { apiGet } from '../api';

interface BannerItem {
  id: string;
  day: number;
  theme: string | null; // 'YYYY-MM-DD' this banner is for
  imageUrl: string | null;
  caption: string | null;
  createdAt?: string;
}

interface ProductDetails {
  id: string;
  status: 'processing' | 'done' | 'failed';
  originalImageUrl: string | null;
  cleanImageUrl: string | null;
  productName: string | null;
  brand: string | null;
  companyName: string | null;
  price: string | null;
  category: string | null;
  subcategory: string | null;
  color: string | null;
  description: string | null;
  metaDescription: string | null;
  confidence: number | null;
  features: string[];
  keywords: string[];
  hashtags: string[];
  visibleText: string[];
  banners: BannerItem[];
  createdAt?: string;
}

interface GetProductResponse {
  success: boolean;
  message?: string;
  product?: ProductDetails;
}

interface NavigationState {
  product?: ProductDetails;
}

/**
 * Works two ways, both rendering the same UI:
 *
 * 1. Mounted at /products/:productId — loads that specific product.
 * 2. Mounted at a route with no :productId (e.g. /product-details) —
 *    loads the logged-in user's most recent product instead. The
 *    token already identifies the user, so no ID is needed in the URL.
 */
const ProductDetailsPage: React.FC = () => {
  const { productId } = useParams<{ productId?: string }>();
  const location = useLocation();
  const navState = location.state as NavigationState | null | undefined;

  const [product, setProduct] = useState<ProductDetails | null>(
    navState?.product ?? null
  );

  const [postedDays, setPostedDays] = useState<number[]>([]);
  const [loading, setLoading] = useState(!navState?.product);
  const [error, setError] = useState<string | null>(null);
  const [noProductYet, setNoProductYet] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchProduct = async () => {
      try {
        if (!navState?.product) {
          setLoading(true);
        }

        setError(null);
        setNoProductYet(false);

        // With an ID: fetch that product. Without one: fetch the
        // logged-in user's latest product (token-based, no ID needed).
        const endpoint = productId
          ? `/products/${productId}`
          : '/products/latest';

        const response = (await apiGet(endpoint)) as GetProductResponse;

        if (cancelled) {
          return;
        }

        if (!response?.success || !response.product) {
          if (!productId) {
            // No product uploaded yet — not a real error, just empty state.
            setNoProductYet(true);
            setProduct(null);
            return;
          }

          throw new Error(response?.message || 'Product not found');
        }

        setProduct(response.product);
      } catch (err: any) {
        if (cancelled) {
          return;
        }

        if (!productId) {
          // Same idea for a 404-style failure on the "latest" endpoint.
          setNoProductYet(true);
          setProduct(null);
          return;
        }

        const message =
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load product';

        if (!navState?.product) {
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    // Skip the fetch only when we already have the product handed to
    // us via navigation state AND we have an explicit ID (the "latest"
    // path always needs a fresh fetch, since state won't carry it).
    if (navState?.product && productId) {
      setLoading(false);
      return;
    }

    fetchProduct();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);


  const heroUrl = product?.cleanImageUrl || product?.originalImageUrl || null;

  const formatBannerDate = (theme: string | null) => {
    if (!theme) return '';

    const date = new Date(`${theme}T00:00:00`);

    if (Number.isNaN(date.getTime())) return theme;

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: '2-digit',
    });
  };

  const currentDay =
    product?.banners
      .filter((banner) => !postedDays.includes(banner.day))
      .sort((a, b) => a.day - b.day)[0]?.day ?? 1;
  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="app-toolbar">
          <IonButtons slot="start">
            <IonBackButton
              defaultHref="/home"
              text=""
              className="text-gray-700"
            />
          </IonButtons>

          <div className="px-2 py-2">
            <h1 className="m-0 text-lg font-bold text-gray-900">
              Product Details
            </h1>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="bg-gray-50">
        {/* Loading */}

        {loading && !product && (
          <div className="flex min-h-full flex-col items-center justify-center gap-3 py-20">
            <IonSpinner name="crescent" />

            <p className="m-0 text-sm text-gray-500">
              Loading product details...
            </p>
          </div>
        )}

        {/* No product yet (only reachable on the ID-less route) */}

        {!loading && noProductYet && (
          <div className="flex min-h-full flex-col items-center justify-center gap-2 px-6 py-20 text-center">
            <p className="m-0 text-sm font-semibold text-gray-700">
              You haven't uploaded a product yet.
            </p>

            <p className="m-0 text-xs text-gray-400">
              Upload a product to see its details here.
            </p>
          </div>
        )}

        {/* Error (only reachable on the ID-based route) */}

        {!loading && error && !product && (
          <div className="flex min-h-full flex-col items-center justify-center gap-2 px-6 py-20 text-center">
            <p className="m-0 text-sm font-semibold text-red-500">{error}</p>

            {productId && (
              <p className="m-0 text-xs text-gray-400">
                Product ID: {productId}
              </p>
            )}
          </div>
        )}

        {/* Content */}

        {product && (
          <div className="min-h-full bg-gray-50 pb-10">
            {/* Hero image */}

            <div className="relative bg-gray-200">
              {heroUrl ? (
                <img
                  src={heroUrl}
                  alt={product.productName || 'Product'}
                  className="h-64 w-full object-cover"
                />
              ) : (
                <div className="flex h-64 w-full items-center justify-center text-sm text-gray-400">
                  No image available
                </div>
              )}

              {/* Status badge */}

              <div className="absolute right-3 top-3">
                <IonBadge
                  color={
                    product.status === 'done'
                      ? 'success'
                      : product.status === 'failed'
                        ? 'danger'
                        : 'warning'
                  }
                >
                  {product.status}
                </IonBadge>
              </div>
            </div>

            <div className="px-4 pt-5">
              {/* Title + brand */}

              <h2 className="m-0 text-xl font-bold text-gray-900">
                {product.productName || 'Untitled product'}
              </h2>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                {product.brand && (
                  <span>
                    by{' '}
                    <span className="font-semibold text-gray-700">
                      {product.brand}
                    </span>
                  </span>
                )}

                {product.companyName &&
                  product.companyName !== product.brand && (
                    <span>· {product.companyName}</span>
                  )}
              </div>

              {/* Price */}

              <div className="mt-4">
                {product.price ? (
                  <span className="text-2xl font-bold text-indigo-600">
                    {product.price}
                  </span>
                ) : (
                  <span className="text-sm italic text-gray-400">
                    Price not detected
                  </span>
                )}
              </div>

              {/* Category / subcategory / color chips */}

              <div className="mt-4 flex flex-wrap gap-2">
                {product.category && (
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
                    {product.category}
                  </span>
                )}

                {product.subcategory && (
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">
                    {product.subcategory}
                  </span>
                )}

                {product.color && (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                    {product.color}
                  </span>
                )}
              </div>

              {/* Ad banners (day-wise) */}

              {product.banners.length > 0 && (
                <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
                  <h3 className="m-0 mb-3 text-sm font-bold text-gray-800">
                    Ad Banners
                  </h3>

                  <div className="-mx-1 flex snap-x gap-3 overflow-x-auto pb-1">
                    {product.banners.map((banner) => {
                      const isPosted = postedDays.includes(banner.day);
                      const isCurrentDay = banner.day === currentDay;
                      const isLocked = !isPosted && !isCurrentDay;

                      return (
                        <div
                          key={banner.id}
                          className="relative w-64 shrink-0 snap-start overflow-hidden rounded-xl border border-gray-100 bg-gray-50 p-2"
                        >
                          {banner.imageUrl ? (
                            <div className="relative overflow-hidden rounded-lg">
                              <img
                                src={banner.imageUrl}
                                alt={banner.caption || `Day ${banner.day} banner`}
                                className={`h-36 w-full rounded-lg object-cover transition ${isLocked ? 'scale-105 blur-md' : ''
                                  }`}
                              />

                              {isLocked && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                                  <div className="rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-gray-700 shadow">
                                    🔒 Day {banner.day}
                                  </div>
                                </div>
                              )}

                              {isPosted && (
                                <div className="absolute right-2 top-2 rounded-full bg-green-500 px-2 py-1 text-xs font-semibold text-white shadow">
                                  ✓ Posted
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex h-36 w-full items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
                              Banner not generated
                            </div>
                          )}

                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-700">
                              Day {banner.day}
                            </span>

                            <span className="text-xs text-gray-400">
                              {formatBannerDate(banner.theme)}
                            </span>
                          </div>

                          {isCurrentDay && !isPosted && (
                            <button
                              type="button"
                              className="mt-2 w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white"
                              onClick={() => {
                                console.log('Post Day:', banner.day);
                              }}
                            >
                              Post Day {banner.day}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Confidence */}

              {typeof product.confidence === 'number' && (
                <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between text-xs font-medium text-gray-500">
                    <span>AI Confidence</span>

                    <span>{product.confidence}%</span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${product.confidence}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Description */}

              {product.description && (
                <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
                  <h3 className="m-0 mb-2 text-sm font-bold text-gray-800">
                    Description
                  </h3>

                  <p className="m-0 text-sm leading-6 text-gray-600">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Meta description (SEO) */}

              {product.metaDescription && (
                <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                  <h3 className="m-0 mb-2 text-sm font-bold text-gray-800">
                    Meta Description
                  </h3>

                  <p className="m-0 text-sm leading-6 text-gray-500">
                    {product.metaDescription}
                  </p>
                </div>
              )}

              {/* Features */}

              {product.features.length > 0 && (
                <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                  <h3 className="m-0 mb-3 text-sm font-bold text-gray-800">
                    Features
                  </h3>

                  <ul className="m-0 flex flex-col gap-2 pl-4 text-sm text-gray-600">
                    {product.features.map((feature, index) => (
                      <li key={index} className="list-disc">
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Visible text */}

              {product.visibleText.length > 0 && (
                <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                  <h3 className="m-0 mb-3 text-sm font-bold text-gray-800">
                    Text Detected on Product
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    {product.visibleText.map((text, index) => (
                      <span
                        key={index}
                        className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600"
                      >
                        {text}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Keywords */}

              {product.keywords.length > 0 && (
                <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                  <h3 className="m-0 mb-3 text-sm font-bold text-gray-800">
                    Keywords
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    {product.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Hashtags */}

              {product.hashtags.length > 0 && (
                <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                  <h3 className="m-0 mb-3 text-sm font-bold text-gray-800">
                    Hashtags
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    {product.hashtags.map((hashtag, index) => (
                      <span
                        key={index}
                        className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600"
                      >
                        {hashtag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default ProductDetailsPage;