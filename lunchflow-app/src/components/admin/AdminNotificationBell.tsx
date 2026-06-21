import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing } from '../../constants/theme';
import { useAdminPortalNav } from '../../context/AdminPortalContext';
import { AdminNotification, buildAdminNotifications } from '../../services/adminNotificationService';

const ICON_COLORS: Record<AdminNotification['icon'], { bg: string; color: string }> = {
  cube: { bg: colors.purpleLight, color: colors.purple },
  wallet: { bg: colors.yellowLight, color: colors.dark },
  bicycle: { bg: colors.greenLight, color: colors.greenDark },
  people: { bg: colors.blueLight, color: colors.blue },
  'alert-circle': { bg: colors.redLight, color: colors.red },
};

const PANEL_WIDTH = 320;

export function AdminNotificationBell() {
  const portalNav = useAdminPortalNav();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [anchor, setAnchor] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<View>(null);

  const refresh = useCallback(async () => {
    setNotifications(await buildAdminNotifications());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  const alertCount = notifications.filter((n) => n.id !== 'all-clear').length;

  const openPanel = () => {
    triggerRef.current?.measureInWindow((left, top, width, height) => {
      setAnchor({
        top: top + height + 8,
        left: Math.max(12, left + width - PANEL_WIDTH),
      });
      setOpen(true);
    });
  };

  const closePanel = () => setOpen(false);

  const handlePressNotification = (notification: AdminNotification) => {
    closePanel();
    if (notification.page && portalNav) {
      portalNav.navigate(notification.page);
    }
  };

  return (
    <>
      <Pressable
        ref={triggerRef}
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
        onPress={openPanel}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
      >
        <Ionicons name="notifications-outline" size={20} color={colors.text} />
        {alertCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{alertCount > 9 ? '9+' : alertCount}</Text>
          </View>
        ) : null}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={closePanel}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={closePanel} />
          <View style={[styles.panel, { top: anchor.top, left: anchor.left, width: PANEL_WIDTH }]}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Notifications</Text>
              <Pressable onPress={closePanel} hitSlop={8}>
                <Ionicons name="close" size={18} color={colors.muted} />
              </Pressable>
            </View>
            <ScrollView style={styles.list} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {notifications.map((notification) => {
                const palette = ICON_COLORS[notification.icon];
                return (
                  <Pressable
                    key={notification.id}
                    style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                    onPress={() => handlePressNotification(notification)}
                    disabled={notification.id === 'all-clear'}
                  >
                    <View style={[styles.itemIcon, { backgroundColor: palette.bg }]}>
                      <Ionicons name={notification.icon} size={16} color={palette.color} />
                    </View>
                    <View style={styles.itemBody}>
                      <Text style={styles.itemTitle}>{notification.title}</Text>
                      <Text style={styles.itemMsg}>{notification.msg}</Text>
                    </View>
                    {notification.page ? (
                      <Ionicons name="chevron-forward" size={14} color={colors.muted} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderRadius: radius.sm,
  },
  triggerPressed: { backgroundColor: colors.surfaceMuted },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.red,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: colors.white, fontSize: 9, fontWeight: '800' },
  modalRoot: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
  },
  panel: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 360,
    overflow: 'hidden',
    ...shadow.elevated,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  panelTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  list: { maxHeight: 300 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  itemPressed: { backgroundColor: colors.orangeLight },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: 13, fontWeight: '800', color: colors.text },
  itemMsg: { fontSize: 12, color: colors.muted, marginTop: 2, fontWeight: '600' },
});
