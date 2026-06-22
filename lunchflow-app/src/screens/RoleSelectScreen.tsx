import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LogoMark } from '../components/LogoMark';
import { colors, radius, spacing } from '../constants/theme';
import { RootStackParamList } from '../navigation/types';
import { openAdminWebPortal } from '../utils/adminWeb';

type Props = NativeStackScreenProps<RootStackParamList, 'RoleSelect'>;

type RoleItem = {
  id: 'customer' | 'driver' | 'admin';
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  action: () => void;
};

export function RoleSelectScreen({ navigation }: Props) {
  const roles: RoleItem[] = [
    {
      id: 'customer',
      title: 'Customer',
      subtitle: 'Parents, students & office staff',
      icon: 'people',
      color: colors.orange,
      bg: colors.orangeLight,
      action: () => navigation.navigate('Login'),
    },
    {
      id: 'driver',
      title: 'Driver',
      subtitle: 'Pickup & deliver lunchboxes',
      icon: 'bicycle',
      color: colors.green,
      bg: colors.greenLight,
      action: () => navigation.navigate('DriverLogin'),
    },
    {
      id: 'admin',
      title: 'Admin',
      subtitle: 'Open web admin portal',
      icon: 'shield-checkmark',
      color: colors.blue,
      bg: colors.blueLight,
      action: openAdminWebPortal,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <LogoMark size={56} />
        <Text style={styles.title}>
          Lunch<Text style={styles.orange}>Flow</Text>
        </Text>
        <Text style={styles.subtitle}>Choose how you want to continue</Text>
      </View>
      <View style={styles.list}>
        {roles.map((role) => (
          <Pressable
            key={role.id}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={role.action}
          >
            <View style={[styles.iconWrap, { backgroundColor: role.bg }]}>
              <Ionicons name={role.icon} size={24} color={role.color} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{role.title}</Text>
              <Text style={styles.cardSub}>{role.subtitle}</Text>
            </View>
            <Ionicons name={role.id === 'admin' ? 'open-outline' : 'chevron-forward'} size={20} color={colors.muted} />
          </Pressable>
        ))}
      </View>
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={styles.back}>← Back to splash</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  header: { alignItems: 'center', paddingVertical: spacing.lg },
  title: { fontSize: 28, fontWeight: '800', marginTop: spacing.md, letterSpacing: -0.5 },
  orange: { color: colors.orange },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 6 },
  list: { gap: 12, flex: 1, justifyContent: 'center', maxWidth: 420, width: '100%', alignSelf: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  pressed: { opacity: 0.92, borderColor: colors.orange },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  cardSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  back: { textAlign: 'center', color: colors.muted, fontSize: 14, paddingVertical: spacing.md },
});
