import { Ionicons } from '@expo/vector-icons';

import { useEffect, useState } from 'react';

import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { createPickupAreaId, formatTime12Hour, savePickupAreaSlot } from '../../services/pickupAreaSlotService';

import { PickupAreaSlot } from '../../types/pickupAreaSlot';

import {

  DayPeriod,

  isValid12HourClock,

  splitTime24Hour,

  toTime24Hour,

} from '../../utils/pickupTimeInput';

import { Button } from '../Button';

import { Input } from '../Input';

import { SelectField } from '../SelectField';

import { colors, radius, spacing } from '../../constants/theme';



const PERIOD_OPTIONS: { id: DayPeriod; label: string }[] = [

  { id: 'AM', label: 'AM' },

  { id: 'PM', label: 'PM' },

];



function parseKeywords(value: string): string[] {

  return value

    .split(',')

    .map((entry) => entry.trim())

    .filter(Boolean);

}



type Props = {

  visible: boolean;

  areas: PickupAreaSlot[];

  editArea?: PickupAreaSlot | null;

  onClose: () => void;

  onSaved: () => void;

};



export function AdminAddPickupAreaModal({ visible, areas, editArea, onClose, onSaved }: Props) {

  const isEditing = Boolean(editArea);

  const [areaName, setAreaName] = useState('');

  const [startClock, setStartClock] = useState('');

  const [startPeriod, setStartPeriod] = useState<DayPeriod>('AM');

  const [endClock, setEndClock] = useState('');

  const [endPeriod, setEndPeriod] = useState<DayPeriod>('PM');

  const [keywords, setKeywords] = useState('');

  const [error, setError] = useState('');

  const [saving, setSaving] = useState(false);



  useEffect(() => {

    if (!visible) {

      setAreaName('');

      setStartClock('');

      setStartPeriod('AM');

      setEndClock('');

      setEndPeriod('PM');

      setKeywords('');

      setError('');

      setSaving(false);

      return;

    }



    if (editArea) {

      const start = splitTime24Hour(editArea.bookingStartTime);

      const end = splitTime24Hour(editArea.bookingEndTime);

      setAreaName(editArea.areaName);

      setStartClock(start.clock);

      setStartPeriod(start.period);

      setEndClock(end.clock);

      setEndPeriod(end.period);

      setKeywords((editArea.matchKeywords ?? []).join(', '));

      setError('');

      setSaving(false);

    }

  }, [visible, editArea]);



  const handleClose = () => {

    if (saving) return;

    onClose();

  };



  const handleSubmit = async () => {

    if (saving) return;

    setError('');



    const name = areaName.trim();



    if (!name) {

      setError('Enter an area name');

      return;

    }

    if (!isValid12HourClock(startClock)) {

      setError('Enter start time like 1:00 or 10:30');

      return;

    }

    if (!isValid12HourClock(endClock)) {

      setError('Enter end time like 2:00 or 11:45');

      return;

    }



    const bookingStartTime = toTime24Hour(startClock, startPeriod);

    const bookingEndTime = toTime24Hour(endClock, endPeriod);

    if (!bookingStartTime || !bookingEndTime) {

      setError('Enter valid booking times');

      return;

    }



    setSaving(true);

    try {

      if (editArea) {

        await savePickupAreaSlot({

          id: editArea.id,

          areaName: name,

          bookingStartTime,

          bookingEndTime,

          matchKeywords: parseKeywords(keywords),

          active: editArea.active,

          sortOrder: editArea.sortOrder,

          createdAt: editArea.createdAt,

        });

      } else {

        const baseId = createPickupAreaId(name);

        const id = areas.some((area) => area.id === baseId) ? `${baseId}-${Date.now()}` : baseId;

        await savePickupAreaSlot({

          id,

          areaName: name,

          bookingStartTime,

          bookingEndTime,

          matchKeywords: parseKeywords(keywords),

          active: true,

          sortOrder: areas.length,

        });

      }

      onSaved();

      onClose();

    } catch (error) {

      setError(error instanceof Error ? error.message : 'Could not save pickup area');

    } finally {

      setSaving(false);

    }

  };



  return (

    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>

      <View style={styles.overlay}>

        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View style={styles.dialog}>

          <View style={styles.header}>

            <View>

              <Text style={styles.title}>{isEditing ? 'Edit Pickup Area' : 'Add Pickup Area'}</Text>

              <Text style={styles.subtitle}>

                {isEditing

                  ? 'Update booking window and address keywords for this area.'

                  : 'Set booking window and address keywords for this area.'}

              </Text>

            </View>

            <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={8}>

              <Ionicons name="close" size={20} color={colors.muted} />

            </Pressable>

          </View>



          <ScrollView style={styles.formScroll} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">

            <Input label="Area Name" value={areaName} onChangeText={setAreaName} placeholder="Anna Nagar" />

            <Text style={styles.timeHint}>Use 12-hour time with AM/PM (example: 1:00 PM, not 13:00).</Text>

            <View style={styles.timeRow}>

              <View style={styles.timeField}>

                <Input label="Start Time" value={startClock} onChangeText={setStartClock} placeholder="10:00" />

              </View>

              <View style={styles.periodField}>

                <SelectField label=" " value={startPeriod} options={PERIOD_OPTIONS} onChange={setStartPeriod} />

              </View>

            </View>

            <View style={styles.timeRow}>

              <View style={styles.timeField}>

                <Input label="End Time" value={endClock} onChangeText={setEndClock} placeholder="11:45" />

              </View>

              <View style={styles.periodField}>

                <SelectField label=" " value={endPeriod} options={PERIOD_OPTIONS} onChange={setEndPeriod} />

              </View>

            </View>

            {startClock && endClock && isValid12HourClock(startClock) && isValid12HourClock(endClock) ? (

              <Text style={styles.preview}>

                Customer window: {formatTime12Hour(toTime24Hour(startClock, startPeriod) ?? '')} –{' '}

                {formatTime12Hour(toTime24Hour(endClock, endPeriod) ?? '')}

              </Text>

            ) : null}

            <Input

              label="Match Keywords (comma separated)"

              value={keywords}

              onChangeText={setKeywords}

              placeholder="anna nagar, anna nagar east"

            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

          </ScrollView>



          <View style={styles.actions}>

            <Pressable style={styles.cancelBtn} onPress={handleClose}>

              <Text style={styles.cancelText}>Cancel</Text>

            </Pressable>

            <Button

              title={saving ? (isEditing ? 'Saving…' : 'Adding…') : isEditing ? 'Save Changes' : 'Add Area'}

              onPress={handleSubmit}

              style={styles.saveBtn}

            />

          </View>

        </View>

      </View>

    </Modal>

  );

}



const styles = StyleSheet.create({

  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },

  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(58, 41, 66, 0.45)' },

  dialog: {

    width: '100%',

    maxWidth: 420,

    backgroundColor: colors.white,

    borderRadius: radius.md,

    borderWidth: 1,

    borderColor: colors.border,

    overflow: 'hidden',

  },

  header: {

    flexDirection: 'row',

    alignItems: 'flex-start',

    justifyContent: 'space-between',

    gap: 12,

    paddingHorizontal: spacing.lg,

    paddingTop: spacing.lg,

    paddingBottom: spacing.md,

    borderBottomWidth: 1,

    borderBottomColor: colors.border,

  },

  title: { fontSize: 20, fontWeight: '800', color: colors.text },

  subtitle: { fontSize: 13, color: colors.muted, marginTop: 4, fontWeight: '600', lineHeight: 18 },

  closeBtn: {

    width: 32,

    height: 32,

    borderRadius: 8,

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: colors.bg,

  },

  formScroll: { flexGrow: 0 },

  form: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },

  timeHint: { fontSize: 12, color: colors.muted, fontWeight: '600', lineHeight: 17 },

  timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },

  timeField: { flex: 1 },

  periodField: { width: 96 },

  preview: { fontSize: 12, color: colors.secondary, fontWeight: '700' },

  error: { color: colors.red, fontSize: 13, fontWeight: '600' },

  actions: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'flex-end',

    gap: 10,

    paddingHorizontal: spacing.lg,

    paddingVertical: spacing.md,

    borderTopWidth: 1,

    borderTopColor: colors.border,

  },

  cancelBtn: {

    paddingHorizontal: 16,

    height: 44,

    alignItems: 'center',

    justifyContent: 'center',

    borderRadius: radius.sm,

    borderWidth: 1,

    borderColor: colors.border,

    backgroundColor: colors.white,

  },

  cancelText: { fontSize: 14, fontWeight: '700', color: colors.text },

  saveBtn: { minWidth: 120 },

});

