import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  fullWidth?: boolean;
  flex?: boolean;
  label?: string;
  leadingIcon?: keyof typeof Ionicons.glyphMap;
};

export function AdminFilterSelect<T extends string>({
  value,
  options,
  onChange,
  minWidth = 140,
  fullWidth,
  flex,
  label,
  leadingIcon,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor>({ top: 0, left: 0, width: minWidth });
  const triggerRef = useRef<View>(null);
  const layoutRef = useRef({ pageX: 0, pageY: 0, width: minWidth, height: 44 });
  const selected = options.find((option) => option.id === value);

  const openMenu = () => {
    const applyAnchor = (left: number, top: number, width: number, height: number) => {
      setAnchor({
        left: Math.max(8, left),
        top: top + height + 4,
        width: Math.max(width, minWidth),
      });
      setOpen(true);
    };

    if (triggerRef.current?.measureInWindow) {
      triggerRef.current.measureInWindow((left, top, width, height) => {
        if (width > 0 && height > 0) {
          applyAnchor(left, top, width, height);
          return;
        }
        applyAnchor(layoutRef.current.pageX, layoutRef.current.pageY, layoutRef.current.width, layoutRef.current.height);
      });
      return;
    }

    applyAnchor(layoutRef.current.pageX, layoutRef.current.pageY, layoutRef.current.width, layoutRef.current.height);
  };

  const closeMenu = () => setOpen(false);

  return (
    <View style={fullWidth ? styles.labeledWrap : flex ? styles.labeledFlex : undefined}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View
        ref={triggerRef}
        style={[styles.wrap, fullWidth ? styles.wrapFull : flex ? styles.wrapFlex : { minWidth }]}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          layoutRef.current.width = width;
          layoutRef.current.height = height;
          triggerRef.current?.measureInWindow((left, top) => {
            layoutRef.current.pageX = left;
            layoutRef.current.pageY = top;
          });
        }}
      >
        <Pressable
          style={styles.trigger}
          onPress={openMenu}
          accessibilityRole="button"
          accessibilityLabel={label ?? selected?.label ?? 'Select filter'}
        >
          {leadingIcon ? <Ionicons name={leadingIcon} size={14} color={colors.muted} /> : null}
          <Text style={styles.triggerText} numberOfLines={1}>
            {selected?.label ?? 'Select'}
          </Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.muted} />
        </Pressable>

        <Modal visible={open} transparent animationType="fade" onRequestClose={closeMenu}>
          <View style={styles.modalRoot}>
            <Pressable style={styles.backdrop} onPress={closeMenu} />
            <View
              style={[
                styles.menu,
                Platform.OS === 'web' && anchor.top <= 0 ? styles.menuCentered : null,
                { top: anchor.top, left: anchor.left, width: anchor.width },
              ]}
            >
              <ScrollView style={styles.menuScroll} keyboardShouldPersistTaps="handled">
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
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labeledWrap: {
    width: '100%',
    gap: 4,
  },
  labeledFlex: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  wrap: {
    flex: 1,
    flexShrink: 0,
    minWidth: 110,
  },
  wrapFull: {
    width: '100%',
    flex: 0,
    minWidth: 0,
  },
  wrapFlex: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    height: 44,
    width: '100%',
  },
  triggerText: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '600' },
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(45, 45, 68, 0.2)',
  },
  menu: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 4,
    maxHeight: 280,
    zIndex: 1000,
    ...shadow.elevated,
  },
  menuCentered: {
    top: '30%',
    left: '50%',
    transform: [{ translateX: -120 }],
    width: 240,
  },
  menuScroll: {
    maxHeight: 272,
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
