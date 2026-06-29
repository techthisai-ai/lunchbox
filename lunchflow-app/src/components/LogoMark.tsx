import { Image, StyleSheet, View } from 'react-native';

const logo = require('../../assets/logo.png');

type Props = {
  /** Square logo size in points. */
  size?: number;
};

export function LogoMark({ size = 96 }: Props) {
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Image
        source={logo}
        style={{ width: size, height: size, borderRadius: Math.round(size * 0.22) }}
        resizeMode="contain"
        accessibilityLabel="Chef Queen logo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
});
