import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { colors, spacing } from '../constants/theme';
import { useDelivery } from '../context/DeliveryContext';
import { useFoodReadyOverlay } from '../context/FoodReadyOverlayContext';
import { useResponsive } from '../hooks/useResponsive';
import { HomeStackParamList } from '../navigation/types';
import { getDeliveryTypeLabel, getDropAddress, normalizeDeliveryType, normalizeDeliveryTypes, buildFoodReadyStudents, DeliveryOrder } from '../types/delivery';

type Props = NativeStackScreenProps<HomeStackParamList, 'FoodReady'>;

function AddressRow({
  icon,
  iconBg,
  iconColor,
  label,
  address,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  label: string;
  address: string;
}) {
  return (
    <View style={styles.addressRow}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.addressInfo}>
        <Text style={styles.addressLabel}>{label}</Text>
        <Text style={styles.addressText}>{address}</Text>
      </View>
    </View>
  );
}

function formatDropDetails(order: Pick<DeliveryOrder, 'studentName' | 'dropAddress' | 'school'>): string {
  const address = getDropAddress(order);
  const name = order.studentName?.trim();
  if (!name) return address;
  if (address && address !== name) return `${name}\n${address}`;
  return name;
}

export function FoodReadyScreen({ navigation }: Props) {
  const { order, submitting, markFoodReady, refreshDelivery } = useDelivery();
  const { openFoodReadyDialog } = useFoodReadyOverlay();
  const { horizontalPadding, foodReadySize, contentMaxWidth } = useResponsive();
  const displayOrder = order;
  const ringSize = Math.min(foodReadySize * 0.66, 120);
  const hasDriver = Boolean(displayOrder?.driver);
  const isWaiting = displayOrder?.status === 'awaiting_driver';
  const etaLabel = displayOrder?.driver?.etaMinutes ? `${displayOrder.driver.etaMinutes} min` : '—';

  useEffect(() => {
    void refreshDelivery();
    const interval = setInterval(() => void refreshDelivery(), 3000);
    return () => clearInterval(interval);
  }, [refreshDelivery]);

  if (!displayOrder || displayOrder.status === 'booked') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button">
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
        </View>
        <View style={[styles.emptyState, { paddingHorizontal: horizontalPadding }]}>
          <Text style={styles.title}>No pickup request yet</Text>
          <Text style={styles.subtitle}>Mark food ready from the home screen first.</Text>
          <Button title="Back to Home" variant="outline" onPress={() => navigation.goBack()} style={styles.fullWidthBtn} />
        </View>
      </SafeAreaView>
    );
  }

  if (displayOrder.status === 'pickup_closed') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button">
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPadding }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.body, { maxWidth: contentMaxWidth }]}>
            <View style={styles.hero}>
              <View style={[styles.ring, styles.cancelledRing, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}>
                <Ionicons name="close" size={48} color={colors.red} />
              </View>
              <Text style={styles.title}>Order Cancelled</Text>
            </View>

            <Card
              style={styles.card}
              title="Delivery Details"
              badge={<Badge label="Cancelled" tone="red" />}
            >
              <AddressRow
                icon="home-outline"
                iconBg={colors.orangeLight}
                iconColor={colors.orange}
                label="Pickup"
                address={displayOrder.pickupAddress}
              />
              <View style={styles.divider} />
              <AddressRow
                icon="location-outline"
                iconBg={colors.greenLight}
                iconColor={colors.greenDark}
                label="Drop"
                address={formatDropDetails(displayOrder)}
              />
            </Card>

            <View style={styles.actions}>
              <Button
                title="Track Live"
                onPress={() => {
                  navigation.getParent()?.dispatch(
                    CommonActions.navigate({
                      name: 'Track',
                      params: { screen: 'Tracking' },
                    }),
                  );
                }}
                style={styles.fullWidthBtn}
              />
              <Button title="Back to Home" variant="outline" onPress={() => navigation.goBack()} style={styles.fullWidthBtn} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button">
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.body, { maxWidth: contentMaxWidth }]}>
          <View style={styles.hero}>
            <View style={[styles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}>
              {isWaiting && !hasDriver ? (
                <ActivityIndicator size="large" color={colors.orange} />
              ) : (
                <Ionicons name="checkmark" size={48} color={colors.orange} />
              )}
            </View>
            <Text style={styles.title}>Pickup Request Created!</Text>
            <Text style={styles.subtitle}>Your lunchbox is ready for pickup</Text>
          </View>

          <Card
            style={styles.card}
            title="Delivery Details"
            badge={<Badge label={getDeliveryTypeLabel(displayOrder.deliveryType)} tone="orange" />}
          >
            <AddressRow
              icon="home-outline"
              iconBg={colors.orangeLight}
              iconColor={colors.orange}
              label="Pickup"
              address={displayOrder.pickupAddress}
            />
            <View style={styles.divider} />
            <AddressRow
              icon="location-outline"
              iconBg={colors.greenLight}
              iconColor={colors.greenDark}
              label="Drop"
              address={formatDropDetails(displayOrder)}
            />
          </Card>

          <Card
            style={styles.card}
            title="Driver Assigned"
            badge={<Badge label={hasDriver ? 'Confirmed' : 'Pending'} tone={hasDriver ? 'green' : 'orange'} />}
          >
            <View style={styles.driverRow}>
              {hasDriver ? (
                <Avatar initials={displayOrder.driver?.initials ?? '—'} />
              ) : (
                <View style={styles.searchAvatar}>
                  <Ionicons name="search" size={20} color={colors.orange} />
                </View>
              )}
              <View style={styles.driverInfo}>
                {displayOrder.driver ? (
                  <>
                    <Text style={styles.driverName}>{displayOrder.driver.name}</Text>
                    {displayOrder.driver.etaMinutes ? (
                      <Text style={styles.driverSub}>
                        {`Arriving in ${displayOrder.driver.etaMinutes} minutes`}
                      </Text>
                    ) : null}
                  </>
                ) : null}
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statBlock}>
                <Text style={styles.statLabel}>Pickup ETA</Text>
                <Text style={styles.statValue}>{etaLabel}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBlock}>
                <Text style={styles.statLabel}>Driver Status</Text>
                <Text style={[styles.statValue, styles.statValueSmall]}>
                  {hasDriver ? 'Assigned' : 'Pending'}
                </Text>
              </View>
            </View>
          </Card>

          <View style={styles.actions}>
            {isWaiting && !hasDriver ? (
              <Button
                title="Edit Delivery Details"
                variant="outline"
                onPress={() => {
                  if (!displayOrder) return;
                  openFoodReadyDialog({
                    initialValues: {
                      name: displayOrder.customerName,
                      deliveryType: normalizeDeliveryType(displayOrder.deliveryType),
                      deliveryTypes: normalizeDeliveryTypes(
                        displayOrder.deliveryTypes,
                        normalizeDeliveryType(displayOrder.deliveryType),
                      ),
                      pickupAddress: displayOrder.pickupAddress,
                      dropAddress: getDropAddress(displayOrder),
                      person: displayOrder.studentName,
                      students: buildFoodReadyStudents({
                        studentEntries: displayOrder.studentEntries,
                        person: displayOrder.studentName,
                        dropAddress: getDropAddress(displayOrder),
                        deliveryType: normalizeDeliveryType(displayOrder.deliveryType),
                        deliveryTypes: displayOrder.deliveryTypes,
                      }),
                    },
                    submitting,
                    onConfirm: async (details) => {
                      await markFoodReady(details);
                      await refreshDelivery();
                    },
                  });
                }}
                style={styles.fullWidthBtn}
              />
            ) : null}

            <Button
              title="Track Live Delivery"
              onPress={() => {
                navigation.getParent()?.dispatch(
                  CommonActions.navigate({
                    name: 'Track',
                    params: { screen: 'Tracking' },
                  }),
                );
              }}
              style={styles.fullWidthBtn}
              variant={hasDriver ? 'primary' : 'outline'}
            />
            <Button title="Back to Home" variant="outline" onPress={() => navigation.goBack()} style={styles.fullWidthBtn} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: spacing.sm, paddingBottom: spacing.sm },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  scroll: {
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  body: {
    width: '100%',
    alignSelf: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.xl,
  },
  ring: {
    backgroundColor: colors.orangeLight,
    borderWidth: 4,
    borderColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cancelledRing: {
    backgroundColor: colors.redLight,
    borderColor: colors.red,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    width: '100%',
    marginBottom: spacing.md,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  addressInfo: { flex: 1, minWidth: 0 },
  addressLabel: { fontSize: 12, fontWeight: '700', color: colors.text },
  addressText: { fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 20 },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  searchAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.orangeLight,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  driverInfo: { flex: 1, minWidth: 0 },
  driverName: { fontWeight: '700', fontSize: 15, color: colors.text, lineHeight: 20 },
  driverSub: { fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 18 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.orange,
    marginTop: 6,
    lineHeight: 32,
  },
  statValueSmall: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  actions: {
    width: '100%',
    gap: 12,
    marginTop: spacing.sm,
  },
  fullWidthBtn: {
    width: '100%',
  },
});
