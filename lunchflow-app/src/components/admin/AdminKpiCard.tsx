import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../../constants/theme';

type Props = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
  compact?: boolean;
  trend?: string;
  trendUp?: boolean;
  linkLabel?: string;
  subtext?: string;
};

export function AdminKpiCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  valueColor,
  compact,
  trend,
  trendUp,
  linkLabel,
  subtext,
}: Props) {
  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={[styles.iconWrap, compact && styles.iconWrapCompact, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={compact ? 14 : 16} color={iconColor} />
      </View>
      <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[styles.value, compact && styles.valueCompact, valueColor ? { color: valueColor } : null]}
        numberOfLines={1}
      >
        {value}
      </Text>
      {trend ? (
        <Text style={[styles.footer, trendUp === false && styles.trendDown]} numberOfLines={1}>
          {trendUp === false ? '↓ ' : '↑ '}
          {trend}
        </Text>
      ) : linkLabel ? (
        <Text style={styles.link} numberOfLines={1}>
          {linkLabel}
        </Text>
      ) : subtext ? (
        <Text style={styles.subtext} numberOfLines={1}>
          {subtext}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 160,
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 96,
  },
  cardCompact: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 8,
    minHeight: 84,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconWrapCompact: {
    width: 28,
    height: 28,
    borderRadius: 8,
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
    textAlign: 'center',
  },
  labelCompact: { fontSize: 10 },
  value: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
    textAlign: 'center',
  },
  valueCompact: { fontSize: 18, marginTop: 2 },
  footer: {
    fontSize: 10,
    color: colors.greenDark,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  trendDown: { color: colors.orange },
  link: {
    fontSize: 11,
    color: colors.orange,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
});
