import { useCallback } from 'react';
import { ViewStyle } from 'react-native';
import { useAdminLayout } from './useAdminLayout';

type ColExtra = Pick<ViewStyle, 'alignItems' | 'justifyContent' | 'overflow'>;

/**
 * Desktop: flex columns fill the table width.
 * Mobile: fixed-width columns inside horizontal scroll.
 */
export function useAdminTableColumn() {
  const { isSidebarCollapsed } = useAdminLayout();

  return useCallback(
    (flex: number, mobileWidth: number, extra?: ColExtra): ViewStyle => {
      if (isSidebarCollapsed) {
        return { width: mobileWidth, flexShrink: 0, minWidth: 0, ...extra };
      }
      return { flex, minWidth: 0, ...extra };
    },
    [isSidebarCollapsed],
  );
}
