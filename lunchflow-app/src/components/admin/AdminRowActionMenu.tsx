import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../constants/theme';

export type RowAction = {
  label: string;
  onPress: () => void;
  tone?: 'default' | 'danger';
};

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  actions: RowAction[];
};

export function AdminRowActionMenu({ visible, onClose, title, subtitle, actions }: Props) {
  const handleAction = (action: RowAction) => {
    onClose();
    action.onPress();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.dialog}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          {actions.length > 0 ? (
            actions.map((action) => (
              <Pressable
                key={action.label}
                style={styles.actionBtn}
                onPress={() => handleAction(action)}
              >
                <Text style={[styles.actionText, action.tone === 'danger' && styles.actionTextDanger]}>
                  {action.label}
                </Text>
              </Pressable>
            ))
          ) : (
            <Text style={styles.emptyText}>No actions available</Text>
          )}

          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(58, 41, 66, 0.45)',
  },
  dialog: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 8,
  },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.muted, fontWeight: '600', marginBottom: 4 },
  actionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  actionText: { fontSize: 15, fontWeight: '700', color: colors.orange, textAlign: 'center' },
  actionTextDanger: { color: colors.red },
  emptyText: { fontSize: 13, color: colors.muted, fontWeight: '600', textAlign: 'center', paddingVertical: 8 },
  cancelBtn: {
    marginTop: 4,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: colors.text },
});
