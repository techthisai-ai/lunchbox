import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../constants/theme';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminDriversScreen } from '../screens/admin/AdminDriversScreen';
import { AdminLoginScreen } from '../screens/admin/AdminLoginScreen';
import { AdminOrdersScreen } from '../screens/admin/AdminOrdersScreen';
import { AdminProfileScreen } from '../screens/admin/AdminProfileScreen';
import { DriverDeliveriesScreen } from '../screens/driver/DriverDeliveriesScreen';
import { DriverHomeScreen } from '../screens/driver/DriverHomeScreen';
import { DriverLoginScreen } from '../screens/driver/DriverLoginScreen';
import { DriverProfileScreen } from '../screens/driver/DriverProfileScreen';
import { DeliveryStatusScreen } from '../screens/DeliveryStatusScreen';
import { FoodReadyScreen } from '../screens/FoodReadyScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { QRTrackingScreen } from '../screens/QRTrackingScreen';
import { ReferralScreen } from '../screens/ReferralScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { RoleSelectScreen } from '../screens/RoleSelectScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { SubscriptionScreen } from '../screens/SubscriptionScreen';
import { SupportScreen } from '../screens/SupportScreen';
import { TrackingScreen } from '../screens/TrackingScreen';
import { WalletScreen } from '../screens/WalletScreen';
import {
  AdminTabParamList,
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
const AdminTab = createBottomTabNavigator<AdminTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const TrackStack = createNativeStackNavigator<TrackStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const stackScreenOptions = {
  headerShown: false,
  animation: 'slide_from_right' as const,
  contentStyle: { backgroundColor: colors.bg },
  gestureEnabled: true,
};

const defaultTabBarStyle = {
  height: 64,
  paddingBottom: 10,
  paddingTop: 8,
  borderTopColor: colors.border,
  backgroundColor: colors.white,
};

function tabBarStyleForRoute(route: Parameters<typeof getFocusedRouteNameFromRoute>[0], rootScreens: string[]) {
  const focused = getFocusedRouteNameFromRoute(route) ?? rootScreens[0];
  if (!rootScreens.includes(focused)) {
    return { display: 'none' as const };
  }
  return defaultTabBarStyle;
}

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={stackScreenOptions}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
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
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
      <ProfileStack.Screen name="Wallet" component={WalletScreen} />
      <ProfileStack.Screen name="Subscription" component={SubscriptionScreen} />
      <ProfileStack.Screen name="Referral" component={ReferralScreen} />
      <ProfileStack.Screen name="Support" component={SupportScreen} />
    </ProfileStack.Navigator>
  );
}

function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
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
      <Tab.Screen name="Home" component={HomeStackNavigator} options={({ route }) => ({ tabBarStyle: tabBarStyleForRoute(route, ['Home']) })} />
      <Tab.Screen name="Track" component={TrackStackNavigator} options={({ route }) => ({ title: 'Track', tabBarStyle: tabBarStyleForRoute(route, ['Tracking']) })} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} options={({ route }) => ({ tabBarStyle: tabBarStyleForRoute(route, ['Profile']) })} />
    </Tab.Navigator>
  );
}

function DriverTabsNavigator() {
  return (
    <DriverTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: defaultTabBarStyle,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
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

function AdminTabsNavigator() {
  return (
    <AdminTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: defaultTabBarStyle,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            AdminDashboard: 'grid',
            AdminOrders: 'receipt',
            AdminDrivers: 'bicycle',
            AdminProfile: 'person',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <AdminTab.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Dashboard' }} />
      <AdminTab.Screen name="AdminOrders" component={AdminOrdersScreen} options={{ title: 'Orders' }} />
      <AdminTab.Screen name="AdminDrivers" component={AdminDriversScreen} options={{ title: 'Drivers' }} />
      <AdminTab.Screen name="AdminProfile" component={AdminProfileScreen} options={{ title: 'Profile' }} />
    </AdminTab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.white },
        gestureEnabled: true,
      }}
    >
      <RootStack.Screen name="Splash" component={SplashScreen} options={{ animation: 'fade' }} />
      <RootStack.Screen name="RoleSelect" component={RoleSelectScreen} />
      <RootStack.Screen name="Login" component={LoginScreen} />
      <RootStack.Screen name="Register" component={RegisterScreen} />
      <RootStack.Screen name="DriverLogin" component={DriverLoginScreen} />
      <RootStack.Screen name="AdminLogin" component={AdminLoginScreen} />
      <RootStack.Screen name="MainTabs" component={CustomerTabs} options={{ animation: 'fade_from_bottom' }} />
      <RootStack.Screen name="DriverTabs" component={DriverTabsNavigator} options={{ animation: 'fade_from_bottom' }} />
      <RootStack.Screen name="AdminTabs" component={AdminTabsNavigator} options={{ animation: 'fade_from_bottom' }} />
    </RootStack.Navigator>
  );
}
