import { Image, StyleSheet } from 'react-native';

const splashLogo = require('../../assets/logo-splash.png');
const loginLogo = require('../../assets/logo-login.png');

type Props = {
  variant?: 'stacked' | 'horizontal' | 'splash';
  height?: number;
};

/** Transparent horizontal lockup (185×105). */
export const SPLASH_LOGO_ASPECT = 185 / 105;
/** Transparent stacked lockup (81×128). */
export const LOGIN_LOGO_ASPECT = 81 / 128;

export function ChefQueenLogo({ variant = 'stacked', height }: Props) {
  const isStacked = variant === 'stacked';
  const h = height ?? (isStacked ? 140 : variant === 'splash' ? 110 : 52);
  const aspect = isStacked ? LOGIN_LOGO_ASPECT : SPLASH_LOGO_ASPECT;
  const w = Math.round(h * aspect);

  return (
    <Image
      source={isStacked ? loginLogo : splashLogo}
      style={[styles.image, { width: w, height: h }]}
      resizeMode="contain"
      accessibilityLabel="Chef Queen"
    />
  );
}

const styles = StyleSheet.create({
  image: { alignSelf: 'center', backgroundColor: 'transparent' },
});
