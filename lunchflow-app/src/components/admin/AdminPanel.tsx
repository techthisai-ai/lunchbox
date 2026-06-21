import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../constants/theme';
import { useAdminLayout } from '../../hooks/useAdminLayout';

type Props = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
  style?: object;
};

export function AdminPanel({ title, actionLabel, onAction, children, style }: Props) {
  const { isSidebarCollapsed } = useAdminLayout();

  return (
    <View style={[styles.panel, isSidebarCollapsed && styles.panelCompact, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {actionLabel ? (
          <Pressable onPress={onAction}>
            <Text style={styles.action}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minWidth: 280,
  },
  panelCompact: {
    minWidth: 0,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: { fontSize: 16, fontWeight: '800', color: colors.text },
  action: { fontSize: 13, fontWeight: '700', color: colors.orange },
});
