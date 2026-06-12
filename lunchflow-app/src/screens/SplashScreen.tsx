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
        <LogoMark />
        <Text style={styles.title}>
          Lunch<Text style={styles.orange}>Flow</Text>
        </Text>
        <Text style={styles.tagline}>
          Fresh lunchbox. Delivered daily.{'\n'}Home to School & Office.
        </Text>
      </View>
      <View style={styles.footer}>
        <Button title="Get Started" onPress={() => navigation.replace('RoleSelect')} />
        <Text style={styles.trust}>Trusted by 10,000+ families & professionals</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, padding: spacing.xl },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '800', marginTop: spacing.lg, letterSpacing: -0.5 },
  orange: { color: colors.orange },
  tagline: { textAlign: 'center', color: colors.muted, marginTop: spacing.sm, fontSize: 15, lineHeight: 22 },
  footer: { paddingBottom: spacing.lg },
  trust: { textAlign: 'center', marginTop: spacing.md, fontSize: 12, color: colors.muted },
});
