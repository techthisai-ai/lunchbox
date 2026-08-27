import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, radius, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { ProfileStackParamList } from '../navigation/types';
import { goBackInProfileStack } from '../navigation/customerRoutes';
import { fetchCustomerAddressFromGps } from '../services/customerAddressLocationService';
import {
  getCustomerOrderToday,
  loadCustomerProfile,
  updateCustomerDeliveryAddress,
  updateCustomerHomeAddress,
} from '../services/orderHubService';
import {
  DeliveryType,
  FoodReadyStudentEntry,
  buildFoodReadyStudents,
  getDeliveryTypeLabel,
  getDropAddress,
  normalizeDeliveryType,
} from '../types/delivery';

type Props = NativeStackScreenProps<ProfileStackParamList, 'SavedAddresses'>;

type DeliveryAddressCard = {
  key: string;
  index: number;
  title: string;
  address: string;
  detail?: string;
  type: DeliveryType;
};

type EditTarget =
  | { kind: 'home'; address: string }
  | { kind: 'delivery'; index: number; name: string; address: string; detail: string };

function deliveryIcon(type: DeliveryType): {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  backgroundColor: string;
} {
  if (type === 'office') {
    return { name: 'business', color: colors.orange, backgroundColor: colors.orangeLight };
  }
  if (type === 'college') {
    return { name: 'school', color: colors.purple, backgroundColor: colors.purpleLight };
  }
  return { name: 'school', color: colors.blue, backgroundColor: colors.blueLight };
}

function badgeTone(type: DeliveryType): 'orange' | 'blue' | 'gray' {
  if (type === 'office') return 'gray';
  if (type === 'college') return 'blue';
  return 'orange';
}

function buildDeliveryCards(
  students: FoodReadyStudentEntry[],
  fallbackAddress: string,
  fallbackType: DeliveryType,
): DeliveryAddressCard[] {
  const filled = students.filter((entry) => entry.dropLocation.trim() || entry.name.trim());
  if (filled.length) {
    return filled.map((entry, index) => {
      const type = normalizeDeliveryType(entry.deliveryType ?? fallbackType);
      const name = entry.name.trim();
      return {
        key: `delivery-${index}-${name}-${entry.dropLocation}`,
        index,
        title: name || (filled.length > 1 ? `Delivery ${index + 1}` : 'Delivery Location'),
        address: entry.dropLocation.trim(),
        detail: entry.classSection.trim() || undefined,
        type,
      };
    });
  }

  const address = fallbackAddress.trim();
  if (!address) return [];

  return [
    {
      key: 'delivery-fallback',
      index: 0,
      title: 'Delivery Location',
      address,
      type: fallbackType,
    },
  ];
}

export function SavedAddressesScreen({ navigation, route }: Props) {
  const focus = route.params?.focus;
  const showPickup = !focus || focus === 'pickup';
  const showDrop = !focus || focus === 'drop';
  const screenTitle =
    focus === 'pickup' ? 'Pickup Address' : focus === 'drop' ? 'Drop Address' : 'Saved Addresses';
  const { user } = useAuth();
  const [homeAddress, setHomeAddress] = useState('');
  const [deliveryCards, setDeliveryCards] = useState<DeliveryAddressCard[]>([]);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [locatingAddress, setLocatingAddress] = useState(false);
  const gpsFocusAttemptedRef = useRef(false);

  const fillHomeAddressFromGps = async (options: { replaceExisting?: boolean; promptOnFailure?: boolean } = {}) => {
    const replaceExisting = options.replaceExisting ?? false;
    const promptOnFailure = options.promptOnFailure ?? replaceExisting;
    if (locatingAddress) return;
    setLocatingAddress(true);
    setError('');
    try {
      const detected = await fetchCustomerAddressFromGps({ promptOnFailure });
      if (!detected) return;
      setEditTarget((current) => {
        if (!current || current.kind !== 'home') return current;
        if (!replaceExisting && current.address.trim()) return current;
        return { kind: 'home', address: detected };
      });
    } finally {
      setLocatingAddress(false);
    }
  };

  const handleHomeAddressFocus = () => {
    if (editTarget?.kind !== 'home' || gpsFocusAttemptedRef.current || locatingAddress || editTarget.address.trim()) {
      return;
    }
    gpsFocusAttemptedRef.current = true;
    void fillHomeAddressFromGps({ replaceExisting: true, promptOnFailure: true });
  };

  const loadAddresses = useCallback(async () => {
    if (!user?.phone) return;
    const [profile, order] = await Promise.all([
      loadCustomerProfile(user.phone),
      getCustomerOrderToday(user.phone),
    ]);
    setHomeAddress(profile.address || order?.pickupAddress || '');

    const fallbackType = normalizeDeliveryType(order?.deliveryType ?? profile.deliveryType);
    const fallbackAddress = (order ? getDropAddress(order) : '') || profile.school || '';
    const students = buildFoodReadyStudents({
      studentEntries: order?.studentEntries,
      students: order?.studentEntries,
      person: order?.studentName || profile.studentName,
      dropAddress: fallbackAddress,
      deliveryType: fallbackType,
      deliveryTypes: order?.deliveryTypes,
    });

    setDeliveryCards(buildDeliveryCards(students, fallbackAddress, fallbackType));
  }, [user?.phone]);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  const openHomeEdit = () => {
    setError('');
    gpsFocusAttemptedRef.current = false;
    setEditTarget({ kind: 'home', address: homeAddress });
  };

  const openDeliveryEdit = (entry: DeliveryAddressCard) => {
    setError('');
    setEditTarget({
      kind: 'delivery',
      index: entry.index,
      name: entry.title === 'Delivery Location' ? '' : entry.title,
      address: entry.address,
      detail: entry.detail ?? '',
    });
  };

  const handleSave = async () => {
    if (!user?.phone || !editTarget) return;

    setSaving(true);
    setError('');
    try {
      if (editTarget.kind === 'home') {
        await updateCustomerHomeAddress(user.phone, editTarget.address);
      } else {
        await updateCustomerDeliveryAddress(user.phone, editTarget.index, {
          name: editTarget.name,
          dropLocation: editTarget.address,
          classSection: editTarget.detail,
        });
      }
      setEditTarget(null);
      await loadAddresses();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save address');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={screenTitle} onBack={() => goBackInProfileStack(navigation)} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {showPickup ? (
          <>
            {!focus ? <Text style={styles.groupLabel}>Pickup address</Text> : null}
            <Card>
              <View style={styles.row}>
                <View style={styles.iconWrap}>
                  <Ionicons name="home" size={18} color={colors.orange} />
                </View>
                <View style={styles.info}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title}>Home Pickup</Text>
                    <View style={styles.titleActions}>
                      <Badge label="Default" tone="green" />
                      <Pressable style={styles.editBtn} onPress={openHomeEdit} accessibilityLabel="Edit home address">
                        <Ionicons name="create-outline" size={18} color={colors.orange} />
                      </Pressable>
                    </View>
                  </View>
                  <Text style={styles.address}>{homeAddress || 'No home address saved'}</Text>
                </View>
              </View>
            </Card>
          </>
        ) : null}

        {showDrop ? (
          <>
            {!focus ? <Text style={styles.groupLabel}>Drop address</Text> : null}
            {deliveryCards.length ? (
          deliveryCards.map((entry) => {
            const icon = deliveryIcon(entry.type);
            return (
              <Card key={entry.key}>
                <View style={styles.row}>
                  <View style={[styles.iconWrap, { backgroundColor: icon.backgroundColor }]}>
                    <Ionicons name={icon.name} size={18} color={icon.color} />
                  </View>
                  <View style={styles.info}>
                    <View style={styles.titleRow}>
                      <Text style={styles.title}>{entry.title}</Text>
                      <View style={styles.titleActions}>
                        <Badge label={getDeliveryTypeLabel(entry.type)} tone={badgeTone(entry.type)} />
                        <Pressable
                          style={styles.editBtn}
                          onPress={() => openDeliveryEdit(entry)}
                          accessibilityLabel={`Edit ${entry.title} address`}
                        >
                          <Ionicons name="create-outline" size={18} color={colors.orange} />
                        </Pressable>
                      </View>
                    </View>
                    <Text style={styles.address}>{entry.address}</Text>
                    {entry.detail ? <Text style={styles.detail}>{entry.detail}</Text> : null}
                  </View>
                </View>
              </Card>
            );
          })
        ) : (
          <Card>
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: colors.blueLight }]}>
                <Ionicons name="school" size={18} color={colors.blue} />
              </View>
              <View style={styles.info}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>Delivery Location</Text>
                  <Pressable
                    style={styles.editBtn}
                    onPress={() =>
                      setEditTarget({
                        kind: 'delivery',
                        index: 0,
                        name: '',
                        address: '',
                        detail: '',
                      })
                    }
                    accessibilityLabel="Add delivery address"
                  >
                    <Ionicons name="create-outline" size={18} color={colors.orange} />
                  </Pressable>
                </View>
                <Text style={styles.address}>No delivery location saved</Text>
              </View>
            </View>
          </Card>
        )}
          </>
        ) : null}
      </ScrollView>

      <Modal visible={Boolean(editTarget)} transparent animationType="fade" onRequestClose={() => setEditTarget(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setEditTarget(null)}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>
              {editTarget?.kind === 'home' ? 'Edit Home Pickup' : 'Edit Delivery Address'}
            </Text>

            {editTarget?.kind === 'home' ? (
              <>
                <Input
                  label="Home Address"
                  value={editTarget.address}
                  onChangeText={(address) => setEditTarget({ kind: 'home', address })}
                  onFocus={handleHomeAddressFocus}
                  placeholder={locatingAddress ? 'Detecting your location...' : 'Tap to use location or enter your home pickup address'}
                  multiline
                />
                <Pressable
                  style={styles.useLocationBtn}
                  onPress={() => void fillHomeAddressFromGps({ replaceExisting: true, promptOnFailure: true })}
                  disabled={locatingAddress}
                >
                  <Ionicons name="locate-outline" size={16} color={colors.orange} />
                  <Text style={styles.useLocationText}>
                    {locatingAddress ? 'Detecting location...' : 'Use my location'}
                  </Text>
                </Pressable>
              </>
            ) : editTarget?.kind === 'delivery' ? (
              <>
                <Input
                  label="Name"
                  value={editTarget.name}
                  onChangeText={(name) => setEditTarget({ ...editTarget, name })}
                  placeholder="Student or recipient name"
                />
                <Input
                  label="Delivery Address"
                  value={editTarget.address}
                  onChangeText={(address) => setEditTarget({ ...editTarget, address })}
                  placeholder="School, office or apartment address"
                  multiline
                />
                <Input
                  label="Class / Section"
                  value={editTarget.detail}
                  onChangeText={(detail) => setEditTarget({ ...editTarget, detail })}
                  placeholder="Optional class or section"
                />
              </>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button title={saving ? 'Saving...' : 'Save Address'} onPress={handleSave} style={{ marginTop: 8 }} />
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setEditTarget(null)}
              style={{ marginTop: 10 }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: 32, gap: spacing.md },
  groupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: -4,
  },
  row: { flexDirection: 'row', gap: 14 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  titleActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontWeight: '700', fontSize: 14, flex: 1 },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.orangeLight,
  },
  address: { fontSize: 13, color: colors.muted, marginTop: 6, lineHeight: 18 },
  detail: { fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 16 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 8 },
  error: { color: colors.red, fontSize: 13, marginBottom: 8 },
  useLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: -4,
    marginBottom: 8,
    paddingVertical: 4,
  },
  useLocationText: { fontSize: 13, fontWeight: '700', color: colors.orange },
});
