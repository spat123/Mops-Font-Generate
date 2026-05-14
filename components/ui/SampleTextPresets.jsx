import React from 'react';
import { AppButton } from './AppButton';

/** Ключи в объекте `sampleTexts` из родителя (pages/index) и подписи кнопок. */
export const SAMPLE_TEXT_PRESET_ITEMS = [
  { key: 'title', label: 'Title' },
  { key: 'pangram', label: 'Pangram' },
  { key: 'paragraph', label: 'Paragraph' },
  { key: 'wikipedia', label: 'Wikipedia' },
];

/**
 * Сетка кнопок быстрой подстановки образца текста (сайдбар).
 * @param {Record<string, string>} sampleTexts — title, pangram, paragraph, wikipedia
 * @param {function(string): void} onSelect — обычно setText из SettingsContext
 */
export function SampleTextPresetGrid({ sampleTexts, onSelect }) {
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
            if (typeof value === 'string' && onSelect) onSelect(value);
          }}
        >
          {label}
        </AppButton>
      ))}
    </div>
  );
}
