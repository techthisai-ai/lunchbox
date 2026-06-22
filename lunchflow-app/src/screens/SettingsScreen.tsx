import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { ProfileStackParamList } from '../navigation/types';
import {
  getLanguageLabel,
  loadLanguagePreference,
  loadNotificationPreferences,
  saveNotificationPreferences,
} from '../services/customerPreferencesService';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Settings'>;

type SettingRow = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  toggleKey?: 'push' | 'sms' | 'whatsapp';
  route?: 'Language' | 'PrivacySecurity';
};

export function SettingsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [toggles, setToggles] = useState({
    push: true,
    sms: true,
    whatsapp: true,
  });
  const [languageLabel, setLanguageLabel] = useState('English');

  const settings: SettingRow[] = [
    { icon: 'notifications-outline', label: 'Push Notifications', sub: 'Delivery & pickup alerts', toggleKey: 'push' },
    { icon: 'chatbubble-outline', label: 'SMS Updates', sub: 'Order status via SMS', toggleKey: 'sms' },
    { icon: 'logo-whatsapp', label: 'WhatsApp Updates', sub: 'Live delivery updates', toggleKey: 'whatsapp' },
    { icon: 'language-outline', label: 'Language', sub: languageLabel, route: 'Language' },
    { icon: 'shield-checkmark-outline', label: 'Privacy & Security', route: 'PrivacySecurity' },
  ];

  useFocusEffect(
    useCallback(() => {
      if (!user?.phone) return;
      loadNotificationPreferences(user.phone).then((prefs) => {
        setToggles(prefs);
      });
      loadLanguagePreference(user.phone).then((language) => {
        setLanguageLabel(getLanguageLabel(language));
      });
    }, [user?.phone]),
  );

  const updateToggle = async (key: 'push' | 'sms' | 'whatsapp', value: boolean) => {
    const next = { ...toggles, [key]: value };
    setToggles(next);
    if (user?.phone) {
      await saveNotificationPreferences(user.phone, next);
    }
  };

  const handleRowPress = (item: SettingRow) => {
    if (item.route) {
      navigation.navigate(item.route);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Settings" subtitle="Manage your preferences" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {settings.map((item) => (
          <Pressable
            key={item.label}
            style={styles.row}
            onPress={() => handleRowPress(item)}
            disabled={!item.route && !item.toggleKey}
          >
            <View style={styles.left}>
              <View style={styles.icon}>
                <Ionicons name={item.icon} size={18} color={colors.text} />
              </View>
              <View>
                <Text style={styles.label}>{item.label}</Text>
                {item.sub ? <Text style={styles.sub}>{item.sub}</Text> : null}
              </View>
            </View>
            {item.toggleKey ? (
              <Switch
                value={toggles[item.toggleKey]}
                onValueChange={(value) => updateToggle(item.toggleKey!, value)}
                trackColor={{ true: colors.orange, false: colors.border }}
                thumbColor={colors.white}
              />
            ) : item.route ? (
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            ) : null}
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontWeight: '600', fontSize: 14 },
  sub: { fontSize: 11, color: colors.muted, marginTop: 2 },
});
