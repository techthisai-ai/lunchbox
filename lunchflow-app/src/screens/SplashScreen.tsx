import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { goToAdminPortal } from '../navigation/adminRoutes';
import { navigateAfterCustomerLogin } from '../navigation/customerRoutes';
import { navigateAfterDriverLogin } from '../navigation/driverRoutes';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const SPLASH_MS = 2500;
const SPLASH_BG = '#FEFBF3';
const logo = require('../../assets/logo.png');

export function SplashScreen({ navigation }: Props) {
  const { user, loading } = useAuth();
  const [minTimeDone, setMinTimeDone] = useState(false);

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
      <View style={styles.content}>
        <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityLabel="Lunch Box logo" />
        <ActivityIndicator size="large" color="#1E3A6E" style={styles.loader} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SPLASH_BG },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  logo: { width: 280, height: 280 },
  loader: { marginTop: spacing.xl },
  loadingText: { marginTop: spacing.md, fontSize: 13, color: '#5C6B7A', fontWeight: '600' },
});
