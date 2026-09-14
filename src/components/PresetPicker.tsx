// src/components/PresetPicker.tsx

import {
  useEffect,
  useState,
} from 'react';

import {
  IonIcon,
  IonTextarea,
  IonSpinner,
} from '@ionic/react';

import {
  checkmarkCircle,
  sparklesOutline,
  createOutline,
  pricetagOutline,
} from 'ionicons/icons';

import axios from 'axios';

const API_URL = '';

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

interface Preset {
  id: number;
  presetKey: string;
  name: string;
  group: string;
  aspectRatio: string;
  promptModifier: string;
  requiresOffer: boolean;
  icon?: string | null;
}

interface PresetPickerProps {
  categoryId: number | null;
  /* Called whenever the effective selection changes */
  onChange: (value: {
    presetId: number | null;
    presetKey: string | null;
    prompt: string;
  }) => void;
}

/*
|--------------------------------------------------------------------------
| Group label mapping
|--------------------------------------------------------------------------
*/

const GROUP_LABELS: Record<string, string> = {
  style: 'Choose a Style',
  creative_type: 'Choose a Creative Type',
  other: 'More Options',
};

const PresetPicker: React.FC<PresetPickerProps> = ({ categoryId, onChange }) => {
  const [grouped, setGrouped] = useState<Record<string, Preset[]>>({});

  const [loading, setLoading] = useState(false);

  const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);

  const [customMode, setCustomMode] = useState(false);

  const [customPrompt, setCustomPrompt] = useState('');

  /*
  |--------------------------------------------------------------------------
  | Load presets whenever category changes
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const loadPresets = async () => {
      try {
        setLoading(true);

        const res = await axios.get<{
          success: boolean;
          grouped: Record<string, Preset[]>;
        }>(`${API_URL}/api/presets`, {
          params: categoryId ? { categoryId } : {},
        });

        setGrouped(res.data?.grouped || {});
      } catch (error) {
        console.error('LOAD PRESETS ERROR:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPresets();
  }, [categoryId]);

  /*
  |--------------------------------------------------------------------------
  | Emit selection upward
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (customMode) {
      onChange({ presetId: null, presetKey: null, prompt: customPrompt.trim() });
      return;
    }

    const flatPresets = Object.values(grouped).flat();
    const selected = flatPresets.find((p) => p.id === selectedPresetId);

    onChange({
      presetId: selected?.id ?? null,
      presetKey: selected?.presetKey ?? null,
      prompt: selected?.promptModifier ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPresetId, customMode, customPrompt]);

  /*
  |--------------------------------------------------------------------------
  | Handlers
  |--------------------------------------------------------------------------
  */

  const handleSelectPreset = (preset: Preset) => {
    setCustomMode(false);
    setSelectedPresetId(preset.id);
  };

  const handleSwitchToCustom = () => {
    setSelectedPresetId(null);
    setCustomMode(true);
  };

  const handleSwitchToPresets = () => {
    setCustomMode(false);
  };

  const groupKeys = Object.keys(grouped);

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      {/* Header row: title + mode toggle */}

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100">
            <IonIcon icon={sparklesOutline} className="text-base text-indigo-600" />
          </div>
          <h3 className="m-0 text-sm font-bold text-gray-900">Ad Style</h3>
        </div>

        <button
          type="button"
          onClick={customMode ? handleSwitchToPresets : handleSwitchToCustom}
          className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 active:bg-gray-200"
        >
          <IonIcon
            icon={customMode ? pricetagOutline : createOutline}
            className="text-sm"
          />
          {customMode ? 'Use Presets' : 'Write Custom'}
        </button>
      </div>

      {/* Loading state */}

      {loading && !customMode && (
        <div className="flex items-center justify-center py-10">
          <IonSpinner name="crescent" />
        </div>
      )}

      {/* Preset grid, grouped by style / creative_type */}

      {!loading && !customMode && groupKeys.length > 0 && (
        <div className="space-y-5">
          {groupKeys.map((groupKey) => (
            <div key={groupKey}>
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {GROUP_LABELS[groupKey] || groupKey}
              </p>

              <div className="grid grid-cols-2 gap-3">
                {grouped[groupKey].map((preset) => {
                  const isSelected = selectedPresetId === preset.id;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`relative rounded-2xl border p-3.5 text-left transition-colors ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      {isSelected && (
                        <IonIcon
                          icon={checkmarkCircle}
                          className="absolute right-2 top-2 text-lg text-indigo-600"
                        />
                      )}

                      <div
                        className={`mb-2 flex h-9 w-9 items-center justify-center rounded-full ${
                          isSelected ? 'bg-indigo-600' : 'bg-white'
                        }`}
                      >
                        <IonIcon
                          icon={sparklesOutline}
                          className={`text-base ${
                            isSelected ? 'text-white' : 'text-gray-400'
                          }`}
                        />
                      </div>

                      <p
                        className={`m-0 text-xs font-bold leading-4 ${
                          isSelected ? 'text-indigo-700' : 'text-gray-800'
                        }`}
                      >
                        {preset.name}
                      </p>

                      {preset.requiresOffer && (
                        <span className="mt-1.5 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          Needs offer
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No presets available */}

      {!loading && !customMode && groupKeys.length === 0 && (
        <p className="py-6 text-center text-xs text-gray-400">
          No presets available for this category. Try writing a custom prompt.
        </p>
      )}

      {/* Custom prompt input */}

      {customMode && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3.5">
          <IonTextarea
            placeholder="Describe the banner you want e.g. Diwali sale banner with festive lights and gold accents"
            autoGrow
            value={customPrompt}
            onIonInput={(e) => setCustomPrompt(e.detail.value || '')}
            className="text-sm"
          />
        </div>
      )}
    </div>
  );
};

export default PresetPicker;