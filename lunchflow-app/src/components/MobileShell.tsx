import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { useResponsive } from '../hooks/useResponsive';

type Props = {
  children: React.ReactNode;
};

type FrameProps = Props & {
  /** When true, use full browser width (admin portal on web). */
  fullWidth?: boolean;
};

export function MobileShell({ children }: Props) {
  return (
    <SafeAreaProvider style={[styles.root, Platform.OS === 'web' && styles.webRoot]}>
      {children}
    </SafeAreaProvider>
  );
}

export function AppLayoutFrame({ children, fullWidth = false }: FrameProps) {
  const { contentMaxWidth, isWide } = useResponsive();
  const constrainWidth = isWide && !fullWidth;
  const maxWidth = constrainWidth ? contentMaxWidth : undefined;

  return (
    <View style={[styles.frame, constrainWidth && styles.frameWide]}>
      <View style={[styles.content, maxWidth != null ? { maxWidth } : styles.contentFull]}>{children}</View>
    </View>
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
