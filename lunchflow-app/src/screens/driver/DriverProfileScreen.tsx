import { useFocusEffect } from '@react-navigation/native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { getInitials } from '../../constants/auth';
import { colors, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../navigation/types';
import { listDriverCompletedToday } from '../../services/orderHubService';
import { getDriverRatingSummary } from '../../services/ratingService';
import { getDriverProfileStats } from '../../services/userRegistryService';
import { DRIVER_EARNING_PER_ORDER } from '../../utils/adminDriverHelpers';

export function DriverProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [earningsToday, setEarningsToday] = useState(0);
  const [ratingAverage, setRatingAverage] = useState('5.0');
  const [reviewCount, setReviewCount] = useState(0);
  const [completedDeliveries, setCompletedDeliveries] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) {
        setEarningsToday(0);
        setRatingAverage('5.0');
        setReviewCount(0);
        setCompletedDeliveries(0);
        return;
      }

      Promise.all([
        listDriverCompletedToday(user.id),
        getDriverProfileStats(user.id),
        getDriverRatingSummary(user.id),
      ]).then(([todayOrders, profileStats, ratingSummary]) => {
        setEarningsToday(todayOrders.length * DRIVER_EARNING_PER_ORDER);
        setRatingAverage(ratingSummary.average);
        setReviewCount(ratingSummary.reviewCount);
        setCompletedDeliveries(profileStats.completedDeliveries);
      });
    }, [user?.id]),
  );

  const handleLogout = async () => {
    await logout();
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'Splash' }] }),
    );
  };

  const ratingLine =
    reviewCount > 0
      ? `★ ${ratingAverage} · ${reviewCount} review${reviewCount === 1 ? '' : 's'} · ${completedDeliveries} deliveries`
      : `★ ${ratingAverage} · No reviews yet · ${completedDeliveries} deliveries`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(user?.name ?? '')}</Text>
        </View>
        <Text style={styles.name}>{user?.name || '—'}</Text>
        <Text style={styles.phone}>{user?.phone ? `+91 ${user.phone}` : '—'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>DRIVER</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card flat>
          <Text style={styles.label}>Vehicle</Text>
          <Text style={styles.value}>{user?.vehicle || '—'}</Text>
        </Card>
        <Card flat>
          <Text style={styles.label}>Rating</Text>
          <Text style={styles.value}>{ratingLine}</Text>
        </Card>
        <Card flat>
          <Text style={styles.label}>Today's Earnings</Text>
          <Text style={[styles.value, earningsToday > 0 && styles.earningsValue]}>
            ₹{earningsToday.toLocaleString('en-IN')}
          </Text>
        </Card>
        <Button title="Logout" variant="danger" onPress={handleLogout} style={{ marginTop: spacing.lg }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { alignItems: 'center', paddingVertical: spacing.xl, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.greenLight,
    borderWidth: 3,
    borderColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: colors.green },
  name: { fontSize: 20, fontWeight: '800', marginTop: 12 },
  phone: { fontSize: 13, color: colors.muted, marginTop: 4 },
  roleBadge: { backgroundColor: colors.greenLight, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginTop: 10 },
  roleText: { fontSize: 11, fontWeight: '800', color: colors.green },
  scroll: { padding: spacing.md },
  label: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  value: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  earningsValue: { color: colors.green },
});
