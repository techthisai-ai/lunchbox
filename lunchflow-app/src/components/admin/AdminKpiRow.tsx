import { Children, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAdminLayout } from '../../hooks/useAdminLayout';

type Props = {
  children: ReactNode;
  dense?: boolean;
};

export function AdminKpiRow({ children, dense }: Props) {
  const { isSidebarCollapsed, width } = useAdminLayout();
  const singleRow = !isSidebarCollapsed && !dense && width >= 1200;

  return (
    <View style={[styles.row, singleRow ? styles.nowrap : styles.wrap]}>
      {Children.toArray(children).map((child, index) => (
        <View key={index} style={[styles.item, singleRow ? styles.itemSingle : styles.itemGrid]}>
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  wrap: { flexWrap: 'wrap' },
  nowrap: { flexWrap: 'nowrap' },
  item: { minWidth: 0 },
  itemGrid: {
    width: '47%',
    flexGrow: 1,
  },
  itemSingle: {
    flex: 1,
  },
});
