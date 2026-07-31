import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Dimensions, Image, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HomeDeliveredProofCard } from '../components/HomeDeliveredProofCard';
import { Avatar } from '../components/Avatar';
import { getInitials } from '../constants/auth';
import { colors, shadow, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useDelivery } from '../context/DeliveryContext';
import { useFoodReadyOverlay } from '../context/FoodReadyOverlayContext';
import { useLiveEta } from '../hooks/useLiveEta';
import { useResponsive } from '../hooks/useResponsive';
import { HomeStackParamList, ProfileStackParamList } from '../navigation/types';
import { DeliveryHistoryEntry, syncDeliveryHistory } from '../services/deliveryHistoryService';
import { loadFoodReadyDefaults } from '../services/foodReadyDefaultsService';
import { listCustomerOrders, loadCustomerProfile } from '../services/orderHubService';
import { checkSubscriptionRenewalReminders, hasActiveSubscription } from '../services/subscriptionService';
import { countUnread, loadNotifications } from '../services/notificationService';
import {
  DeliveryOrder,
  DeliveryProfile,
  DeliveryStatus,
  DeliveryType,
  FoodReadyDetails,
  buildFoodReadyStudents,
  getDropAddress,
  normalizeDeliveryType,
  normalizeDeliveryTypes,
} from '../types/delivery';
import { isHistoryToday, isHistoryTodayOrYesterday, resolveHistoryDateKey } from '../utils/date';

function formatDeliveredClock(raw: string | null | undefined): string {
  if (!raw?.trim()) {
    return new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  const trimmed = raw.trim();
  if (/am|pm/i.test(trimmed)) return trimmed;
  const parsed = Date.parse(`1970-01-01 ${trimmed}`);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  const iso = Date.parse(trimmed);
  if (!Number.isNaN(iso)) {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  return trimmed;
}

function yesterdayKey(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function formatDeliveredWhenLabel(dateKey: string, time: string): string {
  const clock = time && time !== '—' ? time : formatDeliveredClock(null);
  if (isHistoryToday(dateKey)) return `Today, ${clock}`;
  if (dateKey === yesterdayKey()) return `Yesterday, ${clock}`;
  const [year, month, day] = dateKey.split('-').map(Number);
  const label = new Date(year, month - 1, day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${label}, ${clock}`;
}

function getDeliveredAtTitle(order: DeliveryOrder): string {
  const destination = order.school?.trim() || order.dropAddress?.trim();
  const short = destination?.split(',')[0]?.trim();
  if (short) return `Delivered at ${short}`;
  const type = normalizeDeliveryType(order.deliveryType);
  if (type === 'office') return 'Delivered at Office';
  if (type === 'college') return 'Delivered at College';
  return 'Delivered at School';
}

function getDeliveredAtTitleFromHistory(entry: DeliveryHistoryEntry): string {
  const name = entry.destinationName?.trim();
  if (name) return `Delivered at ${name}`;
  if (entry.deliveryType === 'office') return 'Delivered at Office';
  if (entry.deliveryType === 'college') return 'Delivered at College';
  return 'Delivered at School';
}

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeMain'>;

const FOOD_READY_FORM_STATUSES = new Set(['booked', 'food_ready', 'awaiting_driver']);

const GAUGE_SIZE = 192;
const GAUGE_STROKE = 12;

const HOME_PROGRESS_STEPS: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  timeKey: 'bookedAt' | 'foodReadyAt' | 'pickedUpAt' | 'deliveredAt';
}[] = [
  { label: 'Booked', icon: 'checkmark', timeKey: 'bookedAt' },
  { label: 'Food Ready', icon: 'restaurant-outline', timeKey: 'foodReadyAt' },
  { label: 'Picked Up', icon: 'bag-handle-outline', timeKey: 'pickedUpAt' },
  { label: 'In Transit', icon: 'bicycle-outline', timeKey: 'pickedUpAt' },
  { label: 'Delivered', icon: 'checkmark-circle-outline', timeKey: 'deliveredAt' },
];

function getHomeProgressIndex(status: DeliveryStatus): number {
  if (status === 'delivered') return 4;
  if (status === 'in_transit' || status === 'at_drop') return 3;
  if (status === 'picked_up') return 2;
  if (
    status === 'food_ready' ||
    status === 'awaiting_driver' ||
    status === 'driver_assigned' ||
    status === 'at_pickup' ||
    status === 'pickup_verified'
  ) {
    return 1;
  }
  return 0;
}

function formatProgressTime(value: string | null | undefined): string {
  if (!value?.trim()) return '--';
  const trimmed = value.trim();
  if (/am|pm/i.test(trimmed)) return trimmed;
  const parsed = Date.parse(`1970-01-01 ${trimmed}`);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  const iso = Date.parse(trimmed);
  if (!Number.isNaN(iso)) {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  return trimmed;
}

function getActiveStepTime(order: DeliveryOrder | null): string | null {
  if (!order) return null;

  const activeIndex = getHomeProgressIndex(order.status);
  const step = HOME_PROGRESS_STEPS[activeIndex];
  if (!step) return null;

  const raw = order[step.timeKey];
  if (!raw?.trim() && activeIndex === 0 && order.bookedAt?.trim()) {
    return formatProgressTime(order.bookedAt);
  }
  if (!raw?.trim()) return null;

  return formatProgressTime(raw);
}

function HorizontalLiveProgress({ order }: { order: DeliveryOrder }) {
  const activeIndex = getHomeProgressIndex(order.status);
  const isDelivered = order.status === 'delivered';

  return (
    <View style={styles.liveProgressList}>
      {HOME_PROGRESS_STEPS.map((step, index) => {
        const done = index < activeIndex || isDelivered;
        const active = index === activeIndex && !isDelivered;
        const pending = !done && !active;
        const lineDone = index > 0 && (index <= activeIndex || isDelivered);

        return (
          <View key={step.label} style={styles.liveProgressItem}>
            {index > 0 ? (
              <View style={[styles.liveProgressLine, lineDone && styles.liveProgressLineDone]} />
            ) : null}
            <View style={styles.liveProgressStep}>
              <View
                style={[
                  styles.liveProgressIcon,
                  done && styles.liveProgressIconDone,
                  active && styles.liveProgressIconActive,
                  pending && styles.liveProgressIconPending,
                ]}
              >
                {done ? (
                  <Ionicons name="checkmark" size={11} color={colors.onPrimary} />
                ) : (
                  <Ionicons
                    name={step.icon}
                    size={11}
                    color={pending ? 'rgba(255,255,255,0.65)' : colors.onPrimary}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.liveProgressLabel,
                  done && styles.liveProgressLabelDone,
                  active && styles.liveProgressLabelActive,
                  pending && styles.liveProgressLabelPending,
                ]}
                numberOfLines={2}
              >
                {step.label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function shortenWords(text: string, maxWords = 3): string {
  const cleaned = text
    .replace(/\|/g, ',')
    .split(',')[0]
    ?.trim()
    .replace(/\s+/g, ' ');
  if (!cleaned) return '—';
  const words = cleaned.split(' ').filter(Boolean);
  if (words.length <= maxWords) return cleaned;
  return `${words.slice(0, maxWords).join(' ')}…`;
}

function parseDestination(order: DeliveryOrder | null) {
  if (!order) {
    return { name: 'Add destination' };
  }

  const drop = getDropAddress(order);
  const firstStop = order.studentEntries?.[0]?.dropLocation?.trim();
  const raw = firstStop || order.school || drop.split(',')[0]?.trim() || 'Destination';

  return { name: shortenWords(raw, 3) };
}

function getEtaDisplay(order: DeliveryOrder | null, liveEtaMinutes: number | null) {
  if (order?.estimatedArrival?.trim()) {
    return { time: order.estimatedArrival.trim(), label: 'On Time' };
  }

  if (order?.estimatedArrivalAtIso) {
    const arrivalMs = Date.parse(order.estimatedArrivalAtIso);
    if (!Number.isNaN(arrivalMs)) {
      return {
        time: new Date(arrivalMs).toLocaleTimeString('en-IN', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        label: 'On Time',
      };
    }
  }

  if (liveEtaMinutes != null) {
    // Round to whole minutes so ETA text does not flicker between close renders.
    const minutes = Math.max(0, Math.round(liveEtaMinutes));
    const arrival = new Date(Date.now() + minutes * 60_000);
    return {
      time: arrival.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }),
      label: 'On Time',
    };
  }

  return { time: '1:30 PM', label: 'On Time' };
}

function getGaugeMeta(order: DeliveryOrder | null) {
  if (!order || order.status === 'booked') {
    return { percent: 25, status: 'BOOKED', hint: 'Tap when lunchbox is packed & ready.' };
  }
  if (order.status === 'pickup_closed') {
    return { percent: 0, status: 'CANCELLED', hint: 'This delivery was cancelled.' };
  }
  if (order.status === 'delivered') {
    return { percent: 100, status: 'DELIVERED', hint: 'Enjoy your meal!' };
  }
  if (order.status === 'picked_up' || order.status === 'in_transit' || order.status === 'at_drop') {
    return { percent: 90, status: 'IN TRANSIT', hint: 'Your lunchbox is on the way.' };
  }
  if (
    order.driver &&
    (order.status === 'driver_assigned' ||
      order.status === 'at_pickup' ||
      order.status === 'pickup_verified')
  ) {
    return { percent: 82, status: 'RIDER ASSIGNED', hint: 'Rider is heading to pickup.' };
  }
  if (order.status === 'awaiting_driver') {
    return { percent: 75, status: 'FOOD READY', hint: 'Waiting for a rider to accept.' };
  }
  if (order.status === 'food_ready') {
    return { percent: 75, status: 'FOOD READY', hint: 'Tap when lunchbox is packed & ready.' };
  }
  return { percent: 25, status: 'BOOKED', hint: 'Tap when lunchbox is packed & ready.' };
}

function CircularGauge({ percent, cancelled }: { percent: number; cancelled?: boolean }) {
  const radius = (GAUGE_SIZE - GAUGE_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clamped / 100) * circumference;
  const progressStroke = cancelled ? '#FFCDD2' : '#FFFFFF';

  return (
    <Svg width={GAUGE_SIZE} height={GAUGE_SIZE}>
      <Circle
        cx={GAUGE_SIZE / 2}
        cy={GAUGE_SIZE / 2}
        r={radius}
        stroke={cancelled ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.35)'}
        strokeWidth={GAUGE_STROKE}
        fill="none"
      />
      <Circle
        cx={GAUGE_SIZE / 2}
        cy={GAUGE_SIZE / 2}
        r={radius}
        stroke={progressStroke}
        strokeWidth={GAUGE_STROKE}
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90, ${GAUGE_SIZE / 2}, ${GAUGE_SIZE / 2})`}
      />
    </Svg>
  );
}

type LunchBoxCardState = {
  title: string;
  buttonLabel: string;
  buttonIcon: keyof typeof Ionicons.glyphMap;
  action: 'food_ready' | 'tracking' | 'details';
};

function getLunchBoxCardState(order: DeliveryOrder | null): LunchBoxCardState {
  if (!order || order.status === 'booked') {
    return {
      title: 'Mark Food Ready',
      buttonLabel: 'FOOD READY',
      buttonIcon: 'restaurant-outline',
      action: 'food_ready',
    };
  }

  if (order.status === 'pickup_closed') {
    return {
      title: 'Delivery Cancelled',
      buttonLabel: 'VIEW DETAILS',
      buttonIcon: 'close-circle-outline',
      action: 'details',
    };
  }

  if (order.status === 'delivered') {
    return {
      title: 'Delivered Today',
      buttonLabel: 'VIEW DETAILS',
      buttonIcon: 'checkmark-circle-outline',
      action: 'details',
    };
  }

  if (order.status === 'picked_up' || order.status === 'in_transit' || order.status === 'at_drop') {
    return {
      title: 'Lunch On The Way',
      buttonLabel: 'TRACK LIVE',
      buttonIcon: 'navigate',
      action: 'tracking',
    };
  }

  if (
    order.driver &&
    (order.status === 'driver_assigned' ||
      order.status === 'at_pickup' ||
      order.status === 'pickup_verified')
  ) {
    return {
      title: 'Rider Assigned',
      buttonLabel: 'TRACK LIVE',
      buttonIcon: 'bicycle-outline',
      action: 'tracking',
    };
  }

  if (order.status === 'food_ready' || order.status === 'awaiting_driver') {
    if (order.driver) {
      return {
        title: 'Rider Assigned',
        buttonLabel: 'TRACK LIVE',
        buttonIcon: 'bicycle-outline',
        action: 'tracking',
      };
    }

    return {
      title: order.status === 'awaiting_driver' ? 'Waiting For Rider' : 'Food Is Ready',
      buttonLabel: 'FOOD READY',
      buttonIcon: 'restaurant-outline',
      action: 'food_ready',
    };
  }

  return {
    title: 'Mark Food Ready',
    buttonLabel: 'FOOD READY',
    buttonIcon: 'restaurant-outline',
    action: 'food_ready',
  };
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getRecentDeliveryTitle(entry: DeliveryHistoryEntry): string {
  if (entry.dateKey === todayKey() && entry.status === 'Delivered') {
    return "Today's Lunchbox Delivered";
  }
  if (entry.status === 'Delivered') {
    return `${entry.date} Lunchbox Delivered`;
  }
  if (entry.status === 'In Transit') {
    return entry.dateKey === todayKey() ? "Today's Lunchbox In Transit" : `${entry.date} Lunchbox In Transit`;
  }
  return `${entry.date} Lunchbox Cancelled`;
}

function getRecentRoute(entry: DeliveryHistoryEntry): string {
  return `${entry.pickupLabel || 'Home'} → ${entry.destinationName}`;
}

function HomeHeader({
  name,
  initials,
  hasUnread,
  onNotifications,
  onProfile,
}: {
  name: string;
  initials: string;
  hasUnread: boolean;
  onNotifications: () => void;
  onProfile: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerName} numberOfLines={1}>
          {name.toLowerCase()}
        </Text>
      </View>

      <View style={styles.headerRight}>
        <Pressable style={styles.headerIconBtn} onPress={onNotifications}>
          <Ionicons name="notifications-outline" size={20} color={colors.muted} />
          {hasUnread ? <View style={styles.notifDot} /> : null}
        </Pressable>
        <Pressable onPress={onProfile}>
          <Avatar initials={initials} />
        </Pressable>
      </View>
    </View>
  );
}

function TodaysDeliveryCard({
  order,
  liveEtaMinutes,
  onViewDetails,
}: {
  order: DeliveryOrder | null;
  liveEtaMinutes: number | null;
  onViewDetails: () => void;
}) {
  const destination = parseDestination(order);
  const eta = getEtaDisplay(order, liveEtaMinutes);
  const driverName = order?.driver?.name?.split(' ')[0];
  const staffName = driverName || 'Not Assigned';
  const staffSub = driverName ? 'On the way' : 'Yet';

  return (
    <View style={styles.deliveryCard}>
      <View style={styles.deliveryCardHeader}>
        <View style={styles.deliveryCardHeaderLeft}>
          <Ionicons name="calendar-outline" size={16} color={colors.orange} />
          <Text style={styles.deliveryCardEyebrow}>TODAY&apos;S DELIVERY</Text>
        </View>
        <Pressable style={styles.viewDetailsBtn} onPress={onViewDetails}>
          <Text style={styles.viewDetailsText}>View Details</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.onPrimary} />
        </Pressable>
      </View>

      <View style={styles.deliveryInfoRow}>
        <View style={styles.deliveryInfoCol}>
          <Text style={styles.deliveryInfoLabel}>Destination</Text>
          <Text style={styles.deliveryInfoValue} numberOfLines={1}>
            {destination.name}
          </Text>
        </View>

        <View style={styles.deliveryInfoDivider} />

        <View style={styles.deliveryInfoCol}>
          <Text style={styles.deliveryInfoLabel}>ETA</Text>
          <Text style={styles.deliveryEtaValue}>{eta.time}</Text>
          <Text style={styles.deliveryInfoSub}>{eta.label}</Text>
        </View>

        <View style={styles.deliveryInfoDivider} />

        <View style={styles.deliveryInfoCol}>
          <Text style={styles.deliveryInfoLabel}>Delivery Staff</Text>
          <Text style={styles.deliveryInfoValue} numberOfLines={1}>
            {staffName}
          </Text>
          <Text style={styles.deliveryInfoSub}>{staffSub}</Text>
        </View>
      </View>
    </View>
  );
}

function LiveTrackingCard({
  order,
  disabled,
  onPress,
}: {
  order: DeliveryOrder | null;
  disabled?: boolean;
  onPress: () => void;
}) {
  // Hold the last good order so a momentary null refresh cannot flash BOOKED
  // or hide the date / Booked→Delivered tracking row.
  const stableOrderRef = useRef<DeliveryOrder | null>(null);
  if (order && order.status !== 'pickup_closed') {
    stableOrderRef.current = order;
  } else if (!order) {
    // keep previous
  } else if (order.status === 'pickup_closed') {
    stableOrderRef.current = order;
  }

  const displayOrder = order ?? stableOrderRef.current;
  const gauge = getGaugeMeta(displayOrder);
  const isCancelled = displayOrder?.status === 'pickup_closed';
  const showTimeline = Boolean(displayOrder && displayOrder.status !== 'pickup_closed');
  const activeStepTime = getActiveStepTime(displayOrder);
  const lastStepTimeRef = useRef<string | null>(null);
  if (activeStepTime) lastStepTimeRef.current = activeStepTime;
  const stepTimeLabel = activeStepTime ?? (showTimeline ? lastStepTimeRef.current : null);

  return (
    <LinearGradient
      colors={isCancelled ? ['#E53935', '#C62828'] : ['#E91E63', '#AD1457']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.liveTrackingCard}
    >
      <Text style={[styles.liveTrackingTimeBadge, !stepTimeLabel && styles.liveTrackingTimeBadgeHidden]}>
        {stepTimeLabel || ' '}
      </Text>

      <View style={styles.liveTrackingContent}>
        <Pressable
          style={({ pressed }) => [
            styles.gaugeCol,
            pressed && styles.gaugePressed,
            disabled && styles.gaugeDisabled,
          ]}
          onPress={onPress}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={gauge.status}
        >
          <View style={styles.gaugeRingWrap}>
            <CircularGauge percent={gauge.percent} cancelled={isCancelled} />
            <View style={styles.gaugeInner}>
              <View style={[styles.gaugeIconBadge, isCancelled && styles.gaugeIconBadgeCancelled]}>
                <Ionicons
                  name={isCancelled ? 'close-circle-outline' : 'fast-food-outline'}
                  size={22}
                  color={isCancelled ? colors.red : colors.orange}
                />
                <View style={[styles.gaugeCheckBadge, isCancelled && styles.gaugeCheckBadgeCancelled]}>
                  <Ionicons name={isCancelled ? 'close' : 'checkmark'} size={10} color={colors.onPrimary} />
                </View>
              </View>
              <Text style={[styles.gaugePercent, isCancelled && styles.gaugePercentCancelled]}>{gauge.percent}%</Text>
              <Text style={[styles.gaugeStatus, isCancelled && styles.gaugeStatusCancelled]}>{gauge.status}</Text>
              <Text style={styles.gaugeHintOnGradient} numberOfLines={2}>
                {gauge.hint}
              </Text>
            </View>
          </View>
        </Pressable>

        <View style={[styles.timelineBelow, !showTimeline && styles.timelineBelowHidden]}>
          {showTimeline && displayOrder ? <HorizontalLiveProgress order={displayOrder} /> : null}
        </View>
      </View>
    </LinearGradient>
  );
}

function QuickActionsAndReferRow({
  onChangeAddress,
  onDeliveryInstructions,
  onContactSupport,
  onReferEarn,
}: {
  onChangeAddress: () => void;
  onDeliveryInstructions: () => void;
  onContactSupport: () => void;
  onReferEarn: () => void;
}) {
  const actions = [
    { icon: 'location-outline' as const, label: 'Address', onPress: onChangeAddress },
    { icon: 'document-text-outline' as const, label: 'Pickup Request', onPress: onDeliveryInstructions },
    { icon: 'headset-outline' as const, label: 'Support', onPress: onContactSupport },
  ];

  return (
    <View style={styles.quickReferCard}>
      <View style={styles.quickActionsSection}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            style={({ pressed }) => [styles.quickActionBtn, pressed && styles.quickActionBtnPressed]}
            onPress={action.onPress}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name={action.icon} size={17} color={colors.orange} />
            </View>
            <Text style={styles.quickActionLabel} numberOfLines={1}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.quickReferDivider} />

      <Pressable
        style={({ pressed }) => [styles.referSection, pressed && styles.referCardPressed]}
        onPress={onReferEarn}
      >
        <View style={styles.referIcon}>
          <Ionicons name="gift-outline" size={17} color={colors.orange} />
        </View>
        <View style={styles.referCopy}>
          <Text style={styles.referTitle} numberOfLines={1}>
            Refer & Earn
          </Text>
          <Text style={styles.referSub} numberOfLines={1}>
            Invite & earn rewards
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.orange} />
      </Pressable>
    </View>
  );
}

type LunchboxAd = {
  id: string;
  title: string;
  subtitle: string;
  colors: [string, string];
  imageOffset: number;
};

const PROMO_LUNCH_ART = require('../../assets/promo-lunch-hero.png');

const LUNCHBOX_ADS: LunchboxAd[] = [
  {
    id: 'fresh-daily',
    title: 'Fresh Lunchbox, Every Day',
    subtitle: 'Home pickup to school, college, or office — delivered on time.',
    colors: ['#E91E63', '#C2185B'],
    imageOffset: -72,
  },
  {
    id: 'monthly-save',
    title: 'Monthly Plan · Save More',
    subtitle: 'Subscribe once for hassle-free lunch deliveries all month.',
    colors: ['#D81B60', '#AD1457'],
    imageOffset: -28,
  },
  {
    id: 'single-order',
    title: 'Lunch Just for Today?',
    subtitle: 'Single-order from ₹29 — one delivery, no long commitment.',
    colors: ['#C2185B', '#880E4F'],
    imageOffset: -116,
  },
];

const LUNCHBOX_AD_AUTO_SCROLL_MS = 4000;

function ExploreMenuBanner() {
  const scrollRef = useRef<ScrollView>(null);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideWidth, setSlideWidth] = useState(Dimensions.get('window').width - spacing.md * 2);

  const goToSlide = useCallback(
    (index: number, animated = true) => {
      if (!slideWidth) return;
      const nextIndex = ((index % LUNCHBOX_ADS.length) + LUNCHBOX_ADS.length) % LUNCHBOX_ADS.length;
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
      scrollRef.current?.scrollTo({ x: slideWidth * nextIndex, animated });
    },
    [slideWidth],
  );

  useFocusEffect(
    useCallback(() => {
      if (!slideWidth) return undefined;

      const interval = setInterval(() => {
        goToSlide(activeIndexRef.current + 1);
      }, LUNCHBOX_AD_AUTO_SCROLL_MS);

      return () => clearInterval(interval);
    }, [slideWidth, goToSlide]),
  );

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!slideWidth) return;
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    activeIndexRef.current = Math.max(0, Math.min(LUNCHBOX_ADS.length - 1, nextIndex));
    setActiveIndex(activeIndexRef.current);
  };

  return (
    <View
      style={styles.exploreCarousel}
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        if (width > 0 && width !== slideWidth) setSlideWidth(width);
      }}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        style={styles.exploreCarouselScroll}
      >
        {LUNCHBOX_ADS.map((ad) => (
          <View key={ad.id} style={[styles.exploreSlide, { width: slideWidth }]}>
            <LinearGradient
              colors={ad.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.exploreBanner}
            >
              <View style={styles.exploreCopy}>
                <Text style={styles.exploreTitle}>{ad.title}</Text>
                <Text style={styles.exploreSub}>{ad.subtitle}</Text>
              </View>
              <View style={styles.exploreLunchImageWrap}>
                <Image
                  source={PROMO_LUNCH_ART}
                  style={[styles.exploreLunchImage, { marginLeft: ad.imageOffset }]}
                  resizeMode="cover"
                  accessibilityLabel="Lunchbox"
                />
              </View>
            </LinearGradient>
          </View>
        ))}
      </ScrollView>
      <View style={styles.exploreDots}>
        {LUNCHBOX_ADS.map((ad, index) => (
          <View key={ad.id} style={[styles.exploreDot, index === activeIndex && styles.exploreDotActive]} />
        ))}
      </View>
    </View>
  );
}

function RecentDeliveryCard({ entry }: { entry: DeliveryHistoryEntry }) {
  const isDelivered = entry.status === 'Delivered';
  const badgeBg = isDelivered ? colors.greenLight : entry.status === 'In Transit' ? colors.orangeLight : colors.redLight;
  const badgeColor = isDelivered ? colors.green : entry.status === 'In Transit' ? colors.orange : colors.red;

  return (
    <View style={styles.recentCard}>
      <View style={[styles.recentIcon, { backgroundColor: badgeBg }]}>
        <Ionicons
          name={isDelivered ? 'checkmark-circle' : entry.status === 'In Transit' ? 'time-outline' : 'close-circle-outline'}
          size={22}
          color={badgeColor}
        />
      </View>
      <View style={styles.recentCopy}>
        <Text style={styles.recentTitle} numberOfLines={2}>
          {getRecentDeliveryTitle(entry)}
        </Text>
        <Text style={styles.recentRoute} numberOfLines={1}>
          {getRecentRoute(entry)}
        </Text>
      </View>
      <View style={styles.recentMeta}>
        <View style={[styles.recentBadge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.recentBadgeText, { color: badgeColor }]}>{entry.status}</Text>
        </View>
        <Text style={styles.recentTime}>{entry.time}</Text>
      </View>
    </View>
  );
}

export function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { order, submitting, markFoodReady, refreshDelivery } = useDelivery();
  const { openFoodReadyDialog } = useFoodReadyOverlay();
  const { horizontalPadding } = useResponsive();
  // Keep last known active order so Today's Delivery + Live Tracking never
  // flash empty BOOKED / hide the timeline during refresh gaps.
  const stableHomeOrderRef = useRef<DeliveryOrder | null>(null);
  if (order && order.status !== 'pickup_closed') {
    stableHomeOrderRef.current = order;
  }
  const displayOrder = order ?? stableHomeOrderRef.current;
  const liveEtaMinutes = useLiveEta(displayOrder);
  const [errorMessage, setErrorMessage] = useState('');
  const [recentDeliveries, setRecentDeliveries] = useState<DeliveryHistoryEntry[]>([]);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  const displayName = user?.name || 'Guest';
  const initials = getInitials(displayName);

  const loadHomeData = useCallback(async () => {
    if (!user?.phone) {
      setRecentDeliveries([]);
      setHasUnreadNotifications(false);
      return;
    }

    const orders = await listCustomerOrders(user.phone);
    const history = await syncDeliveryHistory(user.phone, orders);
    setRecentDeliveries(
      history.filter((entry) => isHistoryTodayOrYesterday(resolveHistoryDateKey(entry))),
    );
    await checkSubscriptionRenewalReminders(user.phone);
    const notifications = await loadNotifications(user.phone);
    setHasUnreadNotifications(countUnread(notifications) > 0);
  }, [user?.phone]);

  const refreshUnreadBadge = useCallback(async () => {
    if (!user?.phone) {
      setHasUnreadNotifications(false);
      return;
    }
    const notifications = await loadNotifications(user.phone);
    setHasUnreadNotifications(countUnread(notifications) > 0);
  }, [user?.phone]);

  useFocusEffect(
    useCallback(() => {
      refreshDelivery();
      void loadHomeData();
      const interval = setInterval(() => {
        void refreshUnreadBadge();
      }, 4000);
      return () => clearInterval(interval);
    }, [refreshDelivery, loadHomeData, refreshUnreadBadge]),
  );

  const goToFoodReady = useCallback(() => {
    navigation.navigate('FoodReady');
  }, [navigation]);

  const buildFoodReadyDefaults = useCallback(
    (profile?: DeliveryProfile): Partial<FoodReadyDetails> => {
      const personValue = order?.studentName || profile?.studentName || '';
      const dropValue = (order ? getDropAddress(order) : '') || profile?.school || '';
      const students = buildFoodReadyStudents({
        students: order?.studentEntries,
        studentEntries: order?.studentEntries,
        person: personValue,
        dropAddress: dropValue,
        deliveryType: normalizeDeliveryType(order?.deliveryType),
        deliveryTypes: order?.deliveryTypes,
      });
      return {
        name: user?.name || profile?.name || '',
        deliveryType: normalizeDeliveryType(order?.deliveryType),
        deliveryTypes: normalizeDeliveryTypes(order?.deliveryTypes, normalizeDeliveryType(order?.deliveryType)),
        pickupAddress: order?.pickupAddress || profile?.address || '',
        dropAddress: dropValue,
        person: personValue,
        students,
      };
    },
    [order, user?.name],
  );

  const handleConfirmFoodReady = useCallback(
    async (details: FoodReadyDetails) => {
      const result = await markFoodReady(details);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      if (result.order) {
        goToFoodReady();
      }
    },
    [markFoodReady, goToFoodReady],
  );

  const handleFoodReady = useCallback(async () => {
    const showForm = !order || order.status === 'pickup_closed' || FOOD_READY_FORM_STATUSES.has(order.status);
    if (!showForm) {
      goToFoodReady();
      return;
    }

    if (!user?.phone) return;

    setErrorMessage('');

    const hasPlan = await hasActiveSubscription(user.phone);
    if (!hasPlan) {
      navigation.navigate('FoodReady', { step: 'choosePlan' });
      return;
    }

    const [savedDefaults, profile] = await Promise.all([
      loadFoodReadyDefaults(user.phone),
      loadCustomerProfile(user.phone),
    ]);

    if (savedDefaults) {
      openFoodReadyDialog({
        initialValues: savedDefaults,
        startInReviewMode: true,
        submitting,
        onConfirm: handleConfirmFoodReady,
      });
      return;
    }

    openFoodReadyDialog({
      initialValues: buildFoodReadyDefaults(profile),
      startInReviewMode: false,
      submitting,
      onConfirm: handleConfirmFoodReady,
    });
  }, [
    order,
    user?.phone,
    goToFoodReady,
    openFoodReadyDialog,
    submitting,
    handleConfirmFoodReady,
    buildFoodReadyDefaults,
  ]);

  const goToTracking = useCallback(() => {
    const tabNavigation = navigation.getParent();
    if (!tabNavigation) return;

    tabNavigation.dispatch(
      CommonActions.navigate({
        name: 'Track',
        params: { screen: 'Tracking' },
      }),
    );
  }, [navigation]);

  const handleLunchBoxPress = useCallback(() => {
    const action = getLunchBoxCardState(order).action;
    if (action === 'food_ready') {
      void handleFoodReady();
      return;
    }
    if (action === 'tracking') {
      goToTracking();
      return;
    }
    goToFoodReady();
  }, [order, handleFoodReady, goToTracking, goToFoodReady]);

  const handleViewDetails = useCallback(() => {
    const action = getLunchBoxCardState(order).action;
    if (action === 'tracking') {
      goToTracking();
      return;
    }
    goToFoodReady();
  }, [order, goToTracking, goToFoodReady]);

  const goToProfileScreen = useCallback(
    (screen: keyof ProfileStackParamList) => {
      navigation.getParent()?.navigate('Profile', { screen });
    },
    [navigation],
  );

  const deliveredProof = useMemo(() => {
    if (order?.status === 'delivered') {
      const dateKey = order.date || new Date().toISOString().slice(0, 10);
      const time = formatDeliveredClock(order.deliveredAt);
      return {
        title: getDeliveredAtTitle(order),
        whenLabel: formatDeliveredWhenLabel(dateKey, time),
        studentName: order.studentName,
        deliveredTime: time,
        destinationLabel: order.school?.split(',')[0]?.trim() || order.school,
        proofImageUrl: order.deliveryProof?.proofImageUrl,
      };
    }

    const entry = recentDeliveries.find((item) => item.status === 'Delivered');
    if (!entry) return null;

    const dateKey = resolveHistoryDateKey(entry);
    return {
      title: getDeliveredAtTitleFromHistory(entry),
      whenLabel: formatDeliveredWhenLabel(dateKey, entry.time),
      studentName: undefined,
      deliveredTime: entry.time !== '—' ? entry.time : undefined,
      destinationLabel: entry.destinationName,
      proofImageUrl: undefined,
    };
  }, [order, recentDeliveries]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.headerWrap, { paddingHorizontal: horizontalPadding }]}>
        <HomeHeader
          name={displayName}
          initials={initials}
          hasUnread={hasUnreadNotifications}
          onNotifications={() => navigation.navigate('Notifications')}
          onProfile={() => navigation.getParent()?.navigate('Profile')}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPadding }]}
      >
        <TodaysDeliveryCard order={displayOrder} liveEtaMinutes={liveEtaMinutes} onViewDetails={handleViewDetails} />
        <LiveTrackingCard order={displayOrder} disabled={submitting} onPress={handleLunchBoxPress} />

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <QuickActionsAndReferRow
          onChangeAddress={() => goToProfileScreen('SavedAddresses')}
          onDeliveryInstructions={goToFoodReady}
          onContactSupport={() => goToProfileScreen('Support')}
          onReferEarn={() => goToProfileScreen('Referral')}
        />

        <ExploreMenuBanner />

        {deliveredProof ? (
          <HomeDeliveredProofCard
            title={deliveredProof.title}
            whenLabel={deliveredProof.whenLabel}
            studentName={deliveredProof.studentName}
            deliveredTime={deliveredProof.deliveredTime}
            destinationLabel={deliveredProof.destinationLabel}
            proofImageUrl={deliveredProof.proofImageUrl}
          />
        ) : null}

        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pulse-outline" size={18} color={colors.orange} />
              <Text style={styles.sectionTitle}>Recent Deliveries</Text>
            </View>
            <Pressable onPress={() => navigation.getParent()?.navigate('History')}>
              <Text style={styles.viewAllLink}>View All</Text>
            </Pressable>
          </View>

          {recentDeliveries.length > 0 ? (
            recentDeliveries.map((entry) => <RecentDeliveryCard key={entry.id} entry={entry} />)
          ) : (
            <View style={styles.emptyRecent}>
              <Text style={styles.emptyRecentText}>No delivery yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerWrap: { paddingTop: spacing.xs, paddingBottom: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  headerName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.orange,
    textTransform: 'lowercase',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.red,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  scroll: { paddingBottom: 32, gap: 14 },
  deliveryCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.subtle,
  },
  deliveryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: 8,
  },
  deliveryCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  deliveryCardEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.orange,
    letterSpacing: 0.5,
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.orange,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  viewDetailsText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  deliveryInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  deliveryInfoCol: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
    paddingHorizontal: 2,
  },
  deliveryInfoDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.borderSubtle,
    marginHorizontal: 4,
  },
  deliveryInfoLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  deliveryInfoValue: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 14,
  },
  deliveryInfoSub: {
    fontSize: 9,
    color: colors.muted,
    marginTop: 3,
    textAlign: 'center',
    lineHeight: 12,
  },
  deliveryEtaValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.orange,
    textAlign: 'center',
  },
  liveTrackingCard: {
    borderRadius: 22,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingTop: 36,
    marginBottom: 2,
    overflow: 'hidden',
    position: 'relative',
    ...shadow.card,
  },
  liveTrackingTimeBadge: {
    position: 'absolute',
    top: 10,
    left: 12,
    zIndex: 2,
    fontSize: 11,
    fontWeight: '800',
    color: colors.onPrimary,
  },
  liveTrackingTimeBadgeHidden: {
    opacity: 0,
  },
  liveTrackingContent: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  gaugeCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineBelow: {
    width: '100%',
    alignSelf: 'stretch',
    paddingTop: 4,
    minHeight: 52,
  },
  timelineBelowHidden: {
    opacity: 0,
  },
  liveProgressList: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  liveProgressItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minWidth: 0,
  },
  liveProgressStep: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
    paddingHorizontal: 1,
  },
  liveProgressIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  liveProgressIconDone: {
    backgroundColor: colors.green,
  },
  liveProgressIconActive: {
    backgroundColor: colors.green,
  },
  liveProgressIconPending: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  liveProgressLine: {
    height: 2,
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 9,
    minWidth: 2,
    maxWidth: 18,
  },
  liveProgressLineDone: {
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  liveProgressLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.onPrimary,
    textAlign: 'center',
    lineHeight: 10,
    width: '100%',
  },
  liveProgressLabelDone: {
    color: colors.onPrimary,
  },
  liveProgressLabelActive: {
    color: colors.onPrimary,
  },
  liveProgressLabelPending: {
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '700',
  },
  quickReferCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 2,
    minHeight: 72,
    ...shadow.subtle,
  },
  quickActionsSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 0,
    paddingRight: 4,
  },
  quickReferDivider: {
    width: 1,
    height: 48,
    backgroundColor: colors.borderSubtle,
  },
  quickActionBtn: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
    paddingHorizontal: 1,
  },
  quickActionBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  quickActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  quickActionLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.orange,
    textAlign: 'center',
    lineHeight: 10,
  },
  referSection: {
    flex: 1.05,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
    paddingLeft: 6,
  },
  referCardPressed: {
    opacity: 0.94,
  },
  referIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  referCopy: { flex: 1, minWidth: 0 },
  referTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 14,
  },
  referSub: {
    fontSize: 9,
    color: colors.muted,
    marginTop: 1,
    fontWeight: '600',
    lineHeight: 11,
  },
  exploreCarousel: {
    marginBottom: 2,
  },
  exploreCarouselScroll: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  exploreSlide: {
    ...shadow.card,
  },
  exploreBanner: {
    borderRadius: 18,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exploreCopy: { flex: 1, minWidth: 0 },
  exploreTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.onPrimary,
  },
  exploreSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 3,
    fontWeight: '600',
    lineHeight: 15,
  },
  exploreLunchImageWrap: {
    width: 72,
    height: 72,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.95)',
    flexShrink: 0,
  },
  exploreLunchImage: {
    width: 180,
    height: 72,
  },
  exploreDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  exploreDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(233, 30, 99, 0.25)',
  },
  exploreDotActive: {
    width: 16,
    backgroundColor: colors.orange,
  },
  gaugeCard: {
    borderRadius: 22,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
    minHeight: 280,
    justifyContent: 'center',
    ...shadow.card,
  },
  gaugeDecorOne: { position: 'absolute', top: 24, left: 28 },
  gaugeDecorTwo: { position: 'absolute', top: 48, right: 36 },
  gaugeDecorThree: { position: 'absolute', bottom: 28, left: 48 },
  gaugePressable: { alignItems: 'center', justifyContent: 'center' },
  gaugePressed: { opacity: 0.95, transform: [{ scale: 0.99 }] },
  gaugeDisabled: { opacity: 0.7 },
  gaugeRingWrap: {
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeInner: {
    position: 'absolute',
    width: GAUGE_SIZE - GAUGE_STROKE * 2 - 10,
    height: GAUGE_SIZE - GAUGE_STROKE * 2 - 10,
    borderRadius: (GAUGE_SIZE - GAUGE_STROKE * 2 - 10) / 2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  gaugeIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  gaugeIconBadgeCancelled: {
    backgroundColor: colors.redLight,
  },
  gaugeCheckBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  gaugeCheckBadgeCancelled: {
    backgroundColor: colors.red,
  },
  gaugePercent: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.orange,
    lineHeight: 30,
  },
  gaugePercentCancelled: {
    color: colors.red,
  },
  gaugeStatus: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.4,
    marginTop: 2,
  },
  gaugeStatusCancelled: {
    color: colors.red,
  },
  gaugeHint: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 12,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  gaugeHintOnGradient: {
    fontSize: 8,
    fontWeight: '600',
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 11,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  error: {
    color: colors.red,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  progressCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    ...shadow.subtle,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  progressStep: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  progressNodeRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 28,
  },
  progressConnector: {
    flex: 1,
    height: 2,
    marginRight: 4,
    marginTop: 0,
  },
  progressConnectorDone: {
    backgroundColor: colors.green,
  },
  progressConnectorPending: {
    backgroundColor: colors.border,
  },
  progressNode: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  progressNodeDone: {
    backgroundColor: colors.green,
  },
  progressNodeActive: {
    backgroundColor: colors.green,
  },
  progressNodePending: {
    backgroundColor: '#BDBDBD',
  },
  progressLabel: {
    marginTop: 8,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 13,
  },
  progressLabelDone: {
    color: colors.text,
  },
  progressLabelActive: {
    color: colors.orange,
    fontWeight: '800',
  },
  progressLabelPending: {
    color: colors.muted,
    fontWeight: '600',
  },
  progressTime: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  progressTimePending: {
    color: colors.muted,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  recentSection: { marginBottom: spacing.sm },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  viewAllLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.orange,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    marginBottom: 10,
    ...shadow.subtle,
  },
  recentIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentCopy: { flex: 1, minWidth: 0 },
  recentTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 18,
  },
  recentRoute: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 4,
    fontWeight: '500',
  },
  recentMeta: { alignItems: 'flex-end', gap: 6 },
  recentBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  recentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  recentTime: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
  },
  emptyRecent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyRecentText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    fontWeight: '600',
  },
});
