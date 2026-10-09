/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonPage,
  IonSpinner,
  IonSelect,
  IonSelectOption,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

import {
  arrowBack,
  camera,
  chevronDownOutline,
  closeOutline,
  imagesOutline,
  logoFacebook,
  logoInstagram,
  logoLinkedin,
  logoWhatsapp,
  logoYoutube,
  logoGoogle,
  personOutline,
  businessOutline,
  sparklesOutline,
} from 'ionicons/icons';

import { ApiError, apiGet, apiPost, serverApiGet, serverApiPost } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSocialConnections } from '../hooks/useSocialConnections';
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
const MAX_IMAGE_SIZE = 1024 * 1024;
const MIN_VIDEO_SIZE = 100 * 1024;
const MAX_VIDEO_SIZE = 10 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1600;
const MEDIA_STORAGE_PREFIX = 'upload_media_v1';
const VIDEO_DB_NAME = 'aarnexai-upload-media';
const VIDEO_STORE_NAME = 'videos';

type PublishPlatform =
  | 'instagram'
  | 'facebook'
  | 'whatsapp'
  | 'google_business'
  | 'youtube'
  | 'linkedin';

interface LocalMedia {
  id: string;
  bannerId?: string | number;
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  createdAt: string;
}

const PUBLISH_PLATFORMS: { id: PublishPlatform; name: string; icon: string }[] = [
  { id: 'instagram', name: 'Instagram', icon: logoInstagram },
  { id: 'facebook', name: 'Facebook', icon: logoFacebook },
  { id: 'whatsapp', name: 'WhatsApp Business', icon: logoWhatsapp },
  { id: 'google_business', name: 'Google Business Profile', icon: logoGoogle },
  { id: 'youtube', name: 'YouTube', icon: logoYoutube },
  { id: 'linkedin', name: 'LinkedIn', icon: logoLinkedin },
];

const platformLabel = (id: string) => PUBLISH_PLATFORMS.find((p) => p.id === id)?.name ?? id;

const mediaStorageKey = (userId: number | string) => `${MEDIA_STORAGE_PREFIX}_${userId}`;

const openVideoDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('This browser does not support large local video storage.'));
      return;
    }

    const request = indexedDB.open(VIDEO_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(VIDEO_STORE_NAME)) {
        request.result.createObjectStore(VIDEO_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local video storage.'));
  });

const saveVideoLocally = async (key: string, file: File): Promise<void> => {
  const database = await openVideoDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(VIDEO_STORE_NAME, 'readwrite');
    transaction.objectStore(VIDEO_STORE_NAME).put(file, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save video.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Video storage was interrupted.'));
  }).finally(() => database.close());
};

const loadVideoLocally = async (key: string): Promise<Blob | null> => {
  const database = await openVideoDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(VIDEO_STORE_NAME, 'readonly');
    const request = transaction.objectStore(VIDEO_STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
    request.onerror = () => reject(request.error ?? new Error('Could not read saved video.'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => database.close();
  });
};

const removeVideoLocally = async (key: string): Promise<void> => {
  const database = await openVideoDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(VIDEO_STORE_NAME, 'readwrite');
    transaction.objectStore(VIDEO_STORE_NAME).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not remove saved video.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Video removal was interrupted.'));
  }).finally(() => database.close());
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('The selected file could not be read.'));
    reader.onerror = () => reject(new Error('The selected file could not be read.'));
    reader.readAsDataURL(file);
  });

/**
 * Phone camera photos are usually 2-6 MB, far above the 1 MB limit.
 * Downscale / re-encode images until they fit. Videos cannot be compressed here.
 */
const compressImage = async (file: File): Promise<File> => {
  const bitmap = await createImageBitmap(file);
  let scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  let quality = 0.85;

  try {
    for (let attempt = 0; attempt < 6; attempt++) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        break;
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', quality),
      );

      if (blob && blob.size <= MAX_IMAGE_SIZE) {
        return new File([blob], `${file.name.replace(/\.\w+$/, '')}.jpg`, {
          type: 'image/jpeg',
        });
      }

      scale *= 0.8;
      quality = Math.max(0.5, quality - 0.1);
    }
  } finally {
    bitmap.close();
  }

  return file;
};

/** Finds a banner id in whatever shape /upload returns it. */
const extractBannerId = (res: any): string | number | null => {
  const candidates = [
    res?.bannerId,
    res?.banner_id,
    res?.banner?.id,
    res?.banner?.bannerId,
    res?.banner?.banner_id,
    res?.banners?.[0]?.id,
    res?.data?.bannerId,
    res?.data?.banner_id,
    res?.data?.banner?.id,
    res?.data?.banner?.bannerId,
    res?.data?.banner?.banner_id,
    res?.data?.banners?.[0]?.id,
    res?.result?.bannerId,
    res?.result?.banner_id,
    res?.result?.banner?.id,
  ];

  for (const value of candidates) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return null;
};

const extractMarketingPrompts = (response: unknown): string[] => {
  if (
    response &&
    typeof response === 'object' &&
    'success' in response &&
    (response as { success?: boolean }).success === false
  ) {
    const message = (response as { message?: unknown; error?: unknown }).message ??
      (response as { error?: unknown }).error;
    throw new Error(typeof message === 'string' ? message : 'Unable to load saved prompts.');
  }

  const promptKeys = [
    'prompt',
    'customPrompt',
    'custom_prompt',
    'caption',
    'description',
    'content',
    'topicTitle',
    'topic_title',
    'topic',
  ];
  const arrayKeys = [
    'customerMarketingDays',
    'customer_marketing_days',
    'customerMarketingPlans',
    'customer_marketing_plans',
    'items',
    'prompts',
    'days',
    'plans',
    'data',
    'result',
    'rows',
  ];
  const visited = new Set<object>();
  const prompts: string[] = [];

  const visit = (value: unknown, depth: number) => {
    if (!value || typeof value !== 'object' || depth > 8 || visited.has(value)) {
      return;
    }
    visited.add(value);

    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, depth + 1));
      return;
    }

    const record = value as Record<string, unknown>;
    for (const key of promptKeys) {
      const prompt = record[key];
      if (typeof prompt === 'string' && prompt.trim()) {
        prompts.push(prompt.trim());
        break;
      }
    }

    for (const key of arrayKeys) {
      if (record[key] && typeof record[key] === 'object') {
        visit(record[key], depth + 1);
      }
    }
  };

  visit(response, 0);
  return [...new Set(prompts)];
};

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

interface PublishResponse {
  success: boolean;
  message?: string;
  publishedPlatforms?: string[];
  failedPlatforms?: string[];
  results?: Record<string, { success?: boolean; message?: string }>;
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

const Uploadnew: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasSubscription } = useAuth();
  const {
    connected,
    checking: checkingConnections,
    refresh: refreshConnections,
    selectedLinkedinTargets,
    selectedFacebookTargets,
    selectedInstagramTargets,
    facebookTargets,
    instagramTargets,
    linkedinTargets,
    toggleLinkedInTarget,
    toggleFacebookTarget,
    toggleInstagramTarget,
  } = useSocialConnections();

  // step 'upload' = screen 1, step 'generate' = screen 2
  const [step, setStep] = useState<'upload' | 'generate'>('upload');

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaItems, setMediaItems] = useState<LocalMedia[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<LocalMedia | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<PublishPlatform[]>([]);
  const [postDescription, setPostDescription] = useState('');
  const [marketingPrompts, setMarketingPrompts] = useState<string[]>([]);
  const [loadingMarketingPrompts, setLoadingMarketingPrompts] = useState(false);
  const [marketingPromptsError, setMarketingPromptsError] = useState('');
  const [savingPosts, setSavingPosts] = useState(false);

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

  const [uploadingImage, setUploadingImage] = useState(false); // step 1: image upload
  const [generating, setGenerating] = useState(false); // step 2: analyze / generate ad
  const uploading = uploadingImage || generating;
  const [productId, setProductId] = useState<string | number | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null); // browser fallback for the camera
  const videoObjectUrlsRef = useRef(new Set<string>());

  const showMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
  };

  const missingDestinationPlatform = () => [
    { platform: 'facebook' as const, selected: selectedFacebookTargets },
    { platform: 'instagram' as const, selected: selectedInstagramTargets },
    { platform: 'linkedin' as const, selected: selectedLinkedinTargets },
  ].find(({ platform, selected }) =>
    selectedPlatforms.includes(platform) && selected.length === 0)?.platform ?? null;

  const currentUserId = user?.id;
  const videoStorageKey = (mediaId: string) => `${currentUserId}:${mediaId}`;

  const createVideoPreviewUrl = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    videoObjectUrlsRef.current.add(url);
    return url;
  };

  const revokeVideoPreviewUrl = (url: string) => {
    if (videoObjectUrlsRef.current.delete(url)) {
      URL.revokeObjectURL(url);
    }
  };

  // ---------- load saved media for this user ----------
  useEffect(() => {
    const userId = currentUserId;
    if (!userId) {
      setMediaItems([]);
      return;
    }

    let cancelled = false;
    const loadSavedMedia = async () => {
      try {
        const saved = localStorage.getItem(mediaStorageKey(userId));
        const parsed: unknown = saved ? JSON.parse(saved) : [];
        if (!Array.isArray(parsed)) {
          throw new Error('Saved media data has an invalid format.');
        }

        const records = parsed.filter(
          (item): item is LocalMedia =>
            item &&
            typeof item.id === 'string' &&
            typeof item.name === 'string' &&
            typeof item.mimeType === 'string' &&
            typeof item.size === 'number' &&
            (typeof item.dataUrl === 'string' || item.mimeType.startsWith('video/')) &&
            typeof item.createdAt === 'string',
        );
        const hydrated = await Promise.all(records.map(async (item) => {
          if (!item.mimeType.startsWith('video/')) return item;
          const blob = await loadVideoLocally(`${userId}:${item.id}`);
          return blob ? { ...item, dataUrl: createVideoPreviewUrl(blob) } : null;
        }));

        if (!cancelled) {
          setMediaItems(hydrated.filter((item): item is LocalMedia => item !== null));
        } else {
          hydrated.forEach((item) => {
            if (item?.mimeType.startsWith('video/')) revokeVideoPreviewUrl(item.dataUrl);
          });
        }
      } catch (error) {
        console.error('LOAD LOCAL MEDIA ERROR:', error);
        if (!cancelled) {
          showMessage('Unable to load saved media from this device');
          setMediaItems([]);
        }
      }
    };

    void loadSavedMedia();
    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  useEffect(() => () => {
    videoObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    videoObjectUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // ---------- business category ----------
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

  const businessCategoryId = businessCategory?.categoryId ?? null;

  // ---------- subcategories ----------
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
        const res = await serverApiGet(`/categories/${businessCategoryId}/subcategories`);

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

  // ---------- child categories ----------
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
        const res = await serverApiGet(`/subcategories/${subcategoryId}/childcategories`);

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

  // ==================================================
  // LOCAL MEDIA
  // ==================================================

  const readStoredMedia = (): LocalMedia[] => {
    if (!user?.id) {
      return [];
    }

    try {
      const stored = localStorage.getItem(mediaStorageKey(user.id));
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed)
        ? parsed.map((item) => {
            if (!item?.mimeType?.startsWith('video/')) return item;
            return {
              ...item,
              dataUrl: mediaItems.find((media) => media.id === item.id)?.dataUrl ?? '',
            };
          })
        : [];
    } catch {
      return [];
    }
  };

  const persistMedia = (items: LocalMedia[]): boolean => {
    if (!user?.id) {
      return false;
    }

    try {
      const persistedItems = items.map((item) => (
        item.mimeType.startsWith('video/') ? { ...item, dataUrl: '' } : item
      ));
      localStorage.setItem(mediaStorageKey(user.id), JSON.stringify(persistedItems));
      return true;
    } catch (error) {
      console.error('SAVE LOCAL MEDIA ERROR:', error);
      return false;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    // allow picking the same file again later
    e.target.value = '';

    if (!file) {
      return;
    }

    void processSelectedFile(file);
  };

  const processSelectedFile = async (original: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];

    if (!allowedTypes.includes(original.type)) {
      showMessage('Please select a JPG, PNG, WEBP, MP4 or WEBM file');
      return;
    }

    if (!user?.id) {
      showMessage('Please log in again before saving media');
      return;
    }

    try {
      let file = original;
      const isVideo = file.type.startsWith('video/');

      if (isVideo && file.size < MIN_VIDEO_SIZE) {
        showMessage('Videos must be at least 100 KB and no larger than 10 MB.');
        return;
      }

      if (isVideo && file.size > MAX_VIDEO_SIZE) {
        showMessage('Videos must be no larger than 10 MB.');
        return;
      }

      if (file.size > MAX_IMAGE_SIZE && file.type.startsWith('image/')) {
        file = await compressImage(file);
      }

      if (file.type.startsWith('image/') && file.size > MAX_IMAGE_SIZE) {
        showMessage('Images must be 1 MB or smaller after compression.');
        return;
      }

      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const previewUrl = isVideo ? createVideoPreviewUrl(file) : await readFileAsDataUrl(file);

      const item: LocalMedia = {
        id,
        name: file.name,
        mimeType: file.type,
        size: file.size,
        dataUrl: previewUrl,
        createdAt: new Date().toISOString(),
      };

      if (isVideo) {
        await saveVideoLocally(videoStorageKey(id), file);
      }

      // Read the latest stored list so two quick uploads never overwrite each other
      const nextItems = [item, ...readStoredMedia()];

      if (!persistMedia(nextItems)) {
        if (isVideo) {
          await removeVideoLocally(videoStorageKey(id));
          revokeVideoPreviewUrl(previewUrl);
        }
        showMessage('Device storage is full. Remove some media before uploading more.');
        return;
      }

      setMediaItems(nextItems);
      showMessage('Media saved on this device. Tap its preview to choose channels.');
    } catch (error) {
      console.error('SAVE UPLOADED MEDIA ERROR:', error);
      showMessage('Unable to save media. Device storage may be full.');
    }
  };

  const removeLocalMedia = (mediaId: string) => {
    const next = readStoredMedia().filter((item) => item.id !== mediaId);

    persistMedia(next);
    setMediaItems(next);

    const removed = mediaItems.find((item) => item.id === mediaId);
    if (removed?.mimeType.startsWith('video/')) {
      revokeVideoPreviewUrl(removed.dataUrl);
      void removeVideoLocally(videoStorageKey(mediaId)).catch((error) => {
        console.error('REMOVE LOCAL VIDEO ERROR:', error);
        showMessage('Video removed from the list, but could not be deleted from device storage.');
      });
    }

    if (selectedMedia?.id === mediaId) {
      setSelectedMedia(null);
    }
  };

  // ==================================================
  // SOCIAL POSTING
  // ==================================================

  const openMediaShare = (media: LocalMedia) => {
    setSelectedMedia(media);
    setSelectedPlatforms([]);
    setPostDescription('');
    setMarketingPrompts([]);
    setMarketingPromptsError('');
    void refreshConnections();
  };

  const selectedMediaId = selectedMedia?.id;

  useEffect(() => {
    if (!selectedMediaId) {
      setLoadingMarketingPrompts(false);
      return;
    }

    let cancelled = false;
    setLoadingMarketingPrompts(true);
    setMarketingPromptsError('');

    apiGet('/prompt-plan')
      .then((response) => {
        if (!cancelled) {
          setMarketingPrompts(extractMarketingPrompts(response));
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          console.error('LOAD MARKETING PROMPTS ERROR:', error);
          setMarketingPromptsError(
            error instanceof Error ? error.message : 'Unable to load saved prompts.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingMarketingPrompts(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMediaId]);

  const togglePublishPlatform = (platform: PublishPlatform) => {
    if (!connected[platform] || checkingConnections) return;
    if (
      selectedMedia?.mimeType.startsWith('video/') &&
      (platform === 'whatsapp' || platform === 'google_business' || selectedMedia.mimeType !== 'video/mp4')
    ) {
      return;
    }

    setSelectedPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform],
    );
  };

  /**
   * POST /banners/publish needs a bannerId from the database.
   * Local media has none, so upload the image once via /upload to create the
   * server-side record, then cache the returned id on the local item.
   */
  const ensureBannerId = async (media: LocalMedia): Promise<string | number> => {
    if (media.bannerId) {
      return media.bannerId;
    }

    if (!user?.id) {
      throw new Error('Please log in again');
    }

    const blob = await (await fetch(media.dataUrl)).blob();
    const file = new File([blob], media.name, { type: media.mimeType });

    const formData = new FormData();
    formData.append('image', file);
    formData.append('userId', String(user.id));
    formData.append('createBanner', 'true'); // asks /upload to also create the banners row

    const res = await serverApiPost('/upload', formData);

    console.log('UPLOAD RESPONSE FOR BANNER:', JSON.stringify(res));

    if (!res?.success) {
      throw new Error(res?.message || 'Image upload failed');
    }

    const bannerId = extractBannerId(res);

    if (!bannerId) {
      throw new Error(
        'The server did not return a bannerId for this image. /upload must create a banners row and return its id.',
      );
    }

    // remember it so the image is not uploaded again next time
    const next = readStoredMedia().map((m) => (m.id === media.id ? { ...m, bannerId } : m));
    persistMedia(next);
    setMediaItems(next);
    setSelectedMedia((current) => (current?.id === media.id ? { ...current, bannerId } : current));

    return bannerId;
  };

  const savePostsToPlatforms = async () => {
    if (!selectedMedia || savingPosts) {
      return;
    }

    if (selectedPlatforms.length === 0) {
      showMessage('Select at least one social media channel');
      return;
    }

    if (!hasSubscription) {
      navigate('/subscription');
      return;
    }

    const missingDestination = missingDestinationPlatform();
    if (missingDestination) {
      showMessage(`Select at least one ${platformLabel(missingDestination)} destination.`);
      return;
    }

    try {
      setSavingPosts(true);

      if (selectedMedia.mimeType.startsWith('video/')) {
        if (selectedMedia.mimeType !== 'video/mp4') {
          throw new Error('Social video publishing currently requires an MP4 file.');
        }

        const videoResponse = await fetch(selectedMedia.dataUrl);
        if (!videoResponse.ok) throw new Error('Could not read the selected video from this device.');
        const videoBlob = await videoResponse.blob();
        const videoFile = new File([videoBlob], selectedMedia.name, { type: 'video/mp4' });
        const formData = new FormData();
        formData.append('video', videoFile);
        formData.append('platforms', JSON.stringify(selectedPlatforms));
        formData.append('caption', postDescription.trim());
        if (selectedPlatforms.includes('facebook') && selectedFacebookTargets.length) {
          formData.append('facebookPageIds', JSON.stringify(selectedFacebookTargets));
        }
        if (selectedPlatforms.includes('instagram') && selectedInstagramTargets.length) {
          formData.append('instagramAccountIds', JSON.stringify(selectedInstagramTargets));
        }
        if (selectedPlatforms.includes('linkedin') && selectedLinkedinTargets.length) {
          formData.append('linkedinOwnerUrns', JSON.stringify(selectedLinkedinTargets));
        }

        const response = await serverApiPost('/videos/publish', formData);
        const results = response?.results ?? {};
        const succeeded = Object.entries(results)
          .filter(([, result]: [string, any]) => result?.success)
          .map(([platform]) => platform);
        const failed = Object.entries(results)
          .filter(([, result]: [string, any]) => !result?.success || result?.message)
          .map(([platform, result]: [string, any]) =>
            `${platformLabel(platform)}: ${result?.message || 'Publishing failed'}`);

        if (!succeeded.length) {
          throw new Error(failed.join(' | ') || response?.message || 'Unable to publish video.');
        }

        showMessage(
          failed.length
            ? `Posted to ${succeeded.map(platformLabel).join(', ')}. Failed: ${failed.join(' | ')}`
            : `Posted to ${succeeded.map(platformLabel).join(', ')}`,
        );
        setSelectedMedia(null);
        setSelectedPlatforms([]);
        setPostDescription('');
        return;
      }

      if (!selectedMedia.mimeType.startsWith('image/')) {
        throw new Error('This media format cannot be published.');
      }

      const bannerId = await ensureBannerId(selectedMedia);

      const response: PublishResponse = await serverApiPost('/banners/publish', {
        bannerId,
        platforms: selectedPlatforms,
        caption: postDescription.trim(),
      });

      const published = response?.publishedPlatforms ?? [];
      const failed = response?.failedPlatforms ?? [];

      // 207 (partial success) arrives with success:false, so judge by the lists.
      if (published.length === 0) {
        throw new Error(response?.message || 'Unable to publish posts');
      }

      if (failed.length > 0) {
        const reasons = failed
          .map((p) => `${platformLabel(p)}: ${response.results?.[p]?.message ?? 'failed'}`)
          .join(' | ');
        showMessage(`Posted to ${published.map(platformLabel).join(', ')}. Failed: ${reasons}`);
      } else {
        showMessage(`Posted to ${published.map(platformLabel).join(', ')}`);
      }

      setSelectedMedia(null);
      setSelectedPlatforms([]);
      setPostDescription('');
    } catch (error: any) {
      console.error('SAVE SOCIAL POSTS ERROR:', error);

      if (error instanceof ApiError && error.data?.code === 'SUBSCRIPTION_REQUIRED') {
        navigate('/subscription');
        return;
      }

      const results = error instanceof ApiError ? error.data?.results : null;
      if (results && typeof results === 'object' && !Array.isArray(results)) {
        const failures = Object.entries(results)
          .filter(([, result]) =>
            result && typeof result === 'object' &&
            (result as Record<string, unknown>).success === false)
          .map(([platform, result]) => {
            const message = (result as Record<string, unknown>).message;
            return `${platformLabel(platform)}: ${typeof message === 'string' ? message : 'Publishing failed'}`;
          });
        if (failures.length) {
          showMessage(failures.join(' | '));
          return;
        }
      }

      showMessage(
        error?.response?.data?.message ||
          (error instanceof Error ? error.message : 'Unable to publish posts'),
      );
    } finally {
      setSavingPosts(false);
    }
  };

  const generateAdFromSelectedMedia = async () => {
    if (!selectedMedia || !selectedMedia.mimeType.startsWith('image/')) {
      return;
    }

    try {
      const response = await fetch(selectedMedia.dataUrl);
      const blob = await response.blob();
      const file = new File([blob], selectedMedia.name, { type: selectedMedia.mimeType });
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setSelectedMedia(null);
      await uploadImage(file);
    } catch (error) {
      console.error('PREPARE IMAGE FOR GENERATION ERROR:', error);
      showMessage('Unable to prepare this image for ad generation');
    }
  };

  const handleTakePhoto = async () => {
    if (uploadingImage) {
      return;
    }

    // In a browser the Capacitor camera needs @ionic/pwa-elements (the
    // "pwa-camera-modal" error). Use the native camera input there instead.
    if (!Capacitor.isNativePlatform()) {
      cameraInputRef.current?.click();
      return;
    }

    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        correctOrientation: true,
        width: MAX_IMAGE_EDGE,
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

      await processSelectedFile(file);
    } catch (error: any) {
      if (error?.message?.toLowerCase?.().includes('cancel')) {
        return;
      }

      console.error('CAMERA ERROR:', error);
      showMessage('Unable to open the camera');
    }
  };

  // ==================================================
  // STEP 1 — upload image only (/upload). Opens the "Generate Ad" screen.
  // ==================================================

  const resetToUpload = () => {
    setSelectedFile(null);
    setPreviewUrl(null); // the effect above revokes the old object URL
    setProductId(null);
    setUploadedImageUrl(null);
    setSubcategoryId(null);
    setChildCategoryId(null);
    setPromptDescription('');
    setAspectRatio('1:1');
    setStep('upload');
  };

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

      const uploadResponse = await serverApiPost('/upload', formData);

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

      showMessage(error?.response?.data?.message || error?.message || 'Unable to upload image');

      resetToUpload();
    } finally {
      setUploadingImage(false);
    }
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

  // ==================================================
  // STEP 2 — Generate Ad
  // ==================================================

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
    let category =
      resolveBusinessCategory(user, getBusinessCategory(user?.id ?? null)) ?? businessCategory;

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

      const analyzeResponse: AnalyzeResponse = await apiPost('/products/post', {
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

  const selectedIsImage = Boolean(selectedMedia?.mimeType.startsWith('image/'));

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
              zIndex: 1,
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
        {/* hidden gallery input */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        {/* hidden camera input (browser fallback, opens the phone camera) */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
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
            <h1
              style={{
                fontSize: 26,
                lineHeight: 1.15,
                fontWeight: 800,
                color: ui.text,
                margin: '0 0 10px',
              }}
            >
              Upload Image or Video
            </h1>
            <p style={{ margin: '0 0 24px', color: ui.muted, fontSize: 14, lineHeight: 1.5 }}>
              Save an image or video on this device, then tap its preview to choose social
              channels.
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
              JPG, PNG, WEBP · Images are resized to 1 MB or less. MP4 or WEBM videos must be
              between 100 KB and 10 MB.
            </p>

            {mediaItems.length > 0 && (
              <section aria-label="Saved media" style={{ marginTop: 28 }}>
                <h2 style={{ color: ui.text, fontSize: 18, margin: '0 0 12px' }}>
                  Your media ({mediaItems.length})
                </h2>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 12,
                  }}
                >
                  {mediaItems.map((media) => (
                    <div
                      key={media.id}
                      style={{
                        overflow: 'hidden',
                        border: `1px solid ${ui.border}`,
                        borderRadius: 12,
                        background: ui.surface,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => openMediaShare(media)}
                        aria-label={`Choose social channels for ${media.name}`}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: 0,
                          border: 0,
                          background: 'transparent',
                          textAlign: 'left',
                        }}
                      >
                        {media.mimeType.startsWith('video/') ? (
                          <video
                            src={media.dataUrl}
                            muted
                            playsInline
                            preload="metadata"
                            style={{
                              display: 'block',
                              width: '100%',
                              height: 140,
                              objectFit: 'cover',
                              background: '#000',
                            }}
                          />
                        ) : (
                          <img
                            src={media.dataUrl}
                            alt={media.name}
                            style={{
                              display: 'block',
                              width: '100%',
                              height: 140,
                              objectFit: 'cover',
                            }}
                          />
                        )}
                        <span
                          style={{
                            display: 'block',
                            padding: '9px 10px 4px',
                            color: ui.text,
                            fontSize: 13,
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {media.name}
                        </span>
                        <span
                          style={{
                            display: 'block',
                            padding: '0 10px 10px',
                            color: ui.muted,
                            fontSize: 11,
                          }}
                        >
                          Tap to choose social channels
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLocalMedia(media.id)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          border: 0,
                          borderTop: `1px solid ${ui.border}`,
                          color: ui.muted,
                          background: ui.white,
                          fontSize: 12,
                        }}
                      >
                        Remove from device
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
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
                  boxSizing: 'border-box',
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

        {/* ================= CHANNEL PICKER MODAL ================= */}
        <IonModal
          isOpen={Boolean(selectedMedia)}
          onDidDismiss={() => setSelectedMedia(null)}
          breakpoints={[0, 0.65, 0.95]}
          initialBreakpoint={0.95}
          handleBehavior="cycle"
        >
          <div
            style={
              {
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                maxHeight: '80vh',
                background: ui.white,
              }
            }
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 20px 12px',
                borderBottom: `1px solid ${ui.border}`,
                flexShrink: 0,
              }}
            >
              <div>
                <h2 style={{ margin: 0, color: ui.text, fontSize: 19 }}>Choose social channels</h2>
                <p style={{ margin: '4px 0 0', color: ui.muted, fontSize: 12 }}>
                  {checkingConnections
                    ? 'Checking connected accounts...'
                    : `${selectedPlatforms.length} channel${selectedPlatforms.length === 1 ? '' : 's'} selected`}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close channel selection"
                onClick={() => setSelectedMedia(null)}
                style={{ border: 0, background: 'transparent', padding: 8 }}
              >
                <IonIcon icon={closeOutline} style={{ fontSize: 22, color: ui.muted }} />
              </button>
            </div>

            <div
              style={{
                flex: '1 1 auto',
                minHeight: 0,
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                padding: '14px 20px 18px',
              }}
            >
              {selectedMedia && (
              <>
                {selectedMedia.mimeType.startsWith('video/') ? (
                  <video
                    src={selectedMedia.dataUrl}
                    controls
                    playsInline
                    style={{
                      display: 'block',
                      width: '100%',
                      height: 180,
                      borderRadius: 12,
                      background: '#000',
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  <img
                    src={selectedMedia.dataUrl}
                    alt={selectedMedia.name}
                    style={{
                      display: 'block',
                      width: '100%',
                      height: 180,
                      borderRadius: 12,
                      objectFit: 'contain',
                      background: ui.surface,
                    }}
                  />
                )}
                <p
                  style={{
                    margin: '9px 0 16px',
                    color: ui.muted,
                    fontSize: 13,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {selectedMedia.name} · {(selectedMedia.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </>
              )}

              {selectedMedia?.mimeType.startsWith('video/') && (
                <div style={{
                  margin: '0 0 16px',
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: '#EFF6FF',
                  color: '#1D4E89',
                  fontSize: 12,
                  lineHeight: 1.45,
                }}>
                  MP4 videos can be published to Facebook, Instagram, YouTube and LinkedIn.
                  WhatsApp and Google Business video publishing are not available in this flow.
                </div>
              )}

              <div style={{ marginBottom: 18 }}>
              <FieldLabel text="Description (optional)" />
              {loadingMarketingPrompts ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: ui.muted }}>
                  <IonSpinner name="crescent" />
                  <span style={{ fontSize: 13 }}>Loading saved prompts...</span>
                </div>
              ) : marketingPromptsError ? (
                <p role="alert" style={{ margin: '0 0 10px', color: '#D33', fontSize: 13 }}>
                  {marketingPromptsError}
                </p>
              ) : marketingPrompts.length > 0 ? (
                <IonSelect
                  aria-label="Select a saved prompt for the description"
                  interface="alert"
                  placeholder="Choose a saved prompt"
                  onIonChange={(event) => {
                    const prompt = marketingPrompts[event.detail.value];
                    if (prompt) {
                      setPostDescription(prompt.slice(0, MAX_DESCRIPTION));
                    }
                  }}
                  style={{
                    marginBottom: 10,
                    border: `1px solid ${ui.border}`,
                    borderRadius: 12,
                    paddingInline: 12,
                  }}
                >
                  {marketingPrompts.map((prompt, index) => (
                    <IonSelectOption key={`${index}-${prompt.slice(0, 40)}`} value={index}>
                      {prompt}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              ) : (
                <p style={{ margin: '0 0 10px', color: ui.muted, fontSize: 13 }}>
                  No saved prompts available.
                </p>
              )}
              <textarea
                value={postDescription}
                onChange={(e) => setPostDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
                placeholder="Write a description for your post..."
                rows={3}
                maxLength={MAX_DESCRIPTION}
                style={{
                  display: 'block',
                  width: '100%',
                  boxSizing: 'border-box',
                  resize: 'vertical',
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
                {postDescription.length}/{MAX_DESCRIPTION}
              </p>
              </div>

              <FieldLabel text="Select connected channels" />
              {PUBLISH_PLATFORMS.map((platform) => {
                const checked = selectedPlatforms.includes(platform.id);
                const isVideo = Boolean(selectedMedia?.mimeType.startsWith('video/'));
                const supportedForVideo =
                  platform.id === 'facebook' ||
                  platform.id === 'instagram' ||
                  platform.id === 'youtube' ||
                  platform.id === 'linkedin';
                const videoNeedsMp4 = isVideo && selectedMedia?.mimeType !== 'video/mp4';
                const unsupportedVideoPlatform = isVideo && !supportedForVideo;
                const isConnected = connected[platform.id];
                const disabled = checkingConnections || !isConnected || videoNeedsMp4 || unsupportedVideoPlatform;
                const destinationTargets = platform.id === 'facebook'
                  ? facebookTargets
                  : platform.id === 'instagram'
                    ? instagramTargets
                    : platform.id === 'linkedin'
                      ? linkedinTargets
                      : [];
                const selectedDestinationTargets = platform.id === 'facebook'
                  ? selectedFacebookTargets
                  : platform.id === 'instagram'
                    ? selectedInstagramTargets
                    : platform.id === 'linkedin'
                      ? selectedLinkedinTargets
                      : [];
                const toggleDestination = platform.id === 'facebook'
                  ? toggleFacebookTarget
                  : platform.id === 'instagram'
                    ? toggleInstagramTarget
                    : toggleLinkedInTarget;
                const platformColor = platform.id === 'facebook'
                  ? '#1877F2'
                  : platform.id === 'instagram'
                    ? '#DD2A7B'
                    : platform.id === 'youtube'
                      ? '#FF0000'
                      : platform.id === 'linkedin'
                        ? '#0A66C2'
                        : ui.primary;
                const statusLabel = checkingConnections
                  ? 'Checking connection'
                  : !isConnected
                    ? 'Not connected'
                    : unsupportedVideoPlatform
                      ? 'Video not supported'
                      : videoNeedsMp4
                        ? 'MP4 required'
                        : destinationTargets.length > 0
                          ? selectedDestinationTargets.length > 0
                            ? `Connected · ${selectedDestinationTargets.length} of ${destinationTargets.length} destinations selected`
                            : 'Connected · select a destination'
                          : 'Connected';

                return (
                  <div key={platform.id}>
                    <div
                      role="checkbox"
                      aria-checked={checked}
                      aria-label={`Select ${platform.name}`}
                      aria-disabled={disabled}
                      tabIndex={disabled ? -1 : 0}
                      onClick={() => !disabled && togglePublishPlatform(platform.id)}
                      onKeyDown={(e) => {
                        if (!disabled && (e.key === ' ' || e.key === 'Enter')) {
                          e.preventDefault();
                          togglePublishPlatform(platform.id);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: 12,
                        border: `1px solid ${checked ? platformColor : ui.border}`,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        background: checked ? '#EFF6FF' : disabled ? '#F8FAFC' : ui.white,
                        marginBottom: checked && isConnected && destinationTargets.length ? 4 : 10,
                        opacity: disabled ? 0.62 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <IonIcon icon={platform.icon} style={{ fontSize: 22, color: platformColor }} />
                        <span style={{ color: ui.text, fontSize: 14, fontWeight: 600 }}>
                          {platform.name}
                          <small style={{ display: 'block', marginTop: 3, color: ui.muted, fontSize: 11, fontWeight: 400 }}>
                          {statusLabel}
                          </small>
                        </span>
                      </div>
                      <IonCheckbox
                        checked={checked}
                        disabled={disabled}
                        style={{ pointerEvents: 'none' }}
                        tabIndex={-1}
                      />
                    </div>
                    {checked && isConnected && ['facebook', 'instagram', 'linkedin'].includes(platform.id) && (
                      <div
                        style={{
                          margin: '-4px 0 10px 14px',
                          paddingLeft: 12,
                          borderLeft: `2px solid ${ui.border}`,
                        }}
                      >
                        <p style={{
                          margin: '0 0 6px',
                          color: '#A9B6C2',
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: 0.3,
                          textTransform: 'uppercase',
                        }}>
                          Post to
                        </p>
                        {destinationTargets.length === 0 ? (
                          <p style={{ margin: 0, color: ui.muted, fontSize: 12 }}>
                            No connected destinations found. Manage connected accounts to refresh them.
                          </p>
                        ) : destinationTargets.map((target) => {
                          const targetChecked = selectedDestinationTargets.includes(target.urn);
                          const targetLabel = target.type === 'personal'
                            ? 'Personal profile'
                            : target.name;
                          return (
                            <div
                              key={target.urn}
                              role="checkbox"
                              aria-checked={targetChecked}
                              onClick={() => void toggleDestination(target.urn)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 10px',
                                borderRadius: 10,
                                border: `1px solid ${targetChecked ? platformColor : ui.border}`,
                                background: targetChecked ? '#F0F6FF' : ui.white,
                                marginBottom: 6,
                                cursor: 'pointer',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {platform.id === 'linkedin' && (
                                  <IonIcon
                                    icon={target.type === 'personal' ? personOutline : businessOutline}
                                    style={{ fontSize: 15, color: platformColor }}
                                  />
                                )}
                                <span style={{ color: ui.text, fontSize: 12, fontWeight: 600 }}>
                                  {targetLabel}
                                </span>
                              </div>
                              <IonCheckbox checked={targetChecked} style={{ pointerEvents: 'none' }} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div
              style={{
                flexShrink: 0,
                padding: '10px 20px calc(12px + env(safe-area-inset-bottom))',
                borderTop: `1px solid ${ui.border}`,
                background: ui.white,
                boxShadow: '0 -4px 14px rgba(15, 27, 45, 0.06)',
              }}
            >
              {selectedMedia && !selectedIsImage && selectedMedia.mimeType !== 'video/mp4' && (
                <p style={{ margin: '0 0 8px', color: '#A85B00', fontSize: 12 }}>
                  Choose an MP4 video to publish. WEBM can be stored and previewed on this device.
                </p>
              )}
              {!checkingConnections && PUBLISH_PLATFORMS.every((platform) => !connected[platform.id]) && (
                <IonButton
                  expand="block"
                  fill="clear"
                  onClick={() => {
                    setSelectedMedia(null);
                    navigate('/social-connections');
                  }}
                  style={{ margin: '0 0 4px', minHeight: 36 }}
                >
                  Connect social accounts
                </IonButton>
              )}
              {!PUBLISH_PLATFORMS.every((platform) => !connected[platform.id]) && (
                <IonButton
                  expand="block"
                  fill="clear"
                  onClick={() => {
                    setSelectedMedia(null);
                    navigate('/social-connections');
                  }}
                  style={{ margin: '0 0 4px', minHeight: 32, fontSize: 12 }}
                >
                  Manage connected accounts
                </IonButton>
              )}
              <IonButton
                expand="block"
                onClick={() => void savePostsToPlatforms()}
                disabled={
                  savingPosts ||
                  checkingConnections ||
                  selectedPlatforms.length === 0 ||
                  Boolean(missingDestinationPlatform()) ||
                  (!selectedIsImage && selectedMedia?.mimeType !== 'video/mp4')
                }
                style={{
                  margin: 0,
                  minHeight: 48,
                  '--border-radius': '12px',
                } as React.CSSProperties}
              >
                {savingPosts
                  ? <IonSpinner name="crescent" />
                  : `Post to selected channels${selectedPlatforms.length ? ` (${selectedPlatforms.length})` : ''}`}
              </IonButton>
              {selectedIsImage && (
                <IonButton
                  expand="block"
                  fill="outline"
                  onClick={() => void generateAdFromSelectedMedia()}
                  disabled={uploading || savingPosts}
                  style={{ margin: '8px 0 0', minHeight: 44 }}
                >
                  Generate ad from this image
                </IonButton>
              )}
            </div>
          </div>
        </IonModal>

        <IonToast
          isOpen={showToast}
          message={toastMessage}
          duration={5000}
          position="bottom"
          onDidDismiss={() => setShowToast(false)}
        />
      </IonContent>
    </IonPage>
  );
};

export default Uploadnew;