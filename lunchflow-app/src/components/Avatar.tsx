import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';

export function Avatar({ initials, large }: { initials: string; large?: boolean }) {
  return (
    <View style={[styles.avatar, large && styles.large]}>
      <Text style={[styles.text, large && styles.largeText]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  large: { width: 56, height: 56, borderRadius: 28 },
  text: { fontWeight: '700', color: colors.orange, fontSize: 14 },
  largeText: { fontSize: 18 },
});
