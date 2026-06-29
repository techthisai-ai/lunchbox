import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { ProfileStackParamList } from '../navigation/types';
import { getCustomerOrderToday, loadCustomerProfile } from '../services/orderHubService';
import {
  DeliveryType,
  FoodReadyStudentEntry,
  buildFoodReadyStudents,
  getDeliveryTypeLabel,
  getDropAddress,
  normalizeDeliveryType,
} from '../types/delivery';

type Props = NativeStackScreenProps<ProfileStackParamList, 'SavedAddresses'>;

type DeliveryAddressCard = {
  key: string;
  title: string;
  address: string;
  detail?: string;
  type: DeliveryType;
};

function deliveryIcon(type: DeliveryType): {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  backgroundColor: string;
} {
  if (type === 'office') {
    return { name: 'business', color: colors.orange, backgroundColor: colors.orangeLight };
  }
  if (type === 'college') {
    return { name: 'school', color: colors.purple, backgroundColor: colors.purpleLight };
  }
  return { name: 'school', color: colors.blue, backgroundColor: colors.blueLight };
}

function badgeTone(type: DeliveryType): 'orange' | 'blue' | 'gray' {
  if (type === 'office') return 'gray';
  if (type === 'college') return 'blue';
  return 'orange';
}

function buildDeliveryCards(
  students: FoodReadyStudentEntry[],
  fallbackAddress: string,
  fallbackType: DeliveryType,
): DeliveryAddressCard[] {
  const filled = students.filter((entry) => entry.dropLocation.trim());
  if (filled.length) {
    return filled.map((entry, index) => {
      const type = normalizeDeliveryType(entry.deliveryType ?? fallbackType);
      const name = entry.name.trim();
      return {
        key: `delivery-${index}-${name}-${entry.dropLocation}`,
        title: name || (filled.length > 1 ? `Delivery ${index + 1}` : 'Delivery Location'),
        address: entry.dropLocation.trim(),
        detail: entry.classSection.trim() || undefined,
        type,
      };
    });
  }

  const address = fallbackAddress.trim();
  if (!address) return [];

  return [
    {
      key: 'delivery-fallback',
      title: 'Delivery Location',
      address,
      type: fallbackType,
    },
  ];
}

export function SavedAddressesScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [homeAddress, setHomeAddress] = useState('');
  const [deliveryCards, setDeliveryCards] = useState<DeliveryAddressCard[]>([]);

  useEffect(() => {
    if (!user?.phone) return;
    Promise.all([loadCustomerProfile(user.phone), getCustomerOrderToday(user.phone)]).then(
      ([profile, order]) => {
        setHomeAddress(profile.address || order?.pickupAddress || '');

        const fallbackType = normalizeDeliveryType(order?.deliveryType ?? profile.deliveryType);
        const fallbackAddress = (order ? getDropAddress(order) : '') || profile.school || '';
        const students = buildFoodReadyStudents({
          studentEntries: order?.studentEntries,
          students: order?.studentEntries,
          person: order?.studentName || profile.studentName,
          dropAddress: fallbackAddress,
          deliveryType: fallbackType,
          deliveryTypes: order?.deliveryTypes,
        });

        setDeliveryCards(buildDeliveryCards(students, fallbackAddress, fallbackType));
      },
    );
  }, [user?.phone]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Saved Addresses" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Ionicons name="home" size={18} color={colors.orange} />
            </View>
            <View style={styles.info}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>Home Pickup</Text>
                <Badge label="Default" tone="green" />
              </View>
              <Text style={styles.address}>{homeAddress || 'No home address saved'}</Text>
            </View>
          </View>
        </Card>

        {deliveryCards.length ? (
          deliveryCards.map((entry) => {
            const icon = deliveryIcon(entry.type);
            return (
              <Card key={entry.key}>
                <View style={styles.row}>
                  <View style={[styles.iconWrap, { backgroundColor: icon.backgroundColor }]}>
                    <Ionicons name={icon.name} size={18} color={icon.color} />
                  </View>
                  <View style={styles.info}>
                    <View style={styles.titleRow}>
                      <Text style={styles.title}>{entry.title}</Text>
                      <Badge label={getDeliveryTypeLabel(entry.type)} tone={badgeTone(entry.type)} />
                    </View>
                    <Text style={styles.address}>{entry.address}</Text>
                    {entry.detail ? <Text style={styles.detail}>{entry.detail}</Text> : null}
                  </View>
                </View>
              </Card>
            );
          })
        ) : (
          <Card>
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: colors.blueLight }]}>
                <Ionicons name="school" size={18} color={colors.blue} />
              </View>
              <View style={styles.info}>
                <Text style={styles.title}>Delivery Location</Text>
                <Text style={styles.address}>No delivery location saved</Text>
              </View>
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: 32, gap: spacing.md },
  row: { flexDirection: 'row', gap: 14 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontWeight: '700', fontSize: 14, flex: 1 },
  address: { fontSize: 13, color: colors.muted, marginTop: 6, lineHeight: 18 },
  detail: { fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 16 },
});
