import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Timeline } from '../components/Timeline';
import { colors, spacing } from '../constants/theme';
import { TrackStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<TrackStackParamList, 'Tracking'>;

export function TrackingScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.map}>
        <View style={styles.grid} />
        <View style={styles.route} />
        <MapMarker style={{ top: '22%', left: '18%' }} label="Home" color={colors.green} icon="home" />
        <View style={styles.driverPin}>
          <Ionicons name="bicycle" size={22} color={colors.white} />
        </View>
        <MapMarker style={{ top: '18%', right: '12%' }} label="DPS School" color={colors.blue} icon="school" />
      </View>
      <View style={styles.overlay}>
        <View style={styles.etaRow}>
          <View>
            <Text style={styles.muted}>ETA to School</Text>
            <Text style={styles.eta}>14 min</Text>
          </View>
          <Badge label="In Transit" tone="orange" />
        </View>
        <View style={styles.driverRow}>
          <Avatar initials="RK" large />
          <View style={{ flex: 1 }}>
            <Text style={styles.driverName}>Rajesh Kumar</Text>
            <Text style={styles.muted}>★ 4.9 · 842 deliveries</Text>
          </View>
          <Button title="Call Driver" variant="green" small onPress={() => {}} />
        </View>
        <Text style={styles.timelineTitle}>Delivery Timeline</Text>
        <Timeline
          steps={[
            { title: 'Picked Up', time: '12:08 PM', status: 'done' },
            { title: 'In Transit', time: 'Now', status: 'active' },
          ]}
        />
        <Button title="Full Status" variant="outline" onPress={() => navigation.navigate('DeliveryStatus')} style={{ marginTop: spacing.md }} />
        <View style={styles.linkRow}>
          <Button title="QR Track" variant="outline" small onPress={() => navigation.navigate('QRTracking')} />
        </View>
      </View>
    </View>
  );
}

function MapMarker({
  style,
  label,
  color,
  icon,
}: {
  style: ViewStyle;
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={[styles.marker, style]}>
      <View style={[styles.pin, { backgroundColor: color }]}>
        <Ionicons name={icon} size={16} color={colors.white} />
      </View>
      <Text style={styles.pinLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F4EA' },
  map: { flex: 1, position: 'relative' },
  grid: {
    ...StyleSheet.absoluteFill,
    opacity: 0.5,
    backgroundColor: '#E8F4EA',
  },
  route: {
    position: 'absolute',
    top: '35%',
    left: '15%',
    width: '70%',
    height: '30%',
    borderWidth: 3,
    borderColor: colors.orange,
    borderStyle: 'dashed',
    borderRadius: 40,
    opacity: 0.6,
  },
  marker: { position: 'absolute', alignItems: 'center' },
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinLabel: {
    marginTop: 6,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 10,
    fontWeight: '700',
    overflow: 'hidden',
  },
  driverPin: {
    position: 'absolute',
    top: '55%',
    left: '55%',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  etaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  muted: { fontSize: 12, color: colors.muted },
  eta: { fontSize: 24, fontWeight: '800', color: colors.orange },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: spacing.md },
  driverName: { fontWeight: '700', fontSize: 15 },
  timelineTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  linkRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
});
