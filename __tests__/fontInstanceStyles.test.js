import { describe, expect, it } from 'bun:test';
import {
  applyFontInstanceStylesToFont,
  extractFvarInstanceStyles,
  getFontInstanceStyles,
  instanceStyleSignature,
} from '../utils/fontInstanceStyles';

describe('extractFvarInstanceStyles', () => {
  it('maps named fvar instances to preset rows with coordinates', () => {
    const parsed = {
      tables: {
        fvar: {
          axes: [
            { tag: 'wght', minValue: 100, defaultValue: 400, maxValue: 900 },
            { tag: 'wdth', minValue: 75, defaultValue: 100, maxValue: 125 },
          ],
          instances: [
            {
              name: { en: 'Heading Now 47 Regular' },
              coordinates: { wght: 470, wdth: 100 },
            },
            {
              name: { en: 'Heading Now 76 Bold' },
              coordinates: { wght: 760, wdth: 100 },
            },
            {
              name: { en: 'Heading Now 47 Italic' },
              coordinates: { wght: 470, wdth: 100, slnt: -10 },
            },
          ],
        },
      },
    };

    const rows = extractFvarInstanceStyles(parsed);
    expect(rows).toHaveLength(3);
    expect(rows[0].label).toBe('Heading Now 47 Regular');
    expect(rows[0].weight).toBe(470);
    expect(rows[0].style).toBe('normal');
    expect(rows[0].coordinates).toEqual({ wght: 470, wdth: 100 });
    expect(rows[2].style).toBe('italic');
  });

  it('returns empty list when fvar has no instances', () => {
    expect(extractFvarInstanceStyles({ tables: { fvar: { axes: [{ tag: 'wght' }], instances: [] } } })).toEqual([]);
    expect(extractFvarInstanceStyles(null)).toEqual([]);
  });
});

describe('applyFontInstanceStylesToFont', () => {
  it('writes availableStyles and shared instance lists on font object', () => {
    const font = { id: 'abc' };
    applyFontInstanceStylesToFont(font, [
      {
        id: 'fvar-0',
        label: 'Custom Regular',
        weight: 430,
        style: 'normal',
        coordinates: { wght: 430 },
      },
    ]);

    expect(getFontInstanceStyles(font)).toHaveLength(1);
    expect(font.availableStyles[0]).toEqual({
      name: 'Custom Regular',
      weight: 430,
      style: 'normal',
      coordinates: { wght: 430 },
    });
  });
});

describe('instanceStyleSignature', () => {
  it('deduplicates by full coordinates, not only weight', () => {
    const a = { weight: 400, style: 'normal', coordinates: { wght: 400, wdth: 100 } };
    const b = { weight: 400, style: 'normal', coordinates: { wght: 400, wdth: 125 } };
    expect(instanceStyleSignature(a)).not.toBe(instanceStyleSignature(b));
  });
});
