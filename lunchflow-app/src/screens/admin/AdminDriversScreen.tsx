import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { colors, spacing } from '../../constants/theme';

const drivers = [
  { name: 'Rajesh Kumar', phone: '9123456789', vehicle: 'DL 4C AB 1234', status: 'On Route', deliveries: 12, rating: 4.9 },
  { name: 'Amit Sharma', phone: '9988776655', vehicle: 'DL 5D CD 5678', status: 'Available', deliveries: 8, rating: 4.7 },
  { name: 'Vikram Singh', phone: '9876123450', vehicle: 'DL 2B EF 9012', status: 'Offline', deliveries: 0, rating: 4.8 },
];

export function AdminDriversScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Drivers</Text>
        <Text style={styles.sub}>Manage delivery partners</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {drivers.map((d) => (
          <Card key={d.phone}>
            <View style={styles.row}>
              <Avatar initials={d.name.split(' ').map((n) => n[0]).join('').slice(0, 2)} large />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{d.name}</Text>
                <Text style={styles.muted}>{d.vehicle} · ★ {d.rating}</Text>
                <Text style={styles.muted}>{d.phone}</Text>
              </View>
              <Badge
                label={d.status}
                tone={d.status === 'On Route' ? 'orange' : d.status === 'Available' ? 'green' : 'gray'}
              />
            </View>
            <Text style={styles.deliveries}>Today's deliveries: {d.deliveries}</Text>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 22, fontWeight: '800' },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  scroll: { padding: spacing.md, paddingBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { fontWeight: '700', fontSize: 15 },
  muted: { fontSize: 12, color: colors.muted, marginTop: 2 },
  deliveries: { fontSize: 12, fontWeight: '600', marginTop: 12, color: colors.text },
});
