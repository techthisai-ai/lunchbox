import { Children, ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useAdminLayout } from '../../hooks/useAdminLayout';

type Props = {
  children: ReactNode;
  /** Compact cards in a single horizontal row (dashboard). */
  dense?: boolean;
};

export function AdminKpiRow({ children, dense }: Props) {
  const { isSidebarCollapsed, width } = useAdminLayout();
  const singleRow = !isSidebarCollapsed && !dense && width >= 1200;
  const items = Children.toArray(children);

  if (dense) {
    const useScroll = isSidebarCollapsed || width < 900;

    if (useScroll) {
      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollRow}
        >
          {items.map((child, index) => (
            <View key={index} style={styles.itemScroll}>
              {child}
            </View>
          ))}
        </ScrollView>
      );
    }

    const itemStyle = items.length <= 3 ? styles.itemDenseFixed : styles.itemDense;

    return (
      <View style={[styles.row, styles.nowrap, styles.rowStart]}>
        {items.map((child, index) => (
          <View key={index} style={itemStyle}>
            {child}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.row, singleRow ? styles.nowrap : styles.wrap]}>
      {items.map((child, index) => (
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
    gap: 8,
    marginBottom: 12,
  },
  scrollRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    paddingRight: 4,
  },
  wrap: { flexWrap: 'wrap' },
  nowrap: { flexWrap: 'nowrap' },
  rowStart: { alignItems: 'flex-start' },
  item: { minWidth: 0 },
  itemGrid: {
    width: '47%',
    flexGrow: 1,
  },
  itemSingle: {
    flex: 1,
  },
  itemDense: {
    flex: 1,
    minWidth: 0,
  },
  itemDenseFixed: {
    width: 148,
    flexShrink: 0,
  },
  itemScroll: {
    width: 148,
    flexShrink: 0,
  },
});
