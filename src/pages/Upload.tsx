/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonSpinner,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

import {
  arrowBack,
  camera,
  chevronDownOutline,
  imagesOutline,
  sparklesOutline,
} from 'ionicons/icons';

import { apiGet, apiPost } from '../api';
import { useAuth } from '../context/AuthContext';
import aarnaLogo from '../assets/aarna-logo.png';
import {
  BusinessCategory,
  getBusinessCategory,
  resolveBusinessCategory,
  saveBusinessCategory,
} from '../utils/businessCategory';

// ==================================================
// BRAND / TOKENS
// ==================================================

const ui = {
  primary: '#0F6FEC',
  primarySoft: '#EAF3FF',
  text: '#0F1B2D',
  muted: '#6B7A90',
  border: '#E1E7EF',
  dashed: '#B9C7DA',
  surface: '#F8FAFD',
  white: '#FFFFFF',
};

const LOGO_SRC = aarnaLogo;

const MAX_DESCRIPTION = 500;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (change to 5MB if you want to match the mockup text)

// ==================================================
// TYPES
// ==================================================

interface Subcategory {
  id: number;
  name: string;
}

interface ChildCategory {
  id: number;
  name: string;
}

type AspectRatio = '1:1' | '16:9' | '9:16';

interface AiProduct {
  productName?: string;
  brand?: string;
  companyName?: string;
  price?: string | null;
  category?: string;
  subcategory?: string;
  color?: string;
  features?: string[];
  description?: string;
  marketingTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  hashtags?: string[];
  visibleText?: string[];
  confidence?: number;
  cleanImageUrl?: string | null;
}

interface AnalyzeBannerResult {
  id: string | number | null;
  day: number;
  type?: string;
  theme: string | null;
  imageUrl: string | null;
  caption: string | null;
  status: 'done' | 'failed';
  error: string | null;
}

interface AnalyzeResponse {
  success: boolean;
  message?: string;
  status?: string;
  productId?: string | number;
  product?: AiProduct;
  banners?: AnalyzeBannerResult[];
}

interface ProductDetailsBanner {
  id: string;
  day: number;
  theme: string | null;
  imageUrl: string | null;
  caption: string | null;
}

interface ProductDetailsState {
  id: string | number;
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
  banners: ProductDetailsBanner[];
}

const ASPECT_OPTIONS: {
  value: AspectRatio;
  ratio: string;
  label: string;
  w: number;
  h: number;
}[] = [
  { value: '1:1', ratio: '1:1', label: 'Square', w: 16, h: 16 },
  { value: '16:9', ratio: '16:9', label: 'Landscape', w: 22, h: 13 },
  { value: '9:16', ratio: '9:16', label: 'Portrait', w: 13, h: 22 },
];

const unwrapList = <T,>(res: any, key: string): T[] => {
  return res?.data?.[key] ?? res?.[key] ?? [];
};

// ==================================================
// SMALL UI PIECES
// ==================================================

const Logo: React.FC = () => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span style={{ fontSize: 22, fontWeight: 800, color: ui.primary, letterSpacing: -0.5 }}>
        Aarnexai
      </span>
    );
  }

  return (
    <img
      src={LOGO_SRC}
      alt="Aarnexai"
      onError={() => setFailed(true)}
      style={{ height: 38, objectFit: 'contain' }}
    />
  );
};

const FieldLabel: React.FC<{ text: string }> = ({ text }) => (
  <p style={{ fontSize: 14, fontWeight: 600, color: ui.text, margin: '0 0 10px' }}>{text}</p>
);

interface SelectFieldProps {
  value: number | null;
  options: { id: number; name: string }[];
  placeholder: string;
  loading?: boolean;
  onChange: (id: number | null) => void;
}

const SelectField: React.FC<SelectFieldProps> = ({
  value,
  options,
  placeholder,
  loading,
  onChange,
}) => {
  if (loading) {
    return (
      <div
        className="animate-pulse"
        style={{ height: 48, borderRadius: 12, background: ui.border }}
      />
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        style={{
          width: '100%',
          height: 48,
          appearance: 'none',
          WebkitAppearance: 'none',
          borderRadius: 12,
          border: `1px solid ${ui.border}`,
          background: ui.white,
          padding: '0 40px 0 14px',
          fontSize: 14,
          color: value ? ui.text : ui.muted,
          outline: 'none',
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <IonIcon
        icon={chevronDownOutline}
        style={{
          position: 'absolute',
          right: 14,
          top: 16,
          fontSize: 16,
          color: ui.muted,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

// ==================================================
// PAGE
// ==================================================

const Upload: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // step 'upload' = screen 1, step 'generate' = screen 2
  const [step, setStep] = useState<'upload' | 'generate'>('upload');

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');

  // Category comes from Business Setup (saved in localStorage), not selected here
  const [businessCategory, setBusinessCategory] = useState<BusinessCategory | null>(null);

  // Chosen per product on this screen (both optional)
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [childCategories, setChildCategories] = useState<ChildCategory[]>([]);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [childCategoryId, setChildCategoryId] = useState<number | null>(null);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [loadingChildCategories, setLoadingChildCategories] = useState(false);

  const [promptDescription, setPromptDescription] = useState('');

  // Today's TEMPLATE prompt from the server (contains {category} {subcategory} {childcategory})
  const [planTemplate, setPlanTemplate] = useState< | null>(null);

  const [uploadingImage, setUploadingImage] = useState(false); // step 1: image upload
  const [generating, setGenerating] = useState(false); // step 2: analyze / generate ad
  const uploading = uploadingImage || generating;
  const [productId, setProductId] = useState<string | number | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const showMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
  };

  /*
  |--------------------------------------------------------------------------
  | Cleanup object URL
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  /*
  |--------------------------------------------------------------------------
  | Read the business category saved by Business Setup.
  | localStorage first; if it is empty (cleared / new device) fall back to the
  | profile from the backend and cache it again.
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!user?.id && !user?.categoryId) {
      return;
    }

    const saved = getBusinessCategory(user.id ?? null);
    const resolved = resolveBusinessCategory(user, saved);

    if (resolved) {
      setBusinessCategory(resolved);

      if (user?.id) {
        saveBusinessCategory(user.id, resolved);
      }
      return;
    }

    let cancelled = false;

    const loadFromProfile = async () => {
      try {
        const res = await apiGet('/auth/me');
        const u = res?.user;

        if (cancelled) {
          return;
        }

        const fromProfile = resolveBusinessCategory(u, null);

        if (!fromProfile) {
          return;
        }

        saveBusinessCategory(user?.id ?? u?.id ?? null, fromProfile);
        setBusinessCategory(fromProfile);
      } catch (error) {
        console.error('LOAD BUSINESS CATEGORY ERROR:', error);
      }
    };

    loadFromProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.categoryId, user?.category]);

  /*
  |--------------------------------------------------------------------------
  | Subcategories of the saved business category
  |--------------------------------------------------------------------------
  */

  const businessCategoryId = businessCategory?.categoryId ?? null;

  useEffect(() => {
    setSubcategories([]);
    setSubcategoryId(null);

    if (!businessCategoryId) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoadingSubcategories(true);
        const res = await apiGet(`/categories/${businessCategoryId}/subcategories`);

        if (!cancelled) {
          setSubcategories(unwrapList<Subcategory>(res, 'subcategories'));
        }
      } catch (error) {
        console.error('LOAD SUBCATEGORIES ERROR:', error);

        if (!cancelled) {
          showMessage('Unable to load subcategories');
        }
      } finally {
        if (!cancelled) {
          setLoadingSubcategories(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [businessCategoryId]);

  /*
  |--------------------------------------------------------------------------
  | Child categories of the selected subcategory
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    setChildCategories([]);
    setChildCategoryId(null);

    if (!subcategoryId) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoadingChildCategories(true);
        const res = await apiGet(`/subcategories/${subcategoryId}/childcategories`);

        if (!cancelled) {
          setChildCategories(unwrapList<ChildCategory>(res, 'childCategories'));
        }
      } catch (error) {
        console.error('LOAD CHILD CATEGORIES ERROR:', error);

        if (!cancelled) {
          showMessage('Unable to load child categories');
        }
      } finally {
        if (!cancelled) {
          setLoadingChildCategories(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [subcategoryId]);

  /*
  |--------------------------------------------------------------------------
  | 1) Today's TEMPLATE prompt comes from the server (DB).
  |    If the user has no plan yet (or only an old one without placeholders)
  |    the API generates a fresh 30-day plan once via Gemini.
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const categoryName = businessCategory?.categoryName?.trim();

    if (!user?.id || !categoryName) {
      return;
    }

    let cancelled = false;


    return () => {
      cancelled = true;
    };
  }, [user?.id, businessCategory?.categoryId, businessCategory?.categoryName]);

  /*
  |--------------------------------------------------------------------------
  | 2) Fill {category} / {subcategory} / {childcategory} with the real names
  |    whenever the selection changes. Works for businesses without
  |    subcategories too (they fall back to the category name).
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!planTemplate) {
      return;
    }

    const subcategoryName = subcategories.find((item) => item.id === subcategoryId)?.name ?? '';
    const childCategoryName =
      childCategories.find((item) => item.id === childCategoryId)?.name ?? '';

  
  }, [
    planTemplate,
    step,
    subcategoryId,
    childCategoryId,
    subcategories,
    childCategories,
    businessCategory?.categoryName,
  ]);

  /*
  |--------------------------------------------------------------------------
  | File select -> go to "Generate Ad" screen
  |--------------------------------------------------------------------------
  */

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    processSelectedFile(file);

    // allow picking the same file again later
    e.target.value = '';
  };

  const processSelectedFile = (file: File) => {

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      showMessage('Please select a JPG, PNG or WEBP image');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showMessage(`Image size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));

    // upload right away; the Generate Ad screen opens once this succeeds
    uploadImage(file);
  };

  const handleTakePhoto = async () => {
    if (uploadingImage) {
      return;
    }

    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        correctOrientation: true,
      });

      if (!photo.webPath) {
        showMessage('Could not read the captured photo');
        return;
      }

      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      const extension = blob.type === 'image/png' ? 'png' : 'jpg';
      const file = new File([blob], `product-${Date.now()}.${extension}`, {
        type: blob.type || 'image/jpeg',
      });

      processSelectedFile(file);
    } catch (error: any) {
      if (error?.message?.toLowerCase?.().includes('cancel')) {
        return;
      }

      console.error('CAMERA ERROR:', error);
      showMessage('Unable to open the camera');
    }
  };

  /*
  |--------------------------------------------------------------------------
  | STEP 1 — Upload image only (/upload). Opens the "Generate Ad" screen.
  |--------------------------------------------------------------------------
  */

  const uploadImage = async (file: File) => {
    if (!user?.id) {
      showMessage('Please log in again');
      resetToUpload();
      return;
    }

    try {
      setUploadingImage(true);

      const formData = new FormData();
      formData.append('image', file);
      formData.append('userId', String(user.id));

      const uploadResponse = await apiPost('/upload', formData);

      if (!uploadResponse?.success) {
        throw new Error(uploadResponse?.message || 'Image upload failed');
      }

      if (!uploadResponse.productId) {
        throw new Error('Product ID was not returned');
      }

      setProductId(uploadResponse.productId);
      setUploadedImageUrl(uploadResponse.imageUrl || null);
      setStep('generate');
    } catch (error: any) {
      console.error('IMAGE UPLOAD ERROR:', error);

      showMessage(
        error?.response?.data?.message || error?.message || 'Unable to upload image',
      );

      resetToUpload();
    } finally {
      setUploadingImage(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Back
  |--------------------------------------------------------------------------
  */

  const resetToUpload = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);
    setProductId(null);
    setUploadedImageUrl(null);
    setSubcategoryId(null);
    setChildCategoryId(null);
    setPromptDescription('');
    setAspectRatio('1:1');
    setStep('upload');
  };

  const handleBack = () => {
    if (uploading) {
      return;
    }

    if (step === 'generate') {
      resetToUpload();
      return;
    }

    navigate(-1);
  };

  /*
  |--------------------------------------------------------------------------
  | Generate Ad  ->  /upload  ->  /products/analyze
  |--------------------------------------------------------------------------
  */

  const handleGenerate = async () => {
    if (isSubmittingRef.current || uploading) {
      return;
    }

    if (!productId) {
      showMessage('Please upload a product image first');
      return;
    }

    // The category may still be hydrating after this page opens. Re-read the
    // cache/profile at submit time before blocking a valid generation request.
    let category = resolveBusinessCategory(
      user,
      getBusinessCategory(user?.id ?? null),
    ) ?? businessCategory;

    if (!category?.categoryId) {
      try {
        const res = await apiGet('/auth/me');
        const profileCategory = resolveBusinessCategory(res?.user, null);

        if (profileCategory) {
          category = profileCategory;
          setBusinessCategory(profileCategory);
          saveBusinessCategory(user?.id ?? res?.user?.id ?? null, profileCategory);
        }
      } catch (error) {
        console.error('LOAD BUSINESS CATEGORY BEFORE GENERATE ERROR:', error);
      }
    }

    if (!category?.categoryId) {
      showMessage('Please set your business category in Business Setup first');
      return;
    }

    isSubmittingRef.current = true;

    try {
      setGenerating(true);

      showMessage('AI is generating your ad...');

      // STEP 2 — analyze product + generate ad (product analyze API)
      const analyzeResponse: AnalyzeResponse = await apiPost('/product/analyze', {
        productId,
        categoryId: category.categoryId,
        subcategoryId,
        childCategoryId,
        aspectRatio,
        promptDescription: promptDescription.trim(),
      });

      if (!analyzeResponse?.success) {
        throw new Error(analyzeResponse?.message || 'Product analysis failed');
      }

      const aiProduct = analyzeResponse.product;

      if (!aiProduct) {
        throw new Error('Product analysis returned no data');
      }

      const rawBanners = analyzeResponse.banners ?? [];

      const doneBanners: ProductDetailsBanner[] = rawBanners
        .filter((b) => b.status === 'done' && b.imageUrl)
        .map((b) => ({
          id: String(b.id),
          day: b.day,
          theme: b.theme,
          imageUrl: b.imageUrl,
          caption: b.caption,
        }));

      if (rawBanners.some((b) => b.status === 'failed')) {
        console.warn(
          'SOME BANNERS FAILED:',
          rawBanners.filter((b) => b.status === 'failed'),
        );
      }

      showMessage(
        doneBanners.length > 0
          ? 'Ad generated successfully!'
          : 'Product analyzed, but ad generation failed.',
      );

      const productForDetailsPage: ProductDetailsState = {
        id: productId,
        status: (analyzeResponse.status as 'processing' | 'done' | 'failed') || 'done',

        originalImageUrl: uploadedImageUrl,
        cleanImageUrl: aiProduct.cleanImageUrl ?? null,

        productName: aiProduct.productName ?? null,
        brand: aiProduct.brand ?? null,
        companyName: aiProduct.companyName ?? null,
        price: aiProduct.price ?? null,
        category: aiProduct.category ?? null,
        subcategory: aiProduct.subcategory ?? null,
        color: aiProduct.color ?? null,
        description: aiProduct.description ?? null,
        metaDescription: aiProduct.metaDescription ?? null,

        confidence: typeof aiProduct.confidence === 'number' ? aiProduct.confidence : null,

        features: aiProduct.features ?? [],
        keywords: aiProduct.keywords ?? [],
        hashtags: aiProduct.hashtags ?? [],
        visibleText: aiProduct.visibleText ?? [],

        banners: doneBanners,
      };

      navigate(`/product-details`, {
        state: { product: productForDetailsPage },
      });
    } catch (error: any) {
      console.error('UPLOAD / ANALYSIS ERROR:', error);

      let message = 'Unable to generate ad';

      if (error?.response?.data?.message) {
        message = error.response.data.message;
      } else if (error?.message) {
        message = error.message;
      }

      showMessage(message);
    } finally {
      setGenerating(false);
      isSubmittingRef.current = false;
    }
  };

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <IonPage>
      {/* ---------- HEADER ---------- */}
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ '--background': ui.white } as React.CSSProperties}>
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back"
            disabled={uploading}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 0,
              padding: 8,
              display: 'flex',
            }}
          >
            <IonIcon icon={arrowBack} style={{ fontSize: 22, color: ui.text }} />
          </button>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
            <Logo />
          </div>
        </IonToolbar>
      </IonHeader>

      {/* ---------- CONTENT ---------- */}
      <IonContent fullscreen style={{ '--background': ui.white } as React.CSSProperties}>
        {/* hidden inputs (shared by both screens) */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        {/* ================= SCREEN 1 — UPLOAD PRODUCT IMAGE ================= */}
        {step === 'upload' && (
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              margin: '0 auto',
              padding: '24px 20px 36px',
              boxSizing: 'border-box',
            }}
          >
            <p
              style={{
                margin: '0 0 8px',
                color: ui.primary,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
              }}
            >
              Step 1 of 2
            </p>
            <h1 style={{ fontSize: 26, lineHeight: 1.15, fontWeight: 800, color: ui.text, margin: '0 0 10px' }}>
              Upload Product Image
            </h1>
            <p style={{ margin: '0 0 24px', color: ui.muted, fontSize: 14, lineHeight: 1.5 }}>
              Add a clear product photo to start creating your ad.
            </p>

            <button
              type="button"
              onClick={handleTakePhoto}
              disabled={uploadingImage}
              style={{
                width: '100%',
                minHeight: 220,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                padding: '28px 20px',
                borderRadius: 18,
                border: `1px solid ${ui.border}`,
                background: `linear-gradient(145deg, ${ui.primarySoft} 0%, ${ui.surface} 72%)`,
                textAlign: 'center',
                boxShadow: '0 8px 24px rgba(15, 27, 45, 0.06)',
              }}
            >
              {uploadingImage ? (
                <>
                  <IonSpinner name="crescent" style={{ color: ui.primary }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: ui.text }}>
                    Uploading image...
                  </span>
                  <span style={{ fontSize: 13, color: ui.muted }}>Please wait a moment</span>
                </>
              ) : (
                <>
                  <span
                    style={{
                      width: 64,
                      height: 64,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: 18,
                      background: ui.primary,
                      color: ui.white,
                      boxShadow: '0 8px 18px rgba(15, 111, 236, 0.24)',
                    }}
                  >
                    <IonIcon icon={camera} style={{ fontSize: 30 }} />
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: ui.text }}>
                    Take a product photo
                  </span>
                  <span style={{ fontSize: 13, color: ui.muted, lineHeight: 1.4 }}>
                    Camera opens automatically on your phone
                  </span>
                </>
              )}
            </button>

            <IonButton
              expand="block"
              fill="outline"
              onClick={() => galleryInputRef.current?.click()}
              disabled={uploadingImage}
              style={
                {
                  marginTop: 14,
                  '--border-color': ui.border,
                  '--border-width': '1px',
                  '--color': ui.text,
                  '--border-radius': '12px',
                  height: 48,
                  fontWeight: 600,
                } as React.CSSProperties
              }
            >
              <IonIcon slot="start" icon={imagesOutline} style={{ color: ui.primary }} />
              Choose from gallery
            </IonButton>

            <p
              style={{
                margin: '18px 0 0',
                textAlign: 'center',
                color: ui.muted,
                fontSize: 12,
                lineHeight: 1.4,
              }}
            >
              JPG, PNG or WEBP · Maximum {MAX_FILE_SIZE / (1024 * 1024)}MB
            </p>
          </div>
        )}

        {/* ================= SCREEN 2 — GENERATE AD ================= */}
        {step === 'generate' && (
          <div style={{ padding: '20px 20px 32px' }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: ui.text, margin: '8px 0 20px' }}>
              Generate Ad
            </h1>

            {/* selected image (small) */}
            {previewUrl && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 10,
                  marginBottom: 22,
                  border: `1px solid ${ui.border}`,
                  borderRadius: 12,
                  background: ui.surface,
                }}
              >
                <img
                  src={previewUrl}
                  alt="Selected product"
                  style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      fontWeight: 600,
                      color: ui.text,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {selectedFile?.name}
                  </p>
                  <button
                    type="button"
                    onClick={resetToUpload}
                    disabled={uploading}
                    style={{
                      background: 'transparent',
                      border: 0,
                      padding: 0,
                      marginTop: 2,
                      fontSize: 12,
                      fontWeight: 600,
                      color: ui.primary,
                    }}
                  >
                    Change image
                  </button>
                </div>
              </div>
            )}

            {/* Aspect ratio */}
            <FieldLabel text="Select Aspect Ratio" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {ASPECT_OPTIONS.map((opt) => {
                const active = aspectRatio === opt.value;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAspectRatio(opt.value)}
                    aria-pressed={active}
                    style={{
                      height: 96,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      borderRadius: 12,
                      border: `${active ? 2 : 1}px solid ${active ? ui.primary : ui.border}`,
                      background: active ? ui.primarySoft : ui.white,
                    }}
                  >
                    <span
                      style={{
                        width: opt.w,
                        height: opt.h,
                        borderRadius: 3,
                        border: `1.5px solid ${active ? ui.primary : ui.muted}`,
                      }}
                    />
                    <span style={{ lineHeight: 1.25 }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 12,
                          fontWeight: 700,
                          color: active ? ui.primary : ui.text,
                        }}
                      >
                        {opt.ratio}
                      </span>
                      <span style={{ display: 'block', fontSize: 11, color: ui.muted }}>
                        {opt.label}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Category (from Business Setup, read only) */}
            {businessCategory?.categoryName && (
              <div style={{ marginTop: 24 }}>
                <FieldLabel text="Category" />
                <div
                  style={{
                    height: 48,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 14px',
                    borderRadius: 12,
                    border: `1px solid ${ui.border}`,
                    background: ui.surface,
                    fontSize: 14,
                    color: ui.text,
                  }}
                >
                  {businessCategory.categoryName}
                </div>
              </div>
            )}

            {/* Subcategory — only when this category has some */}
            {businessCategoryId && (loadingSubcategories || subcategories.length > 0) && (
              <div style={{ marginTop: 16 }}>
                <FieldLabel text="Subcategory (optional)" />
                <SelectField
                  value={subcategoryId}
                  options={subcategories}
                  placeholder="Select a subcategory"
                  loading={loadingSubcategories}
                  onChange={setSubcategoryId}
                />
              </div>
            )}

            {/* Child category — only when this subcategory has some */}
            {subcategoryId && (loadingChildCategories || childCategories.length > 0) && (
              <div style={{ marginTop: 16 }}>
                <FieldLabel text="Child category (optional)" />
                <SelectField
                  value={childCategoryId}
                  options={childCategories}
                  placeholder="Select a child category"
                  loading={loadingChildCategories}
                  onChange={setChildCategoryId}
                />
              </div>
            )}

            {/* Description */}
            <div style={{ marginTop: 24 }}>
              <FieldLabel text="Product Description" />
              <textarea
                value={promptDescription}
                onChange={(e) => setPromptDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
                placeholder="Enter product details..."
                rows={4}
                maxLength={MAX_DESCRIPTION}
                style={{
                  display: 'block',
                  width: '100%',
                  resize: 'none',
                  borderRadius: 12,
                  border: `1px solid ${ui.border}`,
                  background: ui.white,
                  padding: '12px 14px',
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: ui.text,
                  outline: 'none',
                }}
              />
              <p style={{ margin: '6px 2px 0', textAlign: 'right', fontSize: 12, color: ui.muted }}>
                {promptDescription.length}/{MAX_DESCRIPTION}
              </p>
            </div>

            {/* Generate */}
            <IonButton
              expand="block"
              onClick={handleGenerate}
              disabled={generating}
              style={
                {
                  marginTop: 20,
                  '--background': ui.primary,
                  '--background-activated': ui.primary,
                  '--border-radius': '10px',
                  '--box-shadow': 'none',
                  height: 50,
                  fontWeight: 600,
                } as React.CSSProperties
              }
            >
              {generating ? (
                <>
                  <IonSpinner slot="start" name="crescent" />
                  Generating...
                </>
              ) : (
                <>
                  <IonIcon slot="start" icon={sparklesOutline} />
                  Generate Ad
                </>
              )}
            </IonButton>
          </div>
        )}

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

export default Upload;