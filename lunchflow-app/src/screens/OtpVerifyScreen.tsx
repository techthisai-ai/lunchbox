import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { LogoMark } from '../components/LogoMark';
import { normalizePhone } from '../constants/auth';
import { colors, radius, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { navigateAfterCustomerLogin } from '../navigation/customerRoutes';
import { navigateAfterDriverLogin } from '../navigation/driverRoutes';
import { RootStackParamList } from '../navigation/types';
import { formatCountdown } from '../utils/date';

type Props = NativeStackScreenProps<RootStackParamList, 'OtpVerify'>;

const OTP_RESEND_SECONDS = 30;

export function OtpVerifyScreen({ navigation, route }: Props) {
  const { loginAsCustomer, loginAsDriverOtp, sendCustomerOtp, sendDriverOtp } = useAuth();
  const { horizontalPadding } = useResponsive();
  const phone = normalizePhone(route.params.phone);
  const role = route.params.role ?? 'customer';
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [resendSeconds, setResendSeconds] = useState(OTP_RESEND_SECONDS);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  const handleVerify = async () => {
    if (!otp.trim()) {
      setError('Enter the OTP sent to your phone');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      if (role === 'driver') {
        const result = await loginAsDriverOtp(otp, phone);
        if (result.error) {
          setError(result.error);
          return;
        }
        await navigateAfterDriverLogin(navigation, phone);
        return;
      }

      const result = await loginAsCustomer(otp, phone);
      if (result.error) {
        setError(result.error);
        return;
      }
      await navigateAfterCustomerLogin(navigation, phone);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendSeconds > 0) return;
    setError('');
    const err = role === 'driver' ? await sendDriverOtp(phone) : await sendCustomerOtp(phone);
    if (err === 'REGISTER_REQUIRED' || err === 'DRIVER_REGISTER_REQUIRED') {
      navigation.replace(role === 'driver' ? 'DriverRegister' : 'Register', { phone });
      return;
    }
    if (err) {
      setError(err);
      return;
    }
    setResendSeconds(OTP_RESEND_SECONDS);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
      </View>

      <View style={[styles.content, { paddingHorizontal: horizontalPadding }]}>
        <View style={styles.centerBlock}>
          <LogoMark size={80} />
          <Text style={styles.title}>Enter OTP</Text>
          <Text style={styles.subtitle}>We sent a code to +91 {phone}</Text>

          <View style={styles.formCard}>
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

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              title={submitting ? 'Verifying...' : 'Verify & Login'}
              onPress={handleVerify}
              style={{ marginTop: 4 }}
            />

            <Pressable onPress={handleResend} disabled={resendSeconds > 0} style={styles.resendWrap}>
              <Text style={styles.resend}>
                {resendSeconds > 0 ? (
                  <>
                    Resend OTP in <Text style={styles.link}>{formatCountdown(resendSeconds)}</Text>
                  </>
                ) : (
                  <Text style={styles.link}>Resend OTP</Text>
                )}
              </Text>
            </Pressable>
          </View>

          <Pressable onPress={() => navigation.replace(role === 'driver' ? 'DriverRegister' : 'Register', { phone })}>
            <Text style={styles.register}>
              No account? <Text style={styles.link}>Register</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: spacing.sm, paddingBottom: spacing.sm },
  back: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  content: { flex: 1, justifyContent: 'center' },
  centerBlock: { width: '100%', maxWidth: 380, alignSelf: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', marginTop: spacing.md, color: colors.text },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 6, marginBottom: spacing.lg, textAlign: 'center' },
  formCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
  },
  otpInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    backgroundColor: colors.bg,
  },
  otpInputFilled: { letterSpacing: 8 },
  error: { color: colors.red, fontSize: 13, marginTop: spacing.sm, textAlign: 'center' },
  resendWrap: { marginTop: spacing.md },
  resend: { fontSize: 12, color: colors.muted, textAlign: 'center' },
  link: { color: colors.orange, fontWeight: '700' },
  register: { textAlign: 'center', marginTop: spacing.lg, fontSize: 13, color: colors.muted },
});
