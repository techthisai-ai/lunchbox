import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { LogoMark } from '../components/LogoMark';
import { normalizePhone } from '../constants/auth';
import { colors, radius, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { RootStackParamList } from '../navigation/types';
import { navigateAfterCustomerLogin } from '../navigation/customerRoutes';
import { navigateAfterDriverLogin } from '../navigation/driverRoutes';
import { goToAdminPortal } from '../navigation/adminRoutes';
import { isCustomerRegistered, isDriverRegistered } from '../services/userRegistryService';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

type LoginRole = 'customer' | 'driver' | 'admin';

const ROLES: {
  id: LoginRole;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'customer', label: 'Customer', icon: 'person' },
  { id: 'driver', label: 'Driver', icon: 'bicycle' },
  { id: 'admin', label: 'Admin', icon: 'shield-checkmark' },
];

export function LoginScreen({ navigation, route }: Props) {
  const { loginAsCustomerPhone, loginAsDriver, loginAsAdmin } = useAuth();
  const { horizontalPadding } = useResponsive();
  const [phone, setPhone] = useState(route.params?.phone ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<LoginRole>(route.params?.role ?? 'customer');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = selectedRole === 'admin';
  const buttonTitle = isAdmin ? 'Login as Admin' : 'Login';

  const handleContinue = async () => {
    setError('');

    if (isAdmin) {
      setSubmitting(true);
      try {
        const err = await loginAsAdmin(email, password);
        if (err) {
          setError(err);
          return;
        }
        goToAdminPortal(navigation);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const normalized = normalizePhone(phone);
    if (normalized.length !== 10) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }

    setSubmitting(true);
    try {
      if (selectedRole === 'driver') {
        const registered = await isDriverRegistered(normalized);
        if (!registered) {
          navigation.replace('DriverRegister', { phone: normalized });
          return;
        }
        const err = await loginAsDriver(phone);
        if (err) {
          setError(err);
          return;
        }
        await navigateAfterDriverLogin(navigation, normalized);
        return;
      }

      const registered = await isCustomerRegistered(normalized);
      if (!registered) {
        navigation.replace('Register', { phone: normalized });
        return;
      }

      const err = await loginAsCustomerPhone(phone);
      if (err) {
        setError(err);
        return;
      }

      await navigateAfterCustomerLogin(navigation, normalized);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { paddingHorizontal: horizontalPadding }]}>
        <View style={styles.centerBlock}>
          <LogoMark size={96} />

          <View style={styles.roleRow}>
            {ROLES.map((role) => {
              const active = selectedRole === role.id;
              return (
                <Pressable
                  key={role.id}
                  style={[styles.roleBox, active && styles.roleBoxActive]}
                  onPress={() => {
                    setSelectedRole(role.id);
                    setError('');
                  }}
                >
                  <Ionicons name={role.icon} size={18} color={active ? colors.orange : colors.muted} />
                  <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>{role.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.formCard}>
            {isAdmin ? (
              <>
                <Input
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="Enter admin email"
                />
                <Input
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="Enter password"
                />
              </>
            ) : (
              <Input
                label="Mobile Number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="10-digit mobile number"
                maxLength={10}
              />
            )}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              title={submitting ? 'Please wait...' : buttonTitle}
              onPress={handleContinue}
              style={{ marginTop: 4 }}
            />
          </View>

          {selectedRole === 'customer' ? (
            <Pressable onPress={() => navigation.navigate('Register', { phone: normalizePhone(phone) || undefined })}>
              <Text style={styles.register}>
                New user? <Text style={styles.link}>Register</Text>
              </Text>
            </Pressable>
          ) : selectedRole === 'driver' ? (
            <Pressable
              onPress={() => navigation.navigate('DriverRegister', { phone: normalizePhone(phone) || undefined })}
            >
              <Text style={styles.register}>
                New driver? <Text style={styles.link}>Register</Text>
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, justifyContent: 'center' },
  centerBlock: { width: '100%', maxWidth: 380, alignSelf: 'center', alignItems: 'center' },
  roleRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: spacing.lg, marginBottom: spacing.md, width: '100%' },
  roleBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  roleBoxActive: { borderColor: colors.orange, backgroundColor: colors.yellowLight },
  roleLabel: { fontSize: 11, fontWeight: '700', marginTop: 4, color: colors.muted },
  roleLabelActive: { color: colors.orange },
  formCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
  },
  error: { color: colors.red, fontSize: 13, marginBottom: 8 },
  register: { textAlign: 'center', marginTop: spacing.lg, fontSize: 13, color: colors.muted },
  link: { color: colors.orange, fontWeight: '700' },
});
