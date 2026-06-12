import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, radius, spacing } from '../constants/theme';
import { HomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Notifications'>;

const notifications = [
  { icon: 'bicycle' as const, title: 'Pickup Update', msg: 'Driver Rajesh is 5 min away from your home', time: '2 min ago', bg: colors.orangeLight, color: colors.orange },
  { icon: 'checkmark-circle' as const, title: 'Driver Assigned', msg: 'Rajesh Kumar will pick up your lunchbox', time: '12 min ago', bg: colors.greenLight, color: colors.green },
  { icon: 'cube' as const, title: 'Delivery Confirmed', msg: 'Lunchbox delivered to DPS · 12:28 PM', time: 'Yesterday', bg: colors.greenLight, color: colors.green },
  { icon: 'notifications' as const, title: 'Subscription Reminder', msg: 'Your plan renews in 3 days · ₹699', time: 'Jun 9', bg: colors.blueLight, color: colors.blue },
];

export function NotificationsScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Notifications"
        subtitle="4 unread messages"
        onBack={() => navigation.goBack()}
        right={<Text style={styles.markRead}>Mark all read</Text>}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          {notifications.map((n) => (
            <View key={n.title} style={styles.item}>
              <View style={[styles.icon, { backgroundColor: n.bg }]}>
                <Ionicons name={n.icon} size={20} color={n.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{n.title}</Text>
                <Text style={styles.msg}>{n.msg}</Text>
                <Text style={styles.time}>{n.time}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  markRead: { fontSize: 13, color: colors.orange, fontWeight: '700' },
  scroll: { padding: spacing.md },
  card: { backgroundColor: colors.white, borderRadius: radius.md, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border },
  item: { flexDirection: 'row', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '700', fontSize: 14 },
  msg: { fontSize: 12, color: colors.muted, marginTop: 2 },
  time: { fontSize: 11, color: colors.muted, marginTop: 4 },
});
