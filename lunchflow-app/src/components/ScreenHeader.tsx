import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
};

export function ScreenHeader({ title, subtitle, onBack, right }: Props) {
  return (
    <View style={styles.wrap}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.back}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, backgroundColor: colors.bg },
  back: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.caption, color: colors.muted, marginTop: 2, fontWeight: '500' },
});
