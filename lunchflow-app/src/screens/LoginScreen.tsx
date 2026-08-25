import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChefQueenLogo } from '../components/ChefQueenLogo';
import { formatPhoneInput, normalizePhone } from '../constants/auth';
import { colors, gradients, shadow, spacing } from '../constants/theme';
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
  const { width } = useWindowDimensions();
  const logoHeight = Math.min(148, Math.round(width * 0.36));
  const [phone, setPhone] = useState(route.params?.phone ?? '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);

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
      <View pointerEvents="none" style={styles.decorLayer}>
        <Ionicons name="restaurant-outline" size={42} color="rgba(81,91,47,0.08)" style={styles.decorPot} />
        <Ionicons name="cafe-outline" size={36} color="rgba(228,94,26,0.08)" style={styles.decorCup} />
        <Ionicons name="leaf-outline" size={28} color="rgba(81,91,47,0.1)" style={styles.decorLeaf} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.content, { paddingHorizontal: horizontalPadding }]}>
          <View style={styles.centerBlock}>
            <ChefQueenLogo variant="stacked" height={logoHeight} />

            <View style={styles.formCard}>
              <Text style={styles.welcome}>Welcome</Text>
              <View style={styles.continueRow}>
                <View style={styles.continueLine} />
                <Text style={styles.continueText}>Login to continue</Text>
                <View style={styles.continueLine} />
              </View>

              <Text style={styles.fieldLabel}>Mobile Number</Text>
              <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
                <View style={styles.phoneIcon}>
                  <Ionicons name="call" size={16} color={colors.orange} />
                </View>
                <TextInput
                  value={phone}
                  onChangeText={(text) => setPhone(formatPhoneInput(text))}
                  placeholder="Enter 10-digit mobile number"
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  style={styles.input}
                  underlineColorAndroid="transparent"
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                />
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable
                onPress={handleContinue}
                disabled={submitting}
                style={({ pressed }) => [pressed && styles.loginPressed]}
              >
                <LinearGradient
                  colors={[...gradients.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginBtn}
                >
                  <Text style={styles.loginText}>{submitting ? 'Please wait...' : 'Login'}</Text>
                  {!submitting ? <Ionicons name="arrow-forward" size={18} color={colors.onPrimary} /> : null}
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={() =>
                  navigation.navigate('Register', { phone: normalizePhone(phone) || undefined })
                }
                style={styles.registerWrap}
              >
                <Text style={styles.register}>
                  New user? <Text style={styles.link}>Register {'>'}</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  flex: { flex: 1 },
  decorLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  decorPot: { position: 'absolute', top: 72, left: 18 },
  decorCup: { position: 'absolute', top: 160, left: 40 },
  decorLeaf: { position: 'absolute', bottom: 90, left: 28 },
  content: { flex: 1, justifyContent: 'center' },
  centerBlock: { width: '100%', maxWidth: 400, alignSelf: 'center', alignItems: 'center' },
  formCard: {
    width: '100%',
    marginTop: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
    ...shadow.card,
  },
  welcome: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.green,
    textAlign: 'center',
  },
  continueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 22,
  },
  continueLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: colors.orange,
    opacity: 0.7,
  },
  continueText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.orangeLight,
    borderWidth: 1.5,
    borderColor: colors.orange,
    borderRadius: 14,
    paddingLeft: 8,
    paddingRight: 12,
    minHeight: 50,
  },
  inputWrapFocused: {
    borderColor: colors.orangeDark,
  },
  phoneIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8D7C0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 12,
    borderWidth: 0,
    backgroundColor: 'transparent',
    outlineWidth: 0,
    outlineStyle: 'none' as const,
    outlineColor: 'transparent',
  },
  error: { color: colors.red, fontSize: 13, marginTop: 8 },
  loginPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  loginBtn: {
    marginTop: 16,
    minHeight: 50,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 22,
  },
  loginText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  registerWrap: { marginTop: 16, alignItems: 'center' },
  register: { textAlign: 'center', fontSize: 13, color: colors.muted, fontWeight: '600' },
  link: { color: colors.orange, fontWeight: '800' },
});
