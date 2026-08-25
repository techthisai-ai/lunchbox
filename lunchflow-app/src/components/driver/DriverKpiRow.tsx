import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/theme';

export type DriverKpiItem = {
  label: string;
  value: string;
  tone: 'purple' | 'green' | 'pink' | 'orange' | 'blue' | 'red';
  icon?: keyof typeof Ionicons.glyphMap;
};

const toneGradients: Record<DriverKpiItem['tone'], readonly [string, string]> = {
  purple: ['#E8ECD8', '#D4DABF'],
  green: ['#E4EDE4', '#D0DFD2'],
  blue: ['#E8EEF2', '#D5E0E8'],
  pink: ['#F7EBDA', '#EED9C4'],
  orange: ['#F6E6D8', '#EBD4C2'],
  red: ['#F6E4DC', '#EBD0C6'],
};

type Props = {
  items: DriverKpiItem[];
  compact?: boolean;
};

export function DriverKpiRow({ items, compact }: Props) {
  const dense = compact ?? items.length >= 4;

  return (
    <View style={styles.row}>
      {items.map((item) => {
        const colorsPair = toneGradients[item.tone];
        return (
          <LinearGradient
            key={item.label}
            colors={[...colorsPair]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.box, dense && styles.boxDense]}
          >
            {item.icon ? (
              <Ionicons name={item.icon} size={dense ? 13 : 16} color={colors.text} style={styles.icon} />
            ) : null}
            <Text style={[styles.value, dense && styles.valueDense]} numberOfLines={1} adjustsFontSizeToFit>
              {item.value}
            </Text>
            <Text style={[styles.label, dense && styles.labelDense]} numberOfLines={2}>
              {item.label}
            </Text>
          </LinearGradient>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  box: {
    flex: 1,
    aspectRatio: 1,
    minWidth: 0,
    borderRadius: 16,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxDense: {
    padding: 6,
    borderRadius: 12,
  },
  icon: { marginBottom: 4 },
  value: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  valueDense: { fontSize: 15, lineHeight: 18 },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.muted,
    marginTop: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  labelDense: {
    fontSize: 8,
    lineHeight: 10,
    marginTop: 3,
    letterSpacing: 0.1,
  },
});
