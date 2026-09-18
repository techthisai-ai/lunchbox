import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, shadow, spacing } from '../constants/theme';

export type CheckoutPaymentChoice = 'online' | 'cod';

type Props = {
  value: CheckoutPaymentChoice;
  onChange: (next: CheckoutPaymentChoice) => void;
  disabled?: boolean;
};

const OPTIONS: Array<{
  id: CheckoutPaymentChoice;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    id: 'online',
    title: 'Online Payment (UPI, Cards, NetBanking)',
    subtitle: 'Pay securely via Razorpay checkout.',
    icon: 'card-outline',
  },
  {
    id: 'cod',
    title: 'By Cash',
    subtitle: 'Pay cash to the delivery executive at drop-off.',
    icon: 'cash-outline',
  },
];

export function PaymentMethodSelector({ value, onChange, disabled }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Payment Method</Text>
      <Text style={styles.subheading}>Choose how you would like to pay before selecting a plan.</Text>
      <View style={styles.list}>
        {OPTIONS.map((option) => {
          const selected = value === option.id;
          return (
            <Pressable
              key={option.id}
              style={({ pressed }) => [
                styles.card,
                selected && styles.cardSelected,
                disabled && styles.cardDisabled,
                pressed && !disabled && styles.cardPressed,
              ]}
              onPress={() => onChange(option.id)}
              disabled={disabled}
            >
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
              <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
                <Ionicons name={option.icon} size={20} color={selected ? colors.orange : colors.muted} />
              </View>
              <View style={styles.copy}>
                <Text style={[styles.title, selected && styles.titleSelected]}>{option.title}</Text>
                <Text style={styles.subtitle}>{option.subtitle}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    marginTop: 4,
  },
  heading: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  subheading: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    lineHeight: 17,
    marginBottom: 2,
  },
  list: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    ...shadow.subtle,
  },
  cardSelected: {
    borderColor: colors.orange,
    backgroundColor: '#FFF8F0',
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardPressed: {
    opacity: 0.94,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioSelected: {
    borderColor: colors.orange,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.orange,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapSelected: {
    backgroundColor: colors.orangeLight,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 19,
  },
  titleSelected: {
    color: colors.orangeDark,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    lineHeight: 17,
  },
});
