import { ReactNode } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/theme';
import { useAdminLayout } from '../../hooks/useAdminLayout';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function AdminMobileOverlay({ visible, onClose, children }: Props) {
  const { isSidebarCollapsed } = useAdminLayout();

  if (!visible) return null;

  if (!isSidebarCollapsed) {
    return <>{children}</>;
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.body}>{children}</View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, padding: 12 },
});
