import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { DriverChangePasswordScreen } from '../screens/driver/DriverChangePasswordScreen';
import { DriverDeliveriesScreen } from '../screens/driver/DriverDeliveriesScreen';
import { DriverHomeScreen } from '../screens/driver/DriverHomeScreen';
import { DriverLoginScreen } from '../screens/driver/DriverLoginScreen';
import { DriverRegisterScreen } from '../screens/driver/DriverRegisterScreen';
import { DriverProfileScreen } from '../screens/driver/DriverProfileScreen';
import { DriverNotificationsScreen } from '../screens/driver/DriverNotificationsScreen';
import { DriverPendingApprovalScreen } from '../screens/driver/DriverPendingApprovalScreen';
import { DeliveryStatusScreen } from '../screens/DeliveryStatusScreen';
import { FoodReadyScreen } from '../screens/FoodReadyScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { AdminPortalScreen } from '../screens/admin/AdminPortalScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { LanguageScreen } from '../screens/LanguageScreen';
import { PrivacySecurityScreen } from '../screens/PrivacySecurityScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { PersonalDetailsScreen } from '../screens/PersonalDetailsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SavedAddressesScreen } from '../screens/SavedAddressesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { QRTrackingScreen } from '../screens/QRTrackingScreen';
import { ReferralScreen } from '../screens/ReferralScreen';
import { OtpVerifyScreen } from '../screens/OtpVerifyScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { SubscriptionScreen } from '../screens/SubscriptionScreen';
import { SupportScreen } from '../screens/SupportScreen';
import { TrackingScreen } from '../screens/TrackingScreen';
import { WalletScreen } from '../screens/WalletScreen';
import {
  DriverTabParamList,
  HomeStackParamList,
  MainTabParamList,
  ProfileStackParamList,
  RootStackParamList,
  TrackStackParamList,
} from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const DriverTab = createBottomTabNavigator<DriverTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const TrackStack = createNativeStackNavigator<TrackStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const stackScreenOptions = {
  headerShown: false,
  animation: 'slide_from_right' as const,
  contentStyle: { backgroundColor: colors.bg },
  gestureEnabled: true,
};

function useTabBarStyle() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'web' ? 12 : 8);

  return {
    minHeight: 68 + bottomInset,
    paddingBottom: bottomInset,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  };
}

const tabBarLabelStyle = {
  fontSize: 11,
  fontWeight: '600' as const,
  lineHeight: 14,
  marginTop: 2,
  marginBottom: Platform.OS === 'web' ? 4 : 0,
};

const tabBarIconStyle = {
  marginBottom: 0,
};

function tabBarStyleForRoute(
  route: Parameters<typeof getFocusedRouteNameFromRoute>[0],
  rootScreens: string[],
  baseStyle: ReturnType<typeof useTabBarStyle>,
) {
  const focused = getFocusedRouteNameFromRoute(route) ?? rootScreens[0];
  if (!rootScreens.includes(focused)) {
    return { display: 'none' as const };
  }
  return baseStyle;
}

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={stackScreenOptions}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="FoodReady" component={FoodReadyScreen} options={{ animation: 'slide_from_bottom' }} />
      <HomeStack.Screen name="Notifications" component={NotificationsScreen} />
    </HomeStack.Navigator>
  );
}

function TrackStackNavigator() {
  return (
    <TrackStack.Navigator screenOptions={stackScreenOptions}>
      <TrackStack.Screen name="Tracking" component={TrackingScreen} options={{ animation: 'fade' }} />
      <TrackStack.Screen name="DeliveryStatus" component={DeliveryStatusScreen} />
      <TrackStack.Screen name="QRTracking" component={QRTrackingScreen} />
    </TrackStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={stackScreenOptions}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="PersonalDetails" component={PersonalDetailsScreen} />
      <ProfileStack.Screen name="SavedAddresses" component={SavedAddressesScreen} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
      <ProfileStack.Screen name="Language" component={LanguageScreen} />
      <ProfileStack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
      <ProfileStack.Screen name="Wallet" component={WalletScreen} />
      <ProfileStack.Screen name="Subscription" component={SubscriptionScreen} />
      <ProfileStack.Screen name="Referral" component={ReferralScreen} />
      <ProfileStack.Screen name="Support" component={SupportScreen} />
    </ProfileStack.Navigator>
  );
}

function CustomerTabs() {
  const tabBarStyle = useTabBarStyle();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle,
        tabBarIconStyle,
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home: 'home',
            Track: 'navigate',
            History: 'time',
            Profile: 'person',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} options={({ route }) => ({ tabBarStyle: tabBarStyleForRoute(route, ['HomeMain'], tabBarStyle) })} />
      <Tab.Screen name="Track" component={TrackStackNavigator} options={({ route }) => ({ title: 'Track', tabBarStyle: tabBarStyleForRoute(route, ['Tracking'], tabBarStyle) })} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarStyle }} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} options={({ route }) => ({ tabBarStyle: tabBarStyleForRoute(route, ['ProfileMain'], tabBarStyle) })} />
    </Tab.Navigator>
  );
}

function DriverTabsNavigator() {
  const tabBarStyle = useTabBarStyle();

  return (
    <DriverTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle,
        tabBarLabelStyle,
        tabBarIconStyle,
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            DriverHome: 'home',
            DriverDeliveries: 'list',
            DriverProfile: 'person',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <DriverTab.Screen name="DriverHome" component={DriverHomeScreen} options={{ title: 'Home' }} />
      <DriverTab.Screen name="DriverDeliveries" component={DriverDeliveriesScreen} options={{ title: 'Deliveries' }} />
      <DriverTab.Screen name="DriverProfile" component={DriverProfileScreen} options={{ title: 'Profile' }} />
    </DriverTab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.bg },
        gestureEnabled: true,
      }}
    >
      <RootStack.Screen name="Splash" component={SplashScreen} options={{ animation: 'fade' }} />
      <RootStack.Screen name="Login" component={LoginScreen} options={{ animation: 'fade' }} />
      <RootStack.Screen name="OtpVerify" component={OtpVerifyScreen} />
      <RootStack.Screen name="Register" component={RegisterScreen} />
      <RootStack.Screen name="DriverLogin" component={DriverLoginScreen} />
      <RootStack.Screen name="DriverRegister" component={DriverRegisterScreen} />
      <RootStack.Screen
        name="SubscriptionOnboarding"
        component={SubscriptionScreen}
        options={{ animation: 'fade_from_bottom', gestureEnabled: false }}
      />
      <RootStack.Screen name="MainTabs" component={CustomerTabs} options={{ animation: 'fade_from_bottom' }} />
      <RootStack.Screen name="DriverTabs" component={DriverTabsNavigator} options={{ animation: 'fade_from_bottom' }} />
      <RootStack.Screen name="DriverPendingApproval" component={DriverPendingApprovalScreen} options={{ animation: 'fade' }} />
      <RootStack.Screen name="DriverNotifications" component={DriverNotificationsScreen} />
      <RootStack.Screen name="DriverChangePassword" component={DriverChangePasswordScreen} />
      <RootStack.Screen
        name="AdminPortal"
        component={AdminPortalScreen}
        options={{ animation: 'fade_from_bottom', gestureEnabled: false }}
      />
    </RootStack.Navigator>
  );
}
