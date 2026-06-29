import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useAdminLayout } from '../../hooks/useAdminLayout';

type Props = {
  children: ReactNode;
  minWidth?: number;
};

export function AdminTableScroll({ children, minWidth = 760 }: Props) {
  const { isSidebarCollapsed } = useAdminLayout();

  if (!isSidebarCollapsed) {
    return <View style={styles.fullWidth}>{children}</View>;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator
      nestedScrollEnabled
      contentContainerStyle={styles.content}
      style={styles.scroll}
    >
      <View style={[styles.inner, { minWidth }]}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fullWidth: { width: '100%' },
  scroll: { width: '100%' },
  content: { flexGrow: 1 },
  inner: { width: '100%' },
});
