import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ScreenHeader } from '../components/ScreenHeader';
import { normalizePhone } from '../constants/auth';
import { colors, radius, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { navigateAfterCustomerLogin, navigateAfterCustomerRegistration } from '../navigation/customerRoutes';
import { navigateAfterDriverLogin } from '../navigation/driverRoutes';
import { prefetchOnboardingPageAds } from '../services/promoAdService';
import { isCustomerRegistered } from '../services/userRegistryService';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;
type RegisterRole = 'customer' | 'driver';

const ROLES: {
  id: RegisterRole;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'customer', label: 'Customer', icon: 'person' },
  { id: 'driver', label: 'Driver', icon: 'bicycle' },
];

export function RegisterScreen({ navigation, route }: Props) {
  const { registerCustomer, registerDriver, loginAsCustomerPhone } = useAuth();
  const initialRole: RegisterRole = route.params?.role === 'driver' ? 'driver' : 'customer';
  const [selectedRole, setSelectedRole] = useState<RegisterRole>(initialRole);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(route.params?.phone ?? '');
  const [address, setAddress] = useState('');
  const [referralCode, setReferralCode] = useState(route.params?.referralCode ?? '');
  const [vehicle, setVehicle] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(Boolean(route.params?.phone) && initialRole === 'customer');

  useEffect(() => {
    if (route.params?.phone) {
      setPhone(route.params.phone);
    }
    if (route.params?.referralCode) {
      setReferralCode(route.params.referralCode);
    }
    if (route.params?.role === 'customer' || route.params?.role === 'driver') {
      setSelectedRole(route.params.role);
    }
  }, [route.params?.phone, route.params?.referralCode, route.params?.role]);

  useEffect(() => {
    if (selectedRole === 'customer') {
      void prefetchOnboardingPageAds();
    }
  }, [selectedRole]);

  // If this number is already registered as a customer, skip the form and go to home.
  useEffect(() => {
    if (selectedRole !== 'customer') {
      setChecking(false);
      return;
    }

    const normalized = normalizePhone(route.params?.phone ?? '');
    if (normalized.length !== 10) {
      setChecking(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const registered = await isCustomerRegistered(normalized);
      if (cancelled) return;
      if (!registered) {
        setChecking(false);
        return;
      }
      const err = await loginAsCustomerPhone(normalized);
      if (cancelled) return;
      if (!err) {
        await navigateAfterCustomerLogin(navigation, normalized);
        return;
      }
      setChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [route.params?.phone, selectedRole, loginAsCustomerPhone, navigation]);

  const handleCustomerRegister = async () => {
    setError('');
    setSubmitting(true);
    try {
      const err = await registerCustomer({
        name,
        phone,
        address,
        registrationType: 'school',
        school: '',
        studentName: '',
        classSection: '',
        emergencyContact: '',
        referralCode: referralCode.trim() || undefined,
      });
      if (err) {
        setError(err);
        return;
      }
      await navigateAfterCustomerRegistration(navigation, normalizePhone(phone));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDriverRegister = async () => {
    setError('');
    setSubmitting(true);
    try {
      const err = await registerDriver({
        name,
        phone,
        vehicle,
        licenseNumber,
      });
      if (err) {
        setError(err);
        return;
      }
      await navigateAfterDriverLogin(navigation, normalizePhone(phone));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (selectedRole === 'driver') return handleDriverRegister();
    return handleCustomerRegister();
  };

  const submitTitle = submitting
    ? 'Please wait...'
    : selectedRole === 'driver'
      ? 'Complete Driver Registration'
      : 'Complete Registration';

  if (checking) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Create Account" onBack={() => navigation.goBack()} />
        <Text style={styles.checkingText}>Checking your account...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Create Account" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
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

        {selectedRole === 'customer' ? (
          <>
            <Input label="Full Name" value={name} onChangeText={setName} placeholder="Enter your full name" />
            <Input label="Mobile Number" value={phone} onChangeText={setPhone} phone />
            <Input
              label="Home Address"
              value={address}
              onChangeText={setAddress}
              placeholder="Enter your home address"
            />
            <Input
              label="Referral Code (optional)"
              value={referralCode}
              onChangeText={setReferralCode}
              placeholder="Enter friend's referral code"
              autoCapitalize="characters"
            />
          </>
        ) : (
          <>
            <Input label="Full Name" value={name} onChangeText={setName} placeholder="Enter your full name" />
            <Input label="Mobile Number" value={phone} onChangeText={setPhone} phone />
            <Input
              label="Vehicle Number"
              value={vehicle}
              onChangeText={setVehicle}
              placeholder="e.g. DL 4C AB 1234"
              autoCapitalize="characters"
            />
            <Input
              label="Driving License Number"
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              placeholder="Enter license number"
              autoCapitalize="characters"
            />
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={submitTitle} variant="green" onPress={handleSubmit} />

        <Pressable onPress={() => navigation.navigate('Login', { phone: normalizePhone(phone) || undefined })}>
          <Text style={styles.loginLink}>
            Already have an account? <Text style={styles.link}>Login</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  form: { padding: 16, paddingBottom: 40 },
  roleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.md,
    width: '100%',
  },
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
  error: { color: colors.red, fontSize: 13, marginBottom: 12 },
  checkingText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
    color: colors.muted,
    fontWeight: '600',
  },
  loginLink: { textAlign: 'center', marginTop: spacing.lg, fontSize: 13, color: colors.muted },
  link: { color: colors.orange, fontWeight: '700' },
});
