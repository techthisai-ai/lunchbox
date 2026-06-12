import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LogoMark } from '../components/LogoMark';
import { colors, radius, spacing } from '../constants/theme';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'RoleSelect'>;

const roles = [
  {
    id: 'customer' as const,
    title: 'Customer',
    subtitle: 'Parents, students & office staff',
    icon: 'people' as const,
    color: colors.orange,
    bg: colors.orangeLight,
    screen: 'Login' as const,
  },
  {
    id: 'driver' as const,
    title: 'Driver',
    subtitle: 'Pickup & deliver lunchboxes',
    icon: 'bicycle' as const,
    color: colors.green,
    bg: colors.greenLight,
    screen: 'DriverLogin' as const,
  },
  {
    id: 'admin' as const,
    title: 'Admin',
    subtitle: 'Manage orders, drivers & plans',
    icon: 'shield-checkmark' as const,
    color: colors.blue,
    bg: colors.blueLight,
    screen: 'AdminLogin' as const,
  },
];

export function RoleSelectScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <LogoMark size={56} />
        <Text style={styles.title}>Choose your role</Text>
        <Text style={styles.subtitle}>Sign in to the LunchFlow portal</Text>
      </View>
      <View style={styles.list}>
        {roles.map((role) => (
          <Pressable
            key={role.id}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={() => navigation.navigate(role.screen)}
          >
            <View style={[styles.iconWrap, { backgroundColor: role.bg }]}>
              <Ionicons name={role.icon} size={24} color={role.color} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{role.title}</Text>
              <Text style={styles.cardSub}>{role.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
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
  container: { flex: 1, backgroundColor: colors.white, padding: spacing.lg },
  header: { alignItems: 'center', paddingVertical: spacing.xl },
  title: { fontSize: 24, fontWeight: '800', marginTop: spacing.md },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 6 },
  list: { gap: 12, flex: 1 },
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
