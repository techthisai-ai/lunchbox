import { Image, StyleSheet, View } from 'react-native';

const logo = require('../../assets/logo.png');

export function LogoMark({ size = 72 }: { size?: number }) {
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Image source={logo} style={{ width: size, height: size }} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center' },
});
