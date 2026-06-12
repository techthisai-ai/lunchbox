import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors } from '../constants/theme';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Create Account" subtitle="Register for daily lunchbox delivery" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.form}>
        <Input label="Full Name" defaultValue="Priya Sharma" />
        <Input label="Mobile Number" defaultValue="+91 98765 43210" keyboardType="phone-pad" />
        <Input label="Home Address" defaultValue="42 Green Park, Delhi" />
        <Input label="School / Office Name" defaultValue="Delhi Public School" />
        <Input label="Student Name" defaultValue="Aarav Sharma" />
        <Input label="Class / Section" defaultValue="Class 5 · Section B" />
        <Input label="Emergency Contact" defaultValue="+91 91234 56789" keyboardType="phone-pad" />
        <Button title="Complete Registration" variant="green" onPress={() => navigation.replace('MainTabs', { screen: 'Home', params: { screen: 'Home' } })} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  form: { padding: 16, paddingBottom: 40 },
});
