import { useEffect, useState } from 'react';
import { Dimensions, ScaledSize } from 'react-native';
import { spacing } from '../constants/theme';

export const ADMIN_SIDEBAR_BREAKPOINT = 768;

function getMetrics(): ScaledSize {
  return Dimensions.get('window');
}

export function useAdminLayout() {
  const [window, setWindow] = useState(getMetrics);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window: next }) => {
      setWindow(next);
    });
    return () => sub.remove();
  }, []);

  const width = window.width;
  const isSidebarCollapsed = width < ADMIN_SIDEBAR_BREAKPOINT;
  const isCompact = width < 480;
  const isTablet = width >= 480 && width < ADMIN_SIDEBAR_BREAKPOINT;

  const pagePadding = isCompact ? spacing.sm : isTablet ? spacing.md : spacing.xl;
  const pageTitleSize = isCompact ? 22 : 28;
  const kpiMinWidth = isCompact ? '47%' : isTablet ? 150 : 160;
  const kpiCardMinWidth = isCompact ? 0 : isTablet ? 160 : 200;

  return {
    width,
    isSidebarCollapsed,
    isCompact,
    isTablet,
    showMobileHeader: isSidebarCollapsed,
    pagePadding,
    pageTitleSize,
    kpiMinWidth,
    kpiCardMinWidth,
  };
}
