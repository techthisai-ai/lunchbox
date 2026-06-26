import { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../constants/theme';
import { useAdminLayout } from '../../hooks/useAdminLayout';

type Props = {
  children: ReactNode;
  wide?: boolean;
};

export function AdminPageLayout({ children, wide }: Props) {
  const { pagePadding, showMobileHeader } = useAdminLayout();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.page}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: pagePadding,
            paddingTop: showMobileHeader ? spacing.md : spacing.lg,
            paddingBottom: spacing.xl + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.inner, wide && styles.innerWide]}>{children}</View>
      </ScrollView>
    </View>
  );
}

export function AdminSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  inner: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
  },
  innerWide: {
    maxWidth: 1440,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  section: { marginTop: spacing.sm },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  sectionBody: { gap: 12 },
});

type StatItem = { label: string; value: string };

export function AdminStatGrid({ items, compact }: { items: StatItem[]; compact?: boolean }) {
  const { isSidebarCollapsed } = useAdminLayout();
  const columnCount = isSidebarCollapsed ? 2 : items.length >= 5 ? 3 : items.length <= 4 ? 2 : 3;
  const cellWidth = `${100 / columnCount}%` as const;

  return (
    <View style={statStyles.grid}>
      {items.map((item) => (
        <View key={item.label} style={[statStyles.cell, { width: cellWidth, maxWidth: cellWidth }]}>
          <View style={[statStyles.card, compact && statStyles.cardCompact]}>
            <Text style={[statStyles.value, compact && statStyles.valueCompact]}>{item.value}</Text>
            <Text style={[statStyles.label, compact && statStyles.labelCompact]}>{item.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const statStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -10,
    marginBottom: spacing.md,
  },
  cell: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: 22,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 108,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardCompact: {
    minHeight: 84,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  value: { fontSize: 28, fontWeight: '800', color: colors.orange, lineHeight: 34, textAlign: 'center' },
  valueCompact: { fontSize: 20, lineHeight: 26 },
  label: { fontSize: 12, color: colors.muted, fontWeight: '600', marginTop: 8, lineHeight: 16, textAlign: 'center' },
  labelCompact: { fontSize: 11, marginTop: 6, lineHeight: 14 },
});
