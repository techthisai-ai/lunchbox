import { useEffect, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { ScreenHeader } from '../../components/ScreenHeader';
import { normalizePhone } from '../../constants/auth';
import { colors, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { navigateAfterDriverLogin } from '../../navigation/driverRoutes';
import { RootStackParamList } from '../../navigation/types';
import { driverHasPassword, loadDriverByPhone } from '../../services/userRegistryService';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverLogin'>;

export function DriverLoginScreen({ navigation, route }: Props) {
  const { loginAsDriver } = useAuth();
  const [phone, setPhone] = useState(route.params?.phone ?? '');
  const [password, setPassword] = useState('');
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (route.params?.phone) {
      setPhone(route.params.phone);
    }
  }, [route.params?.phone]);

  useEffect(() => {
    const normalized = normalizePhone(phone);
    if (normalized.length !== 10) {
      setPasswordRequired(false);
      return;
    }
    loadDriverByPhone(normalized).then((driver) => {
      setPasswordRequired(driverHasPassword(driver));
    });
  }, [phone]);

  const handleLogin = async () => {
    setError('');
    const normalized = normalizePhone(phone);
    if (passwordRequired && !password) {
      setError('Enter your password');
      return;
    }

    if (passwordRequired) {
      const driver = await loadDriverByPhone(normalized);
      if (!driver?.password || driver.password !== password) {
        setError('Incorrect password');
        return;
      }
    }

    const err = await loginAsDriver(phone);
    if (err === 'DRIVER_REGISTER_REQUIRED') {
      navigation.replace('DriverRegister', { phone: normalizePhone(phone) || undefined });
      return;
    }
    if (err) {
      setError(err);
      return;
    }
    await navigateAfterDriverLogin(navigation, phone);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Driver Login" subtitle="Pickup & delivery partner app" onBack={() => navigation.goBack()} />
      <View style={styles.form}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>DRIVER PORTAL</Text>
        </View>
        <Input label="Mobile Number" value={phone} onChangeText={setPhone} phone />
        {passwordRequired ? (
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Enter your password"
            autoCapitalize="none"
          />
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Login as Driver" variant="green" onPress={handleLogin} style={{ marginTop: 8 }} />
        <Pressable onPress={() => navigation.navigate('DriverRegister', { phone: normalizePhone(phone) || undefined })}>
          <Text style={styles.register}>
            New driver? <Text style={styles.link}>Register</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  form: { padding: spacing.lg },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.greenLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: colors.green, letterSpacing: 1 },
  error: { color: colors.red, fontSize: 13, marginBottom: 8 },
  register: { textAlign: 'center', marginTop: spacing.lg, fontSize: 13, color: colors.muted },
  link: { color: colors.green, fontWeight: '700' },
});
