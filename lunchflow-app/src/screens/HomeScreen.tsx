import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HistoryClockListIcon } from '../components/HistoryClockListIcon';
import { HomeDeliveredProofCard } from '../components/HomeDeliveredProofCard';
import { BannerCarousel, BannerCarouselSlide } from '../components/BannerCarousel';
import { Avatar } from '../components/Avatar';
import { getInitials } from '../constants/auth';
import { colors, gradients, shadow, spacing } from '../constants/theme';
import { getPickupSlotBlockInfo, resolveCustomerPickupAddress } from '../utils/pickupSlotGuard';
import { clearPickupSlotBannerSession, ensurePickupSlotBannerForAddress } from '../utils/pickupSlotBanner';
import { useAuth } from '../context/AuthContext';
import { useDelivery } from '../context/DeliveryContext';
import { useFoodReadyOverlay } from '../context/FoodReadyOverlayContext';
import { useResponsive } from '../hooks/useResponsive';
import { HomeStackParamList, ProfileStackParamList } from '../navigation/types';
import { DeliveryHistoryEntry, syncDeliveryHistory } from '../services/deliveryHistoryService';
import { loadFoodReadyDefaults } from '../services/foodReadyDefaultsService';
import { listCustomerOrders, loadCustomerProfile } from '../services/orderHubService';
import { checkSubscriptionRenewalReminders, hasActiveSubscription, getFoodReadyDeliveryQuota, loadActiveSubscriptionRecord } from '../services/subscriptionService';
import { countFoodReadyPeople, savePendingFoodReady } from '../services/pendingFoodReadyService';
import { getSubscriptionPlan, isMonthlySubscriptionPlan, isSingleOrderPlan } from '../constants/subscriptions';
import { countUnread, loadNotifications } from '../services/notificationService';
import { subscribeToActivePromoAds } from '../services/promoAdService';
import {
  DeliveryOrder,
  DeliveryProfile,
  DeliveryStatus,
  DeliveryType,
  FoodReadyDetails,
  buildFoodReadyStudents,
  getDropAddress,
  hasSentPickupRequest,
  normalizeDeliveryType,
  normalizeDeliveryTypes,
} from '../types/delivery';
import { isHistoryToday, isHistoryTodayOrYesterday, resolveHistoryDateKey } from '../utils/date';
import {
  getActiveStepTime,
  getHomeGaugeMeta,
  getHomeProgressIndex,
  hasActiveBookingProgress,
  HOME_PROGRESS_STEPS,
} from '../utils/homeOrderProgress';
import { PromoAd, PromoAdAssetKey } from '../types/promoAd';

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

const FOOD_READY_FORM_STATUSES = new Set(['booked']);

const GAUGE_SIZE = 208;
const GAUGE_STROKE = 10;


function HorizontalLiveProgress({ order }: { order: DeliveryOrder | null }) {
  const activeIndex = order && order.status !== 'pickup_closed' ? getHomeProgressIndex(order.status) : -1;
  const isDelivered = order?.status === 'delivered';
  const lastIndex = HOME_PROGRESS_STEPS.length - 1;

  return (
    <View style={styles.liveProgressList}>
      {HOME_PROGRESS_STEPS.map((step, index) => {
        const reached = activeIndex >= 0 && (index <= activeIndex || isDelivered);
        const leftDone = index > 0 && reached;
        const rightDone = index < lastIndex && (index < activeIndex || isDelivered);

        return (
          <View key={step.label} style={styles.liveProgressItem}>
            <View style={styles.liveProgressIconRow}>
              <View style={[styles.liveProgressLine, index === 0 && styles.liveProgressLineHidden, leftDone && styles.liveProgressLineDone]} />
              <View style={[styles.liveProgressIcon, reached ? styles.liveProgressIconDone : styles.liveProgressIconPending]}>
                <Ionicons
                  name={reached ? 'checkmark' : step.icon}
                  size={14}
                  color={reached ? colors.onPrimary : colors.muted}
                />
              </View>
              <View style={[styles.liveProgressLine, index === lastIndex && styles.liveProgressLineHidden, rightDone && styles.liveProgressLineDone]} />
            </View>
            <Text style={[styles.liveProgressLabel, !reached && styles.liveProgressLabelPending]} numberOfLines={2}>
              {step.label}
            </Text>
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
    return { name: 'Destination', kind: 'Office' };
  }

  const drop = getDropAddress(order);
  const firstStop = order.studentEntries?.[0]?.dropLocation?.trim();
  const raw = firstStop || order.school || drop.split(',')[0]?.trim() || 'Destination';
  const type = normalizeDeliveryType(order.deliveryType);
  const kind = type === 'office' ? 'Office' : type === 'college' ? 'College' : 'School';

  return { name: shortenWords(raw, 3), kind };
}


function CircularGauge({ percent, cancelled }: { percent: number; cancelled?: boolean }) {
  const radius = (GAUGE_SIZE - GAUGE_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clamped / 100) * circumference;
  const progressStroke = cancelled ? colors.red : colors.green;

  return (
    <Svg width={GAUGE_SIZE} height={GAUGE_SIZE}>
      <Circle
        cx={GAUGE_SIZE / 2}
        cy={GAUGE_SIZE / 2}
        r={radius}
        stroke="#E6E1D8"
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
  action: 'food_ready' | 'already_sent' | 'tracking' | 'details';
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
      action: 'already_sent',
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

function PickupSlotHomeBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <View style={styles.pickupSlotBanner}>
      <Ionicons name="time-outline" size={18} color={colors.orange} />
      <ScrollView
        style={styles.pickupSlotBannerScroll}
        contentContainerStyle={styles.pickupSlotBannerScrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <Text style={styles.pickupSlotBannerText}>{message}</Text>
      </ScrollView>
      <Pressable onPress={onDismiss} hitSlop={8} accessibilityLabel="Dismiss pickup slot alert">
        <Ionicons name="close" size={16} color={colors.muted} />
      </Pressable>
    </View>
  );
}

function HomeHeader({
  name,
  initials,
  avatarUrl,
  hasUnread,
  onNotifications,
  onProfile,
}: {
  name: string;
  initials: string;
  avatarUrl?: string;
  hasUnread: boolean;
  onNotifications: () => void;
  onProfile: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerName} numberOfLines={1}>
          Hi, {name} 👋
        </Text>
      </View>

      <View style={styles.headerRight}>
        <Pressable style={styles.headerIconBtn} onPress={onNotifications}>
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
          {hasUnread ? <View style={styles.notifDot} /> : null}
        </Pressable>
        <Pressable onPress={onProfile}>
          <Avatar initials={initials} imageUrl={avatarUrl} size={42} />
        </Pressable>
      </View>
    </View>
  );
}

function TodaysDeliveryCard({
  order,
  onViewDetails,
}: {
  order: DeliveryOrder | null;
  onViewDetails: () => void;
}) {
  const destination = parseDestination(order);
  const driverName = order?.driver?.name?.split(' ')[0];
  const pickupFrom = order?.pickupAddress?.trim()
    ? shortenWords(order.pickupAddress, 3)
    : 'Home';
  const staffName = driverName || 'Not Assigned';
  const staffSub = driverName ? 'On the way' : 'Yet';

  return (
    <View style={styles.deliveryCard}>
      <View style={styles.deliveryCardHeader}>
        <View style={styles.deliveryCardHeaderLeft}>
          <Ionicons name="bag-handle-outline" size={14} color={colors.green} />
          <Text style={styles.deliveryCardEyebrow}>TODAY&apos;S LUNCH DELIVERY</Text>
        </View>
        <Pressable style={styles.viewDetailsBtn} onPress={onViewDetails}>
          <Text style={styles.viewDetailsText}>View Details</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.orange} />
        </Pressable>
      </View>

      <View style={styles.deliveryInfoRow}>
        <View style={styles.deliveryInfoCol}>
          <View style={[styles.deliveryStatIcon, { backgroundColor: colors.orangeLight }]}>
            <Ionicons name="bicycle-outline" size={14} color={colors.orange} />
          </View>
          <Text style={styles.deliveryInfoLabel}>Pickup From</Text>
          <Text style={styles.deliveryInfoValue} numberOfLines={1}>
            {pickupFrom}
          </Text>
          {pickupFrom !== 'Home' ? <Text style={styles.deliveryInfoSub}>Home</Text> : null}
        </View>

        <View style={styles.deliveryInfoDivider} />

        <View style={styles.deliveryInfoCol}>
          <View style={[styles.deliveryStatIcon, { backgroundColor: colors.greenLight }]}>
            <Ionicons name="location" size={14} color={colors.green} />
          </View>
          <Text style={styles.deliveryInfoLabel}>Deliver To</Text>
          <Text style={styles.deliveryInfoValue} numberOfLines={1}>
            {destination.name}
          </Text>
          <Text style={styles.deliveryInfoSub}>{destination.kind}</Text>
        </View>

        <View style={styles.deliveryInfoDivider} />

        <View style={styles.deliveryInfoCol}>
          <View style={[styles.deliveryStatIcon, { backgroundColor: colors.greenLight }]}>
            <Ionicons name="person-outline" size={14} color={colors.green} />
          </View>
          <Text style={styles.deliveryInfoLabel}>Driver Status</Text>
          <Text style={styles.deliveryInfoValue} numberOfLines={1}>
            {staffName}
          </Text>
          <Text style={styles.deliveryInfoSub}>{staffSub}</Text>
        </View>
      </View>
    </View>
  );
}

function EmptyBookingCard({ onBook }: { onBook: () => void }) {
  return (
    <View style={styles.emptyBookingCard}>
      <View style={styles.emptyBookingIconWrap}>
        <Ionicons name="calendar-outline" size={28} color={colors.orange} />
      </View>
      <Text style={styles.emptyBookingTitle}>No active booking for today</Text>
      <Text style={styles.emptyBookingSub}>Book lunch delivery to track pickup and delivery progress here.</Text>
      <Pressable style={({ pressed }) => [styles.emptyBookingBtn, pressed && styles.emptyBookingBtnPressed]} onPress={onBook}>
        <Text style={styles.emptyBookingBtnText}>Book Lunch Delivery Now</Text>
        <Ionicons name="arrow-forward" size={16} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}

function LiveTrackingCard({
  order,
  disabled,
  onPress,
  onHistoryPress,
}: {
  order: DeliveryOrder | null;
  disabled?: boolean;
  onPress: () => void;
  onHistoryPress: () => void;
}) {
  const gauge = getHomeGaugeMeta(order);
  const isCancelled = order?.status === 'pickup_closed';
  const showProgressTime = hasActiveBookingProgress(order) || order?.status === 'delivered';
  const activeStepTime = getActiveStepTime(order);
  const lastStepTimeRef = useRef<string | null>(null);
  if (activeStepTime) lastStepTimeRef.current = activeStepTime;
  const stepTimeLabel = activeStepTime ?? lastStepTimeRef.current;

  return (
    <View style={[styles.liveTrackingCard, isCancelled && styles.liveTrackingCardCancelled]}>
      {showProgressTime && stepTimeLabel ? (
        <View style={styles.liveTrackingTimeBadge}>
          <Text style={styles.liveTrackingTimeText}>{stepTimeLabel}</Text>
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [styles.historyShortcut, pressed && styles.historyShortcutPressed]}
        onPress={onHistoryPress}
        accessibilityRole="button"
        accessibilityLabel="History"
        hitSlop={8}
      >
        <HistoryClockListIcon size={34} color={colors.green} />
      </Pressable>

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
            <LinearGradient
              colors={isCancelled ? ['#E57373', '#C62828'] : ['#F6C15B', '#E45E1A']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.gaugeInner}
            >
              <View style={styles.gaugeCenterStack}>
                <View style={[styles.gaugeIconBadge, isCancelled && styles.gaugeIconBadgeCancelled]}>
                  <Ionicons
                    name={isCancelled ? 'close-circle-outline' : 'fast-food-outline'}
                    size={20}
                    color={isCancelled ? colors.red : colors.orange}
                  />
                  {gauge.percent > 0 || isCancelled ? (
                    <View style={[styles.gaugeCheckBadge, isCancelled && styles.gaugeCheckBadgeCancelled]}>
                      <Ionicons name={isCancelled ? 'close' : 'checkmark'} size={10} color={colors.onPrimary} />
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.gaugePercent, isCancelled && styles.gaugePercentCancelled]}>{gauge.percent}%</Text>
                <Text style={[styles.gaugeStatus, isCancelled && styles.gaugeStatusCancelled]}>{gauge.status}</Text>
                <Text style={styles.gaugeHintOnGradient} numberOfLines={2}>
                  {gauge.hint}
                </Text>
              </View>
            </LinearGradient>
          </View>
        </Pressable>

        <View style={styles.timelineBelow}>
          <HorizontalLiveProgress order={order} />
        </View>
      </View>
    </View>
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
    {
      icon: 'location' as const,
      label: 'Address',
      onPress: onChangeAddress,
      iconBg: colors.greenLight,
      iconColor: colors.green,
    },
    {
      icon: 'bag-handle' as const,
      label: 'Pickup',
      onPress: onDeliveryInstructions,
      iconBg: colors.orangeLight,
      iconColor: colors.orange,
    },
    {
      icon: 'headset' as const,
      label: 'Support',
      onPress: onContactSupport,
      iconBg: '#EDE8F6',
      iconColor: '#6A5B9A',
    },
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
            <View style={[styles.quickActionIcon, { backgroundColor: action.iconBg }]}>
              <Ionicons name={action.icon} size={18} color={action.iconColor} />
            </View>
            <Text style={styles.quickActionLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [styles.referSection, pressed && styles.referCardPressed]}
        onPress={onReferEarn}
      >
        <View style={styles.referIcon}>
          <Ionicons name="gift" size={18} color={colors.orange} />
        </View>
        <View style={styles.referCopy}>
          <Text style={styles.referTitle} numberOfLines={1}>
            Refer & Earn
          </Text>
          <Text style={styles.referSub} numberOfLines={2}>
            Invite & earn rewards!
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.text} />
      </Pressable>
    </View>
  );
}

type LunchboxAd = BannerCarouselSlide;

const PROMO_TIFFIN_STICKER = require('../../assets/promo-tiffin-sticker.png');
const PROMO_MEAL_PLATE = require('../../assets/driver-promo-meal.png');

const PROMO_ASSET_MAP: Record<PromoAdAssetKey, number> = {
  'tiffin-sticker': PROMO_TIFFIN_STICKER,
  'meal-plate': PROMO_MEAL_PLATE,
  'lunch-bag': require('../../assets/lunch-bag.png'),
  'tiffin-thankyou': require('../../assets/promo-tiffin-thankyou-cutout.png'),
  'lunch-hero': require('../../assets/promo-lunch-hero.png'),
};

function isReferralPromoAd(ad: PromoAd): boolean {
  const haystack = `${ad.id} ${ad.title} ${ad.subtitle}`.toLowerCase();
  return haystack.includes('refer') || haystack.includes('friends');
}

function promoAdToSlide(ad: PromoAd): LunchboxAd {
  const assetImage = ad.imageAssetKey ? PROMO_ASSET_MAP[ad.imageAssetKey] : undefined;

  if (
    isReferralPromoAd(ad) &&
    !ad.id.startsWith('default-home-carousel-') &&
    (ad.displayType === 'banner' || ad.bannerImageUrl)
  ) {
    return {
      id: ad.id,
      kind: 'composed',
      title: ad.title.trim() || 'Refer Your Friends and Family',
      subtitle: ad.subtitle.trim() || 'Refer Lunch Box to your friends and family.',
      colors: [ad.gradientStart, ad.gradientEnd],
      image: PROMO_ASSET_MAP['lunch-bag'],
    };
  }

  if ((ad.displayType === 'banner' || ad.bannerImageUrl) && ad.bannerImageUrl) {
    return {
      id: ad.id,
      kind: 'banner',
      bannerImageUrl: ad.bannerImageUrl,
    };
  }

  return {
    id: ad.id,
    kind: 'composed',
    title: ad.title,
    subtitle: ad.subtitle,
    colors: [ad.gradientStart, ad.gradientEnd],
    image: ad.imageUrl ? { uri: ad.imageUrl } : assetImage ?? PROMO_MEAL_PLATE,
  };
}

const LUNCHBOX_AD_AUTO_SCROLL_MS = 4000;
const MAX_HOME_PROMO_ADS = 4;

function ExploreMenuBanner() {
  const [remoteAds, setRemoteAds] = useState<LunchboxAd[]>([]);
  const [autoScrollMs, setAutoScrollMs] = useState(LUNCHBOX_AD_AUTO_SCROLL_MS);
  const slides = useMemo(() => remoteAds.slice(0, MAX_HOME_PROMO_ADS), [remoteAds]);

  useEffect(() => subscribeToActivePromoAds('customer', (ads) => setRemoteAds(ads.map(promoAdToSlide))), []);

  useFocusEffect(
    useCallback(() => {
      setAutoScrollMs(LUNCHBOX_AD_AUTO_SCROLL_MS);
      return () => setAutoScrollMs(0);
    }, []),
  );

  return <BannerCarousel slides={slides} autoScrollMs={autoScrollMs} />;
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
  const { order, loading: deliveryLoading, submitting, markFoodReady, refreshDelivery } = useDelivery();
  const { openFoodReadyDialog, closeFoodReadyDialog } = useFoodReadyOverlay();
  const { horizontalPadding } = useResponsive();
  const stableHomeOrderRef = useRef<DeliveryOrder | null>(null);
  if (order && order.status !== 'pickup_closed') {
    stableHomeOrderRef.current = order;
  } else if (!deliveryLoading && !order) {
    stableHomeOrderRef.current = null;
  }
  const displayOrder = order ?? (deliveryLoading ? stableHomeOrderRef.current : null);
  const [errorMessage, setErrorMessage] = useState('');
  const [pickupSlotBanner, setPickupSlotBanner] = useState<string | null>(null);
  const pickupSlotBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickupBannerDismissedRef = useRef(false);
  const [recentDeliveries, setRecentDeliveries] = useState<DeliveryHistoryEntry[]>([]);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  const displayName = user?.name || 'Guest';
  const initials = getInitials(displayName);

  const hidePickupSlotBanner = useCallback(() => {
    setPickupSlotBanner(null);
    if (pickupSlotBannerTimerRef.current) {
      clearTimeout(pickupSlotBannerTimerRef.current);
      pickupSlotBannerTimerRef.current = null;
    }
  }, []);

  const showPickupSlotBanner = useCallback(
    (message: string, expiresAt: number) => {
      setPickupSlotBanner(message);
      if (pickupSlotBannerTimerRef.current) {
        clearTimeout(pickupSlotBannerTimerRef.current);
      }
      const remaining = Math.max(0, expiresAt - Date.now());
      pickupSlotBannerTimerRef.current = setTimeout(hidePickupSlotBanner, remaining);
    },
    [hidePickupSlotBanner],
  );

  const dismissPickupSlotBanner = useCallback(async () => {
    pickupBannerDismissedRef.current = true;
    hidePickupSlotBanner();
    if (user?.phone) {
      await clearPickupSlotBannerSession(user.phone);
    }
  }, [hidePickupSlotBanner, user?.phone]);

  const refreshPickupSlotBanner = useCallback(async () => {
    if (!user?.phone) {
      hidePickupSlotBanner();
      return;
    }

    if (pickupBannerDismissedRef.current) return;

    const current = displayOrder ?? stableHomeOrderRef.current;
    const hasLivePickup =
      current &&
      current.status !== 'booked' &&
      current.status !== 'pickup_closed' &&
      current.status !== 'delivered';

    if (hasLivePickup) {
      hidePickupSlotBanner();
      await clearPickupSlotBannerSession(user.phone);
      return;
    }

    const pickupAddress = await resolveCustomerPickupAddress(user.phone, displayOrder?.pickupAddress);
    const slotInfo = await getPickupSlotBlockInfo(pickupAddress);

    if (!slotInfo.blocked) {
      hidePickupSlotBanner();
      await clearPickupSlotBannerSession(user.phone);
      return;
    }

    if (!slotInfo.message) {
      hidePickupSlotBanner();
      return;
    }

    const expiresAt = await ensurePickupSlotBannerForAddress(user.phone, pickupAddress);
    if (expiresAt <= Date.now()) {
      hidePickupSlotBanner();
      return;
    }

    showPickupSlotBanner(slotInfo.message, expiresAt);
  }, [user?.phone, displayOrder, hidePickupSlotBanner, showPickupSlotBanner]);

  useEffect(() => {
    return () => {
      if (pickupSlotBannerTimerRef.current) {
        clearTimeout(pickupSlotBannerTimerRef.current);
      }
    };
  }, []);

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
      pickupBannerDismissedRef.current = false;
      setErrorMessage('');
      void refreshDelivery().then(() => refreshPickupSlotBanner());
      void loadHomeData();
      const interval = setInterval(() => {
        void refreshUnreadBadge();
      }, 4000);
      return () => clearInterval(interval);
    }, [refreshDelivery, loadHomeData, refreshPickupSlotBanner, refreshUnreadBadge]),
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
        pickupAddress: profile?.address || order?.pickupAddress || '',
        dropAddress: dropValue,
        person: personValue,
        students,
      };
    },
    [order, user?.name],
  );

  const handleConfirmFoodReady = useCallback(
    async (details: FoodReadyDetails) => {
      if (!user?.phone) return;

      const peopleCount = countFoodReadyPeople(details);
      const hasPlan = await hasActiveSubscription(user.phone);

      if (!hasPlan) {
        await savePendingFoodReady(user.phone, details);
        closeFoodReadyDialog();
        navigation.navigate('FoodReady', { step: 'choosePlan', peopleCount: Math.max(1, peopleCount) });
        return;
      }

      const record = await loadActiveSubscriptionRecord(user.phone);
      const plan = record ? getSubscriptionPlan(record.planId) : null;

      if (plan && isSingleOrderPlan(plan)) {
        const paidPeople = record?.paidPeopleCount ?? 1;
        if (peopleCount > paidPeople) {
          await savePendingFoodReady(user.phone, details);
          closeFoodReadyDialog();
          navigation.navigate('FoodReady', { step: 'choosePlan', peopleCount: Math.max(1, peopleCount) });
          return;
        }
      } else if (plan && isMonthlySubscriptionPlan(plan)) {
        const quota = await getFoodReadyDeliveryQuota(user.phone);
        if (peopleCount > quota.maxPeople) {
          await savePendingFoodReady(user.phone, details);
          closeFoodReadyDialog();
          navigation.navigate('FoodReady', { step: 'choosePlan', peopleCount: Math.max(1, peopleCount) });
          return;
        }
      }

      const result = await markFoodReady(details);
      if (result.error) {
        if (result.error.startsWith('Pickup Slot')) {
          if (user?.phone) {
            pickupBannerDismissedRef.current = false;
            const pickupAddress = await resolveCustomerPickupAddress(user.phone, result.order?.pickupAddress ?? order?.pickupAddress);
            const expiresAt = await ensurePickupSlotBannerForAddress(user.phone, pickupAddress);
            showPickupSlotBanner(result.error, expiresAt);
          }
        }
        setErrorMessage(result.error);
        return;
      }
      if (result.order) {
        closeFoodReadyDialog();
        hidePickupSlotBanner();
        void clearPickupSlotBannerSession(user.phone);
        goToFoodReady();
      }
    },
    [markFoodReady, goToFoodReady, user?.phone, showPickupSlotBanner, navigation, closeFoodReadyDialog, hidePickupSlotBanner],
  );

  const handleFoodReady = useCallback(async () => {
    if (!user?.phone) return;

    const pickupAddress = await resolveCustomerPickupAddress(user.phone, order?.pickupAddress);
    const slotInfo = await getPickupSlotBlockInfo(pickupAddress);
    if (slotInfo.blocked && slotInfo.message) {
      pickupBannerDismissedRef.current = false;
      const expiresAt = await ensurePickupSlotBannerForAddress(user.phone, pickupAddress);
      showPickupSlotBanner(slotInfo.message, expiresAt);
      return;
    }

    const current = order ?? stableHomeOrderRef.current;
    if (hasSentPickupRequest(current)) {
      Alert.alert('Pickup request already sent', 'You already sent a pickup request. Please wait for a rider to accept.');
      return;
    }

    const showForm = !current || current.status === 'pickup_closed' || FOOD_READY_FORM_STATUSES.has(current.status);
    if (!showForm) {
      goToFoodReady();
      return;
    }

    if (!user?.phone) return;

    setErrorMessage('');

    const [savedDefaults, profileForDefaults] = await Promise.all([
      loadFoodReadyDefaults(user.phone),
      loadCustomerProfile(user.phone),
    ]);

    const currentPickupAddress =
      profileForDefaults.address?.trim() || order?.pickupAddress?.trim() || savedDefaults?.pickupAddress || '';

    if (savedDefaults) {
      openFoodReadyDialog({
        initialValues: { ...savedDefaults, pickupAddress: currentPickupAddress },
        startInReviewMode: true,
        submitting,
        onConfirm: handleConfirmFoodReady,
      });
      return;
    }

    openFoodReadyDialog({
      initialValues: buildFoodReadyDefaults(profileForDefaults),
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
    showPickupSlotBanner,
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
    const current = order ?? stableHomeOrderRef.current;
    const action = getLunchBoxCardState(current).action;
    if (action === 'already_sent' || hasSentPickupRequest(current)) {
      Alert.alert('Pickup request already sent', 'You already sent a pickup request. Please wait for a rider to accept.');
      return;
    }
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
      const parent = navigation.getParent();
      if (!parent) return;
      parent.navigate('Profile', { screen, initial: false });
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
      };
    }

    const entry = recentDeliveries.find((item) => item.status === 'Delivered');
    if (!entry) return null;

    const dateKey = resolveHistoryDateKey(entry);
    return {
      title: getDeliveredAtTitleFromHistory(entry),
      whenLabel: formatDeliveredWhenLabel(dateKey, entry.time),
    };
  }, [order, recentDeliveries]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.headerWrap, { paddingHorizontal: horizontalPadding }]}>
        <HomeHeader
          name={displayName}
          initials={initials}
          avatarUrl={user?.avatarUrl}
          hasUnread={hasUnreadNotifications}
          onNotifications={() => navigation.navigate('Notifications')}
          onProfile={() => navigation.getParent()?.navigate('Profile')}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPadding }]}
      >
        {pickupSlotBanner ? (
          <PickupSlotHomeBanner message={pickupSlotBanner} onDismiss={() => void dismissPickupSlotBanner()} />
        ) : null}
        {deliveryLoading ? (
          <View style={styles.emptyBookingCard}>
            <Text style={styles.emptyBookingSub}>Loading today&apos;s booking...</Text>
          </View>
        ) : (
          <>
            {hasActiveBookingProgress(displayOrder) ? (
              <TodaysDeliveryCard order={displayOrder!} onViewDetails={handleViewDetails} />
            ) : null}
            <LiveTrackingCard
              order={displayOrder}
              disabled={submitting}
              onPress={handleLunchBoxPress}
              onHistoryPress={() => navigation.navigate('History')}
            />
            {!hasActiveBookingProgress(displayOrder) ? (
              <EmptyBookingCard onBook={goToFoodReady} />
            ) : null}
          </>
        )}

        {deliveredProof ? (
          <HomeDeliveredProofCard title={deliveredProof.title} whenLabel={deliveredProof.whenLabel} />
        ) : null}

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <QuickActionsAndReferRow
          onChangeAddress={() => goToProfileScreen('SavedAddresses')}
          onDeliveryInstructions={goToFoodReady}
          onContactSupport={() => goToProfileScreen('Support')}
          onReferEarn={() => goToProfileScreen('Referral')}
        />

        <ExploreMenuBanner />

        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cube-outline" size={18} color={colors.orange} />
              <Text style={styles.sectionTitle}>Recent Deliveries</Text>
            </View>
            <Pressable onPress={() => navigation.navigate('History')} style={styles.viewAllBtn}>
              <Text style={styles.viewAllLink}>View All</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.orange} />
            </Pressable>
          </View>

          {recentDeliveries.length > 0 ? (
            recentDeliveries.map((entry) => <RecentDeliveryCard key={entry.id} entry={entry} />)
          ) : (
            <View style={styles.emptyRecent}>
              <Ionicons name="cube-outline" size={36} color={colors.muted} />
              <Text style={styles.emptyRecentText}>No delivery yet. Your recent deliveries will appear here.</Text>
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
  pickupSlotBanner: {
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.orangeLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.orange,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    maxHeight: 72,
  },
  pickupSlotBannerScroll: {
    flex: 1,
    maxHeight: 52,
  },
  pickupSlotBannerScrollContent: {
    flexGrow: 1,
  },
  pickupSlotBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 18,
  },
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
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.subtle,
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.orange,
    borderWidth: 2,
    borderColor: colors.white,
  },
  scroll: { paddingBottom: 32, gap: 14 },
  deliveryCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    borderWidth: 0,
    ...shadow.card,
  },
  deliveryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
    color: colors.green,
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  viewDetailsText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.orange,
  },
  deliveryInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  deliveryInfoCol: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
    paddingHorizontal: 3,
  },
  deliveryStatIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  deliveryInfoDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.borderSubtle,
  },
  deliveryInfoLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 1,
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
    textAlign: 'center',
    lineHeight: 11,
    marginTop: 1,
  },
  liveTrackingCard: {
    borderRadius: 26,
    paddingHorizontal: spacing.sm,
    paddingTop: 36,
    paddingBottom: 16,
    marginBottom: 2,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.white,
    ...shadow.card,
  },
  liveTrackingCardCancelled: {
    backgroundColor: colors.white,
  },
  liveTrackingTimeBadge: {
    position: 'absolute',
    top: 12,
    left: 14,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveTrackingTimeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.green,
  },
  historyShortcut: {
    position: 'absolute',
    top: 8,
    right: 12,
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  historyShortcutPressed: {
    opacity: 0.85,
  },
  readyCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 40,
    marginBottom: 8,
    gap: 8,
  },
  readyCopy: {
    flex: 1,
    minWidth: 0,
  },
  readyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.onPrimary,
    lineHeight: 22,
  },
  readySub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 4,
    lineHeight: 15,
    fontWeight: '500',
  },
  readyArt: {
    width: 56,
    height: 56,
    flexShrink: 0,
  },
  readyTracker: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.14)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  readyStepIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  readyStepCheck: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  liveTrackingContent: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  gaugeCol: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  timelineBelow: {
    width: '100%',
    alignSelf: 'stretch',
    marginTop: 12,
  },
  liveProgressList: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  liveProgressItem: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  liveProgressIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 6,
  },
  liveProgressIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  liveProgressIconDone: {
    backgroundColor: colors.orange,
  },
  liveProgressIconPending: {
    backgroundColor: '#E6E1D8',
  },
  liveProgressLine: {
    height: 2,
    flex: 1,
    backgroundColor: '#D8D2C6',
  },
  liveProgressLineDone: {
    backgroundColor: colors.orange,
  },
  liveProgressLineHidden: {
    opacity: 0,
  },
  liveProgressLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 12,
    width: '100%',
    paddingHorizontal: 1,
  },
  liveProgressLabelPending: {
    color: colors.muted,
    fontWeight: '600',
  },
  quickReferCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 2,
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 12,
    ...shadow.card,
  },
  quickActionsSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 0,
    gap: 4,
  },
  quickActionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  quickActionBtnPressed: {
    opacity: 0.85,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 14,
  },
  referSection: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    backgroundColor: colors.bg,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  referCardPressed: {
    opacity: 0.94,
  },
  referIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  referCopy: { flex: 1, minWidth: 0 },
  referTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 17,
  },
  referSub: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 2,
    fontWeight: '500',
    lineHeight: 13,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    overflow: 'hidden',
  },
  gaugeCenterStack: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  gaugeIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF6E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
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
    color: colors.onPrimary,
    lineHeight: 32,
  },
  gaugePercentCancelled: {
    color: colors.onPrimary,
  },
  gaugeStatus: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.green,
    letterSpacing: 0.4,
    marginTop: 2,
  },
  gaugeStatusCancelled: {
    color: colors.onPrimary,
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
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    lineHeight: 12,
    marginTop: 6,
    paddingHorizontal: 4,
    maxWidth: 120,
  },
  emptyBookingCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadow.card,
  },
  emptyBookingIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyBookingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  emptyBookingSub: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 16,
  },
  emptyBookingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.green,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  emptyBookingBtnPressed: {
    opacity: 0.92,
  },
  emptyBookingBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary,
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
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
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
    borderRadius: 22,
    borderWidth: 0,
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
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingVertical: 28,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: 10,
    ...shadow.subtle,
  },
  emptyRecentText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 18,
    maxWidth: 260,
  },
});
