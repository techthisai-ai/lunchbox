import { createElement, useEffect, useState } from 'react';
import { Image, ImageStyle, Platform, StyleProp, StyleSheet } from 'react-native';

type Props = {
  uri: string;
  width?: number;
  height?: number;
  fill?: boolean;
  style?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
};

/** Remote promo banners — uses native <img> on web so mobile browsers render reliably. */
export function PromoBannerImage({
  uri,
  width,
  height,
  fill = false,
  style,
  accessibilityLabel,
}: Props) {
  const [src, setSrc] = useState(uri);

  useEffect(() => {
    setSrc(uri);
  }, [uri]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !uri.startsWith('data:')) return;

    let objectUrl: string | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setSrc(objectUrl);
      } catch {
        if (!cancelled) setSrc(uri);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [uri]);

  const flat = StyleSheet.flatten(style) ?? {};
  const sizingStyle = fill
    ? { width: '100%' as const, height: '100%' as const }
    : { width, height };

  if (Platform.OS === 'web') {
    return createElement('img', {
      src,
      alt: accessibilityLabel ?? '',
      decoding: 'async',
      style: {
        ...flat,
        ...sizingStyle,
        objectFit: 'cover',
        objectPosition: 'center',
        display: 'block',
      },
    });
  }

  return (
    <Image
      source={{ uri: src }}
      style={[sizingStyle, flat]}
      resizeMode="cover"
      accessibilityLabel={accessibilityLabel}
    />
  );
}
