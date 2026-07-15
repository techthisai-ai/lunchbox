import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TimelineStep } from '../components/Timeline';
import { WhatsAppDeliveryConfirmationCard } from '../components/WhatsAppDeliveryConfirmationCard';
import { colors, shadow, spacing } from '../constants/theme';
import { useDelivery } from '../context/DeliveryContext';
import { useLiveEta } from '../hooks/useLiveEta';
import { useResponsive } from '../hooks/useResponsive';
import { TrackStackParamList } from '../navigation/types';
import { buildTimeline, getStatusLabel } from '../services/orderHubService';
import { DeliveryOrder } from '../types/delivery';

type Props = NativeStackScreenProps<TrackStackParamList, 'DeliveryStatus'>;

const STEP_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Order Created': 'receipt-outline',
  'Food Ready': 'restaurant-outline',
  'Driver Assigned': 'bicycle-outline',
  'Picked Up': 'bag-handle-outline',
  'In Transit': 'navigate-outline',
  Delivered: 'checkmark-circle-outline',
};

function getStatusHint(status: DeliveryOrder['status']): string {
  switch (status) {
    case 'booked':
      return 'Your lunchbox order is confirmed and scheduled.';
    case 'food_ready':
      return 'Food is packed and ready for rider pickup.';
    case 'awaiting_driver':
      return 'We are matching the nearest available rider.';
    case 'driver_assigned':
      return 'A verified rider has been assigned to your trip.';
    case 'at_pickup':
    case 'pickup_verified':
      return 'Rider is at the pickup location now.';
    case 'picked_up':
      return 'Lunchbox collected and heading to destination.';
    case 'in_transit':
    case 'at_drop':
      return 'Your lunchbox is on the move right now.';
    case 'delivered':
      return 'Delivery completed successfully today.';
    case 'pickup_closed':
      return 'This delivery was cancelled.';
    default:
      return 'Live updates appear here as your trip progresses.';
  }
}

function getProgressPercent(steps: TimelineStep[]): number {
  if (steps.length === 0) return 0;
  const doneCount = steps.filter((step) => step.status === 'done').length;
  const hasActive = steps.some((step) => step.status === 'active');
  const unit = 100 / steps.length;
  return Math.min(100, Math.round(doneCount * unit + (hasActive ? unit * 0.55 : 0)));
}

function StatusHero({
  order,
  steps,
  onBack,
}: {
  order: DeliveryOrder | null;
  steps: TimelineStep[];
  onBack: () => void;
}) {
  const statusLabel = order ? getStatusLabel(order.status) : 'Pending';
  const hint = order ? getStatusHint(order.status) : 'No active delivery for today.';
  const percent = getProgressPercent(steps);

  return (
    <LinearGradient colors={['#2D2D44', '#252538']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <View style={styles.heroTop}>
        <Pressable onPress={onBack} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={18} color={colors.onPrimary} />
        </Pressable>
        <View style={styles.liveChip}>
          <View style={styles.liveDot} />
          <Text style={styles.liveChipText}>LIVE</Text>
        </View>
      </View>

      <View style={styles.heroMain}>
        <View style={styles.progressRing}>
          <Text style={styles.orbitPercent}>{percent}%</Text>
        </View>
        <View style={styles.heroStatusBlock}>
          <Text style={styles.heroStatus} numberOfLines={1}>
            {statusLabel}
          </Text>
          <Text style={styles.heroHint} numberOfLines={2}>
            {hint}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function JourneyStep({ step, isLast }: { step: TimelineStep; isLast: boolean }) {
  const icon = STEP_ICONS[step.title] ?? 'ellipse-outline';
  const isDone = step.status === 'done';
  const isActive = step.status === 'active';

  return (
    <View style={styles.journeyStep}>
      <View style={styles.journeyRail}>
        <View
          style={[
            styles.journeyNode,
            isDone && styles.journeyNodeDone,
            isActive && styles.journeyNodeActive,
            !isDone && !isActive && styles.journeyNodePending,
          ]}
        >
          <Ionicons
            name={isDone ? 'checkmark' : icon}
            size={isDone ? 14 : 15}
            color={isDone || isActive ? colors.onPrimary : colors.muted}
          />
        </View>
        {!isLast ? (
          <View style={[styles.journeyLine, (isDone || isActive) && styles.journeyLineActive]} />
        ) : null}
      </View>

      <View style={styles.journeyCopy}>
        <View style={styles.journeyTitleRow}>
          <Text style={[styles.journeyTitle, isActive && styles.journeyTitleActive]}>{step.title}</Text>
          {isActive ? (
            <View style={styles.nowPill}>
              <Text style={styles.nowPillText}>Now</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.journeyTime}>{step.time}</Text>
      </View>
    </View>
  );
}

function JourneyTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <View style={styles.journeyCard}>
      <View style={styles.journeyHeader}>
        <Text style={styles.journeyHeaderTitle}>Trip Journey</Text>
        <Text style={styles.journeyHeaderSub}>{steps.filter((s) => s.status === 'done').length} of {steps.length} done</Text>
      </View>
      {steps.map((step, index) => (
        <JourneyStep key={step.title} step={step} isLast={index === steps.length - 1} />
      ))}
    </View>
  );
}

function QuickFacts({ order, etaMinutes }: { order: DeliveryOrder; etaMinutes: number | null }) {
  const driverName = order.driver?.name ?? 'Awaiting rider';
  const eta =
    order.estimatedArrival?.trim() ||
    (etaMinutes != null
      ? `${etaMinutes} min`
      : order.driver?.etaMinutes != null
        ? `${order.driver.etaMinutes} min`
        : '—');

  return (
    <View style={styles.factsRow}>
      <View style={styles.factItem}>
        <Ionicons name="person-circle-outline" size={16} color={colors.orange} />
        <View style={styles.factCopy}>
          <Text style={styles.factLabel}>Rider</Text>
          <Text style={styles.factValue} numberOfLines={1}>
            {driverName}
          </Text>
        </View>
      </View>
      <View style={styles.factDivider} />
      <View style={styles.factItem}>
        <Ionicons name="time-outline" size={16} color={colors.orange} />
        <View style={styles.factCopy}>
          <Text style={styles.factLabel}>ETA</Text>
          <Text style={styles.factValue}>{eta}</Text>
        </View>
      </View>
    </View>
  );
}

export function DeliveryStatusScreen({ navigation }: Props) {
  const { order } = useDelivery();
  const { horizontalPadding } = useResponsive();
  const liveEtaMinutes = useLiveEta(order);
  const steps = buildTimeline(order);
  const onBack = () => navigation.goBack();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <StatusHero order={order} steps={steps} onBack={onBack} />

        <View style={[styles.body, { paddingHorizontal: horizontalPadding }]}>
          {order ? <QuickFacts order={order} etaMinutes={liveEtaMinutes} /> : null}

          {steps.length > 0 ? <JourneyTimeline steps={steps} /> : null}

          {order?.status === 'delivered' ? <WhatsAppDeliveryConfirmationCard order={order} /> : null}

          {order ? (
            <Pressable
              style={({ pressed }) => [styles.mapBtn, pressed && styles.mapBtnPressed]}
              onPress={() => navigation.navigate('Tracking')}
              accessibilityRole="button"
              accessibilityLabel="Track on map"
            >
              <LinearGradient colors={['#E91E63', '#C2185B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.mapBtnGradient}>
                <Ionicons name="map-outline" size={20} color={colors.onPrimary} />
                <Text style={styles.mapBtnText}>Track on Map</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.onPrimary} />
              </LinearGradient>
            </Pressable>
          ) : (
            <Pressable style={styles.outlineBtn} onPress={onBack}>
              <Text style={styles.outlineBtnText}>Back to Home</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 32 },
  hero: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(233,30,99,0.2)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexShrink: 0,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.orange,
  },
  liveChipText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F8BBD0',
    letterSpacing: 0.6,
  },
  heroMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.sm,
  },
  progressRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: colors.orange,
    backgroundColor: 'rgba(233,30,99,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  orbitPercent: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.onPrimary,
  },
  heroStatusBlock: {
    flex: 1,
    minWidth: 0,
  },
  heroStatus: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.onPrimary,
    marginBottom: 3,
  },
  heroHint: {
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.65)',
  },
  body: {
    gap: spacing.sm,
  },
  factsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...shadow.subtle,
  },
  factItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  factCopy: {
    flex: 1,
    minWidth: 0,
  },
  factDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderSubtle,
    marginHorizontal: 4,
  },
  factLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 2,
  },
  factValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  journeyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.sm,
    paddingTop: spacing.md,
    ...shadow.subtle,
  },
  journeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  journeyHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  journeyHeaderSub: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
  },
  journeyStep: {
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
  },
  journeyRail: {
    width: 24,
    alignItems: 'center',
  },
  journeyNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  journeyNodeDone: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  journeyNodeActive: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  journeyNodePending: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
  },
  journeyLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginVertical: 3,
    minHeight: 14,
  },
  journeyLineActive: {
    backgroundColor: colors.green,
  },
  journeyCopy: {
    flex: 1,
    paddingBottom: 10,
    minWidth: 0,
  },
  journeyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  journeyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  journeyTitleActive: {
    color: colors.orange,
    fontWeight: '800',
  },
  nowPill: {
    backgroundColor: colors.orangeLight,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  nowPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.orange,
  },
  journeyTime: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 3,
    fontWeight: '600',
  },
  mapBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    ...shadow.card,
  },
  mapBtnPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  mapBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  mapBtnText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: colors.onPrimary,
    textAlign: 'center',
  },
  outlineBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingVertical: 14,
    alignItems: 'center',
  },
  outlineBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
});
