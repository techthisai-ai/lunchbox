import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AdminPageLayout } from '../../components/admin/AdminPageLayout';
import { Button } from '../../components/Button';
import { colors, radius, spacing } from '../../constants/theme';
import { DEFAULT_DELIVERY_SLOTS, DeliverySlot, loadDeliverySlots, saveDeliverySlot } from '../../services/deliverySlotService';
import { loadPricingPlans, savePricingPlans, PricingPlan } from '../../services/slotPricingService';

function slugifySlotId(label: string): string {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug || `slot-${Date.now()}`;
}

function isValidTime(value: string): boolean {
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(value.trim());
}

export function AdminSlotsScreen() {
  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [newSlotName, setNewSlotName] = useState('');
  const [newSlotStart, setNewSlotStart] = useState('');
  const [newSlotEnd, setNewSlotEnd] = useState('');
  const [newSlotCapacity, setNewSlotCapacity] = useState('');
  const [slotError, setSlotError] = useState('');
  const [addingSlot, setAddingSlot] = useState(false);

  const refresh = useCallback(async () => {
    const loadedSlots = await loadDeliverySlots();
    setSlots(loadedSlots.length ? loadedSlots : DEFAULT_DELIVERY_SLOTS);
    setPlans(await loadPricingPlans());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const updateSlotCapacity = async (slot: DeliverySlot, capacity: string) => {
    const next = { ...slot, capacity: Number(capacity) || slot.capacity };
    await saveDeliverySlot(next);
    await refresh();
  };

  const updatePlanAmount = async (plan: PricingPlan, amount: string) => {
    const nextPlans = plans.map((p) => (p.id === plan.id ? { ...p, amount: Number(amount) || p.amount } : p));
    await savePricingPlans(nextPlans);
    setPlans(nextPlans);
  };

  const handleAddSlot = async () => {
    if (addingSlot) return;
    setSlotError('');
    const name = newSlotName.trim();
    const startTime = newSlotStart.trim();
    const endTime = newSlotEnd.trim();
    const capacity = Number(newSlotCapacity);

    if (!name) {
      setSlotError('Enter a slot name');
      return;
    }
    if (!isValidTime(startTime)) {
      setSlotError('Enter start time as HH:MM');
      return;
    }
    if (!isValidTime(endTime)) {
      setSlotError('Enter end time as HH:MM');
      return;
    }
    if (!capacity || capacity < 1) {
      setSlotError('Enter a valid capacity');
      return;
    }

    const baseId = slugifySlotId(name);
    const id = slots.some((slot) => slot.id === baseId) ? `${baseId}-${Date.now()}` : baseId;
    const label = `${name} (${startTime}–${endTime})`;

    setAddingSlot(true);
    try {
      await saveDeliverySlot({
        id,
        label,
        startTime,
        endTime,
        capacity,
        booked: 0,
        active: true,
      });
      setNewSlotName('');
      setNewSlotStart('');
      setNewSlotEnd('');
      setNewSlotCapacity('');
      await refresh();
    } catch {
      setSlotError('Could not add delivery slot');
    } finally {
      setAddingSlot(false);
    }
  };

  return (
    <AdminPageLayout wide>
      <View style={styles.sectionsRow}>
        <View style={styles.sectionPanel}>
          <Text style={styles.sectionTitle}>Delivery Slots</Text>
          <View style={styles.tableCard}>
            <View style={styles.table}>
              <View style={styles.headerRow}>
                <View style={styles.colSlot}>
                  <Text style={styles.th}>Slot</Text>
                </View>
                <View style={styles.colWindow}>
                  <Text style={styles.th}>Window</Text>
                </View>
                <View style={styles.colBooked}>
                  <Text style={styles.th}>Booked</Text>
                </View>
                <View style={styles.colInput}>
                  <Text style={styles.th}>Capacity</Text>
                </View>
              </View>
              {slots.map((slot) => (
                <View key={slot.id} style={styles.row}>
                  <View style={styles.colSlot}>
                    <Text style={styles.td} numberOfLines={1}>
                      {slot.label}
                    </Text>
                  </View>
                  <View style={styles.colWindow}>
                    <Text style={styles.td} numberOfLines={1}>
                      {slot.startTime} - {slot.endTime}
                    </Text>
                  </View>
                  <View style={styles.colBooked}>
                    <Text style={styles.td} numberOfLines={1}>
                      {slot.booked}
                    </Text>
                  </View>
                  <View style={styles.colInput}>
                    <TextInput
                      style={styles.numInput}
                      keyboardType="number-pad"
                      defaultValue={String(slot.capacity)}
                      onEndEditing={(e) => updateSlotCapacity(slot, e.nativeEvent.text)}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.addForm}>
            <Text style={styles.addFormTitle}>Add Delivery Slot</Text>
            <View style={styles.addFormRow}>
              <View style={styles.addFieldWide}>
                <Text style={styles.addLabel}>Slot Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={newSlotName}
                  onChangeText={setNewSlotName}
                  placeholder="e.g. Evening"
                  placeholderTextColor={colors.muted}
                />
              </View>
              <View style={styles.addFieldTime}>
                <Text style={styles.addLabel}>Start</Text>
                <TextInput
                  style={styles.textInput}
                  value={newSlotStart}
                  onChangeText={setNewSlotStart}
                  placeholder="14:00"
                  placeholderTextColor={colors.muted}
                />
              </View>
              <View style={styles.addFieldTime}>
                <Text style={styles.addLabel}>End</Text>
                <TextInput
                  style={styles.textInput}
                  value={newSlotEnd}
                  onChangeText={setNewSlotEnd}
                  placeholder="15:00"
                  placeholderTextColor={colors.muted}
                />
              </View>
              <View style={styles.addFieldCapacity}>
                <Text style={styles.addLabel}>Capacity</Text>
                <TextInput
                  style={styles.textInput}
                  value={newSlotCapacity}
                  onChangeText={setNewSlotCapacity}
                  keyboardType="number-pad"
                  placeholder="50"
                  placeholderTextColor={colors.muted}
                />
              </View>
              <Button
                title={addingSlot ? 'Adding...' : 'Add Slot'}
                onPress={handleAddSlot}
                small
                style={styles.addBtn}
              />
            </View>
            {slotError ? <Text style={styles.addError}>{slotError}</Text> : null}
          </View>
        </View>

        <View style={styles.sectionPanel}>
          <Text style={styles.sectionTitle}>Subscription Pricing</Text>
          <View style={styles.tableCard}>
            <View style={styles.table}>
              <View style={styles.headerRow}>
                <View style={styles.colPlan}>
                  <Text style={styles.th}>Plan</Text>
                </View>
                <View style={styles.colDuration}>
                  <Text style={styles.th}>Duration</Text>
                </View>
                <View style={styles.colInput}>
                  <Text style={styles.th}>Amount (₹)</Text>
                </View>
              </View>
              {plans.map((plan) => (
                <View key={plan.id} style={styles.row}>
                  <View style={styles.colPlan}>
                    <Text style={styles.td} numberOfLines={1}>
                      {plan.name}
                    </Text>
                  </View>
                  <View style={styles.colDuration}>
                    <Text style={styles.td} numberOfLines={1}>
                      {plan.durationDays} days
                    </Text>
                  </View>
                  <View style={styles.colInput}>
                    <TextInput
                      style={styles.numInput}
                      keyboardType="number-pad"
                      defaultValue={String(plan.amount)}
                      onEndEditing={(e) => updatePlanAmount(plan, e.nativeEvent.text)}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </AdminPageLayout>
  );
}

const styles = StyleSheet.create({
  sectionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'flex-start',
  },
  sectionPanel: {
    flex: 1,
    minWidth: 280,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: spacing.sm,
    color: colors.text,
  },
  tableCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  table: { width: '100%' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    gap: 8,
  },
  th: { fontSize: 11, fontWeight: '800', color: colors.muted, textTransform: 'uppercase' },
  td: { fontSize: 13, color: colors.text, fontWeight: '600' },
  colSlot: { flex: 0.9, minWidth: 0 },
  colWindow: { flex: 1.3, minWidth: 0 },
  colBooked: { width: 52, flexShrink: 0 },
  colPlan: { flex: 1, minWidth: 0 },
  colDuration: { flex: 0.85, minWidth: 0 },
  colInput: { width: 76, flexShrink: 0, alignItems: 'flex-start' },
  numInput: {
    width: 72,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    height: 34,
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  addForm: {
    marginTop: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  addFormTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  addFormRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: 8,
  },
  addFieldWide: {
    flex: 1,
    minWidth: 120,
  },
  addFieldTime: {
    width: 84,
  },
  addFieldCapacity: {
    width: 76,
  },
  addLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    height: 34,
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  addBtn: {
    alignSelf: 'flex-end',
    minWidth: 96,
    height: 34,
    paddingVertical: 0,
  },
  addError: {
    fontSize: 12,
    color: colors.red,
    fontWeight: '600',
  },
});
