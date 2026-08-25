import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { ChefQueenLogo, SPLASH_LOGO_ASPECT } from '../components/ChefQueenLogo';
import { colors, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { navigateAfterCustomerLogin } from '../navigation/customerRoutes';
import { navigateAfterDriverLogin } from '../navigation/driverRoutes';
import { RootStackParamList } from '../navigation/types';
import { openAdminWebPortal } from '../utils/adminWeb';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const SPLASH_MS = 2500;
const SPLASH_BG = colors.bg;

export function SplashScreen({ navigation }: Props) {
  const { user, loading } = useAuth();
  const [minTimeDone, setMinTimeDone] = useState(false);
  const { width } = useWindowDimensions();
  const logoHeight = useMemo(() => {
    const logoWidth = Math.min(340, Math.round(width * 0.84));
    return Math.round(logoWidth / SPLASH_LOGO_ASPECT);
  }, [width]);
  const navigatedRef = useRef(false);

  useEffect(() => {
    ExpoSplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeDone(true), SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading || !minTimeDone) return;

    let cancelled = false;

    (async () => {
      if (cancelled) return;

      if (user?.role === 'admin') {
        // Admin runs only on the web portal (/admin or admin.* host), not in the mobile app.
        navigatedRef.current = true;
        openAdminWebPortal();
        navigation.replace('Login');
        return;
      }

      if (user?.role === 'customer' && user.phone) {
        navigatedRef.current = true;
        await navigateAfterCustomerLogin(navigation, user.phone);
        return;
      }

      if (user?.role === 'driver' && user.phone) {
        navigatedRef.current = true;
        await navigateAfterDriverLogin(navigation, user.phone);
        return;
      }

      navigatedRef.current = true;
      navigation.replace('Login');
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, minTimeDone, user, navigation]);

  // Failsafe: never stay on splash if auth/navigation stalls on a device build.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!navigatedRef.current) {
        navigatedRef.current = true;
        navigation.replace('Login');
      }
    }, 8000);
    return () => clearTimeout(timeout);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.logoStage}>
        <ChefQueenLogo variant="splash" height={logoHeight} />
      </View>

      <View style={styles.footer}>
        <ActivityIndicator size="large" color={colors.orange} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SPLASH_BG,
  },
  logoStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.xl,
    gap: spacing.sm,
    minHeight: 88,
  },
  loadingText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
  },
});
