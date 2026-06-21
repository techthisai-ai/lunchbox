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
import { loadCustomerProfile } from '../services/orderHubService';

type Props = NativeStackScreenProps<ProfileStackParamList, 'SavedAddresses'>;

export function SavedAddressesScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [homeAddress, setHomeAddress] = useState('');
  const [school, setSchool] = useState('');

  useEffect(() => {
    if (!user?.phone) return;
    loadCustomerProfile(user.phone).then((profile) => {
      setHomeAddress(profile.address);
      setSchool(profile.school);
    });
  }, [user?.phone]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Saved Addresses" subtitle="Pickup & delivery locations" onBack={() => navigation.goBack()} />
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
        <Card>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: colors.blueLight }]}>
              <Ionicons name="school" size={18} color={colors.blue} />
            </View>
            <View style={styles.info}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>Delivery Location</Text>
                <Badge label="School" tone="orange" />
              </View>
              <Text style={styles.address}>{school || 'No delivery location saved'}</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: 32 },
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
  title: { fontWeight: '700', fontSize: 14 },
  address: { fontSize: 13, color: colors.muted, marginTop: 6, lineHeight: 18 },
});
