import { CommonActions, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { colors, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { AdminProfileStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AdminProfileStackParamList>;

export function AdminProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<Nav>();

  const handleLogout = () => {
    logout();
    navigation.getParent()?.getParent()?.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'Splash' }] }),
    );
  };

  const menuItems = [
    { icon: 'settings-outline' as const, label: 'System Settings' },
    { icon: 'document-text-outline' as const, label: 'Reports & Analytics', screen: 'AdminReports' as const },
    { icon: 'wallet-outline' as const, label: 'Salary Management', screen: 'AdminSalary' as const },
    { icon: 'cash-outline' as const, label: 'Expense Management', screen: 'AdminExpenses' as const },
    { icon: 'notifications-outline' as const, label: 'Notifications' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>AD</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>ADMIN</Text>
        </View>
      </View>
      <ScrollView>
        {menuItems.map((item) => (
          <Pressable
            key={item.label}
            style={styles.menuItem}
            onPress={() => {
              if (item.screen) navigation.navigate(item.screen);
            }}
          >
            <View style={styles.menuLeft}>
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={18} color={colors.text} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
        <View style={{ padding: spacing.lg }}>
          <Button title="Logout" variant="danger" onPress={handleLogout} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { alignItems: 'center', paddingVertical: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.blueLight,
    borderWidth: 3,
    borderColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: colors.blue },
  name: { fontSize: 20, fontWeight: '800', marginTop: 12 },
  email: { fontSize: 13, color: colors.muted, marginTop: 4 },
  roleBadge: { backgroundColor: colors.blueLight, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginTop: 10 },
  roleText: { fontSize: 11, fontWeight: '800', color: colors.blue },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontWeight: '600', fontSize: 14 },
});
