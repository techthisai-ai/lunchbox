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
  loadNotificationPreferences,
  saveNotificationPreferences,
} from '../services/customerPreferencesService';
type Props = NativeStackScreenProps<ProfileStackParamList, 'Settings'>;

type SettingRow = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  toggle?: boolean;
};

const settings: SettingRow[] = [
  { icon: 'notifications-outline', label: 'Push Notifications', sub: 'Delivery & pickup alerts', toggle: true },
  { icon: 'chatbubble-outline', label: 'SMS Updates', sub: 'Order status via SMS', toggle: true },
  { icon: 'logo-whatsapp', label: 'WhatsApp Updates', sub: 'Live delivery updates', toggle: true },
  { icon: 'language-outline', label: 'Language', sub: 'English' },
  { icon: 'shield-checkmark-outline', label: 'Privacy & Security' },
];

export function SettingsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [toggles, setToggles] = useState({
    push: true,
    sms: true,
    whatsapp: true,
  });

  const toggleKeys = ['push', 'sms', 'whatsapp'] as const;

  useFocusEffect(
    useCallback(() => {
      if (!user?.phone) return;
      loadNotificationPreferences(user.phone).then((prefs) => {
        setToggles(prefs);
      });
    }, [user?.phone]),
  );

  const updateToggle = async (key: (typeof toggleKeys)[number], value: boolean) => {
    const next = { ...toggles, [key]: value };
    setToggles(next);
    if (user?.phone) {
      await saveNotificationPreferences(user.phone, next);
    }
  };

  return (    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Settings" subtitle="Manage your preferences" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {settings.map((item, index) => (
          <Pressable key={item.label} style={styles.row}>
            <View style={styles.left}>
              <View style={styles.icon}>
                <Ionicons name={item.icon} size={18} color={colors.text} />
              </View>
              <View>
                <Text style={styles.label}>{item.label}</Text>
                {item.sub ? <Text style={styles.sub}>{item.sub}</Text> : null}
              </View>
            </View>
            {item.toggle ? (
              <Switch
                value={toggles[toggleKeys[index]]}
                onValueChange={(value) => updateToggle(toggleKeys[index], value)}
                trackColor={{ true: colors.orange, false: colors.border }}
                thumbColor={colors.white}
              />
            ) : (              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            )}
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
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
