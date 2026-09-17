import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HistoryClockListIcon } from '../components/HistoryClockListIcon';
import { ProfileHeaderCard } from '../components/ProfileHeaderCard';
import { colors, shadow, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { ProfileStackParamList } from '../navigation/types';
import { getCustomerOrderToday, loadCustomerProfile } from '../services/orderHubService';
import { loadWallet } from '../services/paymentService';
import { buildFoodReadyStudents, getDropAddress, normalizeDeliveryType } from '../types/delivery';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileMain'>;

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function AddressPreviewRow({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.previewRow} onPress={onPress} disabled={!onPress}>
      <View style={[styles.previewIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.previewCopy}>
        <Text style={styles.previewTitle}>{title}</Text>
        <Text style={styles.previewSub} numberOfLines={2}>
          {subtitle || 'Not saved yet'}
        </Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null}
    </Pressable>
  );
}

function WalletPreviewRow({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  trailing,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  trailing?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.previewRow} onPress={onPress} disabled={!onPress}>
      <View style={[styles.previewIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.previewCopy}>
        <Text style={styles.previewTitle}>{title}</Text>
        <Text style={styles.previewSub}>{subtitle}</Text>
      </View>
      {trailing ? <Text style={styles.trailingPink}>{trailing}</Text> : null}
      {onPress && !trailing ? (
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      ) : null}
    </Pressable>
  );
}

function MenuRow({
  icon,
  iconBg,
  iconColor,
  iconElement,
  label,
  subtitle,
  highlighted,
  onPress,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor?: string;
  iconElement?: ReactNode;
  label: string;
  subtitle?: string;
  highlighted?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.menuRow, highlighted && styles.menuRowHighlighted]}
      onPress={onPress}
    >
      <View style={[styles.previewIcon, { backgroundColor: iconBg }]}>
        {iconElement ?? (icon ? <Ionicons name={icon} size={18} color={iconColor} /> : null)}
      </View>
      <View style={styles.menuCopy}>
        <Text style={styles.menuLabel}>{label}</Text>
        {subtitle ? <Text style={styles.menuSub}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

export function ProfileScreen({ navigation }: Props) {
  const { user, logout, refreshCustomerProfile, syncCustomerProfile } = useAuth();
  const { horizontalPadding } = useResponsive();
  const [homeAddress, setHomeAddress] = useState('');
  const [dropLabel, setDropLabel] = useState('School Drop');
  const [dropAddress, setDropAddress] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!user?.phone) {
        setHomeAddress('');
        setDropAddress('');
        return;
      }

      void refreshCustomerProfile();
      loadWallet(user.phone).then((wallet) => setWalletBalance(wallet?.balance ?? 0));

      Promise.all([loadCustomerProfile(user.phone), getCustomerOrderToday(user.phone)]).then(
        ([profile, order]) => {
          setHomeAddress(profile.address || order?.pickupAddress || '');

          const fallbackType = normalizeDeliveryType(order?.deliveryType ?? profile.deliveryType);
          const fallbackAddress = (order ? getDropAddress(order) : '') || profile.school || '';
          const students = buildFoodReadyStudents({
            studentEntries: order?.studentEntries,
            students: order?.studentEntries,
            person: order?.studentName || profile.studentName,
            dropAddress: fallbackAddress,
            deliveryType: fallbackType,
            deliveryTypes: order?.deliveryTypes,
          });

          const firstDrop = students.find((entry) => entry.dropLocation.trim());
          if (firstDrop) {
            setDropLabel(
              fallbackType === 'office' ? 'Office Drop' : fallbackType === 'college' ? 'College Drop' : 'School Drop',
            );
            setDropAddress(firstDrop.dropLocation.trim());
            return;
          }

          setDropLabel(
            fallbackType === 'office' ? 'Office Drop' : fallbackType === 'college' ? 'College Drop' : 'School Drop',
          );
          setDropAddress(fallbackAddress);
        },
      );
    }, [user?.phone]),
  );

  const handleLogout = async () => {
    await logout();
    navigation.getParent()?.getParent()?.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'Splash' }] }),
    );
  };

  const walletDisplay = `₹${walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.topBar, { paddingHorizontal: horizontalPadding }]}>
        <Text style={styles.pageTitle}>Profile</Text>
        <Pressable
          style={styles.settingsBtn}
          onPress={() => navigation.navigate('Settings')}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
        >
          <Ionicons name="settings-outline" size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPadding }]}
      >
        {user?.phone ? (
          <ProfileHeaderCard
            phone={user.phone}
            name={user.name}
            email={user.email}
            avatarUrl={user.avatarUrl}
            onProfileUpdated={(payload) => {
              void syncCustomerProfile({
                ...user,
                name: payload.name,
                email: payload.email,
                avatarUrl: payload.avatarUrl,
              });
            }}
          />
        ) : null}

        <SectionCard title="Saved Addresses">
          <Text style={styles.addressGroupLabel}>Pickup address</Text>
          <AddressPreviewRow
            icon="home-outline"
            iconBg={colors.orangeLight}
            iconColor={colors.orange}
            title="Home Pickup"
            subtitle={homeAddress}
            onPress={() => navigation.navigate('SavedAddresses', { focus: 'pickup' })}
          />
          <Text style={[styles.addressGroupLabel, styles.addressGroupLabelSpaced]}>Drop address</Text>
          <AddressPreviewRow
            icon="location-outline"
            iconBg={colors.orangeLight}
            iconColor={colors.orange}
            title={dropLabel}
            subtitle={dropAddress}
            onPress={() => navigation.navigate('SavedAddresses', { focus: 'drop' })}
          />
        </SectionCard>

        <SectionCard title="Payments & Wallet">
          <WalletPreviewRow
            icon="wallet-outline"
            iconBg="#FFF8E1"
            iconColor="#F59E0B"
            title="Wallet Balance"
            subtitle="Use for faster checkout"
            trailing={walletDisplay}
            onPress={() => navigation.navigate('Wallet')}
          />
        </SectionCard>

        <MenuRow
          icon="document-text-outline"
          iconBg={colors.orangeLight}
          iconColor={colors.orange}
          label="Subscription Details"
          subtitle="View plan and pricing details"
          onPress={() => navigation.navigate('SubscriptionDetails')}
        />

        <MenuRow
          iconBg={colors.orange}
          iconElement={<HistoryClockListIcon size={18} color="#FFFFFF" />}
          label="History"
          subtitle="View your past deliveries"
          onPress={() => navigation.getParent()?.navigate('Home', { screen: 'History' })}
        />

        <MenuRow
          icon="notifications-outline"
          iconBg="#E8EAF6"
          iconColor={colors.blue}
          label="Notifications & Alerts"
          onPress={() => navigation.getParent()?.navigate('Home', { screen: 'Notifications' })}
        />

        <MenuRow
          icon="shield-checkmark-outline"
          iconBg={colors.bg}
          iconColor={colors.muted}
          label="Security & OTP Settings"
          onPress={() => navigation.navigate('PrivacySecurity')}
        />

        <MenuRow
          icon="log-out-outline"
          iconBg={colors.redLight}
          iconColor={colors.red}
          label="Log Out"
          onPress={() => void handleLogout()}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingBottom: 32, gap: 12 },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: spacing.md,
    gap: 10,
    ...shadow.card,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  addressGroupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  addressGroupLabelSpaced: {
    marginTop: 8,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.bg,
    borderRadius: 14,
    padding: 12,
  },
  previewIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  previewCopy: { flex: 1, minWidth: 0 },
  previewTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  previewSub: { fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 17 },
  trailingPink: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.orange,
    flexShrink: 0,
  },
  manageLink: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.orange,
    flexShrink: 0,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    ...shadow.card,
  },
  menuRowHighlighted: {
    borderColor: colors.orange,
  },
  menuCopy: { flex: 1, minWidth: 0 },
  menuLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  menuSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 3,
    fontWeight: '600',
  },
});
