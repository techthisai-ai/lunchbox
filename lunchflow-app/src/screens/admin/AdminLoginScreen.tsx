import { useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { ScreenHeader } from '../../components/ScreenHeader';
import { DEMO_CREDENTIALS } from '../../constants/auth';
import { colors, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminLogin'>;

export function AdminLoginScreen({ navigation }: Props) {
  const { loginAsAdmin } = useAuth();
  const [email, setEmail] = useState<string>(DEMO_CREDENTIALS.admin.email);
  const [password, setPassword] = useState<string>(DEMO_CREDENTIALS.admin.password);
  const [error, setError] = useState('');

  const handleLogin = () => {
    const err = loginAsAdmin(email, password);
    if (err) {
      setError(err);
      return;
    }
    navigation.replace('AdminTabs', { screen: 'AdminDashboard' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Admin Login" subtitle="Operations & management portal" onBack={() => navigation.goBack()} />
      <View style={styles.form}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>ADMIN PORTAL</Text>
        </View>
        <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Login as Admin" onPress={handleLogin} style={{ marginTop: 8 }} />
        <View style={styles.demo}>
          <Text style={styles.demoTitle}>Demo credentials</Text>
          <Text style={styles.demoText}>Email: {DEMO_CREDENTIALS.admin.email}</Text>
          <Text style={styles.demoText}>Password: {DEMO_CREDENTIALS.admin.password}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  form: { padding: spacing.lg },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.blueLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: colors.blue, letterSpacing: 1 },
  error: { color: colors.red, fontSize: 13, marginBottom: 8 },
  demo: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoTitle: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  demoText: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
