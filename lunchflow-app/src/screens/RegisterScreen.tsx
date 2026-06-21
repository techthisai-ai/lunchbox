import { useEffect, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { SelectField } from '../components/SelectField';
import { ScreenHeader } from '../components/ScreenHeader';
import { normalizePhone } from '../constants/auth';
import { colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { navigateAfterCustomerRegistration } from '../navigation/customerRoutes';
import {
  DeliveryType,
  REGISTRATION_TYPE_OPTIONS,
  getDetailLabel,
  getInstitutionLabel,
  getPersonLabel,
} from '../types/delivery';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export function RegisterScreen({ navigation, route }: Props) {
  const { registerCustomer } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(route.params?.phone ?? '');
  const [address, setAddress] = useState('');
  const [registrationType, setRegistrationType] = useState<DeliveryType>('school');
  const [school, setSchool] = useState('');
  const [studentName, setStudentName] = useState('');
  const [classSection, setClassSection] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (route.params?.phone) {
      setPhone(route.params.phone);
    }
  }, [route.params?.phone]);

  const handleTypeChange = (type: DeliveryType) => {
    setRegistrationType(type);
    setSchool('');
    setStudentName('');
    setClassSection('');
    setError('');
  };

  const handleRegister = async () => {
    setError('');
    const err = await registerCustomer({
      name,
      phone,
      address,
      registrationType,
      school,
      studentName,
      classSection,
      emergencyContact,
    });
    if (err) {
      setError(err);
      return;
    }
    await navigateAfterCustomerRegistration(navigation, normalizePhone(phone));
  };

  const institutionLabel = getInstitutionLabel(registrationType);
  const personLabel = getPersonLabel(registrationType);
  const detailLabel = getDetailLabel(registrationType);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Create Account" subtitle="Register for daily lunchbox delivery" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Input label="Full Name" value={name} onChangeText={setName} placeholder="Enter your full name" />
        <Input label="Mobile Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Enter 10-digit mobile number" />
        <Input label="Home Address" value={address} onChangeText={setAddress} placeholder="Enter your home address" />

        <SelectField
          label="Registration Type"
          value={registrationType}
          options={REGISTRATION_TYPE_OPTIONS}
          onChange={handleTypeChange}
          placeholder="Select student, college or office"
        />

        <Input
          label={institutionLabel}
          value={school}
          onChangeText={setSchool}
          placeholder={`Enter ${institutionLabel.toLowerCase()}`}
        />
        <Input
          label={personLabel}
          value={studentName}
          onChangeText={setStudentName}
          placeholder={`Enter ${personLabel.toLowerCase()}`}
        />
        <Input
          label={detailLabel}
          value={classSection}
          onChangeText={setClassSection}
          placeholder={
            registrationType === 'school'
              ? 'e.g. Class 5 · Section B'
              : registrationType === 'college'
                ? 'e.g. B.Tech CSE · 2nd Year'
                : 'e.g. HR · 3rd Floor'
          }
        />
        <Input
          label="Emergency Contact"
          value={emergencyContact}
          onChangeText={setEmergencyContact}
          keyboardType="phone-pad"
          placeholder="Enter emergency contact number"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Complete Registration" variant="green" onPress={handleRegister} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  form: { padding: 16, paddingBottom: 40 },
  error: { color: colors.red, fontSize: 13, marginBottom: 12 },
});
