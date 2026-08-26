import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AdminSectionHeader } from './AdminSectionHeader';
import { AdminTableScroll } from './AdminTableScroll';
import { colors, radius, spacing } from '../../constants/theme';
import { useAdminTableColumn } from '../../hooks/useAdminTableColumn';
import {
  DEFAULT_PICKUP_AREA_SLOT,
  deletePickupAreaSlot,
  formatTime12Hour,
  listAllPickupAreaSlotsAdmin,
} from '../../services/pickupAreaSlotService';
import { PickupAreaSlot } from '../../types/pickupAreaSlot';

type Props = {
  areas: PickupAreaSlot[];
  onRefresh: () => Promise<void>;
  onEdit: (area: PickupAreaSlot) => void;
};

export function AdminPickupAreasSection({ areas, onRefresh, onEdit }: Props) {
  const col = useAdminTableColumn();
  const cols = {
    area: col(1, 140),
    window: col(1, 130),
    keywords: col(1.2, 180),
    actions: col(0.6, 110, { alignItems: 'flex-end' }),
  };

  const handleDelete = useCallback(
    async (area: PickupAreaSlot) => {
      if (area.id === DEFAULT_PICKUP_AREA_SLOT.id) return;
      await deletePickupAreaSlot(area.id);
      await onRefresh();
    },
    [onRefresh],
  );

  const visibleAreas = areas.filter((area) => area.id !== DEFAULT_PICKUP_AREA_SLOT.id);

  return (
    <View style={styles.sectionPanel}>
      <AdminSectionHeader title="Pickup Area Booking Slots" />

      <View style={styles.tableCard}>
        <AdminTableScroll minWidth={500}>
          <View style={styles.table}>
            <View style={styles.headerRow}>
              <View style={cols.area}><Text style={styles.th}>Area Name</Text></View>
              <View style={cols.window}><Text style={styles.th}>Booking Window</Text></View>
              <View style={cols.keywords}><Text style={styles.th}>Match Keywords</Text></View>
              <View style={cols.actions}><Text style={styles.th}>Actions</Text></View>
            </View>
            {visibleAreas.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.muted}>No pickup areas yet. Use Add Area above to create one.</Text>
              </View>
            ) : null}
            {visibleAreas.map((area) => (
              <View key={area.id} style={styles.row}>
                <View style={cols.area}>
                  <Text style={styles.td} numberOfLines={2}>{area.areaName}</Text>
                </View>
                <View style={cols.window}>
                  <Text style={styles.td}>
                    {formatTime12Hour(area.bookingStartTime)} – {formatTime12Hour(area.bookingEndTime)}
                  </Text>
                </View>
                <View style={cols.keywords}>
                  <Text style={styles.td} numberOfLines={2}>
                    {[area.areaName, ...(area.matchKeywords ?? [])].join(', ')}
                  </Text>
                </View>
                <View style={cols.actions}>
                  <View style={styles.actionRow}>
                    <Pressable onPress={() => onEdit(area)}>
                      <Text style={styles.edit}>Edit</Text>
                    </Pressable>
                    <Pressable onPress={() => void handleDelete(area)}>
                      <Text style={styles.delete}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </AdminTableScroll>
      </View>
    </View>
  );
}

export async function loadAdminPickupAreas(): Promise<PickupAreaSlot[]> {
  return listAllPickupAreaSlotsAdmin();
}

const styles = StyleSheet.create({
  sectionPanel: { width: '100%' },
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
  muted: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  edit: { fontSize: 13, fontWeight: '700', color: colors.primary },
  delete: { fontSize: 13, fontWeight: '700', color: colors.red },
  emptyRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
});
