import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing } from '../constants/theme';

const GREEN = '#2E7D32';
const GREEN_LIGHT = '#C8E6C9';

type Props = {
  title: string;
  whenLabel: string;
};

export function HomeDeliveredProofCard({ title, whenLabel }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Delivered</Text>
        </View>
      </View>

      <Text style={styles.when}>{whenLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GREEN_LIGHT,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.subtle,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: GREEN,
    lineHeight: 22,
  },
  badge: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: GREEN,
  },
  when: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
});
