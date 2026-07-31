import { useState } from 'react';
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
import { isCustomerRegistered, isDriverRegistered } from '../services/userRegistryService';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation, route }: Props) {
  const { loginAsCustomerPhone, loginAsDriver } = useAuth();
  const { horizontalPadding } = useResponsive();
  const [phone, setPhone] = useState(route.params?.phone ?? '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleContinue = async () => {
    setError('');

    const normalized = normalizePhone(phone);
    if (normalized.length !== 10) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }

    setSubmitting(true);
    try {
      const [driverRegistered, customerRegistered] = await Promise.all([
        isDriverRegistered(normalized),
        isCustomerRegistered(normalized),
      ]);

      if (driverRegistered) {
        const err = await loginAsDriver(phone);
        if (err) {
          setError(err);
          return;
        }
        await navigateAfterDriverLogin(navigation, normalized);
        return;
      }

      if (customerRegistered) {
        const err = await loginAsCustomerPhone(phone);
        if (err) {
          setError(err);
          return;
        }
        await navigateAfterCustomerLogin(navigation, normalized);
        return;
      }

      navigation.replace('Register', { phone: normalized });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { paddingHorizontal: horizontalPadding }]}>
        <View style={styles.centerBlock}>
          <LogoMark size={96} />

          <View style={styles.formCard}>
            <Input
              label="Mobile Number"
              value={phone}
              onChangeText={setPhone}
              phone
              placeholder="10-digit mobile number"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              title={submitting ? 'Please wait...' : 'Login'}
              onPress={handleContinue}
              style={{ marginTop: 4 }}
            />
          </View>

          <Pressable
            onPress={() =>
              navigation.navigate('Register', { phone: normalizePhone(phone) || undefined })
            }
          >
            <Text style={styles.register}>
              New user? <Text style={styles.link}>Register</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, justifyContent: 'center' },
  centerBlock: { width: '100%', maxWidth: 380, alignSelf: 'center', alignItems: 'center' },
  formCard: {
    width: '100%',
    marginTop: spacing.lg,
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
