import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../components/Input';
import { SelectField } from '../components/SelectField';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { ProfileStackParamList } from '../navigation/types';
import { loadCustomerRegistration } from '../services/userRegistryService';
import { DeliveryType, REGISTRATION_TYPE_OPTIONS, normalizeDeliveryType } from '../types/delivery';

type Props = NativeStackScreenProps<ProfileStackParamList, 'PersonalDetails'>;

export function PersonalDetailsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [address, setAddress] = useState('');
  const [registrationType, setRegistrationType] = useState<DeliveryType>('school');

  useEffect(() => {
    if (!user?.phone) return;
    loadCustomerRegistration(user.phone).then((registration) => {
      if (!registration) return;
      setName(registration.name || user.name || '');
      setPhone(registration.phone || user.phone || '');
      setAddress(registration.address || '');
      setRegistrationType(normalizeDeliveryType(registration.registrationType));
    });
  }, [user?.name, user?.phone]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Personal Details" subtitle="Your account information" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Input label="Full Name" value={name} onChangeText={setName} placeholder="Enter your full name" />
        <Input
          label="Mobile Number"
          value={phone ? `+91 ${phone}` : ''}
          editable={false}
          placeholder="Enter 10-digit mobile number"
        />
        <Input label="Home Address" value={address} onChangeText={setAddress} placeholder="Enter your home address" />
        <SelectField
          label="Registration Type"
          value={registrationType}
          options={REGISTRATION_TYPE_OPTIONS}
          onChange={setRegistrationType}
          placeholder="Select student, college or office"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  form: { padding: spacing.lg, paddingBottom: 32 },
});
