import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, radius, spacing } from '../constants/theme';

const deliveries = [
  { date: 'Jun 11, 2024', route: 'Home → DPS School', status: 'Delivered', time: '12:28 PM' },
  { date: 'Jun 10, 2024', route: 'Home → DPS School', status: 'Delivered', time: '12:31 PM' },
  { date: 'Jun 9, 2024', route: 'Home → DPS School', status: 'Delivered', time: '12:25 PM' },
  { date: 'Jun 8, 2024', route: 'Home → Office', status: 'Delivered', time: '1:02 PM' },
];

const filters = ['All', 'Delivered', 'In Transit', 'Cancelled'];

export function HistoryScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Delivery History" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput placeholder="Search deliveries..." placeholderTextColor={colors.muted} style={styles.searchInput} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
          {filters.map((f, i) => (
            <View key={f} style={[styles.chip, i === 0 && styles.chipActive]}>
              <Text style={[styles.chipText, i === 0 && styles.chipTextActive]}>{f}</Text>
            </View>
          ))}
        </ScrollView>
        {deliveries.map((d) => (
          <Card key={d.date}>
            <View style={styles.row}>
              <View>
                <Text style={styles.date}>{d.date}</Text>
                <Text style={styles.route}>{d.route}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Badge label={d.status} tone="green" />
                <Text style={styles.time}>{d.time}</Text>
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: 24 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  filters: { marginBottom: 14, flexGrow: 0 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginRight: 8,
  },
  chipActive: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.text },
  chipTextActive: { color: colors.white },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontWeight: '700', fontSize: 14 },
  route: { fontSize: 12, color: colors.muted, marginTop: 2 },
  time: { fontSize: 11, color: colors.muted, marginTop: 4 },
});
