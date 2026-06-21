import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Splash: undefined;
  RoleSelect: undefined;
  Login: { phone?: string } | undefined;
  Register: { phone?: string } | undefined;
  DriverLogin: { phone?: string } | undefined;
  DriverRegister: { phone?: string } | undefined;
  SubscriptionOnboarding: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  DriverTabs: NavigatorScreenParams<DriverTabParamList>;
};

export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Track: NavigatorScreenParams<TrackStackParamList>;
  History: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

export type DriverTabParamList = {
  DriverHome: undefined;
  DriverDeliveries: undefined;
  DriverProfile: undefined;
};

export type AdminTabParamList = {
  AdminDashboard: undefined;
  AdminOrders: undefined;
  AdminDrivers: undefined;
  AdminProfile: NavigatorScreenParams<AdminProfileStackParamList>;
};

export type AdminProfileStackParamList = {
  AdminProfileMain: undefined;
  AdminReports: undefined;
  AdminSalary: undefined;
  AdminExpenses: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  FoodReady: undefined;
  Notifications: undefined;
};

export type TrackStackParamList = {
  Tracking: undefined;
  DeliveryStatus: undefined;
  QRTracking: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  PersonalDetails: undefined;
  SavedAddresses: undefined;
  Settings: undefined;
  Wallet: undefined;
  Subscription: undefined;
  Referral: undefined;
  Support: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
