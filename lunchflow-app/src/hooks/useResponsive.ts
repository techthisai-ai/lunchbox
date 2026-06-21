import { useEffect, useState } from 'react';
import { Dimensions, Platform, ScaledSize } from 'react-native';

const MOBILE_MAX = 480;
const TABLET_MAX = 768;

function getMetrics(): ScaledSize {
  return Dimensions.get('window');
}

export function useResponsive() {
  const [window, setWindow] = useState(getMetrics);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window: next }) => {
      setWindow(next);
    });
    return () => sub.remove();
  }, []);

  const width = window.width;
  const height = window.height;
  const isWeb = Platform.OS === 'web';
  const isCompact = width < MOBILE_MAX;
  const isTablet = width >= MOBILE_MAX && width < TABLET_MAX;
  const isWide = width >= MOBILE_MAX;

  const contentMaxWidth = isWide ? MOBILE_MAX : width;
  const horizontalPadding = isCompact ? 16 : isTablet ? 24 : 20;
  const foodReadySize = Math.min(Math.max(width * 0.46, 150), 180);
  const bottomInsetPadding = isWeb ? 8 : 0;

  return {
    width,
    height,
    isWeb,
    isCompact,
    isTablet,
    isWide,
    contentMaxWidth,
    horizontalPadding,
    foodReadySize,
    bottomInsetPadding,
  };
}
