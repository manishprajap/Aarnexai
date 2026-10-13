import { useEffect, useState } from 'react';
import { IonCheckbox, IonLabel, IonSpinner } from '@ionic/react';
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

  const toggleSelection = (id: number, checked: boolean) => {
    onChange(checked
      ? [...new Set([...value, id])]
      : value.filter((selectedId) => selectedId !== id));
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
          <p style={{ color: '#6B7A90', fontSize: 12, margin: '6px 0 10px' }}>
            Select as many occasions as you want ({value.length} selected). They will be combined into one banner.
          </p>
          <div role="group" aria-label="Select festivals and occasions" style={{ display: 'grid', gap: 8 }}>
            {festivals.map((festival) => (
              <label
                key={festival.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px',
                  border: `1px solid ${value.includes(festival.id) ? '#6C63FF' : '#E3E8EF'}`,
                  borderRadius: 12,
                  background: value.includes(festival.id) ? '#F5F4FF' : '#FFFFFF',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.65 : 1,
                }}
              >
                <IonCheckbox
                  checked={value.includes(festival.id)}
                  disabled={disabled}
                  onIonChange={(event) => toggleSelection(festival.id, event.detail.checked)}
                  aria-label={`Select ${festival.name}`}
                />
                <span style={{ display: 'grid', gap: 3 }}>
                  <strong style={{ color: '#263238', fontSize: 14 }}>
                    {festival.name}{festival.nameHi ? ` · ${festival.nameHi}` : ''}
                  </strong>
                  <small style={{ color: '#6B7A90', fontSize: 12 }}>
                    {festival.festivalType.replace(/_/g, ' ')} · {festival.festivalDate}
                  </small>
                </span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default FestivalSelector;
