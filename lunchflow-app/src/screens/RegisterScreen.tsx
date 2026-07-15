import { useEffect, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ScreenHeader } from '../components/ScreenHeader';
import { normalizePhone } from '../constants/auth';
import { colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { navigateAfterCustomerLogin, navigateAfterCustomerRegistration } from '../navigation/customerRoutes';
import { isCustomerRegistered } from '../services/userRegistryService';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export function RegisterScreen({ navigation, route }: Props) {
  const { registerCustomer, loginAsCustomerPhone } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(route.params?.phone ?? '');
  const [address, setAddress] = useState('');
  const [referralCode, setReferralCode] = useState(route.params?.referralCode ?? '');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(Boolean(route.params?.phone));

  useEffect(() => {
    if (route.params?.phone) {
      setPhone(route.params.phone);
    }
    if (route.params?.referralCode) {
      setReferralCode(route.params.referralCode);
    }
  }, [route.params?.phone, route.params?.referralCode]);

  // If this number is already registered, skip the form and go to home.
  useEffect(() => {
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
  }, [route.params?.phone, loginAsCustomerPhone, navigation]);

  const handleRegister = async () => {
    setError('');
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
  };

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
        <Input label="Full Name" value={name} onChangeText={setName} placeholder="Enter your full name" />
        <Input label="Mobile Number" value={phone} onChangeText={setPhone} phone />
        <Input label="Home Address" value={address} onChangeText={setAddress} placeholder="Enter your home address" />
        <Input
          label="Referral Code (optional)"
          value={referralCode}
          onChangeText={setReferralCode}
          placeholder="Enter friend's referral code"
          autoCapitalize="characters"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Complete Registration" variant="green" onPress={handleRegister} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  form: { padding: 16, paddingBottom: 40 },
  error: { color: colors.red, fontSize: 13, marginBottom: 12 },
  checkingText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
    color: colors.muted,
    fontWeight: '600',
  },
});
