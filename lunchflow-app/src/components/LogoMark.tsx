import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { colors, radius, shadow } from '../constants/theme';

export function LogoMark({ size = 72 }: { size?: number }) {
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size * 0.28 }, shadow.card]}>
      <LinearGradient
        colors={[colors.orange, colors.green]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { borderRadius: size * 0.28 }]}
      >
        <Ionicons name="restaurant" size={size * 0.45} color={colors.white} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center', overflow: 'hidden' },
  gradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
