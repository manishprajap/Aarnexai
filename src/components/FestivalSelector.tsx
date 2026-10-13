import { useEffect, useState } from 'react';
import { IonLabel, IonSelect, IonSelectOption, IonSpinner } from '@ionic/react';
import { apiGet } from '../api';

export type FestivalOption = {
  id: number;
  slug: string;
  name: string;
  nameHi: string | null;
  festivalDate: string;
  festivalType: string;
  religion: string;
  description: string | null;
};

type FestivalSelectorProps = {
  value: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
};

const FestivalSelector: React.FC<FestivalSelectorProps> = ({ value, onChange, disabled = false }) => {
  const [festivals, setFestivals] = useState<FestivalOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void apiGet<{ success: boolean; festivals: FestivalOption[] }>('/festivals/upcoming')
      .then((response) => {
        if (!response.success || !Array.isArray(response.festivals)) {
          throw new Error('The server returned an invalid upcoming occasions list.');
        }
        if (!cancelled) setFestivals(response.festivals);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load upcoming occasions.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const updateSelection = (selected: unknown) => {
    const ids = Array.isArray(selected)
      ? selected.map(Number).filter((id) => Number.isInteger(id) && id > 0)
      : [];
    onChange([...new Set(ids)]);
  };

  return (
    <div>
      <IonLabel>
        <strong>Festival / Jayanti / Occasion (optional)</strong>
      </IonLabel>
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0' }}>
          <IonSpinner name="crescent" />
          <span>Loading upcoming occasions…</span>
        </div>
      ) : error ? (
        <p role="alert" style={{ color: '#b42318', fontSize: 13 }}>{error}</p>
      ) : festivals.length === 0 ? (
        <p style={{ color: '#6B7A90', fontSize: 13 }}>
          No festivals or occasions are listed in the next two days.
        </p>
      ) : (
        <>
          <IonSelect
            multiple
            interface="alert"
            placeholder="Select one or more occasions"
            value={value}
            disabled={disabled}
            onIonChange={(event) => updateSelection(event.detail.value)}
          >
            {festivals.map((festival) => (
              <IonSelectOption key={festival.id} value={festival.id}>
                {festival.name}{festival.nameHi ? ` · ${festival.nameHi}` : ''}
                {' '}({festival.festivalType.replace(/_/g, ' ')} · {festival.festivalDate})
              </IonSelectOption>
            ))}
          </IonSelect>
          <p style={{ color: '#6B7A90', fontSize: 12, margin: '6px 0 0' }}>
            Choose multiple occasions to include them together in one banner.
          </p>
        </>
      )}
    </div>
  );
};

export default FestivalSelector;
