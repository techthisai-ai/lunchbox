import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, radius, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { HomeStackParamList } from '../navigation/types';
import {
  AppNotification,
  countUnread,
  loadNotifications,
  markAllNotificationsRead,
} from '../services/notificationService';
import { getSubscriptionRenewalLabel } from '../utils/date';

type Props = NativeStackScreenProps<HomeStackParamList, 'Notifications'>;

const iconColors: Record<AppNotification['icon'], { bg: string; color: string }> = {
  bicycle: { bg: colors.orangeLight, color: colors.orange },
  'checkmark-circle': { bg: colors.greenLight, color: colors.green },
  cube: { bg: colors.greenLight, color: colors.green },
  notifications: { bg: colors.yellowLight, color: colors.yellowDark },
};

export function NotificationsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { horizontalPadding } = useResponsive();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const refresh = useCallback(async () => {
    if (!user?.phone) {
      setNotifications([]);
      return;
    }
    let items = await loadNotifications(user.phone);
    if (items.length === 0) {
      items = [
        {
          id: 'welcome',
          icon: 'notifications',
          title: 'Welcome to LunchFlow',
          msg: `Your school plan renews on ${getSubscriptionRenewalLabel()} · ₹699`,
          time: 'Just now',
          createdAt: Date.now(),
          read: false,
        },
      ];
    }
    setNotifications(items);
  }, [user?.phone]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const interval = setInterval(refresh, 4000);
      return () => clearInterval(interval);
    }, [refresh]),
  );

  const unread = countUnread(notifications);

  const handleMarkAllRead = async () => {
    if (!user?.phone) return;
    await markAllNotificationsRead(user.phone);
    refresh();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread messages` : 'All caught up'}
        onBack={() => navigation.goBack()}
        right={
          <Pressable onPress={handleMarkAllRead}>
            <Text style={styles.markRead}>Mark all read</Text>
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {notifications.map((n, index) => {
            const palette = iconColors[n.icon] ?? iconColors.notifications;
            return (
              <View key={`${n.id}-${index}`} style={styles.item}>
                <View style={[styles.icon, { backgroundColor: palette.bg }]}>
                  <Ionicons name={n.icon} size={20} color={palette.color} />
                </View>
                <View style={styles.itemBody}>
                  <Text style={styles.title}>{n.title}</Text>
                  <Text style={styles.msg}>{n.msg}</Text>
                  <Text style={styles.time}>{n.time}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  markRead: { fontSize: 13, color: colors.orange, fontWeight: '700' },
  scroll: { paddingTop: spacing.md, paddingBottom: 32, flexGrow: 1 },
  card: { backgroundColor: colors.white, borderRadius: radius.md, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border },
  item: { flexDirection: 'row', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemBody: { flex: 1, minWidth: 0 },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '700', fontSize: 14 },
  msg: { fontSize: 12, color: colors.muted, marginTop: 2 },
  time: { fontSize: 11, color: colors.muted, marginTop: 4 },
});
