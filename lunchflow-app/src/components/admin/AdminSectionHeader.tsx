import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../../constants/theme';

type Props = {
  title: string;
  subtitle?: string;
};

export function AdminSectionHeader({ title, subtitle }: Props) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.sm,
  },
  title: { fontSize: 16, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.muted, lineHeight: 18, marginTop: 4, fontWeight: '600' },
});
