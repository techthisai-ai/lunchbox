import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { MobileShell } from './src/components/MobileShell';
import { colors } from './src/constants/theme';
import { AuthProvider } from './src/context/AuthContext';
import { DeliveryProvider } from './src/context/DeliveryContext';
import { FoodReadyOverlayProvider } from './src/context/FoodReadyOverlayContext';
import { RatingOverlayProvider } from './src/context/RatingOverlayContext';
import { useFirebaseInit } from './src/hooks/useFirebaseInit';
import './src/lib/firebase';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AdminWebApp } from './src/AdminWebApp';
import { isAdminWebEntry } from './src/utils/adminWeb';

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

function MobileApp() {
  useFirebaseInit();

  return (
    <AuthProvider>
      <RatingOverlayProvider>
        <DeliveryProvider>
          <FoodReadyOverlayProvider>
            <MobileShell>
              <View style={styles.navRoot}>
                <NavigationContainer theme={navTheme}>
                  <StatusBar style="dark" />
                  <RootNavigator />
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
