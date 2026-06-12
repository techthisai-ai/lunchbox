import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, radius, spacing } from '../constants/theme';
import { ProfileStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Support'>;

const faqs = [
  'How do I mark food as ready?',
  'What if my driver is delayed?',
  'How to change delivery address?',
];

export function SupportScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Help & Support" subtitle="We're here to help you" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <SupportOption icon="chatbubble-ellipses" iconBg={colors.greenLight} iconColor={colors.green} title="Chat Support" sub="Avg. response: 2 min" />
        <SupportOption icon="call" iconBg={colors.orangeLight} iconColor={colors.orange} title="Call Support" sub="1800-LUNCH-FLOW" />
        <Text style={styles.section}>FAQs</Text>
        {faqs.map((q) => (
          <Pressable key={q} style={styles.faq}>
            <Text style={styles.faqText}>{q}</Text>
            <Ionicons name="add" size={20} color={colors.muted} />
          </Pressable>
        ))}
        <Button title="Raise a Complaint" variant="danger" onPress={() => {}} style={{ marginTop: spacing.lg }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SupportOption({
  icon,
  iconBg,
  iconColor,
  title,
  sub,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  sub: string;
}) {
  return (
    <Pressable style={styles.option}>
      <View style={[styles.optionIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: 32 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  optionIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontWeight: '700', fontSize: 15 },
  optionSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  section: { fontSize: 16, fontWeight: '800', marginVertical: 12 },
  faq: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  faqText: { fontWeight: '600', fontSize: 14, flex: 1, paddingRight: 12 },
});
