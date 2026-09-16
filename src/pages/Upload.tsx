/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useEffect,
  useRef,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonTitle,
  IonIcon,
  IonButton,
  IonBackButton,
  IonButtons,
  IonToast,
  IonSpinner,
} from '@ionic/react';

import {
  cameraOutline,
  imagesOutline,
  closeCircle,
  sparklesOutline,
  chatbubbleEllipsesOutline,
  informationCircleOutline,
  checkmark,
  chevronDownOutline,
  shirtOutline,
  fastFoodOutline,
  phonePortraitOutline,
  laptopOutline,
  homeOutline,
  carOutline,
  bookOutline,
  cubeOutline,
  diamondOutline,
  walkOutline,
  watchOutline,
  glassesOutline,
  flowerOutline,
  gameControllerOutline,
  cutOutline,
  medkitOutline,
  pawOutline,
  bagHandleOutline,
  colorPaletteOutline,
  buildOutline,
  fitnessOutline,
  giftOutline,
  rocketOutline,
  pricetagOutline,
  appsOutline,
} from 'ionicons/icons';

import { apiGet, apiPost } from '../api';
import { useAuth } from '../context/AuthContext';

// ==================================================
// BRAND
// ==================================================

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

const AVATAR_TINTS = [
  { bg: '#EAF4FF', fg: '#1E7FE0' },
  { bg: '#EAFBF8', fg: '#12A19C' },
  { bg: '#FFF4E6', fg: '#C2740D' },
  { bg: '#FDEBEE', fg: '#D64545' },
  { bg: '#F2EAFB', fg: '#7C3AED' },
  { bg: '#EAF7EE', fg: '#3D9A50' },
];

const tintFor = (id: number) => AVATAR_TINTS[Math.abs(id) % AVATAR_TINTS.length];

interface Category {
  id: number;
  name: string;
  icon?: string | null;
}

interface Subcategory {
  id: number;
  name: string;
}

interface ChildCategory {
  id: number;
  name: string;
}

const PROMPT_TYPES: { label: string; value: string }[] = [
  { label: 'Festive / Sale', value: 'festive_sale' },
  { label: 'Product Launch', value: 'product_launch' },
  { label: 'Discount / Offer', value: 'discount_offer' },
  { label: 'Minimal / Clean', value: 'minimal_clean' },
  { label: 'Premium / Luxury', value: 'premium_luxury' },
  { label: 'Custom', value: 'custom' },
];

const unwrapList = <T,>(res: any, key: string): T[] => {
  return res?.data?.[key] ?? res?.[key] ?? [];
};

// ==================================================
// ICON MATCHING
// ==================================================

const NAME_ICON_MAP: { keywords: string[]; icon: string }[] = [
  { keywords: ['cloth', 'fashion', 'apparel', 'wear', 'garment', 'dress', 'saree', 'kurta'], icon: shirtOutline },
  { keywords: ['food', 'grocery', 'snack', 'beverage', 'restaurant', 'sweet', 'bakery'], icon: fastFoodOutline },
  { keywords: ['mobile', 'phone', 'electronic', 'gadget', 'tech', 'camera'], icon: phonePortraitOutline },
  { keywords: ['laptop', 'computer'], icon: laptopOutline },
  { keywords: ['home', 'furniture', 'decor', 'kitchen', 'appliance'], icon: homeOutline },
  { keywords: ['car', 'auto', 'vehicle', 'bike', 'scooter'], icon: carOutline },
  { keywords: ['book', 'stationery', 'education'], icon: bookOutline },
  { keywords: ['jewel', 'diamond', 'gold', 'silver', 'luxury'], icon: diamondOutline },
  { keywords: ['shoe', 'footwear', 'sandal', 'sneaker', 'slipper'], icon: walkOutline },
  { keywords: ['watch', 'accessor'], icon: watchOutline },
  { keywords: ['glass', 'eyewear', 'sunglass'], icon: glassesOutline },
  { keywords: ['flower', 'plant', 'garden'], icon: flowerOutline },
  { keywords: ['game', 'toy', 'kids', 'baby'], icon: gameControllerOutline },
  { keywords: ['beauty', 'cosmetic', 'salon', 'hair', 'makeup'], icon: cutOutline },
  { keywords: ['health', 'medic', 'pharma', 'wellness', 'fitness supplement'], icon: medkitOutline },
  { keywords: ['pet', 'animal'], icon: pawOutline },
  { keywords: ['bag', 'handbag', 'luggage', 'wallet'], icon: bagHandleOutline },
  { keywords: ['art', 'craft', 'paint', 'handmade'], icon: colorPaletteOutline },
  { keywords: ['tool', 'hardware', 'machine'], icon: buildOutline },
  { keywords: ['sport', 'gym', 'fitness'], icon: fitnessOutline },
  { keywords: ['gift'], icon: giftOutline },
];

const getIconForName = (name: string): string => {
  const lower = name.toLowerCase();
  const match = NAME_ICON_MAP.find((entry) => entry.keywords.some((k) => lower.includes(k)));
  return match ? match.icon : cubeOutline;
};

const PROMPT_TYPE_ICON: Record<string, string> = {
  festive_sale: giftOutline,
  product_launch: rocketOutline,
  discount_offer: pricetagOutline,
  minimal_clean: appsOutline,
  premium_luxury: diamondOutline,
  custom: colorPaletteOutline,
};

const renderItemIcon = (name: string, imageIcon?: string | null, color?: string) => {
  const isImageIcon = Boolean(imageIcon && /^https?:\/\//.test(imageIcon));

  if (isImageIcon) {
    return <img src={imageIcon as string} alt="" className="h-4 w-4 object-contain" />;
  }

  return <IonIcon icon={getIconForName(name)} style={{ fontSize: 16, color: color || brand.blue }} />;
};

// ==================================================
// SECTION LABEL
// ==================================================

const SectionLabel: React.FC<{ text: string; hint?: string }> = ({ text, hint }) => (
  <div className="mb-3">
    <p style={{ fontSize: 14, fontWeight: 600, color: brand.navy }}>{text}</p>
    {hint && (
      <p
        className="mt-1 flex items-center gap-1"
        style={{ fontSize: 12, color: brand.ink }}
      >
        <IonIcon icon={informationCircleOutline} style={{ fontSize: 14 }} />
        {hint}
      </p>
    )}
  </div>
);

// ==================================================
// DROPDOWN SELECT
// ==================================================

interface DropdownOption {
  id: number | string;
  name: string;
  icon: React.ReactNode;
}

interface DropdownSelectProps {
  items: DropdownOption[];
  selectedId: number | string | null;
  loading?: boolean;
  placeholder?: string;
  emptyLabel?: string;
  onSelect: (id: number | string) => void;
}

const DropdownSelect: React.FC<DropdownSelectProps> = ({
  items,
  selectedId,
  loading,
  placeholder,
  emptyLabel,
  onSelect,
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="h-12 w-full animate-pulse rounded-xl" style={{ background: brand.border }} />
    );
  }

  const selected = items.find((i) => i.id === selectedId);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5"
        style={{ border: `1px solid ${brand.border}`, background: '#FFFFFF' }}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {selected ? (
            <>
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ background: tintFor(typeof selected.id === 'number' ? selected.id : selected.id.length).bg }}
              >
                {selected.icon}
              </span>
              <span
                className="truncate"
                style={{ fontSize: 14, fontWeight: 600, color: brand.navy }}
              >
                {selected.name}
              </span>
            </>
          ) : (
            <span style={{ fontSize: 13.5, color: brand.ink }}>
              {placeholder || 'Select an option'}
            </span>
          )}
        </span>
        <IonIcon
          icon={chevronDownOutline}
          style={{
            fontSize: 16,
            color: brand.ink,
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 z-20 mt-1.5 max-h-60 overflow-y-auto rounded-xl"
          style={{
            border: `1px solid ${brand.border}`,
            background: '#FFFFFF',
            boxShadow: '0 10px 28px rgba(15,42,74,0.14)',
          }}
        >
          {items.length === 0 ? (
            <div className="px-3.5 py-3" style={{ fontSize: 12.5, color: brand.ink }}>
              {emptyLabel || 'No options available'}
            </div>
          ) : (
            items.map((item) => {
              const isSelected = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect(item.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors active:opacity-80"
                  style={{ background: isSelected ? brand.pageBgFrom : 'transparent' }}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{ background: tintFor(typeof item.id === 'number' ? item.id : item.id.length).bg }}
                  >
                    {item.icon}
                  </span>
                  <span
                    className="flex-1 truncate"
                    style={{ fontSize: 13.5, fontWeight: isSelected ? 600 : 500, color: brand.navy }}
                  >
                    {item.name}
                  </span>
                  {isSelected && (
                    <IonIcon icon={checkmark} style={{ fontSize: 15, color: brand.blue, flexShrink: 0 }} />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

// ==================================================
// STEP PROGRESS
// ==================================================

const STEPS = ['Photo', 'Category', 'Style'];

const StepProgress: React.FC<{ current: number }> = ({ current }) => (
  <div className="flex items-center gap-2 px-4 pb-4 pt-1">
    {STEPS.map((label, i) => (
      <div key={label} className="flex flex-1 items-center gap-2">
        <div
          className="h-1 flex-1 rounded-full transition-colors"
          style={{ background: i <= current ? '#FFFFFF' : 'rgba(255,255,255,0.35)' }}
        />
        {i < STEPS.length - 1 && null}
      </div>
    ))}
  </div>
);

// ==================================================
// AI ANALYZE RESPONSE TYPES — mirrors /api/products/analyze
// ==================================================

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

const Upload: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [childCategories, setChildCategories] = useState<ChildCategory[]>([]);

  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [childCategoryId, setChildCategoryId] = useState<number | null>(null);

  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [loadingChildCategories, setLoadingChildCategories] = useState(false);

  const [subcategoriesFetched, setSubcategoriesFetched] = useState(false);
  const [childCategoriesFetched, setChildCategoriesFetched] = useState(false);

  const [promptType, setPromptType] = useState<string | null>(null);
  const [promptDescription, setPromptDescription] = useState('');
  const [bannerColor, setBannerColor] = useState('#4F46E5');

  const [uploading, setUploading] = useState(false);
  const isSubmittingRef = useRef(false);

  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /*
  |--------------------------------------------------------------------------
  | Cleanup object URL on unmount
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
  | Load categories once an image is selected
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!selectedFile || categories.length > 0) {
      return;
    }

    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const res = await apiGet('/categories');

        setCategories(unwrapList<Category>(res, 'categories'));
      } catch (error) {
        console.error('LOAD CATEGORIES ERROR:', error);
        showMessage('Unable to load categories');
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, [categories.length, selectedFile]);

  /*
  |--------------------------------------------------------------------------
  | Load subcategories whenever category changes
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!categoryId) {
      setSubcategories([]);
      setSubcategoryId(null);
      setChildCategories([]);
      setChildCategoryId(null);
      setSubcategoriesFetched(false);
      return;
    }

    const loadSubcategories = async () => {
      try {
        setLoadingSubcategories(true);
        setSubcategoryId(null);
        setChildCategories([]);
        setChildCategoryId(null);
        setSubcategoriesFetched(false);

        const res = await apiGet(`/categories/${categoryId}/subcategories`);

        setSubcategories(unwrapList<Subcategory>(res, 'subcategories'));
      } catch (error) {
        console.error('LOAD SUBCATEGORIES ERROR:', error);
        showMessage('Unable to load subcategories');
      } finally {
        setLoadingSubcategories(false);
        setSubcategoriesFetched(true);
      }
    };

    loadSubcategories();
  }, [categoryId]);

  /*
  |--------------------------------------------------------------------------
  | Load child categories whenever subcategory changes
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!subcategoryId) {
      setChildCategories([]);
      setChildCategoryId(null);
      setChildCategoriesFetched(false);
      return;
    }

    const loadChildCategories = async () => {
      try {
        setLoadingChildCategories(true);
        setChildCategoryId(null);
        setChildCategoriesFetched(false);

        const res = await apiGet(`/subcategories/${subcategoryId}/childcategories`);

        setChildCategories(unwrapList<ChildCategory>(res, 'childCategories'));
      } catch (error) {
        console.error('LOAD CHILD CATEGORIES ERROR:', error);
        showMessage('Unable to load child categories');
      } finally {
        setLoadingChildCategories(false);
        setChildCategoriesFetched(true);
      }
    };

    loadChildCategories();
  }, [subcategoryId]);

  /*
  |--------------------------------------------------------------------------
  | Show Toast
  |--------------------------------------------------------------------------
  */

  const showMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
  };

  /*
  |--------------------------------------------------------------------------
  | Select File
  |--------------------------------------------------------------------------
  */

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      showMessage('Please select JPG, PNG or WEBP image');
      e.target.value = '';
      return;
    }

    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      showMessage('Image size must be less than 10MB');
      e.target.value = '';
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  /*
  |--------------------------------------------------------------------------
  | Clear
  |--------------------------------------------------------------------------
  */

  const handleClear = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);
    setCategoryId(null);
    setSubcategoryId(null);
    setSubcategories([]);
    setChildCategoryId(null);
    setChildCategories([]);
    setPromptType(null);
    setPromptDescription('');
    setBannerColor('#4F46E5');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Hex input change — always keeps a leading '#' and uppercases the value
  |--------------------------------------------------------------------------
  */

  const handleHexChange = (raw: string) => {
    let val = raw.trim();

    if (!val.startsWith('#')) {
      val = `#${val}`;
    }

    val = '#' + val.slice(1).replace(/[^0-9a-fA-F]/g, '');

    setBannerColor(val.slice(0, 7));
  };

  /*
  |--------------------------------------------------------------------------
  | Upload + Analyze (generates banners using category / subcategory /
  | prompt type / prompt description / banner color selected above)
  |--------------------------------------------------------------------------
  */

  const handleContinue = async () => {
    if (isSubmittingRef.current || uploading) {
      return;
    }

    if (!selectedFile) {
      showMessage('Please select a product image');
      return;
    }

    if (!categoryId) {
      showMessage('Please select a category');
      return;
    }

    if (!user?.id) {
      showMessage('Please log in again');
      return;
    }

    isSubmittingRef.current = true;

    try {
      setUploading(true);

      /*
      |--------------------------------------------------------------------------
      | STEP 1 — Upload image + selections
      |--------------------------------------------------------------------------
      */

      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('userId', String(user.id));
      formData.append('categoryId', String(categoryId));

      if (subcategoryId) {
        formData.append('subcategoryId', String(subcategoryId));
      }

      if (childCategoryId) {
        formData.append('childCategoryId', String(childCategoryId));
      }

      if (promptType) {
        formData.append('promptType', promptType);
      }

      formData.append('promptDescription', promptDescription.trim());
      formData.append('bannerColor', bannerColor);

      console.log('Uploading product...');

      const uploadResponse = await apiPost('/upload', formData);

      console.log('UPLOAD RESPONSE:', uploadResponse);

      if (!uploadResponse.success) {
        throw new Error(uploadResponse.message || 'Upload failed');
      }

      const productId = uploadResponse.productId;
      const uploadedImageUrl = uploadResponse.imageUrl || null;

      if (!productId) {
        throw new Error('Product ID was not returned');
      }

      console.log('PRODUCT ID:', productId);

      showMessage('Image uploaded. AI is generating your banners...');

      console.log('Starting AI analysis...');

      const analyzeResponse: AnalyzeResponse = await apiPost('/products/analyze', {
        productId,
      });

      console.log('ANALYZE RESPONSE:', analyzeResponse);

      if (!analyzeResponse?.success) {
        throw new Error(analyzeResponse?.message || 'Product analysis failed');
      }

      const aiProduct = analyzeResponse.product;

      if (!aiProduct) {
        throw new Error('Product analysis returned no data');
      }

      /*
      |--------------------------------------------------------------------------
      | Banners — only keep the ones that generated successfully
      |--------------------------------------------------------------------------
      */

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

      const failedBanners = rawBanners.filter((b) => b.status === 'failed');

      if (failedBanners.length > 0) {
        console.warn('SOME BANNERS FAILED:', failedBanners);
      }

      if (doneBanners.length > 0) {
        showMessage('Product analyzed — banners generated!');
      } else {
        showMessage('Product analyzed, but banner generation failed. Check console.');
      }

      /*
      |--------------------------------------------------------------------------
      | Build state for the product details page
      |--------------------------------------------------------------------------
      */

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

        confidence:
          typeof aiProduct.confidence === 'number' ? aiProduct.confidence : null,

        features: aiProduct.features ?? [],
        keywords: aiProduct.keywords ?? [],
        hashtags: aiProduct.hashtags ?? [],
        visibleText: aiProduct.visibleText ?? [],

        banners: doneBanners,
      };

      navigate(`/products/${productId}`, {
        state: { product: productForDetailsPage },
      });
    } catch (error: any) {
      console.error('UPLOAD / ANALYSIS ERROR:', error);

      let message = 'Unable to process product';

      if (error?.response?.data?.message) {
        message = error.response.data.message;
      } else if (error?.message) {
        message = error.message;
      }

      showMessage(message);
    } finally {
      setUploading(false);
      isSubmittingRef.current = false;
    }
  };

  const noSubcategories = subcategoriesFetched && !loadingSubcategories && subcategories.length === 0;
  const noChildCategories = childCategoriesFetched && !loadingChildCategories && childCategories.length === 0;

  const stepIndex = !previewUrl ? 0 : !categoryId ? 1 : 2;

  const categoryOptions: DropdownOption[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    icon: renderItemIcon(c.name, c.icon, tintFor(c.id).fg),
  }));

  const subcategoryOptions: DropdownOption[] = subcategories.map((s) => ({
    id: s.id,
    name: s.name,
    icon: renderItemIcon(s.name, null, tintFor(s.id).fg),
  }));

  const childCategoryOptions: DropdownOption[] = childCategories.map((c) => ({
    id: c.id,
    name: c.name,
    icon: renderItemIcon(c.name, null, tintFor(c.id).fg),
  }));

  const promptTypeOptions: DropdownOption[] = PROMPT_TYPES.map((p, i) => ({
    id: p.value,
    name: p.label,
    icon: (
      <IonIcon
        icon={PROMPT_TYPE_ICON[p.value] || pricetagOutline}
        style={{ fontSize: 16, color: tintFor(i).fg }}
      />
    ),
  }));

  return (
    <IonPage>
      {/* ================================================== HEADER ================================================== */}

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
              text=""
              style={{ '--color': '#FFFFFF' } as React.CSSProperties}
            />
          </IonButtons>
          <IonTitle style={{ fontWeight: 700 }}>Upload product</IonTitle>
        </IonToolbar>
        <div
          style={{
            background: `linear-gradient(90deg, ${brand.blue}, ${brand.teal})`,
          }}
        >
          <StepProgress current={stepIndex} />
        </div>
      </IonHeader>

      {/* ================================================== CONTENT ================================================== */}

      <IonContent
        fullscreen
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
        <div style={{ padding: '20px 16px 12px' }}>
          <p style={{ fontSize: 13, color: brand.ink, lineHeight: 1.5, marginBottom: 18 }}>
            Take a clear photo of your product, choose a category, and set a
            banner style — then we'll generate professional ad banners for
            you.
          </p>

          {/* ================================================== STEP 1 — PHOTO ================================================== */}

          <div
            style={{
              background: brand.cardBg,
              borderRadius: 20,
              padding: 18,
              border: `1px solid ${brand.border}`,
              boxShadow: '0 10px 28px rgba(15,42,74,0.06)',
              marginBottom: 16,
            }}
          >
            {!previewUrl ? (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center rounded-xl px-5 py-9 text-center transition-colors active:opacity-80"
                  style={{
                    border: `2px dashed ${brand.teal}`,
                    background: brand.pageBgFrom,
                  }}
                >
                  <div
                    className="mb-3 flex h-14 w-14 items-center justify-center rounded-full"
                    style={{
                      background: `linear-gradient(135deg, ${brand.blue}, ${brand.teal})`,
                    }}
                  >
                    <IonIcon icon={cameraOutline} style={{ fontSize: 24, color: '#FFFFFF' }} />
                  </div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: brand.navy, margin: 0 }}>
                    Tap to select an image
                  </h4>
                  <p style={{ fontSize: 12, color: brand.ink, marginTop: 6, maxWidth: 260 }}>
                    Take a photo or choose one from your gallery — JPG, PNG or
                    WEBP, up to 10MB.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </button>

                <IonButton
                  expand="block"
                  fill="outline"
                  style={
                    {
                      '--border-color': brand.border,
                      '--color': brand.navy,
                      '--border-radius': '12px',
                      marginTop: 12,
                    } as React.CSSProperties
                  }
                  onClick={() => fileInputRef.current?.click()}
                >
                  <IonIcon slot="start" icon={imagesOutline} />
                  Choose from gallery
                </IonButton>
              </>
            ) : (
              <div className="relative overflow-hidden rounded-2xl" style={{ border: `1px solid ${brand.border}` }}>
                <img
                  src={previewUrl}
                  alt="Product preview"
                  className="w-full object-cover"
                  style={{ maxHeight: 280 }}
                />
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={uploading}
                  className="absolute right-2 top-2 rounded-full p-1 backdrop-blur-sm"
                  style={{ background: 'rgba(15,42,74,0.55)' }}
                >
                  <IonIcon icon={closeCircle} style={{ fontSize: 20, color: '#FFFFFF' }} />
                </button>
              </div>
            )}
          </div>

          {/* ================================================== STEP 2 — CATEGORY ================================================== */}

          {previewUrl && (
            <div
              style={{
                background: brand.cardBg,
                borderRadius: 20,
                padding: 18,
                border: `1px solid ${brand.border}`,
                boxShadow: '0 10px 28px rgba(15,42,74,0.06)',
                marginBottom: 16,
              }}
            >
              <SectionLabel text="Category" />
              <DropdownSelect
                items={categoryOptions}
                selectedId={categoryId}
                loading={loadingCategories}
                placeholder="Select a category"
                onSelect={(id) => setCategoryId(Number(id))}
              />

              {categoryId && (
                <div className="mt-5">
                  <SectionLabel text="Subcategory (optional)" />
                  <DropdownSelect
                    items={subcategoryOptions}
                    selectedId={subcategoryId}
                    loading={loadingSubcategories}
                    placeholder="Select a subcategory"
                    emptyLabel={
                      noSubcategories
                        ? 'No subcategories for this category yet — you can continue without one.'
                        : 'No options available'
                    }
                    onSelect={(id) => setSubcategoryId(Number(id))}
                  />
                </div>
              )}

              {subcategoryId && (
                <div className="mt-5">
                  <SectionLabel text="Child category (optional)" />
                  <DropdownSelect
                    items={childCategoryOptions}
                    selectedId={childCategoryId}
                    loading={loadingChildCategories}
                    placeholder="Select a child category"
                    emptyLabel={
                      noChildCategories
                        ? 'No child categories for this subcategory yet — you can continue without one.'
                        : 'No options available'
                    }
                    onSelect={(id) => setChildCategoryId(Number(id))}
                  />
                </div>
              )}
            </div>
          )}

          {/* ================================================== STEP 3 — BANNER STYLE ================================================== */}

          {previewUrl && (
            <div
              style={{
                background: brand.cardBg,
                borderRadius: 20,
                padding: 18,
                border: `1px solid ${brand.border}`,
                boxShadow: '0 10px 28px rgba(15,42,74,0.06)',
                marginBottom: 16,
              }}
            >
              {/* Banner Color */}
              <div className="mb-5">
                <SectionLabel text="Banner color" />

                <div
                  className="flex items-center gap-3 rounded-xl p-3"
                  style={{ border: `1px solid ${brand.border}` }}
                >
                  <label
                    htmlFor="bannerColorPicker"
                    className="relative flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full"
                    style={{ backgroundColor: bannerColor, boxShadow: `0 0 0 1px ${brand.border}` }}
                  >
                    <input
                      id="bannerColorPicker"
                      type="color"
                      value={bannerColor}
                      onChange={(e) => setBannerColor(e.target.value)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </label>
                  <div className="flex-1">
                    <p style={{ fontSize: 11, fontWeight: 500, color: brand.ink, marginBottom: 4 }}>
                      Hex code
                    </p>
                    <input
                      type="text"
                      value={bannerColor}
                      onChange={(e) => handleHexChange(e.target.value)}
                      placeholder="#4F46E5"
                      maxLength={7}
                      className="w-full rounded-lg px-2.5 py-1.5 outline-none"
                      style={{
                        border: `1px solid ${brand.border}`,
                        fontSize: 13,
                        fontWeight: 500,
                        color: brand.navy,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Prompt Type */}
              <div className="mb-5">
                <SectionLabel text="Prompt type" />
                <DropdownSelect
                  items={promptTypeOptions}
                  selectedId={promptType}
                  placeholder="Select a prompt type"
                  onSelect={(id) => setPromptType(String(id))}
                />
              </div>

              {/* Prompt Description */}
              <div>
                <div className="mb-2 flex items-center gap-1.5">
                  <IonIcon icon={chatbubbleEllipsesOutline} style={{ color: brand.ink, fontSize: 15 }} />
                  <label style={{ fontSize: 11, fontWeight: 500, color: brand.ink }}>
                    Prompt description <span style={{ color: '#A9B6C2' }}>(optional)</span>
                  </label>
                </div>
                <div
                  className="rounded-xl p-3"
                  style={{ border: `1px solid ${brand.border}` }}
                >
                  <textarea
                    value={promptDescription}
                    onChange={(e) => setPromptDescription(e.target.value)}
                    placeholder="e.g. Diwali sale banner with festive lights and gold accents"
                    rows={3}
                    className="block w-full resize-none border-0 bg-transparent p-0 outline-none"
                    style={{ fontSize: 14, lineHeight: 1.5, color: brand.navy }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================================================== STICKY CTA ================================================== */}

        {previewUrl && (
          <div
            className="shrink-0 px-4 py-3"
            style={{
              borderTop: `1px solid ${brand.border}`,
              background: '#FFFFFF',
              paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
            }}
          >
            <IonButton
              expand="block"
              onClick={handleContinue}
              disabled={uploading}
              style={
                {
                  '--background': `linear-gradient(90deg, ${brand.blue}, ${brand.teal})`,
                  '--background-activated': `linear-gradient(90deg, ${brand.blue}, ${brand.teal})`,
                  '--border-radius': '12px',
                  '--box-shadow': 'none',
                  fontWeight: 600,
                } as React.CSSProperties
              }
            >
              {uploading ? (
                <>
                  <IonSpinner slot="start" name="crescent" />
                  Generating banners...
                </>
              ) : (
                <>
                  <IonIcon slot="start" icon={sparklesOutline} />
                  Generate banners
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