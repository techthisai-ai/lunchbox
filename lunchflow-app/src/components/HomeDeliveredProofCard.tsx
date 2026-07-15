import { Ionicons } from '@expo/vector-icons';
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing } from '../constants/theme';
import { SUPPORT_WHATSAPP_PHONE } from '../services/supportService';

const GREEN = '#2E7D32';
const GREEN_LIGHT = '#C8E6C9';

type OpenDeliveryProofWhatsAppInput = {
  studentName?: string;
  deliveredTime?: string;
  destinationLabel?: string;
  proofImageUrl?: string;
};

function buildDeliveryProofMessage({
  studentName,
  deliveredTime,
  destinationLabel,
  proofImageUrl,
}: OpenDeliveryProofWhatsAppInput): string {
  const timePart =
    deliveredTime?.trim() ||
    new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  const childPart = studentName?.trim() ? `${studentName}'s lunch` : "Your child's lunch";
  const placePart = destinationLabel?.trim() ? ` at ${destinationLabel.trim()}` : '';

  let message = `Hi LunchFlow, ${childPart} was delivered${placePart} at ${timePart}. Please share the delivery photo proof.`;

  const proofUrl = proofImageUrl?.trim();
  if (proofUrl?.startsWith('https://')) {
    message += `\n\nPhoto proof: ${proofUrl}`;
  }

  return message;
}

export async function openDeliveryProofWhatsApp(input: OpenDeliveryProofWhatsAppInput): Promise<void> {
  const message = encodeURIComponent(buildDeliveryProofMessage(input));
  const appUrl = `whatsapp://send?phone=${SUPPORT_WHATSAPP_PHONE}&text=${message}`;
  const webUrl = `https://wa.me/${SUPPORT_WHATSAPP_PHONE}?text=${message}`;

  try {
    if (Platform.OS === 'web') {
      window.open(webUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    const canOpenApp = await Linking.canOpenURL(appUrl);
    await Linking.openURL(canOpenApp ? appUrl : webUrl);
  } catch {
    try {
      if (Platform.OS === 'web') {
        window.location.href = webUrl;
        return;
      }
      await Linking.openURL(webUrl);
    } catch {
      const timePart =
        input.deliveredTime?.trim() ||
        new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
      const childPart = input.studentName?.trim() ? `${input.studentName}'s lunch` : "Your child's lunch";
      Alert.alert(
        'Open WhatsApp',
        `${childPart} was delivered at ${timePart}. Open WhatsApp to view your delivery photo and message.`,
      );
    }
  }
}

type Props = {
  title: string;
  whenLabel: string;
  studentName?: string;
  deliveredTime?: string;
  destinationLabel?: string;
  proofImageUrl?: string;
};

export function HomeDeliveredProofCard({
  title,
  whenLabel,
  studentName,
  deliveredTime,
  destinationLabel,
  proofImageUrl,
}: Props) {
  const handleViewProof = () => {
    void openDeliveryProofWhatsApp({
      studentName,
      deliveredTime,
      destinationLabel: destinationLabel ?? title.replace(/^Delivered at\s/i, ''),
      proofImageUrl,
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Delivered</Text>
        </View>
      </View>

      <Text style={styles.when}>{whenLabel}</Text>

      <Pressable
        style={({ pressed }) => [styles.proofBtn, pressed && styles.proofBtnPressed]}
        onPress={handleViewProof}
        accessibilityRole="button"
        accessibilityLabel="View photo proof in WhatsApp"
      >
        <Ionicons name="image-outline" size={18} color={GREEN} />
        <Text style={styles.proofBtnText}>View Photo Proof</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GREEN_LIGHT,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.subtle,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: GREEN,
    lineHeight: 22,
  },
  badge: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: GREEN,
  },
  when: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  proofBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: GREEN,
    borderRadius: 12,
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  proofBtnPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  proofBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: GREEN,
  },
});
