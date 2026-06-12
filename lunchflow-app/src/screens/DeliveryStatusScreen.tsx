import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { Timeline } from '../components/Timeline';
import { colors, spacing } from '../constants/theme';
import { TrackStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<TrackStackParamList, 'DeliveryStatus'>;

const steps = [
  { title: 'Order Created', time: '11:45 AM', status: 'done' as const },
  { title: 'Food Ready', time: '12:02 PM', status: 'done' as const },
  { title: 'Driver Assigned', time: '12:05 PM', status: 'done' as const },
  { title: 'Picked Up', time: '12:08 PM', status: 'done' as const },
  { title: 'In Transit', time: '12:10 PM', status: 'active' as const },
  { title: 'Delivered', time: '—', status: 'pending' as const },
];

export function DeliveryStatusScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Delivery Status" subtitle="Order #LF-2024-8842 · Today" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.statusBanner}>
          <Text style={styles.muted}>Current Status</Text>
          <Text style={styles.statusText}>In Transit</Text>
        </Card>
        <Text style={styles.section}>Timeline</Text>
        <Card>
          <Timeline steps={steps} />
        </Card>
        <Button title="Track on Map" onPress={() => navigation.navigate('Tracking')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  scroll: { padding: spacing.md, paddingBottom: 32 },
  statusBanner: { backgroundColor: colors.orangeLight, borderWidth: 1, borderColor: '#FED7AA', alignItems: 'center' },
  muted: { fontSize: 13, color: colors.muted },
  statusText: { fontSize: 20, fontWeight: '800', color: colors.orange, marginTop: 4 },
  section: { fontSize: 16, fontWeight: '800', marginVertical: 12 },
});
