import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { colors, shadow, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { goToAdminPortal } from '../navigation/adminRoutes';
import { navigateAfterCustomerLogin } from '../navigation/customerRoutes';
import { navigateAfterDriverLogin } from '../navigation/driverRoutes';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const SPLASH_MS = 2500;
const SPLASH_BG = colors.surfaceMuted;
const logo = require('../../assets/logo.png');

function useSplashLogoSize() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const horizontalCap = width * 0.38;
    const verticalCap = height * 0.2;
    const logoSize = Math.min(horizontalCap, verticalCap, 132);
    const cornerRadius = Math.round(logoSize * 0.22);
    return { logoSize, cornerRadius };
  }, [width, height]);
}

export function SplashScreen({ navigation }: Props) {
  const { user, loading } = useAuth();
  const [minTimeDone, setMinTimeDone] = useState(false);
  const { logoSize, cornerRadius } = useSplashLogoSize();

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
        goToAdminPortal(navigation);
        return;
      }

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
      <View style={styles.logoStage}>
        <View
          style={[
            styles.logoFrame,
            { width: logoSize, height: logoSize, borderRadius: cornerRadius },
          ]}
        >
          <Image
            source={logo}
            style={[styles.logo, { borderRadius: cornerRadius }]}
            resizeMode="contain"
            accessibilityLabel="Chef Queen logo"
          />
        </View>
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
  logoFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadow.subtle,
  },
  logo: {
    width: '100%',
    height: '100%',
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
