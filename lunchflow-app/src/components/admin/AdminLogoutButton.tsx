import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { colors, radius } from '../../constants/theme';
import { useAdminPortalNav } from '../../context/AdminPortalContext';

export function AdminLogoutButton() {
  const portalNav = useAdminPortalNav();

  return (
    <Pressable
      style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
      onPress={() => portalNav?.logout()}
      accessibilityRole="button"
      accessibilityLabel="Logout"
    >
      <Ionicons name="log-out-outline" size={20} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  triggerPressed: { backgroundColor: colors.surfaceMuted },
});
