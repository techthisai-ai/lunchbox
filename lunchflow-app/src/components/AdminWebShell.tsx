import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';

type Props = {
  children: React.ReactNode;
};

export function AdminWebShell({ children }: Props) {
  return (
    <SafeAreaProvider style={styles.root}>
      <View style={styles.frame}>{children}</View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    ...(Platform.OS === 'web'
      ? {
          minHeight: '100vh' as unknown as number,
          width: '100%' as unknown as number,
        }
      : {}),
  },
  frame: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.bg,
  },
});
