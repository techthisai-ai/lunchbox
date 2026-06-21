import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { AdminWebShell } from './components/AdminWebShell';
import { colors } from './constants/theme';
import { AuthProvider } from './context/AuthContext';
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
  root: { flex: 1 },
});
