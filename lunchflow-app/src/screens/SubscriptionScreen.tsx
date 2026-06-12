import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, radius, spacing } from '../constants/theme';
import { ProfileStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Subscription'>;

const features = ['Daily pickup', 'Live tracking', 'SMS alerts'];

export function SubscriptionScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Subscription Plans" subtitle="Choose the plan that fits you" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.section}>School Plans</Text>
        <PlanCard name="Basic School" price="₹699" period="Monthly" desc="1 lunchbox/day · Mon–Fri" />
        <PlanCard name="Premium School" price="₹999" period="Monthly" desc="2 lunchboxes · Priority delivery" featured />
        <Text style={styles.section}>Office Plans</Text>
        <PlanCard name="Standard Office" price="₹999" period="Monthly" desc="Daily office delivery · 1 box" />
        <PlanCard name="Team Office" price="₹1499" period="Monthly" desc="Up to 3 boxes · Express route" featured />
        <Button title="Subscribe Now" onPress={() => {}} style={{ marginTop: 8 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanCard({
  name,
  price,
  period,
  desc,
  featured,
}: {
  name: string;
  price: string;
  period: string;
  desc: string;
  featured?: boolean;
}) {
  return (
    <View style={[styles.plan, featured && styles.featured]}>
      {featured ? <Text style={styles.popular}>Most Popular</Text> : null}
      <Text style={styles.planName}>{name}</Text>
      <Text style={styles.price}>
        {price} <Text style={styles.period}>/ {period}</Text>
      </Text>
      <Text style={styles.desc}>{desc}</Text>
      {features.map((f) => (
        <Text key={f} style={styles.feature}>✓ {f}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: 32 },
  section: { fontSize: 16, fontWeight: '800', marginBottom: 12, marginTop: 4 },
  plan: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: 12,
    backgroundColor: colors.white,
  },
  featured: { borderColor: colors.orange, backgroundColor: colors.orangeLight },
  popular: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: colors.orange,
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  planName: { fontWeight: '700', fontSize: 16, marginBottom: 4 },
  price: { fontSize: 28, fontWeight: '800', color: colors.orange },
  period: { fontSize: 14, fontWeight: '600', color: colors.muted },
  desc: { fontSize: 13, color: colors.muted, marginTop: 8 },
  feature: { fontSize: 12, marginTop: 4, color: colors.text },
});
