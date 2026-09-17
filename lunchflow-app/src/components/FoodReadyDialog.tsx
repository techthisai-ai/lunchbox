import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useDelivery } from '../context/DeliveryContext';
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
  hasSentPickupRequest,
  normalizeDeliveryType,
} from '../types/delivery';
import { normalizeFoodReadyDetails } from '../services/foodReadyDefaultsService';
import {
  FoodReadyDeliveryQuota,
  getFoodReadyDeliveryQuota,
} from '../services/subscriptionService';
import { Button } from './Button';

type Props = {
  visible: boolean;
  initialValues?: Partial<FoodReadyDetails>;
  startInReviewMode?: boolean;
  submitting?: boolean;
  allowUpdate?: boolean;
  onConfirm: (details: FoodReadyDetails) => void | Promise<void>;
  onCancel: () => void;
};

const WHERE_OPTIONS: { id: DeliveryType; label: string }[] = [
  { id: 'school', label: 'School' },
  { id: 'college', label: 'College' },
  { id: 'office', label: 'Office' },
];

function personSectionLabel(students: FoodReadyStudentEntry[]): string {
  const types = new Set(students.map((entry) => entry.deliveryType));
  if (types.size > 1) return 'Students & Employees';
  if (types.has('office')) return 'Employees';
  return 'Students';
}

function uniqueDeliveryTypes(students: FoodReadyStudentEntry[]): DeliveryType[] {
  return [...new Set(students.map((entry) => normalizeDeliveryType(entry.deliveryType)))];
}

function countByType(students: FoodReadyStudentEntry[], type: DeliveryType): number {
  return students.filter((entry) => entry.deliveryType === type).length;
}

function entryCardTitle(entry: FoodReadyStudentEntry, index: number, allStudents: FoodReadyStudentEntry[]): string {
  const typeLabel = getDeliveryTypeLabel(entry.deliveryType);
  const role = entry.deliveryType === 'office' ? 'Employee' : 'Student';
  const sameTypeCount = allStudents.filter((row) => row.deliveryType === entry.deliveryType).length;
  const sameTypeIndex =
    allStudents.slice(0, index + 1).filter((row) => row.deliveryType === entry.deliveryType).length;
  const suffix = sameTypeCount > 1 ? ` ${sameTypeIndex}` : '';
  return `${role}${suffix} · ${typeLabel}`;
}

function reviewStudentTitle(entry: FoodReadyStudentEntry, index: number, allStudents: FoodReadyStudentEntry[]): string {
  return entryCardTitle(entry, index, allStudents).replace(' · ', ' - ');
}

function ReviewInfoCard({
  name,
  pickupAddress,
  whereLabel,
}: {
  name: string;
  pickupAddress: string;
  whereLabel: string;
}) {
  return (
    <View style={styles.reviewInfoCard}>
      <View style={styles.reviewInfoRow}>
        <Text style={styles.reviewInfoLabel}>Name</Text>
        <Text style={styles.reviewInfoValue} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <View style={styles.reviewInfoDivider} />
      <View style={styles.reviewInfoRow}>
        <Text style={styles.reviewInfoLabel}>Pickup</Text>
        <Text style={styles.reviewInfoValue} numberOfLines={2}>
          {pickupAddress}
        </Text>
      </View>
      <View style={styles.reviewInfoDivider} />
      <View style={styles.reviewInfoRow}>
        <Text style={styles.reviewInfoLabel}>Delivery Location</Text>
        <Text style={styles.reviewInfoValue} numberOfLines={1}>
          {whereLabel}
        </Text>
      </View>
    </View>
  );
}

function ReviewStudentCard({
  student,
  index,
  allStudents,
}: {
  student: FoodReadyStudentEntry;
  index: number;
  allStudents: FoodReadyStudentEntry[];
}) {
  return (
    <View style={styles.reviewStudentCard}>
      <Text style={styles.reviewStudentTitle}>{reviewStudentTitle(student, index, allStudents)}</Text>
      <Text style={styles.reviewMeta} numberOfLines={1}>
        {getPersonLabel(student.deliveryType)}: {student.name.trim()}
      </Text>
      <Text style={styles.reviewMeta} numberOfLines={2}>
        Drop: {student.dropLocation.trim()}
      </Text>
      <Text style={styles.reviewMeta} numberOfLines={2}>
        {getDetailLabel(student.deliveryType)}: {student.classSection.trim()}
      </Text>
    </View>
  );
}

function ReviewActionButton({
  title,
  icon,
  onPress,
  variant,
  compact,
  disabled,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant: 'primary' | 'outlineGreen' | 'outlineRed';
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.reviewActionBtn,
        compact && styles.reviewActionBtnCompact,
        variant === 'primary' && styles.reviewActionPrimary,
        variant === 'outlineGreen' && styles.reviewActionOutlineGreen,
        variant === 'outlineRed' && styles.reviewActionOutlineRed,
        disabled && styles.reviewActionDisabled,
        pressed && !disabled && styles.reviewActionPressed,
      ]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={variant === 'primary' ? colors.onPrimary : variant === 'outlineRed' ? colors.red : colors.green}
      />
      <Text
        style={[
          styles.reviewActionText,
          variant === 'outlineGreen' && styles.reviewActionTextGreen,
          variant === 'outlineRed' && styles.reviewActionTextRed,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function DialogBody({
  initialValues,
  startInReviewMode = false,
  submitting,
  allowUpdate = false,
  onConfirm,
  onCancel,
}: Omit<Props, 'visible'>) {
  const { user } = useAuth();
  const { order } = useDelivery();
  const [mode, setMode] = useState<'review' | 'edit'>(startInReviewMode ? 'review' : 'edit');
  const [name, setName] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [students, setStudents] = useState<FoodReadyStudentEntry[]>([]);
  const [error, setError] = useState('');
  const [quota, setQuota] = useState<FoodReadyDeliveryQuota>({
    maxPeople: 1,
    allowAddPeople: false,
    isSingleOrder: true,
    planLabel: 'Loading…',
    sameDropSeats: 0,
    diffDropSeats: 0,
  });
  const alreadySent = hasSentPickupRequest(order) && !allowUpdate;

  const blockIfAlreadySent = () => {
    if (!alreadySent) return false;
    Alert.alert(
      'Pickup request already sent',
      'You already sent a pickup request. Please wait for a rider to accept.',
    );
    onCancel();
    return true;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.phone) return;
      const nextQuota = await getFoodReadyDeliveryQuota(user.phone);
      if (!cancelled) setQuota(nextQuota);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.phone]);

  useEffect(() => {
    setName(initialValues?.name ?? '');
    setPickupAddress(initialValues?.pickupAddress ?? '');
    const nextStudents = buildFoodReadyStudents(initialValues);
    setStudents(nextStudents);
    setMode(startInReviewMode ? 'review' : 'edit');
    setError('');
  }, [initialValues, startInReviewMode]);

  const buildConfirmedDetails = async (): Promise<FoodReadyDetails | null> => {
    const trimmedName = name.trim();
    const pickup = pickupAddress.trim();
    const filledStudents = students
      .map((entry) => ({
        name: entry.name.trim(),
        dropLocation: entry.dropLocation.trim(),
        classSection: entry.classSection.trim(),
        deliveryType: normalizeDeliveryType(entry.deliveryType),
      }))
      .filter((entry) => entry.name || entry.dropLocation || entry.classSection);

    if (!trimmedName) {
      setError('Enter your name');
      return null;
    }
    if (!pickup) {
      setError('Enter pickup address');
      return null;
    }
    if (filledStudents.length === 0) {
      setError('Add at least one student or employee');
      return null;
    }

    const deliveryTypes = uniqueDeliveryTypes(filledStudents);

    for (let index = 0; index < filledStudents.length; index += 1) {
      const entry = filledStudents[index];
      const label = filledStudents.length > 1 ? ` ${index + 1}` : '';
      if (!entry.name) {
        setError(`Enter ${getPersonLabel(entry.deliveryType).toLowerCase()}${label}`);
        return null;
      }
      if (!entry.dropLocation) {
        setError(`Enter drop location for person${label}`);
        return null;
      }
      if (!entry.classSection) {
        setError(`Enter ${getDetailLabel(entry.deliveryType).toLowerCase()} for person${label}`);
        return null;
      }
    }

    const legacy = foodReadyStudentsToLegacy(filledStudents);
    return {
      name: trimmedName,
      pickupAddress: pickup,
      dropAddress: legacy.dropAddress,
      person: legacy.person,
      persons: legacy.persons,
      students: filledStudents,
      deliveryType: filledStudents[0]?.deliveryType ?? deliveryTypes[0] ?? 'school',
      deliveryTypes,
    };
  };

  const handleReady = async () => {
    if (blockIfAlreadySent() || submitting) return;
    const details = await buildConfirmedDetails();
    if (!details) return;
    setError('');
    await onConfirm(details);
  };

  const handleReviewConfirm = async () => {
    if (blockIfAlreadySent() || submitting) return;
    const reviewDeliveryTypes = uniqueDeliveryTypes(students);
    const details = normalizeFoodReadyDetails({
      name,
      pickupAddress,
      deliveryType: reviewDeliveryTypes[0] ?? students[0]?.deliveryType ?? 'school',
      deliveryTypes: reviewDeliveryTypes,
      students: students,
    });
    if (!details) {
      setMode('edit');
      setError('Saved details are incomplete. Please update them.');
      return;
    }
    setError('');
    await onConfirm(details);
  };

  const reviewStudents = buildFoodReadyStudents({
    name,
    pickupAddress,
    deliveryType: students[0]?.deliveryType ?? 'school',
    deliveryTypes: uniqueDeliveryTypes(students),
    students,
  }).filter((entry) => entry.name.trim() || entry.dropLocation.trim() || entry.classSection.trim());

  const reviewWhereLabel = uniqueDeliveryTypes(reviewStudents)
    .map((type) => getDeliveryTypeLabel(type))
    .join(' · ');

  if (mode === 'review') {
    return (
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onCancel} accessibilityLabel="Close dialog" />
        <View style={styles.reviewCard}>
          <ScrollView
            style={styles.reviewScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.reviewBody}
          >
            <ReviewInfoCard
              name={name.trim()}
              pickupAddress={pickupAddress.trim()}
              whereLabel={reviewWhereLabel || '—'}
            />

            {reviewStudents.map((student, index) => (
              <ReviewStudentCard
                key={`review-${index}`}
                student={student}
                index={index}
                allStudents={reviewStudents}
              />
            ))}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <ReviewActionButton
              title={alreadySent ? 'Already sent' : submitting ? 'Sending...' : 'Food Ready'}
              icon="checkmark-circle"
              onPress={handleReviewConfirm}
              variant="primary"
              disabled={alreadySent || submitting}
            />
            <View style={styles.reviewActionRow}>
              <ReviewActionButton
                title="Switch"
                icon="swap-horizontal"
                onPress={() => {
                  setError('');
                  setMode('edit');
                }}
                variant="outlineGreen"
                compact
              />
              <ReviewActionButton title="Cancel" icon="close-circle" onPress={onCancel} variant="outlineRed" compact />
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

  const handleAddStudent = (type: DeliveryType) => {
    if (students.length >= 10) {
      setError('You can add up to 10 people in one booking.');
      return;
    }
    setError('');
    setStudents((current) => [...current, emptyFoodReadyStudent(type)]);
  };

  const handleRemoveStudent = (index: number) => {
    setStudents((current) => current.filter((_, i) => i !== index));
  };

  const needsMoreSeats = students.length > quota.maxPeople;

  const handleStudentFieldChange = (
    index: number,
    field: keyof FoodReadyStudentEntry,
    value: string | DeliveryType,
  ) => {
    setStudents((current) =>
      current.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)),
    );
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

          <Text style={styles.fieldLabel}>Delivery Location</Text>
          <Text style={styles.sectionHint}>
            Tap School, College, or Office to add each person. Tap the same option again for another.
          </Text>
          <View style={styles.typeRow}>
            {WHERE_OPTIONS.map((option) => {
              const addedCount = countByType(students, option.id);
              return (
                <Pressable
                  key={option.id}
                  style={[styles.typeChip, addedCount > 0 && styles.typeChipActive]}
                  onPress={() => handleAddStudent(option.id)}
                >
                  <Text style={[styles.typeChipText, addedCount > 0 && styles.typeChipTextActive]}>
                    {option.label}
                    {addedCount > 0 ? ` (${addedCount})` : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {students.length > 0 ? (
            <Text style={[styles.fieldLabel, styles.personListLabel]}>{personSectionLabel(students)}</Text>
          ) : null}

          {students.length === 0 ? (
            <Text style={styles.emptyPersonHint}>No one added yet. Tap School, College, or Office above.</Text>
          ) : null}

          {students.map((student, index) => {
            const entryType = normalizeDeliveryType(student.deliveryType);
            return (
              <View key={`student-${index}`} style={styles.studentCard}>
                <View style={styles.studentCardHeader}>
                  <Text style={styles.studentCardTitle}>{entryCardTitle(student, index, students)}</Text>
                  <Pressable
                    style={styles.removeBtn}
                    onPress={() => handleRemoveStudent(index)}
                    accessibilityLabel="Remove person"
                  >
                    <Ionicons name="close-circle" size={22} color={colors.muted} />
                  </Pressable>
                </View>

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

          {needsMoreSeats ? (
            <Text style={styles.quotaHint}>
              {quota.isSingleOrder
                ? `You have ${students.length} ${students.length === 1 ? 'person' : 'people'} · Plan covers ${quota.maxPeople}. Tap Ready to pay ₹29 for each extra person.`
                : `You have ${students.length} people · Plan covers ${quota.maxPeople} today. Tap Ready to buy add-ons (₹149/month same location · ₹249/month different location).`}
            </Text>
          ) : students.length > 0 ? (
            <Text style={styles.quotaHint}>
              {quota.isSingleOrder
                ? `Single delivery: ${students.length}/${quota.maxPeople} ${quota.maxPeople === 1 ? 'person' : 'people'}`
                : `Seats today: ${students.length}/${quota.maxPeople}`}
            </Text>
          ) : null}

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
  sectionHint: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    lineHeight: 17,
    marginBottom: spacing.sm,
    marginTop: -2,
  },
  personListLabel: {
    marginTop: spacing.sm,
  },
  emptyPersonHint: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    textAlign: 'center',
  },
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
  quotaHint: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 4,
  },
  error: { color: colors.red, fontSize: 13, marginBottom: 8 },
  reviewCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.white,
    borderRadius: 20,
    maxHeight: '90%',
    overflow: 'hidden',
    zIndex: 1,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 12px 40px rgba(15, 23, 42, 0.25)',
        } as object)
      : {}),
  },
  reviewScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  reviewBody: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  reviewInfoCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginBottom: spacing.sm,
    backgroundColor: colors.bg,
  },
  reviewInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 5,
  },
  reviewInfoDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
  reviewInfoLabel: {
    width: 52,
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    paddingTop: 1,
  },
  reviewInfoValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 16,
  },
  reviewStudentCard: {
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    marginBottom: 6,
    backgroundColor: colors.greenLight,
  },
  reviewStudentTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.green,
    marginBottom: 4,
  },
  reviewMeta: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '600',
    lineHeight: 15,
    marginBottom: 2,
  },
  reviewActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  reviewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginTop: 6,
  },
  reviewActionBtnCompact: {
    flex: 1,
    marginTop: 0,
    paddingVertical: 10,
  },
  reviewActionPrimary: {
    backgroundColor: colors.green,
    marginTop: 4,
  },
  reviewActionOutlineGreen: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.green,
  },
  reviewActionOutlineRed: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.red,
  },
  reviewActionPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  reviewActionDisabled: { opacity: 0.45 },
  reviewActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  reviewActionTextGreen: {
    color: colors.green,
  },
  reviewActionTextRed: {
    color: colors.red,
  },
});
