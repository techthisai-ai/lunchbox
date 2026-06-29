import { NavigationContainer, DefaultTheme, NavigationContainerRef, NavigationState } from '@react-navigation/native';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MobileShell, AppLayoutFrame } from './src/components/MobileShell';
import { colors } from './src/constants/theme';
import { AuthProvider } from './src/context/AuthContext';
import { DeliveryProvider } from './src/context/DeliveryContext';
import { FoodReadyOverlayProvider } from './src/context/FoodReadyOverlayContext';
import { RatingOverlayProvider } from './src/context/RatingOverlayContext';
import { useFirebaseInit } from './src/hooks/useFirebaseInit';
import './src/lib/firebase';
import { RootNavigator } from './src/navigation/RootNavigator';
import { RootStackParamList } from './src/navigation/types';
import { AdminWebApp } from './src/AdminWebApp';
import { isAdminWebEntry } from './src/utils/adminWeb';

ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    primary: colors.orange,
    card: colors.white,
    text: colors.text,
    border: colors.border,
  },
};

const styles = StyleSheet.create({
  navRoot: { flex: 1 },
});

function getActiveRouteName(state: NavigationState | undefined): string {
  if (!state?.routes?.length) return '';
  const route = state.routes[state.index ?? 0];
  if (route.state) {
    return getActiveRouteName(route.state as NavigationState);
  }
  return route.name ?? '';
}

function MobileApp() {
  useFirebaseInit();
  const [activeRoute, setActiveRoute] = useState('');
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  const syncRoute = useCallback((state: NavigationState | undefined) => {
    setActiveRoute(getActiveRouteName(state));
  }, []);

  return (
    <AuthProvider>
      <RatingOverlayProvider>
        <DeliveryProvider>
          <FoodReadyOverlayProvider>
            <MobileShell>
              <View style={styles.navRoot}>
                <NavigationContainer
                  ref={navigationRef}
                  theme={navTheme}
                  onReady={() => syncRoute(navigationRef.current?.getRootState())}
                  onStateChange={syncRoute}
                >
                  <AppLayoutFrame fullWidth={activeRoute === 'AdminPortal'}>
                    <StatusBar style="dark" />
                    <RootNavigator />
                  </AppLayoutFrame>
                </NavigationContainer>
              </View>
            </MobileShell>
          </FoodReadyOverlayProvider>
        </DeliveryProvider>
      </RatingOverlayProvider>
    </AuthProvider>
  );
}

export default function App() {
  if (isAdminWebEntry()) {
    return <AdminWebApp />;
  }
  return <MobileApp />;
}
