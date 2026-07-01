import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../../constants/theme';

type Props = {
  title?: string;
  greetingName?: string;
  subtitle?: string;
  notificationCount?: number;
  onNotificationsPress?: () => void;
  rightSlot?: React.ReactNode;
};

export function DriverScreenHeader({
  title,
  greetingName,
  subtitle,
  notificationCount = 0,
  onNotificationsPress,
  rightSlot,
}: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        {title ? (
          <Text style={styles.title}>{title}</Text>
        ) : (
          <>
            <Text style={styles.greeting}>Hi, {greetingName || 'Driver'}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </>
        )}
      </View>
      {rightSlot ?? (
        <Pressable
          style={styles.notifBtn}
          onPress={onNotificationsPress}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
          {notificationCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
            </View>
          ) : null}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.bg,
  },
  headerText: { flex: 1, minWidth: 0, marginRight: 12 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  greeting: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 4, fontWeight: '600', lineHeight: 18 },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
});
