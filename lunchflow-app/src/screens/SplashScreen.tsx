import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { LogoMark } from '../components/LogoMark';
import { colors, spacing } from '../constants/theme';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export function SplashScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.stack}>
          <LogoMark />
          <Text style={styles.title}>
            Lunch<Text style={styles.orange}>Flow</Text>
          </Text>
          <Button
            title="Get Started"
            onPress={() => navigation.replace('RoleSelect')}
            style={styles.button}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  stack: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  title: { fontSize: 32, fontWeight: '800', marginTop: spacing.lg, letterSpacing: -0.5, textAlign: 'center' },
  orange: { color: colors.orange },
  button: { marginTop: spacing.xl, width: '100%', alignSelf: 'center' },
});
