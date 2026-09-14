import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  IonContent, IonHeader, IonPage, IonToolbar, IonBackButton,
  IonButtons, IonButton, IonSpinner, IonBadge,
} from '@ionic/react';
import axios from 'axios';

const API_URL = '';

interface Category {
  id: string;
  name: string;
  icon?: string;
}

interface Subcategory {
  id: string;
  name: string;
}

interface Preset {
  id: string;
  presetKey: string;
  name: string;
  group: 'style' | 'creative_type';
  aspectRatio: string;
  requiresOffer: boolean;
}

const SelectCategory: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/categories`).then((res) => {
      setCategories(res.data.categories);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }
    axios
      .get(`${API_URL}/categories/${categoryId}/subcategories`)
      .then((res) => setSubcategories(res.data.subcategories));

    axios
      .get(`${API_URL}/presets?categoryId=${categoryId}`)
      .then((res) => setPresets(res.data.presets));
  }, [categoryId]);

  const togglePreset = (id: string) => {
    setSelectedPresets((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (!categoryId) return;
    navigate(`/products/${productId}/generate`, {
      state: { categoryId, subcategoryId, presetIds: selectedPresets },
    });
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="app-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" text="" />
          </IonButtons>
          <h1 className="m-0 px-2 text-lg font-bold text-gray-900">
            Select Category
          </h1>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="bg-gray-50">
        <div className="px-4 pb-8 pt-5">
          {loading ? (
            <div className="flex justify-center py-14">
              <IonSpinner name="crescent" />
            </div>
          ) : (
            <>
              {/* Category */}
              <h4 className="mb-2 text-sm font-bold text-gray-700">Business Category</h4>
              <div className="mb-6 grid grid-cols-2 gap-2">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setCategoryId(c.id);
                      setSubcategoryId(null);
                    }}
                    className={`cursor-pointer rounded-xl border p-3 text-center text-sm font-medium ${
                      categoryId === c.id
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    {c.name}
                  </div>
                ))}
              </div>

              {/* Subcategory */}
              {subcategories.length > 0 && (
                <>
                  <h4 className="mb-2 text-sm font-bold text-gray-700">Subcategory</h4>
                  <div className="mb-6 flex flex-wrap gap-2">
                    {subcategories.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => setSubcategoryId(s.id)}
                        className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium ${
                          subcategoryId === s.id
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 bg-white text-gray-600'
                        }`}
                      >
                        {s.name}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Presets (checkbox style) */}
              {categoryId && presets.length > 0 && (
                <>
                  <h4 className="mb-2 text-sm font-bold text-gray-700">
                    Ad Style (select one or more)
                  </h4>
                  <div className="mb-6 flex flex-col gap-2">
                    {presets.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => togglePreset(p.id)}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 ${
                          selectedPresets.includes(p.id)
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedPresets.includes(p.id)}
                            readOnly
                          />
                          <span className="text-sm font-semibold text-gray-800">
                            {p.name}
                          </span>
                        </div>
                        <IonBadge color="medium">{p.aspectRatio}</IonBadge>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <IonButton
                expand="block"
                disabled={!categoryId || selectedPresets.length === 0}
                onClick={handleNext}
              >
                Continue
              </IonButton>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default SelectCategory;