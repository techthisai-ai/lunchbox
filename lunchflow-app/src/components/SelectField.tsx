import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow } from '../constants/theme';

export type SelectOption<T extends string> = {
  id: T;
  label: string;
};

type Anchor = {
  top: number;
  left: number;
  width: number;
};

type Props<T extends string> = {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
};

export function SelectField<T extends string>({ label, value, options, onChange, placeholder = 'Select an option' }: Props<T>) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor>({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<View>(null);
  const selected = options.find((option) => option.id === value);

  const openMenu = () => {
    triggerRef.current?.measureInWindow((left, top, width, height) => {
      setAnchor({
        left,
        top: top + height + 4,
        width,
      });
      setOpen(true);
    });
  };

  const closeMenu = () => setOpen(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View ref={triggerRef}>
        <Pressable style={styles.trigger} onPress={openMenu} accessibilityRole="button">
          <Text style={[styles.triggerText, !selected && styles.placeholder]} numberOfLines={1}>
            {selected?.label ?? placeholder}
          </Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={closeMenu}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={closeMenu} />
          <View style={[styles.menu, { top: anchor.top, left: anchor.left, width: anchor.width }]}>
            {options.map((option) => {
              const active = option.id === value;
              return (
                <Pressable
                  key={option.id}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => {
                    onChange(option.id);
                    closeMenu();
                  }}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]} numberOfLines={1}>
                    {option.label}
                  </Text>
                  {active ? <Ionicons name="checkmark" size={16} color={colors.orange} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, color: colors.text },
  trigger: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  triggerText: { fontSize: 15, color: colors.text, flex: 1 },
  placeholder: { color: colors.muted },
  modalRoot: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
  },
  menu: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 4,
    maxHeight: 240,
    ...shadow.elevated,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  optionActive: { backgroundColor: colors.orangeLight },
  optionText: { fontSize: 14, color: colors.text, flex: 1 },
  optionTextActive: { fontWeight: '700', color: colors.orange },
});
