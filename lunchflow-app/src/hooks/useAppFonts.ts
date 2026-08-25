import { useFonts } from 'expo-font';

/**
 * Load Chef Queen brand fonts once at app start.
 * Text/TextInput are remapped to Poppins via Metro (src/lib/PatchedText*).
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    Poppins_400Regular: require('../../assets/fonts/Poppins_400Regular.ttf'),
    Poppins_500Medium: require('../../assets/fonts/Poppins_500Medium.ttf'),
    Poppins_600SemiBold: require('../../assets/fonts/Poppins_600SemiBold.ttf'),
    Poppins_700Bold: require('../../assets/fonts/Poppins_700Bold.ttf'),
    PlayfairDisplay_400Regular: require('../../assets/fonts/PlayfairDisplay_400Regular.ttf'),
    PlayfairDisplay_700Bold: require('../../assets/fonts/PlayfairDisplay_700Bold.ttf'),
    Tahu: require('../../assets/fonts/Tahu.ttf'),
  });

  // Proceed even if load fails so the app never blocks forever on fonts.
  return loaded || Boolean(error);
}
