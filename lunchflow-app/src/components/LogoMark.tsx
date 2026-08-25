import { Image, StyleSheet, View } from 'react-native';

const logo = require('../../assets/logo-primary.png');

type Props = {
  /** Logo height in points. */
  size?: number;
  /** Optional width; defaults to size (square). */
  width?: number;
};

export function LogoMark({ size = 96, width }: Props) {
  const w = width ?? size;
  return (
    <View style={[styles.wrap, { width: w, height: size }]}>
      <Image
        source={logo}
        style={{ width: w, height: size }}
        resizeMode="contain"
        accessibilityLabel="Chef Queen"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
});
