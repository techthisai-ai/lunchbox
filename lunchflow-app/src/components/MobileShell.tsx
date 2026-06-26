import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { useFullWidthLayout } from '../context/FullWidthContext';
import { useResponsive } from '../hooks/useResponsive';

type Props = {
  children: React.ReactNode;
};

function AppFrame({ children }: Props) {
  const { contentMaxWidth, isWide } = useResponsive();
  const fullWidth = useFullWidthLayout();
  const maxWidth = fullWidth ? undefined : isWide ? contentMaxWidth : contentMaxWidth;

  return (
    <View style={[styles.frame, isWide && !fullWidth && styles.frameWide]}>
      <View style={[styles.content, maxWidth != null ? { maxWidth } : styles.contentFull]}>{children}</View>
    </View>
  );
}

export function MobileShell({ children }: Props) {
  return (
    <SafeAreaProvider style={[styles.root, Platform.OS === 'web' && styles.webRoot]}>
      <AppFrame>{children}</AppFrame>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  webRoot: {
    minHeight: '100vh' as unknown as number,
    width: '100%' as unknown as number,
  },
  frame: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.bg,
  },
  frameWide: {
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.bg,
  },
  contentFull: {
    maxWidth: '100%' as unknown as number,
  },
});
