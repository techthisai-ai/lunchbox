import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';

export function Avatar({
  initials,
  imageUrl,
  large,
  onDark,
  size,
}: {
  initials: string;
  imageUrl?: string | null;
  large?: boolean;
  onDark?: boolean;
  size?: number;
}) {
  const dim = large ? 56 : size ?? 48;
  const fontSize = large ? 18 : size && size <= 42 ? 12 : 14;
  const radius = dim / 2;

  if (imageUrl?.trim()) {
    return (
      <Image
        source={{ uri: imageUrl.trim() }}
        style={[
          styles.avatarImage,
          { width: dim, height: dim, borderRadius: radius },
          onDark && styles.onDarkImage,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        large && styles.large,
        onDark && styles.onDark,
        size && !large ? { width: dim, height: dim, borderRadius: radius } : null,
      ]}
    >
      <Text style={[styles.text, large && styles.largeText, size && !large ? { fontSize } : null]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    backgroundColor: colors.bg,
  },
  large: { width: 56, height: 56, borderRadius: 28 },
  onDark: { backgroundColor: 'rgba(255,255,255,0.2)' },
  onDarkImage: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  text: { fontWeight: '700', color: colors.onPrimary, fontSize: 14 },
  largeText: { fontSize: 18 },
});
