import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { addExpenseRecord } from '../../services/adminFinanceService';
import { ExpenseCategory, PaymentMethod } from '../../types/finance';
import { Button } from '../Button';
import { Input } from '../Input';
import { SelectField } from '../SelectField';
import { colors, radius, spacing } from '../../constants/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
};

const CATEGORY_OPTIONS: { id: ExpenseCategory; label: string }[] = [
  { id: 'fuel', label: 'Fuel' },
  { id: 'packaging', label: 'Packaging' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'misc', label: 'Miscellaneous' },
];

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string }[] = [
  { id: 'cash', label: 'Cash' },
  { id: 'upi', label: 'UPI' },
  { id: 'card', label: 'Card' },
];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AdminAddExpenseModal({ visible, onClose, onAdded }: Props) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('fuel');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      setTitle('');
      setCategory('fuel');
      setAmount('');
      setNotes('');
      setPaymentMethod('cash');
      setError('');
      setSaving(false);
    }
  }, [visible]);

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleSubmit = async () => {
    setError('');
    const parsedAmount = Number(amount.replace(/,/g, '').trim());
    if (!title.trim()) {
      setError('Enter expense name');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }

    setSaving(true);
    try {
      await addExpenseRecord({
        category,
        title: title.trim(),
        amount: parsedAmount,
        date: todayKey(),
        notes: notes.trim() || undefined,
        paymentMethod,
      });
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add expense');
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
              <Text style={styles.title}>Add Expense</Text>
              <Text style={styles.subtitle}>Fill in the expense details below.</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Input label="Expense Name" value={title} onChangeText={setTitle} placeholder="e.g. Diesel refill" />
            <SelectField label="Category" value={category} options={CATEGORY_OPTIONS} onChange={setCategory} />
            <Input
              label="Amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="Enter amount in ₹"
            />
            <SelectField label="Payment Method" value={paymentMethod} options={PAYMENT_OPTIONS} onChange={setPaymentMethod} />
            <Input
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional description"
              multiline
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={handleClose} disabled={saving}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Button title={saving ? 'Saving…' : 'Add Expense'} onPress={handleSubmit} style={styles.saveBtn} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(58, 41, 66, 0.45)',
  },
  dialog: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
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
  form: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  error: { color: colors.red, fontSize: 13, marginBottom: 8, fontWeight: '600' },
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
  saveBtn: { minWidth: 140 },
});
