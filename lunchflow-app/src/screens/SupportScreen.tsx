import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, radius, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { ProfileStackParamList } from '../navigation/types';
import {
  SUPPORT_FAQS,
  SUPPORT_PHONE_DISPLAY,
  openSupportCall,
  openSupportChat,
  submitSupportComplaint,
} from '../services/supportService';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Support'>;

export function SupportScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [complaintText, setComplaintText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleFaq = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  const handleRaiseComplaint = () => {
    if (!user?.phone) {
      Alert.alert('Login required', 'Please log in to raise a complaint.');
      return;
    }
    setComplaintText('');
    setComplaintOpen(true);
  };

  const handleSubmitComplaint = async () => {
    if (!user?.phone || submitting) return;
    setSubmitting(true);
    try {
      const complaint = await submitSupportComplaint({
        customerPhone: user.phone,
        customerName: user.name || 'Customer',
        message: complaintText,
      });
      setComplaintOpen(false);
      setComplaintText('');
      Alert.alert(
        'Complaint submitted',
        `We received your complaint (${complaint.id}). Our team will contact you shortly.`,
      );
    } catch (error) {
      Alert.alert('Could not submit', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Help & Support" subtitle="We're here to help you" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <SupportOption
          icon="chatbubble-ellipses"
          iconBg={colors.greenLight}
          iconColor={colors.green}
          title="Chat Support"
          sub="Avg. response: 2 min"
          onPress={() => openSupportChat(user?.name, user?.phone)}
        />
        <SupportOption
          icon="call"
          iconBg={colors.orangeLight}
          iconColor={colors.orange}
          title="Call Support"
          sub={SUPPORT_PHONE_DISPLAY}
          onPress={() => openSupportCall()}
        />

        <Text style={styles.section}>FAQs</Text>
        {SUPPORT_FAQS.map((faq) => {
          const expanded = expandedId === faq.id;
          return (
            <Pressable key={faq.id} style={styles.faq} onPress={() => toggleFaq(faq.id)}>
              <View style={styles.faqHeader}>
                <Text style={styles.faqText}>{faq.question}</Text>
                <Ionicons name={expanded ? 'remove' : 'add'} size={20} color={colors.muted} />
              </View>
              {expanded ? <Text style={styles.faqAnswer}>{faq.answer}</Text> : null}
            </Pressable>
          );
        })}

        <Button title="Raise a Complaint" variant="danger" onPress={handleRaiseComplaint} style={{ marginTop: spacing.lg }} />
      </ScrollView>

      <Modal visible={complaintOpen} transparent animationType="slide" onRequestClose={() => setComplaintOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => !submitting && setComplaintOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>Raise a Complaint</Text>
            <TextInput
              style={styles.complaintInput}
              value={complaintText}
              onChangeText={setComplaintText}
              placeholder="Describe your issue..."
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
              editable={!submitting}
            />
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="outline" onPress={() => setComplaintOpen(false)} style={styles.modalBtn} />
              <Button
                title={submitting ? 'Submitting...' : 'Submit'}
                variant="danger"
                onPress={handleSubmitComplaint}
                style={styles.modalBtn}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function SupportOption({
  icon,
  iconBg,
  iconColor,
  title,
  sub,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.option} onPress={onPress}>
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
    shadowColor: colors.text,
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
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  faqText: { fontWeight: '600', fontSize: 14, flex: 1 },
  faqAnswer: { fontSize: 13, color: colors.muted, lineHeight: 20, marginTop: 10 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(45, 45, 68, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  complaintInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    minHeight: 120,
    padding: 14,
    marginTop: spacing.md,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  modalBtn: { flex: 1 },
});
