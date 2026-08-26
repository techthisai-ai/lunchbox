import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../constants/theme';

type Action = {
  label: string;
  onPress: () => void;
};

type Props = {
  actions: Action[];
};

export function AdminPageActionBar({ actions }: Props) {
  return (
    <View style={styles.bar}>
      {actions.map((action) => (
        <Pressable key={action.label} style={styles.addBtn} onPress={action.onPress}>
          <Ionicons name="add" size={16} color={colors.white} />
          <Text style={styles.addBtnText}>{action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.orange,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    height: 36,
  },
  addBtnText: { fontSize: 13, fontWeight: '800', color: colors.onPrimary },
});
