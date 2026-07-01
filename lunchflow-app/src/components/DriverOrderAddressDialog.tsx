import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';
import { openMapsNavigationToAddress } from '../services/mapsNavigation';
import {
  DeliveryOrder,
  buildFoodReadyStudents,
  getDeliveryTypeLabel,
  getDropAddress,
  normalizeDeliveryType,
} from '../types/delivery';
import { Button } from './Button';

type Props = {
  visible: boolean;
  order: DeliveryOrder | null;
  onClose: () => void;
};

export function DriverOrderAddressDialog({ visible, order, onClose }: Props) {
  if (!order) return null;

  const students = buildFoodReadyStudents({
    studentEntries: order.studentEntries,
    students: order.studentEntries,
    person: order.studentName,
    dropAddress: getDropAddress(order),
    deliveryType: normalizeDeliveryType(order.deliveryType),
    deliveryTypes: order.deliveryTypes,
  }).filter((entry) => entry.name.trim() || entry.dropLocation.trim());

  const dropFallback = getDropAddress(order);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            <Text style={styles.title}>Pickup & Drop</Text>
            <Text style={styles.subtitle}>
              {order.customerName} · {order.id}
            </Text>

            <View style={styles.block}>
              <View style={styles.blockHeader}>
                <View style={[styles.iconWrap, styles.pickupIcon]}>
                  <Ionicons name="home" size={16} color={colors.orange} />
                </View>
                <Text style={styles.blockTitle}>Pickup Address</Text>
              </View>
              <Text style={styles.addressText}>{order.pickupAddress || '—'}</Text>
              {order.pickupAddress?.trim() ? (
                <Button
                  title="Navigate to Pickup"
                  variant="outline"
                  small
                  onPress={() => openMapsNavigationToAddress(order.pickupAddress)}
                  style={styles.navBtn}
                />
              ) : null}
            </View>

            <View style={styles.block}>
              <View style={styles.blockHeader}>
                <View style={[styles.iconWrap, styles.dropIcon]}>
                  <Ionicons name="location" size={16} color={colors.blue} />
                </View>
                <Text style={styles.blockTitle}>Drop Address</Text>
              </View>

              {students.length > 0 ? (
                students.map((student, index) => (
                  <View key={`${student.name}-${index}`} style={styles.studentCard}>
                    <Text style={styles.studentName}>
                      {student.name.trim() || `Student ${index + 1}`}
                      <Text style={styles.studentType}> · {getDeliveryTypeLabel(student.deliveryType)}</Text>
                    </Text>
                    <Text style={styles.addressText}>{student.dropLocation.trim() || dropFallback || '—'}</Text>
                    {student.classSection.trim() ? (
                      <Text style={styles.detailText}>{student.classSection.trim()}</Text>
                    ) : null}
                    {student.dropLocation.trim() ? (
                      <Button
                        title="Navigate"
                        variant="outline"
                        small
                        onPress={() => openMapsNavigationToAddress(student.dropLocation)}
                        style={styles.navBtn}
                      />
                    ) : null}
                  </View>
                ))
              ) : (
                <>
                  <Text style={styles.addressText}>{dropFallback || '—'}</Text>
                  {dropFallback?.trim() ? (
                    <Button
                      title="Navigate to Drop"
                      variant="outline"
                      small
                      onPress={() => openMapsNavigationToAddress(dropFallback)}
                      style={styles.navBtn}
                    />
                  ) : null}
                </>
              )}
            </View>

            <Button title="Close" variant="outline" onPress={onClose} style={{ marginTop: spacing.sm }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 4, marginBottom: spacing.md, fontWeight: '600' },
  block: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.bg,
  },
  blockHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupIcon: { backgroundColor: colors.orangeLight },
  dropIcon: { backgroundColor: colors.blueLight },
  blockTitle: { fontSize: 13, fontWeight: '800', color: colors.text },
  addressText: { fontSize: 14, color: colors.text, lineHeight: 20, fontWeight: '600' },
  detailText: { fontSize: 12, color: colors.muted, marginTop: 4, fontWeight: '600' },
  studentCard: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  studentName: { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 4 },
  studentType: { fontWeight: '600', color: colors.muted },
  navBtn: { marginTop: 8, alignSelf: 'flex-start' },
});
