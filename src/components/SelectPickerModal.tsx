// components/SelectPickerModal.tsx
import React, { useMemo, useState } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonThumbnail,
} from '@ionic/react';
import {
  checkmarkCircle,
  pricetagOutline,
  closeOutline,
  shirtOutline,
  fastFoodOutline,
  restaurantOutline,
  footstepsOutline,
  schoolOutline,
  cutOutline,
  medkitOutline,
  calculatorOutline,
  homeOutline,
  pencilOutline,
  cartOutline,
  heartOutline,
  barbellOutline,
  carOutline,
  businessOutline,
  happyOutline,
  diamondOutline,
  bookOutline,
  hardwareChipOutline,
  airplaneOutline,
  watchOutline,
  bagOutline,
  storefrontOutline,
  leafOutline,
  constructOutline,
  pawOutline,
  cashOutline,
  briefcaseOutline,
  giftOutline,
  flowerOutline,
  colorPaletteOutline,
  ellipsisHorizontalOutline,
} from 'ionicons/icons';

export interface PickerItem {
  id: number;
  name: string;
  icon?: string | null;
}

interface Props {
  isOpen: boolean;
  title: string;
  items: PickerItem[];
  selectedId: number | null;
  onClose: () => void;
  onSelect: (id: number) => void;
  loading?: boolean;
  emptyText?: string;
}

// Keyword → icon map, checked in order. Falls back to a generic tag icon
// when a category's own `icon` field is empty and nothing here matches.
const ICON_RULES: { keywords: string[]; icon: string }[] = [
  { keywords: ['fashion', 'clothing', 'apparel', 'garment'], icon: shirtOutline },
  { keywords: ['restaurant', 'cafe', 'dining'], icon: restaurantOutline },
  { keywords: ['food', 'grocery'], icon: fastFoodOutline },
  { keywords: ['footwear', 'shoe'], icon: footstepsOutline },
  { keywords: ['coaching', 'institute', 'education', 'school', 'tuition'], icon: schoolOutline },
  { keywords: ['salon', 'spa', 'beauty', 'personal care'], icon: cutOutline },
  { keywords: ['hospital', 'doctor', 'clinic', 'health', 'wellness', 'medical'], icon: medkitOutline },
  { keywords: ['tax', 'ca ', 'consultant', 'accountant'], icon: calculatorOutline },
  { keywords: ['finance', 'bank', 'loan'], icon: cashOutline },
  { keywords: ['home & kitchen', 'kitchen', 'furniture'], icon: homeOutline },
  { keywords: ['stationery', 'pen', 'notebook'], icon: pencilOutline },
  { keywords: ['book'], icon: bookOutline },
  { keywords: ['sports', 'gym', 'fitness'], icon: barbellOutline },
  { keywords: ['automobile', 'automotive', 'car', 'vehicle', 'b2b'], icon: carOutline },
  { keywords: ['real estate', 'property'], icon: businessOutline },
  { keywords: ['baby', 'kid', 'toy'], icon: happyOutline },
  { keywords: ['jewellery', 'jewelry'], icon: diamondOutline },
  { keywords: ['electronics', 'gadget', 'mobile', 'computer'], icon: hardwareChipOutline },
  { keywords: ['travel', 'tour'], icon: airplaneOutline },
  { keywords: ['watch'], icon: watchOutline },
  { keywords: ['bag', 'luggage'], icon: bagOutline },
  { keywords: ['retail shop', 'shop', 'store'], icon: storefrontOutline },
  { keywords: ['garden', 'outdoor', 'plant'], icon: leafOutline },
  { keywords: ['home service', 'repair', 'construction'], icon: constructOutline },
  { keywords: ['pet'], icon: pawOutline },
  { keywords: ['office', 'business supplies'], icon: briefcaseOutline },
  { keywords: ['gift', 'occasion'], icon: giftOutline },
  { keywords: ['religious', 'spiritual'], icon: flowerOutline },
  { keywords: ['art', 'craft'], icon: colorPaletteOutline },
  { keywords: ['cart', 'ecommerce', 'e-commerce'], icon: cartOutline },
  { keywords: ['other'], icon: ellipsisHorizontalOutline },
  { keywords: ['love', 'heart'], icon: heartOutline },
];

const getCategoryIcon = (name: string): string => {
  const lower = name.toLowerCase();
  const match = ICON_RULES.find((rule) => rule.keywords.some((kw) => lower.includes(kw)));
  return match?.icon || pricetagOutline;
};

const SelectPickerModal: React.FC<Props> = ({
  isOpen,
  title,
  items,
  selectedId,
  onClose,
  onSelect,
  loading,
  emptyText = 'No results found',
}) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, query]);

  const handlePick = (id: number) => {
    onSelect(id);
    setQuery('');
    onClose();
  };

  const handleDismiss = () => {
    setQuery('');
    onClose();
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={handleDismiss}
      initialBreakpoint={1}
      breakpoints={[0, 1]}
      handleBehavior="cycle"
      className="picker-sheet-modal"
    >
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle className="text-[15px] font-semibold">{title}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleDismiss}>
              <IonIcon icon={closeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={query}
            onIonInput={(e) => setQuery(e.detail.value ?? '')}
            placeholder={`Search ${title.toLowerCase()}...`}
            debounce={150}
          />
        </IonToolbar>
      </IonHeader>

      <IonContent className="bg-gray-50" scrollY>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-sm text-gray-400">
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center text-sm text-gray-400">
            {emptyText}
          </div>
        ) : (
          <IonList className="bg-transparent" lines="full">
            {filtered.map((item) => {
              const isSelected = item.id === selectedId;
              return (
                <IonItem
                  key={item.id}
                  button
                  onClick={() => handlePick(item.id)}
                  className={isSelected ? 'bg-indigo-50' : ''}
                >
                  <IonThumbnail
                    slot="start"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50"
                  >
                    {item.icon ? (
                      <img src={item.icon} alt="" className="h-5 w-5 object-contain" />
                    ) : (
                      <IonIcon icon={getCategoryIcon(item.name)} className="text-base text-indigo-500" />
                    )}
                  </IonThumbnail>
                  <IonLabel className="text-[14px] font-medium text-gray-700">
                    {item.name}
                  </IonLabel>
                  {isSelected && (
                    <IonIcon icon={checkmarkCircle} slot="end" className="text-lg text-indigo-600" />
                  )}
                </IonItem>
              );
            })}
          </IonList>
        )}
        {/* keeps the last row clear of the home-indicator area on iOS */}
        <div style={{ height: 'env(safe-area-inset-bottom)' }} />
      </IonContent>
    </IonModal>
  );
};

export default SelectPickerModal;