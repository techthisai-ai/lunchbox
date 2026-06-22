import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogoMark } from '../components/LogoMark';
import { colors, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { navigateAfterCustomerLogin } from '../navigation/customerRoutes';
import { navigateAfterDriverLogin } from '../navigation/driverRoutes';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const SPLASH_MS = 2500;

export function SplashScreen({ navigation }: Props) {
  const { user, loading } = useAuth();
  const [minTimeDone, setMinTimeDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeDone(true), SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading || !minTimeDone) return;

    let cancelled = false;

    (async () => {
      if (cancelled) return;

      if (user?.role === 'customer' && user.phone) {
        await navigateAfterCustomerLogin(navigation, user.phone);
        return;
      }

      if (user?.role === 'driver' && user.phone) {
        await navigateAfterDriverLogin(navigation, user.phone);
        return;
      }

      navigation.replace('Login');
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, minTimeDone, user, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <LogoMark size={72} />
        <Text style={styles.title}>
          Lunch<Text style={styles.accent}>Flow</Text>
        </Text>
        <Text style={styles.subtitle}>Fresh lunchboxes, on time</Text>
        <ActivityIndicator size="large" color={colors.orange} style={styles.loader} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: { fontSize: 32, fontWeight: '800', marginTop: spacing.lg, letterSpacing: -0.5 },
  accent: { color: colors.orange },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 8, fontWeight: '600' },
  loader: { marginTop: spacing.xl },
  loadingText: { marginTop: spacing.md, fontSize: 13, color: colors.muted, fontWeight: '600' },
});
