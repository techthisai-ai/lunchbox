import { Platform, StyleSheet, View } from 'react-native';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';

type Props = {
  children: React.ReactNode;
};

export function AdminWebShell({ children }: Props) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      rootOverflow: root?.style.overflow ?? '',
      rootHeight: root?.style.height ?? '',
    };

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    if (root) {
      root.style.overflow = 'hidden';
      root.style.height = '100%';
    }

    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      if (root) {
        root.style.overflow = prev.rootOverflow;
        root.style.height = prev.rootHeight;
      }
    };
  }, []);

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
          height: '100vh' as unknown as number,
          width: '100%' as unknown as number,
          overflow: 'hidden' as const,
        }
      : {}),
  },
  frame: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.bg,
    ...(Platform.OS === 'web'
      ? {
          height: '100%' as unknown as number,
          overflow: 'hidden' as const,
        }
      : {}),
  },
});
