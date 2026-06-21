import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../constants/theme';
import { ONLINE_PAYMENT_OPTIONS } from '../services/paymentService';

type Props = {
  visible: boolean;
  amount: number;
  description: string;
  paying?: boolean;
  onSelect: (methodId: string) => void;
  onCancel: () => void;
};

export function OnlinePaymentDialog({ visible, amount, description, paying, onSelect, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>Pay Online</Text>
          <Text style={styles.subtitle}>{description}</Text>
          <Text style={styles.amount}>₹{amount.toLocaleString('en-IN')}</Text>

          <Text style={styles.section}>Choose payment method</Text>
          {ONLINE_PAYMENT_OPTIONS.map((option) => (
            <Pressable
              key={option.id}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed, paying && styles.optionDisabled]}
              onPress={() => !paying && onSelect(option.id)}
              disabled={paying}
            >
              <View style={[styles.optionIcon, { backgroundColor: option.iconBg }]}>
                <Text style={[styles.optionIconText, { color: option.iconColor }]}>{option.icon}</Text>
              </View>
              <View style={styles.optionBody}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.optionSub}>{option.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}

          {paying ? <Text style={styles.processing}>Opening payment app…</Text> : null}
          <Pressable onPress={onCancel} style={styles.cancelBtn} disabled={paying}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(58, 41, 66, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 4 },
  amount: { fontSize: 32, fontWeight: '800', color: colors.orange, textAlign: 'center', marginTop: 8 },
  section: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionPressed: { opacity: 0.85 },
  optionDisabled: { opacity: 0.6 },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconText: { fontSize: 11, fontWeight: '800' },
  optionBody: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  optionSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  processing: { fontSize: 13, color: colors.green, fontWeight: '600', textAlign: 'center', marginTop: spacing.md },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
  cancelText: { fontSize: 14, fontWeight: '600', color: colors.muted },
});
