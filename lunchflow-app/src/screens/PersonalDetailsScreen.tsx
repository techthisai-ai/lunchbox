import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../components/Input';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { ProfileStackParamList } from '../navigation/types';
import { loadCustomerProfile } from '../services/orderHubService';

type Props = NativeStackScreenProps<ProfileStackParamList, 'PersonalDetails'>;

export function PersonalDetailsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [studentName, setStudentName] = useState('');
  const [school, setSchool] = useState('');
  const [classSection, setClassSection] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  useEffect(() => {
    if (!user?.phone) return;
    loadCustomerProfile(user.phone).then((profile) => {
      setName(user.name ?? profile.name);
      setStudentName(profile.studentName);
      setSchool(profile.school);
    });
  }, [user]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Personal Details" subtitle="Your account information" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.form}>
        <Input label="Full Name" value={name} onChangeText={setName} placeholder="Your full name" />
        <Input label="Mobile Number" value={phone ? `+91 ${phone}` : ''} editable={false} />
        <Input label="Student Name" value={studentName} onChangeText={setStudentName} placeholder="Student name" />
        <Input label="School / Office" value={school} onChangeText={setSchool} placeholder="School or office name" />
        <Input label="Class / Section" value={classSection} onChangeText={setClassSection} placeholder="Class or section" />
        <Input label="Emergency Contact" value={emergencyContact} onChangeText={setEmergencyContact} placeholder="Emergency contact number" keyboardType="phone-pad" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  form: { padding: spacing.lg, paddingBottom: 32 },
});
