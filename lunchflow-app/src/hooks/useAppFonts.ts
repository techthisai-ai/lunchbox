import { Roboto_400Regular, Roboto_700Bold, useFonts } from '@expo-google-fonts/roboto';

/**
 * Load bundled Roboto fonts once at app start.
 * Text/TextInput are remapped to Roboto via Metro (src/lib/PatchedText*).
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    Roboto_400Regular,
    Roboto_700Bold,
  });

  // Proceed even if load fails so the app never blocks forever on fonts.
  return loaded || Boolean(error);
}
