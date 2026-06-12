import { Platform, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';

type Props = {
  children: React.ReactNode;
};

export function MobileShell({ children }: Props) {
  return (
    <SafeAreaProvider style={[styles.root, Platform.OS === 'web' && styles.webRoot]}>
      {children}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  webRoot: {
    minHeight: '100vh' as unknown as number,
    width: '100%' as unknown as number,
  },
});
