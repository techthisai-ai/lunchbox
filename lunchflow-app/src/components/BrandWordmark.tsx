import { StyleSheet, Text, View } from 'react-native';
import { brandHeadingStyle, taglineStyle } from '../constants/fonts';
import { colors, spacing } from '../constants/theme';

type Props = {
  showTagline?: boolean;
};

/** Chef Queen wordmark — Playfair Display + optional Tahu tagline. */
export function BrandWordmark({ showTagline = true }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.name}>Chef Queen</Text>
      {showTagline ? <Text style={styles.tagline}>Home Cooked with Love</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginTop: spacing.sm },
  name: {
    ...brandHeadingStyle(),
    fontSize: 28,
    lineHeight: 34,
    color: colors.text,
    textAlign: 'center',
  },
  tagline: {
    ...taglineStyle(),
    fontSize: 18,
    lineHeight: 24,
    color: colors.orange,
    marginTop: 4,
    textAlign: 'center',
  },
});
