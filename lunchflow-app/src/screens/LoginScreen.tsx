import { useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { LogoMark } from '../components/LogoMark';
import { ScreenHeader } from '../components/ScreenHeader';
import { DEMO_CREDENTIALS } from '../constants/auth';
import { colors, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { loginAsCustomer } = useAuth();
  const [phone, setPhone] = useState<string>(DEMO_CREDENTIALS.customer.phone);
  const [otp, setOtp] = useState<string>(DEMO_CREDENTIALS.customer.otp);
  const [error, setError] = useState('');

  const handleLogin = () => {
    const err = loginAsCustomer(phone, otp);
    if (err) {
      setError(err);
      return;
    }
    navigation.replace('MainTabs', { screen: 'Home', params: { screen: 'Home' } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Customer Login" subtitle="Sign in with mobile & OTP" onBack={() => navigation.goBack()} />
      <View style={styles.top}>
        <LogoMark size={56} />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>CUSTOMER APP</Text>
        </View>
      </View>
      <View style={styles.form}>
        <Input label="Mobile Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Text style={styles.label}>Enter OTP</Text>
        <TextInput
          style={styles.otpInput}
          value={otp}
          onChangeText={setOtp}
          maxLength={4}
          keyboardType="number-pad"
          placeholder="4-digit OTP"
          placeholderTextColor={colors.muted}
        />
        <Text style={styles.resend}>
          Resend OTP in <Text style={styles.orange}>0:28</Text>
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Login" onPress={handleLogin} style={{ marginTop: 8 }} />
        <Pressable onPress={() => navigation.navigate('Register')}>
          <Text style={styles.register}>
            New user? <Text style={styles.orange}>Register</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  top: { alignItems: 'center', paddingTop: spacing.md },
  badge: {
    backgroundColor: colors.orangeLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: colors.orange, letterSpacing: 1 },
  form: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  otpInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 8,
    color: colors.text,
    marginBottom: 8,
  },
  resend: { fontSize: 12, color: colors.muted, marginBottom: spacing.sm },
  orange: { color: colors.orange, fontWeight: '700' },
  error: { color: colors.red, fontSize: 13, marginBottom: 8 },
  register: { textAlign: 'center', marginTop: spacing.lg, fontSize: 13, color: colors.muted },
});
