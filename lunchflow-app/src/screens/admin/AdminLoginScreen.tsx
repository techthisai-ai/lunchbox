import { useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { colors, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { AdminWebStackParamList } from '../../navigation/AdminWebNavigator';

export function AdminLoginScreen({ navigation }: NativeStackScreenProps<AdminWebStackParamList, 'AdminLogin'>) {
  const { loginAsAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    const err = await loginAsAdmin(email, password);
    if (err) {
      setError(err);
      return;
    }
    navigation.replace('AdminPortal');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.wrap}>
        <View style={styles.panel}>
          <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Enter admin email" />
          <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Enter password" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Login as Admin" onPress={handleLogin} style={{ marginTop: 8 }} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  panel: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  error: { color: colors.red, fontSize: 13, marginBottom: 8 },
});
