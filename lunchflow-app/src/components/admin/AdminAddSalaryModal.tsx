import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { addSalaryRecord, listSalaryRecords } from '../../services/adminFinanceService';
import { listTelecallers } from '../../services/telecallerService';
import { loadRegisteredDrivers } from '../../services/userRegistryService';
import { Button } from '../Button';
import { Input } from '../Input';
import { SelectField } from '../SelectField';
import { colors, radius, spacing } from '../../constants/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
  defaultMonth: string;
  defaultEmployeeName?: string;
  defaultRole?: string;
};

const ROLE_OPTIONS = [
  { id: 'Driver', label: 'Driver' },
  { id: 'Delivery Boy', label: 'Delivery Boy' },
  { id: 'Telecaller', label: 'Telecaller' },
  { id: 'Staff', label: 'Staff' },
] as const;

type RoleId = (typeof ROLE_OPTIONS)[number]['id'];

function formatMonthLabel(month: string): string {
  const [year, monthPart] = month.split('-');
  const date = new Date(Number(year), Number(monthPart) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

async function loadEmployeeNamesForRole(role: RoleId): Promise<string[]> {
  if (role === 'Driver' || role === 'Delivery Boy') {
    const drivers = await loadRegisteredDrivers();
    return drivers
      .filter((driver) => (driver.approvalStatus ?? 'approved') === 'approved')
      .map((driver) => driver.name.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }

  if (role === 'Telecaller') {
    const telecallers = await listTelecallers();
    return telecallers
      .map((telecaller) => telecaller.name.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }

  // Staff: unique names previously saved under Staff role
  const records = await listSalaryRecords();
  const names = new Set<string>();
  for (const record of records) {
    if (record.role.trim().toLowerCase() !== 'staff') continue;
    const name = record.employeeName.trim();
    if (name) names.add(name);
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

export function AdminAddSalaryModal({
  visible,
  onClose,
  onAdded,
  defaultMonth,
  defaultEmployeeName = '',
  defaultRole = 'Driver',
}: Props) {
  const [employeeName, setEmployeeName] = useState('');
  const [role, setRole] = useState<RoleId>('Driver');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [employeeNames, setEmployeeNames] = useState<string[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  useEffect(() => {
    if (!visible) {
      setEmployeeName('');
      setRole('Driver');
      setAmount('');
      setError('');
      setSaving(false);
      setEmployeeNames([]);
      return;
    }
    const nextRole = ROLE_OPTIONS.some((option) => option.id === defaultRole)
      ? (defaultRole as RoleId)
      : 'Driver';
    setRole(nextRole);
    setEmployeeName(defaultEmployeeName);
    setAmount('');
    setError('');
  }, [visible, defaultEmployeeName, defaultRole]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoadingEmployees(true);
    loadEmployeeNamesForRole(role)
      .then((names) => {
        if (cancelled) return;
        setEmployeeNames(names);
        setEmployeeName((current) => {
          if (current && names.includes(current)) return current;
          if (defaultEmployeeName && names.includes(defaultEmployeeName) && role === defaultRole) {
            return defaultEmployeeName;
          }
          return '';
        });
      })
      .catch(() => {
        if (!cancelled) setEmployeeNames([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingEmployees(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, role, defaultEmployeeName, defaultRole]);

  const employeeOptions = useMemo(
    () => employeeNames.map((name) => ({ id: name, label: name })),
    [employeeNames],
  );

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleRoleChange = (nextRole: RoleId) => {
    setRole(nextRole);
    setEmployeeName('');
    setError('');
  };

  const handleSubmit = async () => {
    if (saving) return;
    setError('');
    const parsedAmount = Number(amount.replace(/,/g, '').trim());
    if (!employeeName.trim()) {
      setError(loadingEmployees ? 'Loading employees…' : 'Select an employee name');
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
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not add salary record. Please try again.');
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
            <SelectField label="Role" value={role} options={[...ROLE_OPTIONS]} onChange={handleRoleChange} />
            <SelectField
              label="Employee Name"
              value={(employeeName || '') as string}
              options={employeeOptions}
              onChange={setEmployeeName}
              placeholder={
                loadingEmployees
                  ? 'Loading employees…'
                  : employeeOptions.length === 0
                    ? `No ${role.toLowerCase()}s found`
                    : 'Select employee name'
              }
            />
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
