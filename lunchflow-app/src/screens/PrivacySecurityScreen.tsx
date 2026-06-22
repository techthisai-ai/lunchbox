import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, radius, spacing } from '../constants/theme';
import { ProfileStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'PrivacySecurity'>;

type PrivacyItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  action?: () => void;
};

type PrivacySection = {
  title: string;
  items: PrivacyItem[];
};

const sections: PrivacySection[] = [
  {
    title: 'Account Security',
    items: [
      {
        icon: 'phone-portrait-outline' as const,
        label: 'OTP Login',
        description: 'Your account is secured with one-time passwords sent to your registered mobile number.',
      },
      {
        icon: 'lock-closed-outline' as const,
        label: 'Session Protection',
        description: 'You are signed out automatically when logging in from another device.',
      },
    ],
  },
  {
    title: 'Your Data',
    items: [
      {
        icon: 'document-text-outline' as const,
        label: 'Privacy Policy',
        description: 'Learn how LunchFlow collects, uses, and protects your personal information.',
        action: () => Linking.openURL('https://lunchflow.app/privacy'),
      },
      {
        icon: 'reader-outline' as const,
        label: 'Terms of Service',
        description: 'Review the terms that govern your use of the LunchFlow app.',
        action: () => Linking.openURL('https://lunchflow.app/terms'),
      },
      {
        icon: 'shield-checkmark-outline' as const,
        label: 'Delivery Data',
        description: 'Order history, addresses, and location data are used only to fulfil your deliveries.',
      },
    ],
  },
];

export function PrivacySecurityScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Privacy & Security" subtitle="How we keep your account safe" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item) => (
              <Pressable
                key={item.label}
                style={styles.card}
                onPress={item.action}
                disabled={!item.action}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name={item.icon} size={18} color={colors.text} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardLabel}>{item.label}</Text>
                  <Text style={styles.cardDescription}>{item.description}</Text>
                </View>
                {item.action ? <Ionicons name="open-outline" size={18} color={colors.muted} /> : null}
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: 32 },
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: 10, textTransform: 'uppercase' },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardLabel: { fontWeight: '700', fontSize: 14, color: colors.text },
  cardDescription: { fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 18 },
});
