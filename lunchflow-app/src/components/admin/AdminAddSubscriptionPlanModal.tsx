import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PricingPlan, savePricingPlans } from '../../services/slotPricingService';
import { Button } from '../Button';
import { Input } from '../Input';
import { colors, radius, spacing } from '../../constants/theme';

function slugifyPlanId(label: string): string {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug || `plan-${Date.now()}`;
}

type Props = {
  visible: boolean;
  plans: PricingPlan[];
  onClose: () => void;
  onAdded: (nextPlans: PricingPlan[]) => void;
};

export function AdminAddSubscriptionPlanModal({ visible, plans, onClose, onAdded }: Props) {
  const [name, setName] = useState('');
  const [planType, setPlanType] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      setName('');
      setPlanType('');
      setDurationDays('');
      setAmount('');
      setError('');
      setSaving(false);
    }
  }, [visible]);

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (saving) return;
    setError('');

    const planName = name.trim();
    const type = planType.trim() || 'Custom plan';
    const duration = Number(durationDays);
    const price = Number(amount);

    if (!planName) {
      setError('Enter a plan name');
      return;
    }
    if (!price || price < 1) {
      setError('Enter a valid amount');
      return;
    }
    if (!duration || duration < 1) {
      setError('Enter a valid duration in days');
      return;
    }

    const baseId = slugifyPlanId(planName);
    const id = plans.some((plan) => plan.id === baseId) ? `${baseId}-${Date.now()}` : baseId;

    setSaving(true);
    try {
      const nextPlans: PricingPlan[] = [
        ...plans,
        { id, name: planName, amount: price, durationDays: duration, active: true, planType: type },
      ];
      await savePricingPlans(nextPlans);
      onAdded(nextPlans);
      onClose();
    } catch {
      setError('Could not add pricing plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.dialog}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Add Subscription Plan</Text>
              <Text style={styles.subtitle}>Create a new customer pricing plan.</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Input label="Plan Name" value={name} onChangeText={setName} placeholder="e.g. Weekend plan" />
            <Input label="Type" value={planType} onChangeText={setPlanType} placeholder="Single order / Monthly" />
            <Input
              label="Duration (days)"
              value={durationDays}
              onChangeText={setDurationDays}
              keyboardType="number-pad"
              placeholder="Enter days"
            />
            <Input
              label="Amount (₹)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="number-pad"
              placeholder="Enter amount"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Button title={saving ? 'Adding…' : 'Add Plan'} onPress={handleSubmit} style={styles.saveBtn} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(58, 41, 66, 0.45)' },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 4, fontWeight: '600', lineHeight: 18 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  formScroll: { flexGrow: 0 },
  form: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
  error: { color: colors.red, fontSize: 13, fontWeight: '600' },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: colors.text },
  saveBtn: { minWidth: 120 },
});
