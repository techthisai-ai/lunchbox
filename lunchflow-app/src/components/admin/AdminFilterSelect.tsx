import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow } from '../../constants/theme';
import { useAdminLayout } from '../../hooks/useAdminLayout';

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
  const { isSidebarCollapsed } = useAdminLayout();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor>({ top: 0, left: 0, width: minWidth });
  const [useSheet, setUseSheet] = useState(isSidebarCollapsed);
  const triggerRef = useRef<View>(null);
  const selected = options.find((option) => option.id === value);

  const closeMenu = () => setOpen(false);

  const openMenu = () => {
    if (isSidebarCollapsed) {
      setUseSheet(true);
      setOpen(true);
      return;
    }

    const applyAnchor = (left: number, top: number, width: number, height: number) => {
      const menuWidth = Math.max(width, minWidth);
      const nextTop = top + height + 4;
      const nextLeft = Math.max(8, Math.min(left, windowWidth - menuWidth - 8));

      if (nextTop < 8 || nextTop > windowHeight - 120) {
        setUseSheet(true);
        setOpen(true);
        return;
      }

      setUseSheet(false);
      setAnchor({ left: nextLeft, top: nextTop, width: menuWidth });
      setOpen(true);
    };

    const measure = () => {
      if (!triggerRef.current?.measureInWindow) {
        setUseSheet(true);
        setOpen(true);
        return;
      }

      triggerRef.current.measureInWindow((left, top, width, height) => {
        if (width > 0 && height > 0 && top >= 0) {
          applyAnchor(left, top, width, height);
          return;
        }
        setUseSheet(true);
        setOpen(true);
      });
    };

    if (Platform.OS === 'web') {
      requestAnimationFrame(measure);
      return;
    }

    measure();
  };

  const sheetTitle = label ?? selected?.label ?? 'Select option';

  return (
    <View style={fullWidth ? styles.labeledWrap : flex ? styles.labeledFlex : undefined}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View
        ref={triggerRef}
        collapsable={false}
        style={
          fullWidth
            ? styles.wrapFull
            : flex
              ? styles.wrapFlex
              : [styles.wrap, { minWidth }]
        }
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
      </View>

      {open ? (
        <Modal visible transparent animationType="fade" onRequestClose={closeMenu}>
          <View style={styles.modalRoot}>
            <Pressable style={styles.backdrop} onPress={closeMenu} />
            {useSheet ? (
              <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>{sheetTitle}</Text>
                <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
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
            ) : (
              <View style={[styles.menu, { top: anchor.top, left: anchor.left, width: anchor.width }]}>
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
            )}
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labeledWrap: {
    width: '100%',
    gap: 4,
    flexGrow: 0,
    flexShrink: 0,
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
    flexGrow: 0,
    flexShrink: 0,
    flex: 0,
    minWidth: 0,
    alignSelf: 'stretch',
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
    backgroundColor: colors.white,
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
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(45, 45, 68, 0.35)',
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
  menuScroll: {
    maxHeight: 272,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
    maxHeight: '70%',
    paddingTop: 8,
    ...shadow.elevated,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sheetScroll: {
    maxHeight: 360,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  optionActive: { backgroundColor: colors.orangeLight },
  optionText: { fontSize: 14, color: colors.text, fontWeight: '600', flex: 1 },
  optionTextActive: { color: colors.orange, fontWeight: '700' },
});
