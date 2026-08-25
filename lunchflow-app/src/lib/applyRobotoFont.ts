import type { TextStyle } from 'react-native';
import { resolveAppFontFamily } from '../constants/fonts';

type StyleLike = Record<string, unknown> | null | undefined | false | StyleLike[];

function flattenStyle(style: StyleLike): Record<string, unknown> {
  if (style == null || style === false) return {};
  if (Array.isArray(style)) {
    const out: Record<string, unknown> = {};
    for (const item of style) {
      Object.assign(out, flattenStyle(item));
    }
    return out;
  }
  if (typeof style === 'object') return style as Record<string, unknown>;
  return {};
}

/** Pin the correct bundled face from fontWeight / explicit accent family. */
export function applyRobotoFontStyle(style: StyleLike): StyleLike {
  const flat = flattenStyle(style);
  const fontFamily = resolveAppFontFamily(
    flat.fontWeight as TextStyle['fontWeight'],
    flat.fontFamily as string | undefined,
  );
  return [style, { fontFamily, fontWeight: 'normal' }];
}
