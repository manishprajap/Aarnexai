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
} from 'ionicons/icons';

import axios from 'axios';

/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
|
| Vite proxy use kar rahe ho to empty rakho.
|
| Frontend:
| http://localhost:8100
|
| Backend:
| http://localhost:3000
|
| Request:
| /api/upload
|
*/

const API_URL = '';

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

interface UploadResponse {
  success: boolean;
  message?: string;
  productId?: string;
  imageUrl?: string;
  status?: string;
}

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
  id: string | null;
  day: number;
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
  productId?: string;
  product?: AiProduct;
  banners?: AnalyzeBannerResult[];
}

/*
|--------------------------------------------------------------------------
| Shape expected by the ProductDetails page
|--------------------------------------------------------------------------
|
| Mirrors the GET /api/products/:productId response so the details
| page's rendering logic works identically whether the data arrived
| via navigation state (this file) or a fresh fetch (page refresh).
|
*/

interface ProductDetailsBanner {
  id: string;
  day: number;
  theme: string | null;
  imageUrl: string | null;
  caption: string | null;
}

interface ProductDetailsState {
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
  banners: ProductDetailsBanner[];
}

const UploadNEW: React.FC = () => {
  const navigate = useNavigate();

  /*
  |--------------------------------------------------------------------------
  | Image
  |--------------------------------------------------------------------------
  */

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  const [uploading, setUploading] = useState(false);


  const isSubmittingRef = useRef(false);

  /*
  |--------------------------------------------------------------------------
  | Toast
  |--------------------------------------------------------------------------
  */

  const [toastMessage, setToastMessage] = useState('');

  const [showToast, setShowToast] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | File input
  |--------------------------------------------------------------------------
  */

  const fileInputRef = useRef<HTMLInputElement>(null);

  /*
  |--------------------------------------------------------------------------
  | Cleanup object URL on unmount
  |--------------------------------------------------------------------------
  |
  | Prevents memory leaks if the user navigates away
  | while a preview is still active.
  |
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

    /*
    |--------------------------------------------------------------------------
    | Validate type
    |--------------------------------------------------------------------------
    */

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      showMessage('Please select JPG, PNG or WEBP image');

      e.target.value = '';

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Validate size
    |--------------------------------------------------------------------------
    */

    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      showMessage('Image size must be less than 10MB');

      e.target.value = '';

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Cleanup old preview
    |--------------------------------------------------------------------------
    */

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    /*
    |--------------------------------------------------------------------------
    | Set file
    |--------------------------------------------------------------------------
    */

    setSelectedFile(file);

    const url = URL.createObjectURL(file);

    setPreviewUrl(url);
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

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Upload + Analyze
  |--------------------------------------------------------------------------
  */

  const handleContinue = async () => {
    /*
    |--------------------------------------------------------------------------
    | Synchronous double-submit guard
    |--------------------------------------------------------------------------
    */

    if (isSubmittingRef.current || uploading) {
      return;
    }

    if (!selectedFile) {
      showMessage('Please select a product image');

      return;
    }

    isSubmittingRef.current = true;

    try {
      setUploading(true);

      /*
      |--------------------------------------------------------------------------
      | Form Data
      |--------------------------------------------------------------------------
      */

      const formData = new FormData();

      formData.append('image', selectedFile);

      /*
      |--------------------------------------------------------------------------
      | Temporary Test User
      |--------------------------------------------------------------------------
      |
      | Later JWT se actual user ID aayegi.
      |
      */

      formData.append('userId', 'test-user-001');

      /*
      |--------------------------------------------------------------------------
      | STEP 1
      | Upload image
      |--------------------------------------------------------------------------
      */

      console.log('Uploading product...');

      const uploadResponse = await axios.post<UploadResponse>(
        `${API_URL}/api/upload`,
        formData
      );

      console.log('UPLOAD RESPONSE:', uploadResponse.data);

      if (!uploadResponse.data?.success) {
        throw new Error(uploadResponse.data?.message || 'Upload failed');
      }

      const productId = uploadResponse.data.productId;

      const uploadedImageUrl = uploadResponse.data.imageUrl || null;

      if (!productId) {
        throw new Error('Product ID was not returned');
      }

      console.log('PRODUCT ID:', productId);

      /*
      |--------------------------------------------------------------------------
      | STEP 2
      | Analyze with AI (also generates day-wise ad banners server-side)
      |--------------------------------------------------------------------------
      */

      showMessage('Image uploaded. AI is analyzing product...');

      console.log('Starting AI analysis...');

      const analyzeResponse = await axios.post<AnalyzeResponse>(
        `${API_URL}/api/products/analyze`,
        { productId }
      );

      console.log('AI PRODUCT DETAILS:', analyzeResponse.data);

      /*
      |--------------------------------------------------------------------------
      | Check AI result
      |--------------------------------------------------------------------------
      */

      if (!analyzeResponse.data?.success) {
        throw new Error(
          analyzeResponse.data?.message || 'Product analysis failed'
        );
      }

      const aiProduct: AiProduct | undefined = analyzeResponse.data.product;

      if (!aiProduct) {
        throw new Error('Product analysis returned no data');
      }

      /*
      |--------------------------------------------------------------------------
      | Banners — only keep the ones that generated successfully
      |--------------------------------------------------------------------------
      */

      const rawBanners = analyzeResponse.data.banners ?? [];

      const doneBanners: ProductDetailsBanner[] = rawBanners
        .filter((b) => b.status === 'done' && b.imageUrl)
        .map((b) => ({
          id: b.id as string,
          day: b.day,
          theme: b.theme,
          imageUrl: b.imageUrl,
          caption: b.caption,
        }));

      const failedBanners = rawBanners.filter((b) => b.status === 'failed');

      if (failedBanners.length > 0) {
        console.warn('SOME BANNERS FAILED:', failedBanners);
      }

      /*
      |--------------------------------------------------------------------------
      | Success
      |--------------------------------------------------------------------------
      */

      if (doneBanners.length > 0) {
        showMessage('Product analyzed — banners generated!');
      } else {
        showMessage(
          'Product analyzed, but banner generation failed. Check console.'
        );
      }

    

      const productForDetailsPage: ProductDetailsState = {
        id: productId,

        status:
          (analyzeResponse.data.status as
            | 'processing'
            | 'done'
            | 'failed') || 'done',

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
          typeof aiProduct.confidence === 'number'
            ? aiProduct.confidence
            : null,

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
              Upload Product
            </h1>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="bg-gray-50">
        <div className="min-h-full bg-gray-50 px-4 pb-8 pt-5">
          {/* Intro */}

          <div className="mb-6">
            <p className="m-0 text-sm leading-6 text-gray-500">
              Take a clear photo of your product, or choose one from your
              gallery. AI will identify the brand, category, features and
              other product details, and generate professional ad banners.
            </p>
          </div>

          {/* Upload / Preview */}

          <div className="mb-6 rounded-3xl bg-white p-5 shadow-sm">
            {!previewUrl ? (
              <div
                className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-5 py-10 text-center"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
                  <IonIcon
                    icon={cameraOutline}
                    className="text-2xl text-indigo-600"
                  />
                </div>

                <h4 className="m-0 text-sm font-bold text-gray-800">
                  Tap to select an image
                </h4>

                <p className="mt-2 max-w-xs text-xs leading-5 text-gray-500">
                  JPG, PNG, WEBP up to 10MB
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            ) : (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Product preview"
                  className="w-full rounded-2xl object-cover"
                  style={{ maxHeight: '360px' }}
                />

                <button
                  type="button"
                  onClick={handleClear}
                  disabled={uploading}
                  className="absolute right-2 top-2 rounded-full bg-white/90 p-0.5 shadow-md"
                >
                  <IonIcon
                    icon={closeCircle}
                    className="text-2xl text-gray-700"
                  />
                </button>
              </div>
            )}
          </div>

          {/* Gallery */}

          {!previewUrl && (
            <IonButton
              expand="block"
              fill="outline"
              className="mb-6"
              onClick={() => fileInputRef.current?.click()}
            >
              <IonIcon slot="start" icon={imagesOutline} />
              Choose from Gallery
            </IonButton>
          )}

          {/* Analyze */}

          {previewUrl && (
            <IonButton
              expand="block"
              className="hero-button-solid"
              onClick={handleContinue}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <IonSpinner slot="start" name="crescent" />
                  Analyzing Product...
                </>
              ) : (
                <>
                  <IonIcon slot="start" icon={sparklesOutline} />
                  Analyze Product
                </>
              )}
            </IonButton>
          )}
        </div>

        {/* Toast */}

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

export default UploadNEW;