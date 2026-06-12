import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, spacing } from '../constants/theme';
import { TrackStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<TrackStackParamList, 'QRTracking'>;

const pattern = [
  1,1,1,1,1,1,1,1, 1,0,1,0,1,0,1,0, 1,0,0,1,0,1,0,1,
  0,1,1,0,1,0,1,0, 1,0,1,1,0,1,0,1, 1,1,0,1,0,0,1,1,
  1,0,1,0,1,1,0,1, 0,1,0,1,0,1,1,0, 1,1,1,0,1,0,1,1,
];

export function QRTrackingScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="QR Tracking" subtitle="Scan to verify your lunchbox" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.qrCard}>
          <Text style={styles.qrId}>Lunchbox ID: LF-AAR-2847</Text>
          <View style={styles.qr}>
            {pattern.map((cell, i) => (
              <View key={i} style={[styles.qrCell, cell === 0 && styles.qrWhite]} />
            ))}
          </View>
          <Button title="Scan QR Code" variant="green" onPress={() => {}} />
        </Card>
        <Card title="Parcel Status" badge={<Badge label="In Transit" tone="orange" />}>
          <Text style={styles.muted}>Last scanned: Gate 2, DPS School · 12:18 PM</Text>
        </Card>
        <Text style={styles.section}>Delivery History</Text>
        <HistoryRow date="Jun 11" status="Verified" time="12:28 PM" />
        <HistoryRow date="Jun 10" status="Verified" time="12:31 PM" />
      </ScrollView>
    </SafeAreaView>
  );
}

function HistoryRow({ date, status, time }: { date: string; status: string; time: string }) {
  return (
    <Card flat style={{ paddingVertical: 12 }}>
      <View style={styles.row}>
        <View>
          <Text style={styles.date}>{date}</Text>
          <Text style={styles.muted}>Home → DPS School</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Badge label={status} tone="green" />
          <Text style={[styles.muted, { marginTop: 4, fontSize: 11 }]}>{time}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: 32 },
  qrCard: { alignItems: 'center', paddingVertical: spacing.xl },
  qrId: { fontSize: 13, fontWeight: '700', marginBottom: spacing.md },
  qr: {
    width: 180,
    height: 180,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 16,
    marginBottom: spacing.md,
  },
  qrCell: { width: '11%', aspectRatio: 1, backgroundColor: colors.text, margin: '1%', borderRadius: 1 },
  qrWhite: { backgroundColor: colors.white },
  muted: { fontSize: 12, color: colors.muted },
  section: { fontSize: 16, fontWeight: '800', marginVertical: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontWeight: '700', fontSize: 14 },
});
