import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { addSalaryRecord } from '../../services/adminFinanceService';
import { Button } from '../Button';
import { Input } from '../Input';
import { SelectField } from '../SelectField';
import { colors, radius, spacing } from '../../constants/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
  defaultMonth: string;
};

const ROLE_OPTIONS = [
  { id: 'Driver', label: 'Driver' },
  { id: 'Delivery Boy', label: 'Delivery Boy' },
  { id: 'Telecaller', label: 'Telecaller' },
  { id: 'Staff', label: 'Staff' },
] as const;

function formatMonthLabel(month: string): string {
  const [year, monthPart] = month.split('-');
  const date = new Date(Number(year), Number(monthPart) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function AdminAddSalaryModal({ visible, onClose, onAdded, defaultMonth }: Props) {
  const [employeeName, setEmployeeName] = useState('');
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]['id']>('Driver');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      setEmployeeName('');
      setRole('Driver');
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
    const parsedAmount = Number(amount.replace(/,/g, '').trim());
    if (!employeeName.trim()) {
      setError('Enter employee name');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }

    setSaving(true);
    try {
      await addSalaryRecord({
        employeeName: employeeName.trim(),
        role,
        month: defaultMonth,
        amount: parsedAmount,
      });
      onAdded();
      onClose();
    } catch {
      setError('Could not add salary record. Please try again.');
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
              <Text style={styles.title}>Add Salary</Text>
              <Text style={styles.subtitle}>Add a salary entry for {formatMonthLabel(defaultMonth)}.</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Input label="Employee Name" value={employeeName} onChangeText={setEmployeeName} placeholder="Enter employee name" />
            <SelectField label="Role" value={role} options={[...ROLE_OPTIONS]} onChange={setRole} />
            <Input
              label="Amount (₹)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="Enter salary amount"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={handleClose} disabled={saving}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Button title={saving ? 'Saving…' : 'Add Salary'} onPress={handleSubmit} style={styles.saveBtn} />
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
  saveBtn: { minWidth: 120 },
});
