import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';
import { colors, radius, shadow, spacing } from '../../constants/theme';
import { DeliveryOrder } from '../../types/delivery';
import { DriverLocationGroup, getOrderStudentName } from '../../utils/driverLocationGroups';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  group: DriverLocationGroup;
  deliveredAt?: string;
  bulkLoading?: boolean;
  singleDeliveringId?: string | null;
  readOnly?: boolean;
  onNavigate?: (address: string) => void;
  onDeliverAll?: (group: DriverLocationGroup) => void;
  onDeliverOne?: (order: DeliveryOrder) => void;
};

function StudentRow({
  order,
  disabled,
  delivering,
  readOnly,
  onDeliver,
}: {
  order: DeliveryOrder;
  disabled?: boolean;
  delivering?: boolean;
  readOnly?: boolean;
  onDeliver: () => void;
}) {
  const isDelivered = readOnly || order.status === 'delivered';

  return (
    <View style={styles.studentRow}>
      <View style={styles.studentCopy}>
        <Ionicons name="person-outline" size={16} color={isDelivered ? colors.green : colors.orange} />
        <Text style={[styles.studentName, isDelivered && styles.studentNameDelivered]} numberOfLines={1}>
          {getOrderStudentName(order)}
        </Text>
      </View>
      {isDelivered ? (
        <View style={styles.deliveredPill}>
          <Ionicons name="checkmark-circle" size={14} color={colors.green} />
          <Text style={styles.deliveredPillText}>Delivered</Text>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.deliverOneBtn, (disabled || delivering) && styles.deliverOneBtnDisabled, pressed && !disabled && styles.deliverOneBtnPressed]}
          onPress={onDeliver}
          disabled={disabled || delivering}
        >
          {delivering ? (
            <ActivityIndicator size="small" color={colors.orange} />
          ) : (
            <Text style={styles.deliverOneText}>Deliver</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

export function DriverBulkDeliveryCard({
  group,
  deliveredAt,
  bulkLoading = false,
  singleDeliveringId = null,
  readOnly = false,
  onNavigate,
  onDeliverAll,
  onDeliverOne,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const isSuccess = readOnly || Boolean(deliveredAt) || group.isFullyDelivered;
  const showBulkButton = !readOnly && group.pendingCount > 0 && group.pendingCount === group.totalCount;
  const showPartialActions = !readOnly && group.pendingCount > 0 && group.deliveredCount > 0;

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((current) => !current);
  };

  return (
    <View style={[styles.card, isSuccess && styles.cardDelivered]}>
      <Pressable style={styles.header} onPress={toggleExpanded}>
        <View style={styles.headerCopy}>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={18} color={isSuccess ? colors.green : colors.orange} />
            <Text style={styles.locationName} numberOfLines={2}>
              {group.locationName}
            </Text>
          </View>
          <Text style={styles.address} numberOfLines={2}>
            {group.address}
          </Text>
          <Text style={styles.countText}>
            {group.totalCount} Lunchbox{group.totalCount === 1 ? '' : 'es'}
          </Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          <Text style={styles.sectionLabel}>Student List</Text>
          {group.orders.map((order) => (
            <StudentRow
              key={order.id}
              order={order}
              disabled={bulkLoading || readOnly}
              delivering={singleDeliveringId === order.id}
              readOnly={readOnly}
              onDeliver={() => onDeliverOne?.(order)}
            />
          ))}

          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressValue}>
              {isSuccess
                ? 'Delivered Successfully'
                : `${group.pendingCount} Pending${group.deliveredCount > 0 ? ` · ${group.deliveredCount} Delivered` : ''}`}
            </Text>
          </View>

          {isSuccess ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={18} color={colors.green} />
              <Text style={styles.successText}>
                Delivered at {deliveredAt ?? group.orders.find((order) => order.deliveredAt)?.deliveredAt ?? '—'}
              </Text>
            </View>
          ) : (
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [styles.navBtn, pressed && styles.actionPressed]}
                onPress={() => onNavigate?.(group.address)}
              >
                <Ionicons name="navigate-outline" size={16} color={colors.orange} />
                <Text style={styles.navBtnText}>Navigate</Text>
              </Pressable>

              {showBulkButton ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.deliverAllBtn,
                    bulkLoading && styles.deliverAllBtnDisabled,
                    pressed && !bulkLoading && styles.actionPressed,
                  ]}
                  onPress={() => onDeliverAll?.(group)}
                  disabled={bulkLoading}
                >
                  {bulkLoading ? (
                    <ActivityIndicator size="small" color={colors.onPrimary} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done-outline" size={18} color={colors.onPrimary} />
                      <Text style={styles.deliverAllText}>
                        Deliver All ({group.pendingCount} Lunchbox{group.pendingCount === 1 ? '' : 'es'})
                      </Text>
                    </>
                  )}
                </Pressable>
              ) : null}

              {showPartialActions ? (
                <Text style={styles.partialHint}>Deliver remaining lunchboxes individually, or finish the last ones below.</Text>
              ) : null}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    ...shadow.subtle,
  },
  cardDelivered: {
    borderColor: colors.green,
    backgroundColor: colors.greenLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    padding: spacing.md,
  },
  headerCopy: { flex: 1, minWidth: 0, gap: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationName: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.text },
  address: { fontSize: 12, color: colors.muted, fontWeight: '600', lineHeight: 17 },
  countText: { fontSize: 12, fontWeight: '800', color: colors.orange, marginTop: 4 },
  body: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: colors.muted, textTransform: 'uppercase' },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  studentCopy: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  studentName: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
  studentNameDelivered: { color: colors.green },
  deliveredPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deliveredPillText: { fontSize: 11, fontWeight: '700', color: colors.green },
  deliverOneBtn: {
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.orange,
    backgroundColor: colors.white,
  },
  deliverOneBtnDisabled: { opacity: 0.6 },
  deliverOneBtnPressed: { opacity: 0.92 },
  deliverOneText: { fontSize: 11, fontWeight: '800', color: colors.orange },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 4,
  },
  progressLabel: { fontSize: 12, fontWeight: '800', color: colors.text },
  progressValue: { fontSize: 12, fontWeight: '700', color: colors.muted },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.green,
  },
  successText: { fontSize: 13, fontWeight: '800', color: colors.green },
  actions: { gap: 10, marginTop: 4 },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.orange,
    borderRadius: radius.full,
    paddingVertical: 10,
    backgroundColor: colors.white,
  },
  navBtnText: { fontSize: 12, fontWeight: '800', color: colors.orange },
  deliverAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.green,
    borderRadius: radius.full,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 46,
  },
  deliverAllBtnDisabled: { opacity: 0.7 },
  actionPressed: { opacity: 0.94, transform: [{ scale: 0.99 }] },
  deliverAllText: { fontSize: 13, fontWeight: '800', color: colors.onPrimary, textAlign: 'center' },
  partialHint: { fontSize: 11, color: colors.muted, fontWeight: '600', lineHeight: 16 },
});
