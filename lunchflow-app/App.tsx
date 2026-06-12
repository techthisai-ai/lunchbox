import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { MobileShell } from './src/components/MobileShell';
import { colors } from './src/constants/theme';
import { AuthProvider } from './src/context/AuthContext';
import { useFirebaseInit } from './src/hooks/useFirebaseInit';
import './src/lib/firebase';
import { RootNavigator } from './src/navigation/RootNavigator';

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

export default function App() {
  useFirebaseInit();

  return (
    <AuthProvider>
      <MobileShell>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
      </MobileShell>
    </AuthProvider>
  );
}
