import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { useWebViewportLock } from '../hooks/useWebViewportLock';

type Props = {
  children: React.ReactNode;
};

export function AdminWebShell({ children }: Props) {
  useWebViewportLock();

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
    color: colors.text,
    ...(Platform.OS === 'web'
      ? {
          minHeight: '100%' as unknown as number,
          height: '100%' as unknown as number,
          width: '100%' as unknown as number,
          overflow: 'hidden' as const,
        }
      : {}),
  },
  frame: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.bg,
    color: colors.text,
    ...(Platform.OS === 'web'
      ? {
          height: '100%' as unknown as number,
          overflow: 'hidden' as const,
        }
      : {}),
  },
});
