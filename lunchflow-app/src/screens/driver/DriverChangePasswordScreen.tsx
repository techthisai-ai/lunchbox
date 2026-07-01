import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../navigation/types';
import {
  changeDriverPassword,
  driverHasPassword,
  loadDriverByPhone,
} from '../../services/userRegistryService';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverChangePassword'>;

export function DriverChangePasswordScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [hasPassword, setHasPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user?.phone) {
        setHasPassword(false);
        return;
      }
      loadDriverByPhone(user.phone).then((driver) => {
        setHasPassword(driverHasPassword(driver));
      });
    }, [user?.phone]),
  );

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!user?.phone) {
      setError('Sign in again to change your password');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (hasPassword && !currentPassword) {
      setError('Enter your current password');
      return;
    }

    setLoading(true);
    const err = await changeDriverPassword(user.phone, currentPassword, newPassword);
    setLoading(false);

    if (err) {
      setError(err);
      return;
    }

    setSuccess(hasPassword ? 'Password updated successfully' : 'Password set successfully');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setHasPassword(true);
    setTimeout(() => navigation.goBack(), 1200);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Change Password"
        subtitle={hasPassword ? 'Update your login password' : 'Set a password for your account'}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {hasPassword ? (
          <Input
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            placeholder="Enter current password"
            autoCapitalize="none"
          />
        ) : null}
        <Input
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder="At least 6 characters"
          autoCapitalize="none"
        />
        <Input
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="Re-enter new password"
          autoCapitalize="none"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}
        <Button
          title={loading ? 'Saving...' : hasPassword ? 'Update Password' : 'Set Password'}
          variant="green"
          onPress={handleSubmit}
          style={{ marginTop: spacing.sm }}
        />
        <View style={styles.note}>
          <Text style={styles.noteText}>
            Use this password along with your mobile number when signing in to the driver app.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  form: { padding: spacing.lg, paddingBottom: 40 },
  error: { color: colors.red, fontSize: 13, marginBottom: 8 },
  success: { color: colors.green, fontSize: 13, marginBottom: 8, fontWeight: '600' },
  note: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.greenLight,
    borderRadius: 12,
  },
  noteText: { fontSize: 12, color: colors.muted, lineHeight: 18, fontWeight: '600' },
});
