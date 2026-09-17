import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { formatPhoneInput, getInitials, normalizePhone } from '../constants/auth';
import { colors, shadow, spacing } from '../constants/theme';
import {
  loadCustomerProfileRecord,
  pickProfileImageUri,
  updateCustomerProfile,
  uploadCustomerAvatar,
  validateEmergencyContact,
  validateProfileEmail,
  validateProfileName,
} from '../services/customerProfileService';
import { getDeliveryTypeLabel } from '../types/delivery';
import { Avatar } from './Avatar';

type Props = {
  phone: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  onProfileUpdated: (payload: {
    name: string;
    email?: string;
    avatarUrl?: string;
  }) => void;
};

type Feedback = { type: 'success' | 'error'; message: string } | null;

export function ProfileHeaderCard({ phone, name, email, avatarUrl, onProfileUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftEmail, setDraftEmail] = useState(email ?? '');
  const [draftAvatarUrl, setDraftAvatarUrl] = useState(avatarUrl ?? '');
  const [draftEmergency, setDraftEmergency] = useState('');
  const [draftStudentName, setDraftStudentName] = useState('');
  const [deliveryTypeLabel, setDeliveryTypeLabel] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);

  const applyProfile = (profile: Awaited<ReturnType<typeof loadCustomerProfileRecord>>) => {
    if (!profile) return;
    setDraftName(profile.name);
    setDraftEmail(profile.email ?? '');
    setDraftAvatarUrl(profile.avatarUrl ?? '');
    setDraftEmergency(profile.emergencyContact ?? '');
    setDraftStudentName(profile.studentName ?? '');
    setDeliveryTypeLabel(getDeliveryTypeLabel(profile.registrationType));
  };

  useEffect(() => {
    if (editing) return;
    setDraftName(name);
    setDraftEmail(email ?? '');
    setDraftAvatarUrl(avatarUrl ?? '');
  }, [name, email, avatarUrl, editing]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadCustomerProfileRecord(phone)
      .then((profile) => {
        if (cancelled || !profile) return;
        applyProfile(profile);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [phone]);

  const handlePickAvatar = async () => {
    setFeedback(null);
    try {
      setUploadingAvatar(true);
      const uri = await pickProfileImageUri();
      if (!uri) return;

      setDraftAvatarUrl(uri);

      if (!editing) {
        const uploadedUrl = await uploadCustomerAvatar(phone, uri);
        const { user } = await updateCustomerProfile(phone, { avatarUrl: uploadedUrl });
        setDraftAvatarUrl(uploadedUrl);
        onProfileUpdated({
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
        });
        setFeedback({ type: 'success', message: 'Profile picture updated successfully.' });
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Could not update profile picture.',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCancel = () => {
    setDraftName(name);
    setDraftEmail(email ?? '');
    setDraftAvatarUrl(avatarUrl ?? '');
    setFeedback(null);
    setEditing(false);
    void loadCustomerProfileRecord(phone).then(applyProfile);
  };

  const handleSave = async () => {
    setFeedback(null);
    const nameError = validateProfileName(draftName);
    if (nameError) {
      setFeedback({ type: 'error', message: nameError });
      return;
    }
    const emailError = validateProfileEmail(draftEmail);
    if (emailError) {
      setFeedback({ type: 'error', message: emailError });
      return;
    }
    const emergencyError = validateEmergencyContact(draftEmergency);
    if (emergencyError) {
      setFeedback({ type: 'error', message: emergencyError });
      return;
    }

    setSaving(true);
    try {
      let nextAvatarUrl = draftAvatarUrl.trim();
      if (nextAvatarUrl && !nextAvatarUrl.startsWith('http') && !nextAvatarUrl.startsWith('data:')) {
        nextAvatarUrl = await uploadCustomerAvatar(phone, nextAvatarUrl);
      }

      const { user } = await updateCustomerProfile(phone, {
        name: draftName,
        email: draftEmail,
        avatarUrl: nextAvatarUrl || undefined,
        emergencyContact: draftEmergency,
        studentName: draftStudentName,
      });

      setDraftAvatarUrl(user.avatarUrl ?? nextAvatarUrl);
      onProfileUpdated({
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      });
      setEditing(false);
      setFeedback({ type: 'success', message: 'Profile updated successfully.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Could not save profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  const displayAvatarUrl = draftAvatarUrl || avatarUrl;
  const displayName = editing ? draftName : name;
  const initials = getInitials(displayName || 'Customer');

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>My Profile</Text>
        {!editing ? (
          <Pressable style={styles.editBtn} onPress={() => setEditing(true)} accessibilityRole="button">
            <Ionicons name="create-outline" size={16} color={colors.orange} />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.avatarRow}>
        <Pressable
          style={styles.avatarWrap}
          onPress={() => void handlePickAvatar()}
          disabled={uploadingAvatar || saving}
          accessibilityRole="button"
          accessibilityLabel="Change profile picture"
        >
          {displayAvatarUrl ? (
            <Image source={{ uri: displayAvatarUrl }} style={styles.avatarImage} />
          ) : (
            <Avatar initials={initials} size={84} />
          )}
          <View style={styles.cameraBadge}>
            {uploadingAvatar ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Ionicons name="camera" size={14} color={colors.onPrimary} />
            )}
          </View>
        </Pressable>

        <View style={styles.identityCopy}>
          {loading ? (
            <ActivityIndicator color={colors.green} />
          ) : editing ? (
            <>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={draftName}
                onChangeText={setDraftName}
                placeholder="Enter your full name"
                placeholderTextColor={colors.muted}
                autoCapitalize="words"
              />
            </>
          ) : (
            <>
              <Text style={styles.displayName}>{displayName || 'Customer'}</Text>
              <Text style={styles.displaySub}>+91 {phone}</Text>
              {deliveryTypeLabel ? <Text style={styles.typeBadge}>{deliveryTypeLabel} delivery</Text> : null}
            </>
          )}
        </View>
      </View>

      <View style={styles.fields}>
        <Text style={styles.fieldLabel}>Mobile Number</Text>
        {editing ? (
          <View style={styles.readOnlyField}>
            <Ionicons name="call-outline" size={16} color={colors.muted} />
            <Text style={styles.readOnlyText}>+91 {phone}</Text>
          </View>
        ) : (
          <Text style={styles.fieldValue}>+91 {phone}</Text>
        )}
        <Text style={styles.helperText}>Login number cannot be changed.</Text>

        <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Email Address</Text>
        {editing ? (
          <TextInput
            style={styles.input}
            value={draftEmail}
            onChangeText={setDraftEmail}
            placeholder="Enter email (optional)"
            placeholderTextColor={colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        ) : (
          <Text style={styles.fieldValue}>{email?.trim() || draftEmail.trim() || 'Not added yet'}</Text>
        )}

        <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Child / Student Name</Text>
        {editing ? (
          <TextInput
            style={styles.input}
            value={draftStudentName}
            onChangeText={setDraftStudentName}
            placeholder="Name of child or employee"
            placeholderTextColor={colors.muted}
            autoCapitalize="words"
          />
        ) : (
          <Text style={styles.fieldValue}>{draftStudentName.trim() || 'Not added yet'}</Text>
        )}

        <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Emergency Contact</Text>
        {editing ? (
          <TextInput
            style={styles.input}
            value={draftEmergency}
            onChangeText={(value) => setDraftEmergency(formatPhoneInput(value))}
            placeholder="10-digit emergency number"
            placeholderTextColor={colors.muted}
            keyboardType="phone-pad"
            maxLength={10}
          />
        ) : (
          <Text style={styles.fieldValue}>
            {draftEmergency.trim() ? `+91 ${normalizePhone(draftEmergency)}` : 'Not added yet'}
          </Text>
        )}
      </View>

      {editing ? (
        <View style={styles.actionRow}>
          <Pressable style={styles.cancelBtn} onPress={handleCancel} disabled={saving}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.saveBtn} onPress={() => void handleSave()} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {feedback ? (
        <View style={[styles.feedback, feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError]}>
          <Ionicons
            name={feedback.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
            size={16}
            color={feedback.type === 'success' ? colors.green : colors.red}
          />
          <Text style={styles.feedbackText}>{feedback.message}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: spacing.md,
    gap: 14,
    ...shadow.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.orangeLight,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.orange,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.bg,
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  displaySub: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  typeBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '700',
    color: colors.green,
    backgroundColor: colors.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fields: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  fieldLabelSpaced: {
    marginTop: 8,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  helperText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  readOnlyText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  saveBtn: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: colors.green,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  feedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  feedbackSuccess: {
    backgroundColor: colors.greenLight,
  },
  feedbackError: {
    backgroundColor: colors.redLight,
  },
  feedbackText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
});
