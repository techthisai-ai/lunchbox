import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

type Props = {
  children: ReactNode;
  minWidth?: number;
};

export function AdminTableScroll({ children, minWidth = 760 }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled contentContainerStyle={styles.content}>
      <View style={[styles.inner, { minWidth }]}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  inner: { width: '100%' },
});
