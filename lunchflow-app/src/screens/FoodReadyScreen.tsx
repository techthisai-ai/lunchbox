import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { colors, spacing } from '../constants/theme';
import { HomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'FoodReady'>;

export function FoodReadyScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.ring}>
          <Ionicons name="checkmark" size={48} color={colors.green} />
        </View>
        <Text style={styles.title}>Pickup Request Created!</Text>
        <Text style={styles.subtitle}>Your lunchbox is ready for pickup</Text>

        <Card title="Driver Assigned" badge={<Badge label="Confirmed" tone="green" />}>
          <View style={styles.driverRow}>
            <Avatar initials="RK" />
            <View>
              <Text style={styles.driverName}>Rajesh Kumar</Text>
              <Text style={styles.muted}>Arriving in 8 minutes</Text>
            </View>
          </View>
        </Card>

        <Card flat>
          <Text style={styles.muted}>Pickup ETA</Text>
          <Text style={styles.eta}>8 min</Text>
        </Card>

        <Button
          title="Track Live Delivery"
          onPress={() => navigation.getParent()?.navigate('Track', { screen: 'Tracking' })}
          style={{ marginTop: spacing.lg }}
        />
        <Button title="Back to Home" variant="outline" onPress={() => navigation.goBack()} style={{ marginTop: 12 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { flex: 1, padding: spacing.lg, paddingTop: 40, alignItems: 'center' },
  ring: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.greenLight,
    borderWidth: 4,
    borderColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: colors.muted, fontSize: 14, marginBottom: spacing.xl, textAlign: 'center' },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  driverName: { fontWeight: '700' },
  muted: { fontSize: 12, color: colors.muted },
  eta: { fontSize: 36, fontWeight: '800', color: colors.orange, textAlign: 'center', marginTop: 4 },
});
