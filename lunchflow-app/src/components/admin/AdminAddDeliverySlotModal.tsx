import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { saveDeliverySlot } from '../../services/deliverySlotService';
import { Button } from '../Button';
import { Input } from '../Input';
import { colors, radius, spacing } from '../../constants/theme';

function slugifySlotId(label: string): string {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug || `slot-${Date.now()}`;
}

function isValidTime(value: string): boolean {
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(value.trim());
}

type Props = {
  visible: boolean;
  existingIds: string[];
  onClose: () => void;
  onAdded: () => void;
};

export function AdminAddDeliverySlotModal({ visible, existingIds, onClose, onAdded }: Props) {
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [capacity, setCapacity] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      setName('');
      setStartTime('');
      setEndTime('');
      setCapacity('');
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

    const slotName = name.trim();
    const start = startTime.trim();
    const end = endTime.trim();
    const cap = Number(capacity);

    if (!slotName) {
      setError('Enter a slot name');
      return;
    }
    if (!isValidTime(start)) {
      setError('Enter start time as HH:MM');
      return;
    }
    if (!isValidTime(end)) {
      setError('Enter end time as HH:MM');
      return;
    }
    if (!cap || cap < 1) {
      setError('Enter a valid capacity');
      return;
    }

    const baseId = slugifySlotId(slotName);
    const id = existingIds.includes(baseId) ? `${baseId}-${Date.now()}` : baseId;

    setSaving(true);
    try {
      await saveDeliverySlot({
        id,
        label: `${slotName} (${start}–${end})`,
        startTime: start,
        endTime: end,
        capacity: cap,
        booked: 0,
        active: true,
      });
      onAdded();
      onClose();
    } catch {
      setError('Could not add delivery slot');
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
              <Text style={styles.title}>Add Delivery Slot</Text>
              <Text style={styles.subtitle}>Create a new delivery time window.</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Input label="Slot Name" value={name} onChangeText={setName} placeholder="e.g. Evening" />
            <Input label="Start Time" value={startTime} onChangeText={setStartTime} placeholder="HH:MM" />
            <Input label="End Time" value={endTime} onChangeText={setEndTime} placeholder="HH:MM" />
            <Input
              label="Capacity"
              value={capacity}
              onChangeText={setCapacity}
              keyboardType="number-pad"
              placeholder="Enter capacity"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Button title={saving ? 'Adding…' : 'Add Slot'} onPress={handleSubmit} style={styles.saveBtn} />
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
