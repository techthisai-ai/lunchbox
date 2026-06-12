import { ReactNode } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, shadow, spacing } from '../constants/theme';

type Props = {
  children: ReactNode;
  flat?: boolean;
  style?: ViewStyle;
  title?: string;
  badge?: ReactNode;
  headerRight?: ReactNode;
};

export function Card({ children, flat, style, title, badge, headerRight }: Props) {
  return (
    <View style={[styles.card, flat && styles.flat, style]}>
      {(title || badge || headerRight) && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {badge}
          </View>
          {headerRight}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 14,
    ...shadow.card,
  },
  flat: {
    ...shadow.card,
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
});
