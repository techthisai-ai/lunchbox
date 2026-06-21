import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow } from '../../constants/theme';

export type FilterOption<T extends string> = {
  id: T;
  label: string;
};

type Anchor = {
  top: number;
  left: number;
  width: number;
};

type Props<T extends string> = {
  value: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
  minWidth?: number;
};

export function AdminFilterSelect<T extends string>({ value, options, onChange, minWidth = 140 }: Props<T>) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor>({ top: 0, left: 0, width: minWidth });
  const triggerRef = useRef<View>(null);
  const selected = options.find((option) => option.id === value);

  const openMenu = () => {
    triggerRef.current?.measureInWindow((left, top, width, height) => {
      setAnchor({
        left,
        top: top + height + 4,
        width: Math.max(width, minWidth),
      });
      setOpen(true);
    });
  };

  const closeMenu = () => setOpen(false);

  return (
    <View ref={triggerRef} style={[styles.wrap, { minWidth }]}>
      <Pressable style={styles.trigger} onPress={openMenu}>
        <Text style={styles.triggerText} numberOfLines={1}>
          {selected?.label ?? 'Select'}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.muted} />
      </Pressable>

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
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>{option.label}</Text>
                  {active ? <Ionicons name="checkmark" size={14} color={colors.orange} /> : null}
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
  wrap: {
    flex: 1,
    flexShrink: 0,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    height: 40,
    width: '100%',
  },
  triggerText: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '600' },
  modalRoot: {
    flex: 1,
  },
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
    maxHeight: 260,
    ...shadow.elevated,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  optionActive: { backgroundColor: colors.orangeLight },
  optionText: { fontSize: 13, color: colors.text, fontWeight: '600' },
  optionTextActive: { color: colors.orange, fontWeight: '700' },
});
