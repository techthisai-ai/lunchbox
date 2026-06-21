import { Ionicons } from '@expo/vector-icons';
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
import { getDeliveryTypeLabel, getDropAddress, normalizeDeliveryType } from '../types/delivery';

type Props = NativeStackScreenProps<HomeStackParamList, 'FoodReady'>;

export function FoodReadyScreen({ navigation }: Props) {
  const { order, submitting, markFoodReady, refreshDelivery } = useDelivery();
  const { openFoodReadyDialog } = useFoodReadyOverlay();
  const { horizontalPadding, foodReadySize } = useResponsive();
  const displayOrder = order;
  const ringSize = Math.min(foodReadySize * 0.66, 120);
  const hasDriver = Boolean(displayOrder?.driver);
  const isWaiting = displayOrder?.status === 'awaiting_driver';

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
        <View style={styles.content}>
          <Text style={styles.title}>No pickup request yet</Text>
          <Text style={styles.subtitle}>Mark food ready from the home screen first.</Text>
          <Button title="Back to Home" variant="outline" onPress={() => navigation.goBack()} style={{ marginTop: spacing.lg }} />
        </View>
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
        contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}>
          {isWaiting && !hasDriver ? (
            <ActivityIndicator size="large" color={colors.green} />
          ) : (
            <Ionicons name="checkmark" size={48} color={colors.green} />
          )}
        </View>
        <Text style={styles.title}>Pickup Request Created!</Text>
        <Text style={styles.subtitle}>Your lunchbox is ready for pickup</Text>

        <Card
          title="Delivery Details"
          badge={<Badge label={getDeliveryTypeLabel(displayOrder.deliveryType)} tone="orange" />}
        >
          <View style={styles.addressRow}>
            <Ionicons name="home-outline" size={18} color={colors.orange} />
            <View style={styles.addressInfo}>
              <Text style={styles.addressLabel}>Pickup</Text>
              <Text style={styles.addressText}>{displayOrder.pickupAddress}</Text>
            </View>
          </View>
          <View style={[styles.addressRow, { marginTop: 12 }]}>
            <Ionicons name="location-outline" size={18} color={colors.green} />
            <View style={styles.addressInfo}>
              <Text style={styles.addressLabel}>Drop · {displayOrder.studentName}</Text>
              <Text style={styles.addressText}>{getDropAddress(displayOrder)}</Text>
            </View>
          </View>
        </Card>

        <Card
          title="Driver Assigned"
          badge={<Badge label={hasDriver ? 'Confirmed' : 'Pending'} tone={hasDriver ? 'green' : 'orange'} />}
        >
          <View style={styles.driverRow}>
            <Avatar initials={displayOrder.driver?.initials ?? '…'} />
            <View>
              <Text style={styles.driverName}>
                {displayOrder.driver?.name ?? 'Finding a driver near you...'}
              </Text>
              <Text style={styles.muted}>
                {displayOrder.driver?.etaMinutes
                  ? `Arriving in ${displayOrder.driver.etaMinutes} minutes`
                  : 'Waiting for a driver to accept your request'}
              </Text>
            </View>
          </View>
        </Card>

        <Card flat>
          <Text style={styles.muted}>Pickup ETA</Text>
          <Text style={styles.eta}>
            {displayOrder.driver?.etaMinutes ? `${displayOrder.driver.etaMinutes} min` : '—'}
          </Text>
        </Card>

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
                  pickupAddress: displayOrder.pickupAddress,
                  dropAddress: getDropAddress(displayOrder),
                  person: displayOrder.studentName,
                },
                submitting,
                onConfirm: async (details) => {
                  await markFoodReady(details);
                  await refreshDelivery();
                },
              });
            }}
            style={{ marginTop: spacing.lg }}
          />
        ) : null}

        <Button
          title="Track Live Delivery"
          onPress={() => navigation.getParent()?.navigate('Track', { screen: 'Tracking' })}
          style={{ marginTop: isWaiting && !hasDriver ? 12 : spacing.lg }}
          variant={hasDriver ? 'primary' : 'outline'}
        />
        <Button title="Back to Home" variant="outline" onPress={() => navigation.goBack()} style={{ marginTop: 12, marginBottom: spacing.lg }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
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
  content: { padding: spacing.lg, paddingTop: spacing.md, alignItems: 'center', paddingBottom: spacing.xl },
  ring: {
    backgroundColor: colors.greenLight,
    borderWidth: 4,
    borderColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: colors.muted, fontSize: 14, marginBottom: spacing.xl, textAlign: 'center' },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  addressInfo: { flex: 1 },
  addressLabel: { fontSize: 12, fontWeight: '700', color: colors.text },
  addressText: { fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  driverName: { fontWeight: '700' },
  muted: { fontSize: 12, color: colors.muted },
  eta: { fontSize: 36, fontWeight: '800', color: colors.orange, textAlign: 'center', marginTop: 4 },
});
