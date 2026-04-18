import React from 'react';

/** Ключи в объекте `sampleTexts` из родителя (pages/index) и подписи кнопок. */
export const SAMPLE_TEXT_PRESET_ITEMS = [
  { key: 'title', label: 'Title' },
  { key: 'pangram', label: 'Pangram' },
  { key: 'paragraph', label: 'Paragraph' },
  { key: 'wikipedia', label: 'Wikipedia' },
];

const btnClass =
  'rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-800 transition-all duration-150 hover:bg-gray-50 hover:shadow-sm';

/**
 * Сетка кнопок быстрой подстановки образца текста (сайдбар).
 * @param {Record<string, string>} sampleTexts — title, pangram, paragraph, wikipedia
 * @param {function(string): void} onSelect — обычно setText из SettingsContext
 */
export function SampleTextPresetGrid({ sampleTexts, onSelect }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-2">
      {SAMPLE_TEXT_PRESET_ITEMS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          className={btnClass}
          onClick={() => {
            const value = sampleTexts?.[key];
            if (typeof value === 'string' && onSelect) onSelect(value);
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
