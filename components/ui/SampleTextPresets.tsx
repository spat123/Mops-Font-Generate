import { AppButton } from './AppButton';

export const SAMPLE_TEXT_PRESET_ITEMS = [
  { key: 'title', label: 'Title' },
  { key: 'pangram', label: 'Pangram' },
  { key: 'paragraph', label: 'Paragraph' },
  { key: 'wikipedia', label: 'Wikipedia' },
] as const;

export type SampleTextPresetKey = (typeof SAMPLE_TEXT_PRESET_ITEMS)[number]['key'];

export type SampleTextPresetGridProps = {
  sampleTexts: Record<string, string>;
  onSelect: (value: string) => void;
};

/** Сетка кнопок быстрой подстановки образца текста (сайдбар). */
export function SampleTextPresetGrid({ sampleTexts, onSelect }: SampleTextPresetGridProps) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-2">
      {SAMPLE_TEXT_PRESET_ITEMS.map(({ key, label }) => (
        <AppButton
          key={key}
          type="button"
          variant="outline"
          size="xs"
          fullWidth
          className="!normal-case font-normal"
          onClick={() => {
            const value = sampleTexts?.[key];
            if (typeof value === 'string') onSelect(value);
          }}
        >
          {label}
        </AppButton>
      ))}
    </div>
  );
}
