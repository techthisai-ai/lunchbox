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
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverLogin'>;

export function DriverLoginScreen({ navigation, route }: Props) {
  const { loginAsDriver } = useAuth();
  const [phone, setPhone] = useState(route.params?.phone ?? '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (route.params?.phone) {
      setPhone(route.params.phone);
    }
  }, [route.params?.phone]);

  const handleLogin = async () => {
    setError('');
    const err = await loginAsDriver(phone);
    if (err === 'DRIVER_REGISTER_REQUIRED') {
      navigation.replace('DriverRegister', { phone: normalizePhone(phone) || undefined });
      return;
    }
    if (err) {
      setError(err);
      return;
    }
    navigation.replace('DriverTabs', { screen: 'DriverHome' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Driver Login" subtitle="Pickup & delivery partner app" onBack={() => navigation.goBack()} />
      <View style={styles.form}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>DRIVER PORTAL</Text>
        </View>
        <Input label="Mobile Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Enter 10-digit mobile number" />
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
  container: { flex: 1, backgroundColor: colors.white },
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
