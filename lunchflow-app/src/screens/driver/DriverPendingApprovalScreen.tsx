import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { colors, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { navigateAfterDriverLogin } from '../../navigation/driverRoutes';
import { RootStackParamList } from '../../navigation/types';
import { loadDriverByPhone } from '../../services/userRegistryService';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverPendingApproval'>;

export function DriverPendingApprovalScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const [status, setStatus] = useState<'pending' | 'rejected'>('pending');

  useFocusEffect(
    useCallback(() => {
      if (!user?.phone) return;
      loadDriverByPhone(user.phone).then((driver) => {
        const approvalStatus = driver?.approvalStatus ?? 'pending';
        setStatus(approvalStatus === 'rejected' ? 'rejected' : 'pending');
        if (approvalStatus === 'approved') {
          navigateAfterDriverLogin(navigation, user.phone!);
        }
      });
    }, [navigation, user?.phone]),
  );

  const handleLogout = async () => {
    await logout();
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.title}>
            {status === 'rejected' ? 'Application Not Approved' : 'Waiting for Admin Approval'}
          </Text>
          <Text style={styles.subtitle}>
            {status === 'rejected'
              ? 'Your driver application was reviewed and not approved. Contact support if you need help.'
              : 'Your driver account is registered. An admin will review and approve it before you can accept deliveries.'}
          </Text>
          {user?.name ? <Text style={styles.meta}>Name: {user.name}</Text> : null}
          {user?.phone ? <Text style={styles.meta}>Phone: +91 {user.phone}</Text> : null}
          {user?.vehicle ? <Text style={styles.meta}>Vehicle: {user.vehicle}</Text> : null}
        </Card>
        {status === 'pending' ? (
          <Text style={styles.hint}>This page updates automatically once you are approved.</Text>
        ) : null}
        <Button title="Back to Login" variant="outline" onPress={handleLogout} style={styles.logoutBtn} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  card: { width: '100%' },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 10 },
  subtitle: { fontSize: 14, color: colors.muted, lineHeight: 21 },
  meta: { fontSize: 13, color: colors.text, marginTop: 10, fontWeight: '600' },
  hint: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: spacing.md },
  logoutBtn: { marginTop: spacing.lg },
});
