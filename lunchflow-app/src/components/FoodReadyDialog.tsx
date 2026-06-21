import { ReactNode, useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';
import { DeliveryType, FoodReadyDetails, getPersonLabel, normalizeDeliveryType } from '../types/delivery';
import { Button } from './Button';

type Props = {
  visible: boolean;
  initialValues?: Partial<FoodReadyDetails>;
  submitting?: boolean;
  onConfirm: (details: FoodReadyDetails) => void;
  onCancel: () => void;
};

const WHERE_OPTIONS: { id: DeliveryType; label: string }[] = [
  { id: 'school', label: 'School' },
  { id: 'college', label: 'College' },
  { id: 'office', label: 'Office' },
];

function DialogBody({
  initialValues,
  submitting,
  onConfirm,
  onCancel,
}: Omit<Props, 'visible'>) {
  const [name, setName] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropAddress, setDropAddress] = useState('');
  const [person, setPerson] = useState('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('school');
  const [error, setError] = useState('');

  useEffect(() => {
    setName(initialValues?.name ?? '');
    setPickupAddress(initialValues?.pickupAddress ?? '');
    setDropAddress(initialValues?.dropAddress ?? '');
    setPerson(initialValues?.person ?? '');
    setDeliveryType(normalizeDeliveryType(initialValues?.deliveryType));
    setError('');
  }, [initialValues]);

  const handleReady = () => {
    const trimmedName = name.trim();
    const pickup = pickupAddress.trim();
    const drop = dropAddress.trim();
    const trimmedPerson = person.trim();

    if (!trimmedName) {
      setError('Enter your name');
      return;
    }
    if (!pickup) {
      setError('Enter pickup address');
      return;
    }
    if (!drop) {
      setError('Enter drop address');
      return;
    }
    if (!trimmedPerson) {
      setError(`Enter ${getPersonLabel(deliveryType).toLowerCase()}`);
      return;
    }

    setError('');
    onConfirm({
      name: trimmedName,
      pickupAddress: pickup,
      dropAddress: drop,
      person: trimmedPerson,
      deliveryType,
    });
  };

  return (
    <View style={styles.backdrop}>
      <Pressable style={styles.backdropTap} onPress={onCancel} accessibilityLabel="Close dialog" />
      <View style={styles.card}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.fieldLabel}>Pickup Address</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={pickupAddress}
            onChangeText={setPickupAddress}
            placeholder="Home pickup address"
            placeholderTextColor={colors.muted}
            multiline
          />

          <Text style={styles.fieldLabel}>Drop Address</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={dropAddress}
            onChangeText={setDropAddress}
            placeholder="School, college or office address"
            placeholderTextColor={colors.muted}
            multiline
          />

          <Text style={styles.fieldLabel}>Person</Text>
          <TextInput
            style={styles.input}
            value={person}
            onChangeText={setPerson}
            placeholder={getPersonLabel(deliveryType)}
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.fieldLabel}>Where</Text>
          <View style={styles.typeRow}>
            {WHERE_OPTIONS.map((option) => {
              const active = deliveryType === option.id;
              return (
                <Pressable
                  key={option.id}
                  style={[styles.typeChip, active && styles.typeChipActive]}
                  onPress={() => setDeliveryType(option.id)}
                >
                  <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title={submitting ? 'Sending...' : 'Ready'}
            variant="green"
            onPress={handleReady}
            style={{ marginTop: spacing.sm }}
          />
          <Button title="Cancel" variant="outline" onPress={onCancel} style={{ marginTop: 10 }} />
        </ScrollView>
      </View>
    </View>
  );
}

export function FoodReadyDialog({ visible, ...props }: Props) {
  if (!visible) {
    return null;
  }

  const body = <DialogBody {...props} />;

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const { createPortal } = require('react-dom') as { createPortal: (children: ReactNode, container: Element) => React.ReactPortal };
    return createPortal(body, document.body);
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={props.onCancel} statusBarTranslucent>
      {body}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    ...(Platform.OS === 'web'
      ? ({
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          minHeight: '100vh',
          zIndex: 99999,
        } as object)
      : {}),
  },
  backdropTap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    maxHeight: '90%',
    zIndex: 1,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 12px 40px rgba(15, 23, 42, 0.25)',
        } as object)
      : {}),
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  typeChipActive: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeLight,
  },
  typeChipText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  typeChipTextActive: { color: colors.orange },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.md,
    backgroundColor: colors.white,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  error: { color: colors.red, fontSize: 13, marginBottom: 8 },
});
