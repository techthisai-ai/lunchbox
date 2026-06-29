import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, radius, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { ProfileStackParamList } from '../navigation/types';
import {
  AppLanguage,
  LANGUAGE_OPTIONS,
  loadLanguagePreference,
  saveLanguagePreference,
} from '../services/customerPreferencesService';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Language'>;

export function LanguageScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<AppLanguage>('en');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user?.phone) return;
      loadLanguagePreference(user.phone).then(setSelected);
    }, [user?.phone]),
  );

  const selectLanguage = async (language: AppLanguage) => {
    if (!user?.phone || language === selected) return;
    setSaving(true);
    setSelected(language);
    try {
      await saveLanguagePreference(user.phone, language);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Language" subtitle="Choose your preferred language" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {LANGUAGE_OPTIONS.map((option) => {
          const active = selected === option.code;
          return (
            <Pressable
              key={option.code}
              style={[styles.option, active && styles.optionActive]}
              onPress={() => selectLanguage(option.code)}
              disabled={saving}
            >
              <View style={styles.optionText}>
                <Text style={styles.label}>{option.label}</Text>
                <Text style={styles.nativeLabel}>{option.nativeLabel}</Text>
              </View>
              {active ? <Ionicons name="checkmark-circle" size={22} color={colors.orange} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: 32 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 16,
    marginBottom: 10,
  },
  optionActive: { borderColor: colors.orange, backgroundColor: colors.orangeLight },
  optionText: { flex: 1 },
  label: { fontWeight: '700', fontSize: 15, color: colors.text },
  nativeLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
