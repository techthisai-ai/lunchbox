import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AdminAddDeliverySlotModal } from '../../components/admin/AdminAddDeliverySlotModal';
import { AdminAddPickupAreaModal } from '../../components/admin/AdminAddPickupAreaModal';
import { AdminAddSubscriptionPlanModal } from '../../components/admin/AdminAddSubscriptionPlanModal';
import { AdminPageActionBar } from '../../components/admin/AdminPageActionBar';
import { AdminPageLayout } from '../../components/admin/AdminPageLayout';
import { AdminPickupAreasSection, loadAdminPickupAreas } from '../../components/admin/AdminPickupAreasSection';
import { AdminSectionHeader } from '../../components/admin/AdminSectionHeader';
import { AdminTableScroll } from '../../components/admin/AdminTableScroll';
import { colors, radius, spacing } from '../../constants/theme';
import { useAdminTableColumn } from '../../hooks/useAdminTableColumn';
import { LEGACY_CATEGORY_PLAN_IDS } from '../../constants/subscriptions';
import { DEFAULT_DELIVERY_SLOTS, DeliverySlot, loadDeliverySlots, saveDeliverySlot } from '../../services/deliverySlotService';
import {
  defaultAdminPricingPlans,
  filterAdminPricingPlans,
  loadPricingPlans,
  PricingPlan,
  savePricingPlans,
} from '../../services/slotPricingService';
import { PickupAreaSlot } from '../../types/pickupAreaSlot';

export function AdminSlotsScreen() {
  const col = useAdminTableColumn();
  const slotCols = {
    slot: col(0.9, 140),
    window: col(1.3, 130),
    booked: col(0.4, 60, { alignItems: 'center' }),
    input: col(0.5, 85, { alignItems: 'flex-start' }),
  };
  const planCols = {
    plan: col(1.2, 180),
    type: col(0.8, 110),
    duration: col(0.85, 100),
    input: col(0.5, 85, { alignItems: 'flex-start' }),
  };
  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [pickupAreas, setPickupAreas] = useState<PickupAreaSlot[]>([]);
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [editPickupArea, setEditPickupArea] = useState<PickupAreaSlot | null>(null);

  const refresh = useCallback(async () => {
    const loadedSlots = await loadDeliverySlots();
    setSlots(loadedSlots.length ? loadedSlots : DEFAULT_DELIVERY_SLOTS);

    const loadedPlans = filterAdminPricingPlans(await loadPricingPlans());
    const defaults = defaultAdminPricingPlans();
    const defaultIds = new Set(defaults.map((plan) => plan.id));
    const mergedDefaults = defaults.map(
      (defaultPlan) => loadedPlans.find((plan) => plan.id === defaultPlan.id) ?? defaultPlan,
    );
    const customPlans = loadedPlans.filter((plan) => !defaultIds.has(plan.id));
    const visiblePlans = [...mergedDefaults, ...customPlans];
    setPlans(visiblePlans);

    const rawPlans = await loadPricingPlans();
    if (rawPlans.length !== visiblePlans.length || rawPlans.some((plan) => LEGACY_CATEGORY_PLAN_IDS.has(plan.id))) {
      await savePricingPlans(visiblePlans);
    }

    setPickupAreas(await loadAdminPickupAreas());
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

  return (
    <AdminPageLayout wide>
      <AdminAddDeliverySlotModal
        visible={slotModalOpen}
        existingIds={slots.map((slot) => slot.id)}
        onClose={() => setSlotModalOpen(false)}
        onAdded={refresh}
      />
      <AdminAddSubscriptionPlanModal
        visible={planModalOpen}
        plans={plans}
        onClose={() => setPlanModalOpen(false)}
        onAdded={setPlans}
      />
      <AdminAddPickupAreaModal
        visible={areaModalOpen || editPickupArea !== null}
        areas={pickupAreas}
        editArea={editPickupArea}
        onClose={() => {
          setAreaModalOpen(false);
          setEditPickupArea(null);
        }}
        onSaved={refresh}
      />

      <AdminPageActionBar
        actions={[
          { label: 'Add Slot', onPress: () => setSlotModalOpen(true) },
          { label: 'Add Plan', onPress: () => setPlanModalOpen(true) },
          { label: 'Add Area', onPress: () => setAreaModalOpen(true) },
        ]}
      />

      <View style={styles.sectionsRow}>
        <View style={styles.leftColumn}>
          <View style={styles.sectionPanel}>
            <AdminSectionHeader title="Delivery Slots" />
            <View style={styles.tableCard}>
              <AdminTableScroll minWidth={500}>
                <View style={styles.table}>
                  <View style={styles.headerRow}>
                    <View style={slotCols.slot}><Text style={styles.th}>Slot</Text></View>
                    <View style={slotCols.window}><Text style={styles.th}>Window</Text></View>
                    <View style={slotCols.booked}><Text style={styles.th}>Booked</Text></View>
                    <View style={slotCols.input}><Text style={styles.th}>Capacity</Text></View>
                  </View>
                  {slots.map((slot) => (
                    <View key={slot.id} style={styles.row}>
                      <View style={slotCols.slot}>
                        <Text style={styles.td} numberOfLines={1}>
                          {slot.label}
                        </Text>
                      </View>
                      <View style={slotCols.window}>
                        <Text style={styles.td} numberOfLines={1}>
                          {slot.startTime} - {slot.endTime}
                        </Text>
                      </View>
                      <View style={slotCols.booked}>
                        <Text style={styles.td} numberOfLines={1}>
                          {slot.booked}
                        </Text>
                      </View>
                      <View style={slotCols.input}>
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
              </AdminTableScroll>
            </View>
          </View>

          <AdminPickupAreasSection
            areas={pickupAreas}
            onRefresh={refresh}
            onEdit={setEditPickupArea}
          />
        </View>

        <View style={[styles.sectionPanel, styles.rightColumn]}>
          <AdminSectionHeader title="Subscription Pricing" />
          <View style={styles.tableCard}>
            <AdminTableScroll minWidth={400}>
              <View style={styles.table}>
                <View style={styles.headerRow}>
                  <View style={planCols.plan}><Text style={styles.th}>Plan</Text></View>
                  <View style={planCols.type}><Text style={styles.th}>Type</Text></View>
                  <View style={planCols.duration}><Text style={styles.th}>Duration</Text></View>
                  <View style={planCols.input}><Text style={styles.th}>Amount (₹)</Text></View>
                </View>
                {plans.map((plan) => (
                  <View key={plan.id} style={styles.row}>
                    <View style={planCols.plan}>
                      <Text style={styles.td} numberOfLines={2}>
                        {plan.name}
                      </Text>
                    </View>
                    <View style={planCols.type}>
                      <Text style={styles.td} numberOfLines={1}>
                        {plan.planType ?? 'Plan'}
                      </Text>
                    </View>
                    <View style={planCols.duration}>
                      <Text style={styles.td} numberOfLines={1}>
                        {plan.durationDays} days
                      </Text>
                    </View>
                    <View style={planCols.input}>
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
            </AdminTableScroll>
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
  leftColumn: {
    flex: 1,
    minWidth: 280,
    gap: spacing.md,
  },
  sectionPanel: {
    width: '100%',
  },
  rightColumn: {
    flex: 1,
    minWidth: 280,
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
});
