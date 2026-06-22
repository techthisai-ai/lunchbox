import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { Timeline } from '../components/Timeline';
import { colors, spacing } from '../constants/theme';
import { useDelivery } from '../context/DeliveryContext';
import { buildTimeline, getStatusLabel } from '../services/orderHubService';
import { TrackStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<TrackStackParamList, 'DeliveryStatus'>;

export function DeliveryStatusScreen({ navigation }: Props) {
  const { order } = useDelivery();

  if (!order) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title="Delivery Status" subtitle="No active delivery today" onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.scroll}>
          <Card style={styles.statusBanner}>
            <Text style={styles.muted}>Current Status</Text>
            <Text style={styles.statusText}>Pending</Text>
          </Card>
          <Button title="Back to Home" variant="outline" onPress={() => navigation.goBack()} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Delivery Status" subtitle={`Order #${order.id} · Today`} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.statusBanner}>
          <Text style={styles.muted}>Current Status</Text>
          <Text style={styles.statusText}>{getStatusLabel(order.status)}</Text>
        </Card>
        <Text style={styles.section}>Timeline</Text>
        <Card>
          <Timeline steps={buildTimeline(order)} />
        </Card>
        <Button title="Track on Map" onPress={() => navigation.navigate('Tracking')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: 32 },
  statusBanner: { backgroundColor: colors.orangeLight, borderWidth: 1, borderColor: colors.borderSubtle, alignItems: 'center' },
  muted: { fontSize: 13, color: colors.muted },
  statusText: { fontSize: 20, fontWeight: '800', color: colors.orange, marginTop: 4 },
  section: { fontSize: 16, fontWeight: '800', marginVertical: 12 },
});
