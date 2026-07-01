import { useEffect, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { navigateAfterDriverLogin } from '../../navigation/driverRoutes';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverRegister'>;

export function DriverRegisterScreen({ navigation, route }: Props) {
  const { registerDriver } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(route.params?.phone ?? '');
  const [vehicle, setVehicle] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (route.params?.phone) {
      setPhone(route.params.phone);
    }
  }, [route.params?.phone]);

  const handleRegister = async () => {
    setError('');
    const err = await registerDriver({
      name,
      phone,
      vehicle,
      licenseNumber,
    });
    if (err) {
      setError(err);
      return;
    }
    await navigateAfterDriverLogin(navigation, phone);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Driver Registration" subtitle="Join as a pickup & delivery partner" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.form}>
        <Input label="Full Name" value={name} onChangeText={setName} placeholder="Enter your full name" />
        <Input label="Mobile Number" value={phone} onChangeText={setPhone} phone />
        <Input label="Vehicle Number" value={vehicle} onChangeText={setVehicle} placeholder="e.g. DL 4C AB 1234" autoCapitalize="characters" />
        <Input label="Driving License Number" value={licenseNumber} onChangeText={setLicenseNumber} placeholder="Enter license number" autoCapitalize="characters" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Complete Driver Registration" variant="green" onPress={handleRegister} style={{ marginTop: spacing.sm }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  form: { padding: spacing.lg, paddingBottom: 40 },
  error: { color: colors.red, fontSize: 13, marginBottom: 12 },
});
