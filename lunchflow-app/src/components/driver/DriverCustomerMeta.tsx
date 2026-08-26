import { StyleSheet, Text } from 'react-native';
import { colors } from '../../constants/theme';

function formatCustomerPhone(phone?: string): string {
  const digits = phone?.replace(/\D/g, '') ?? '';
  const normalized = digits.length > 10 ? digits.slice(-10) : digits;
  if (normalized.length !== 10) return phone?.trim() || '—';
  return `${normalized.slice(0, 5)} ${normalized.slice(5)}`;
}

type Props = {
  name?: string;
  phone?: string;
  compact?: boolean;
};

export function DriverCustomerMeta({ name, phone, compact = false }: Props) {
  const displayName = name?.trim();
  const displayPhone = phone?.trim();
  if (!displayName && !displayPhone) return null;

  return (
    <Text style={[styles.meta, compact && styles.metaCompact]} numberOfLines={2}>
      {displayName ? displayName : 'Customer'}
      {displayPhone ? ` · ${formatCustomerPhone(displayPhone)}` : ''}
    </Text>
  );
}

const styles = StyleSheet.create({
  meta: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginTop: 6,
    lineHeight: 17,
  },
  metaCompact: {
    marginTop: 4,
  },
});
