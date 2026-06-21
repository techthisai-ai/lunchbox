import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { LogoMark } from '../components/LogoMark';
import { normalizePhone } from '../constants/auth';
import { colors, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { RootStackParamList } from '../navigation/types';
import { navigateAfterCustomerLogin } from '../navigation/customerRoutes';
import { formatCountdown } from '../utils/date';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const OTP_RESEND_SECONDS = 30;

export function LoginScreen({ navigation, route }: Props) {
  const { sendCustomerOtp, loginAsCustomer, getDevOtpHint } = useAuth();
  const { horizontalPadding } = useResponsive();
  const [phone, setPhone] = useState(route.params?.phone ?? '');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (route.params?.phone) {
      setPhone(route.params.phone);
    }
  }, [route.params?.phone]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  const requestOtp = async () => {
    const normalized = normalizePhone(phone);
    if (normalized.length !== 10) {
      setError('Enter a valid 10-digit mobile number');
      return false;
    }

    const err = await sendCustomerOtp(phone);
    if (err === 'REGISTER_REQUIRED') {
      navigation.replace('Register', { phone: normalized });
      return false;
    }
    if (err) {
      setError(err);
      return false;
    }

    setOtpSent(true);
    setResendSeconds(OTP_RESEND_SECONDS);
    const devOtp = getDevOtpHint();
    setInfo(devOtp ? `OTP sent. Dev OTP: ${devOtp}` : 'OTP sent to your mobile number');
    return true;
  };

  const handleLogin = async () => {
    setError('');
    setInfo('');

    if (!otp.trim()) {
      await requestOtp();
      return;
    }

    if (!otpSent) {
      const sent = await requestOtp();
      if (!sent) return;
    }

    const result = await loginAsCustomer(otp);
    if (result.error) {
      setError(result.error);
      return;
    }

    const phoneForRouting = result.user?.phone ?? normalizePhone(phone);
    await navigateAfterCustomerLogin(navigation, phoneForRouting);
  };

  const handleResend = async () => {
    if (resendSeconds > 0) return;
    setError('');
    await requestOtp();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
      </View>
      <View style={styles.top}>
        <LogoMark size={56} />
      </View>
      <View style={[styles.form, { paddingHorizontal: horizontalPadding }]}>
        <Input
          label="Mobile Number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="Enter 10-digit mobile number"
        />
        <Text style={styles.label}>Enter OTP</Text>
        <TextInput
          style={[styles.otpInput, otp.length > 0 && styles.otpInputFilled]}
          value={otp}
          onChangeText={setOtp}
          maxLength={6}
          keyboardType="number-pad"
          placeholder="Enter OTP"
          placeholderTextColor={colors.muted}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
        />
        <Pressable onPress={handleResend} disabled={resendSeconds > 0}>
          <Text style={styles.resend}>
            {resendSeconds > 0 ? (
              <>
                Resend OTP in <Text style={styles.orange}>{formatCountdown(resendSeconds)}</Text>
              </>
            ) : (
              <Text style={styles.orange}>Resend OTP</Text>
            )}
          </Text>
        </Pressable>
        {info ? <Text style={styles.info}>{info}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={otp.trim() ? 'Verify & Login' : 'Send OTP'} onPress={handleLogin} style={{ marginTop: 8 }} />
        <Pressable onPress={() => navigation.navigate('Register', { phone: normalizePhone(phone) || undefined })}>
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
  header: { paddingTop: spacing.sm, paddingBottom: spacing.sm },
  back: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  top: { alignItems: 'center', paddingTop: spacing.md },
  form: { paddingTop: spacing.lg },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  otpInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  otpInputFilled: {
    letterSpacing: 8,
  },
  resend: { fontSize: 12, color: colors.muted, marginBottom: spacing.sm },
  orange: { color: colors.orange, fontWeight: '700' },
  info: { color: colors.green, fontSize: 13, marginBottom: 8 },
  error: { color: colors.red, fontSize: 13, marginBottom: 8 },
  register: { textAlign: 'center', marginTop: spacing.lg, fontSize: 13, color: colors.muted },
});
