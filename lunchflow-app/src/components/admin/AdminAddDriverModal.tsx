import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../Button';
import { Input } from '../Input';
import { colors, radius, spacing } from '../../constants/theme';
import { registerDriverRecord } from '../../services/userRegistryService';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
};

const EMPTY_FORM = {
  name: '',
  phone: '',
  vehicle: '',
  licenseNumber: '',
};

export function AdminAddDriverModal({ visible, onClose, onAdded }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      setName(EMPTY_FORM.name);
      setPhone(EMPTY_FORM.phone);
      setVehicle(EMPTY_FORM.vehicle);
      setLicenseNumber(EMPTY_FORM.licenseNumber);
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
    setSaving(true);
    try {
      await registerDriverRecord({
        name,
        phone,
        vehicle,
        licenseNumber,
      }, { approvedByAdmin: true });
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add driver');
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
              <Text style={styles.title}>Add Driver</Text>
              <Text style={styles.subtitle}>Fill in driver details to register a new employee.</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Input label="Full Name" value={name} onChangeText={setName} placeholder="Enter driver full name" />
            <Input
              label="Mobile Number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="Enter 10-digit mobile number"
            />
            <Input
              label="Vehicle Number"
              value={vehicle}
              onChangeText={setVehicle}
              placeholder="e.g. DL 4C AB 1234"
              autoCapitalize="characters"
            />
            <Input
              label="Driving License Number"
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              placeholder="Enter license number"
              autoCapitalize="characters"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={handleClose} disabled={saving}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Button title={saving ? 'Saving…' : 'Add Driver'} onPress={handleSubmit} style={styles.saveBtn} />
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
