import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { useEffect } from 'react';
import { Text, TextInput } from 'react-native';
import { fonts } from '../constants/fonts';

let defaultsApplied = false;

function applyDefaultTextFonts() {
  if (defaultsApplied) return;
  defaultsApplied = true;

  const base = { fontFamily: fonts.regular };

  const TextComponent = Text as typeof Text & {
    defaultProps?: { style?: object | object[] };
  };
  const prevTextStyle = TextComponent.defaultProps?.style;
  TextComponent.defaultProps = {
    ...TextComponent.defaultProps,
    style: prevTextStyle ? [base, prevTextStyle] : base,
  };

  const TextInputComponent = TextInput as typeof TextInput & {
    defaultProps?: { style?: object | object[] };
  };
  const prevInputStyle = TextInputComponent.defaultProps?.style;
  TextInputComponent.defaultProps = {
    ...TextInputComponent.defaultProps,
    style: prevInputStyle ? [base, prevInputStyle] : base,
  };
}

/** Load bundled Inter fonts once at app start. */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (loaded) applyDefaultTextFonts();
  }, [loaded]);

  // Proceed even if load fails so the app never blocks forever on fonts.
  return loaded || Boolean(error);
}
