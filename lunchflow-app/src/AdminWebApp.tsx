import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { AdminWebShell } from './components/AdminWebShell';
import { colors } from './constants/theme';
import { AuthProvider } from './context/AuthContext';
import { useAppFonts } from './hooks/useAppFonts';
import { useFirebaseInit } from './hooks/useFirebaseInit';
import './lib/firebase';
import { AdminWebNavigator } from './navigation/AdminWebNavigator';

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

export function AdminWebApp() {
  useFirebaseInit();
  const fontsReady = useAppFonts();

  useEffect(() => {
    if (!fontsReady) return;
    ExpoSplashScreen.hideAsync().catch(() => {});
  }, [fontsReady]);

  if (!fontsReady) {
    return <View style={styles.root} />;
  }

  return (
    <AuthProvider>
      <AdminWebShell>
        <View style={styles.root}>
          <NavigationContainer theme={navTheme}>
            <StatusBar style="dark" />
            <AdminWebNavigator />
          </NavigationContainer>
        </View>
      </AdminWebShell>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, height: '100%' as unknown as number },
});
