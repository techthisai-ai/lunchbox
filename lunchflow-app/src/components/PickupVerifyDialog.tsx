import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';
import { Button } from './Button';

type Props = {
  visible: boolean;
  orderLabel: string;
  onVerify: (code: string) => Promise<string | null>;
  onCancel: () => void;
};

export function PickupVerifyDialog({ visible, orderLabel, onVerify, onCancel }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setError('');
    setLoading(true);
    const err = await onVerify(code.trim());
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setCode('');
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Verify Pickup</Text>
          <Text style={styles.message}>Enter customer OTP or paste scanned QR JSON for {orderLabel}</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="OTP or QR code"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title={loading ? 'Verifying...' : 'Verify Pickup'} onPress={handleVerify} />
          <Button title="Cancel" variant="outline" onPress={onCancel} style={{ marginTop: 10 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  title: { fontSize: 18, fontWeight: '800' },
  message: { fontSize: 14, color: colors.muted, marginTop: 8, lineHeight: 20 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '700',
    marginVertical: spacing.md,
    color: colors.text,
  },
  error: { color: colors.red, fontSize: 13, marginBottom: 8 },
});
