import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';
import {
  DeliveryType,
  FoodReadyDetails,
  FoodReadyStudentEntry,
  buildFoodReadyStudents,
  emptyFoodReadyStudent,
  foodReadyStudentsToLegacy,
  getDeliveryTypeLabel,
  getDetailLabel,
  getPersonLabel,
  normalizeDeliveryType,
  normalizeDeliveryTypes,
} from '../types/delivery';
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

function personSectionLabel(types: DeliveryType[]): string {
  if (types.length > 1) return 'Students & Employees';
  if (types[0] === 'office') return 'Employees';
  return 'Students';
}

function personAddLabel(types: DeliveryType[]): string {
  if (types.length > 1) return 'Add Person';
  if (types[0] === 'office') return 'Add Employee';
  return 'Add Student';
}

function entryCardTitle(entry: FoodReadyStudentEntry, index: number, total: number): string {
  const typeLabel = getDeliveryTypeLabel(entry.deliveryType);
  const suffix = total > 1 ? ` ${index + 1}` : '';
  if (entry.deliveryType === 'office') return `Employee${suffix} · ${typeLabel}`;
  return `Student${suffix} · ${typeLabel}`;
}

function DialogBody({
  initialValues,
  submitting,
  onConfirm,
  onCancel,
}: Omit<Props, 'visible'>) {
  const [name, setName] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [students, setStudents] = useState<FoodReadyStudentEntry[]>([emptyFoodReadyStudent()]);
  const [selectedWhere, setSelectedWhere] = useState<DeliveryType[]>(['school']);
  const [error, setError] = useState('');

  useEffect(() => {
    const where = normalizeDeliveryTypes(
      initialValues?.deliveryTypes ?? initialValues?.students?.map((entry) => entry.deliveryType),
      normalizeDeliveryType(initialValues?.deliveryType),
    );
    setName(initialValues?.name ?? '');
    setPickupAddress(initialValues?.pickupAddress ?? '');
    setSelectedWhere(where);
    setStudents(buildFoodReadyStudents(initialValues));
    setError('');
  }, [initialValues]);

  const handleToggleWhere = (type: DeliveryType) => {
    setSelectedWhere((current) => {
      if (current.includes(type)) {
        if (current.length === 1) return current;
        const next = current.filter((entry) => entry !== type);
        setStudents((rows) =>
          rows.map((row) =>
            row.deliveryType === type ? { ...row, deliveryType: next[0] } : row,
          ),
        );
        return next;
      }
      return [...current, type];
    });
  };

  const handleAddStudent = () => {
    setStudents((current) => [...current, emptyFoodReadyStudent(selectedWhere[0])]);
  };

  const handleRemoveStudent = (index: number) => {
    setStudents((current) => (current.length <= 1 ? current : current.filter((_, i) => i !== index)));
  };

  const handleStudentFieldChange = (
    index: number,
    field: keyof FoodReadyStudentEntry,
    value: string | DeliveryType,
  ) => {
    setStudents((current) =>
      current.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)),
    );
  };

  const handleReady = () => {
    const trimmedName = name.trim();
    const pickup = pickupAddress.trim();
    const filledStudents = students
      .map((entry) => ({
        name: entry.name.trim(),
        dropLocation: entry.dropLocation.trim(),
        classSection: entry.classSection.trim(),
        deliveryType:
          selectedWhere.length === 1
            ? selectedWhere[0]
            : normalizeDeliveryType(entry.deliveryType),
      }))
      .filter((entry) => entry.name || entry.dropLocation || entry.classSection);

    if (!trimmedName) {
      setError('Enter your name');
      return;
    }
    if (!pickup) {
      setError('Enter pickup address');
      return;
    }
    if (selectedWhere.length === 0) {
      setError('Select at least one option under Where');
      return;
    }
    if (filledStudents.length === 0) {
      setError('Add at least one student or employee');
      return;
    }

    for (let index = 0; index < filledStudents.length; index += 1) {
      const entry = filledStudents[index];
      const label = students.length > 1 ? ` ${index + 1}` : '';
      if (!selectedWhere.includes(entry.deliveryType)) {
        setError(`Choose a valid Where type for person${label}`);
        return;
      }
      if (!entry.name) {
        setError(`Enter ${getPersonLabel(entry.deliveryType).toLowerCase()}${label}`);
        return;
      }
      if (!entry.dropLocation) {
        setError(`Enter drop location for person${label}`);
        return;
      }
      if (!entry.classSection) {
        setError(`Enter ${getDetailLabel(entry.deliveryType).toLowerCase()} for person${label}`);
        return;
      }
    }

    const legacy = foodReadyStudentsToLegacy(filledStudents);
    setError('');
    onConfirm({
      name: trimmedName,
      pickupAddress: pickup,
      dropAddress: legacy.dropAddress,
      person: legacy.person,
      persons: legacy.persons,
      students: filledStudents,
      deliveryType: filledStudents[0]?.deliveryType ?? selectedWhere[0],
      deliveryTypes: selectedWhere,
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

          <Text style={styles.fieldLabel}>Where</Text>
          <View style={styles.typeRow}>
            {WHERE_OPTIONS.map((option) => {
              const active = selectedWhere.includes(option.id);
              return (
                <Pressable
                  key={option.id}
                  style={[styles.typeChip, active && styles.typeChipActive]}
                  onPress={() => handleToggleWhere(option.id)}
                >
                  <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>{personSectionLabel(selectedWhere)}</Text>
          {students.map((student, index) => {
            const entryType = normalizeDeliveryType(student.deliveryType);
            return (
              <View key={`student-${index}`} style={styles.studentCard}>
                <View style={styles.studentCardHeader}>
                  <Text style={styles.studentCardTitle}>{entryCardTitle(student, index, students.length)}</Text>
                  {students.length > 1 ? (
                    <Pressable
                      style={styles.removeBtn}
                      onPress={() => handleRemoveStudent(index)}
                      accessibilityLabel="Remove person"
                    >
                      <Ionicons name="close-circle" size={22} color={colors.muted} />
                    </Pressable>
                  ) : null}
                </View>

                {selectedWhere.length > 1 ? (
                  <>
                    <Text style={styles.subLabel}>Type</Text>
                    <View style={styles.typeRowCompact}>
                      {WHERE_OPTIONS.filter((option) => selectedWhere.includes(option.id)).map((option) => {
                        const active = entryType === option.id;
                        return (
                          <Pressable
                            key={option.id}
                            style={[styles.typeChipCompact, active && styles.typeChipActive]}
                            onPress={() => handleStudentFieldChange(index, 'deliveryType', option.id)}
                          >
                            <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                              {option.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                ) : null}

                <Text style={styles.subLabel}>{getPersonLabel(entryType)}</Text>
                <TextInput
                  style={styles.input}
                  value={student.name}
                  onChangeText={(value) => handleStudentFieldChange(index, 'name', value)}
                  placeholder={getPersonLabel(entryType)}
                  placeholderTextColor={colors.muted}
                />

                <Text style={styles.subLabel}>Drop Location</Text>
                <TextInput
                  style={[styles.input, styles.multiline]}
                  value={student.dropLocation}
                  onChangeText={(value) => handleStudentFieldChange(index, 'dropLocation', value)}
                  placeholder={`${getDeliveryTypeLabel(entryType)} drop location`}
                  placeholderTextColor={colors.muted}
                  multiline
                />

                <Text style={styles.subLabel}>{getDetailLabel(entryType)}</Text>
                <TextInput
                  style={styles.input}
                  value={student.classSection}
                  onChangeText={(value) => handleStudentFieldChange(index, 'classSection', value)}
                  placeholder={
                    entryType === 'school'
                      ? 'e.g. Class 5 · Section B'
                      : entryType === 'college'
                        ? 'e.g. B.Tech CSE · 2nd Year'
                        : 'e.g. HR · 3rd Floor'
                  }
                  placeholderTextColor={colors.muted}
                />
              </View>
            );
          })}

          <Pressable style={styles.addStudentBtn} onPress={handleAddStudent}>
            <Ionicons name="add-circle-outline" size={18} color={colors.orange} />
            <Text style={styles.addStudentText}>{personAddLabel(selectedWhere)}</Text>
          </Pressable>

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
  subLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 6,
    marginTop: 2,
  },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  typeRowCompact: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  typeChipCompact: {
    paddingVertical: 8,
    paddingHorizontal: 12,
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
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  multiline: { minHeight: 64, textAlignVertical: 'top' },
  studentCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.bg,
  },
  studentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  studentCardTitle: { fontSize: 13, fontWeight: '800', color: colors.text, flex: 1 },
  removeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addStudentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
    paddingVertical: 4,
  },
  addStudentText: { fontSize: 13, fontWeight: '700', color: colors.orange },
  error: { color: colors.red, fontSize: 13, marginBottom: 8 },
});
