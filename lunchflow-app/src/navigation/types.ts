import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Splash: undefined;
  RoleSelect: undefined;
  Login: undefined;
  Register: undefined;
  DriverLogin: undefined;
  AdminLogin: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  DriverTabs: NavigatorScreenParams<DriverTabParamList>;
  AdminTabs: NavigatorScreenParams<AdminTabParamList>;
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
  AdminProfile: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  FoodReady: undefined;
  Notifications: undefined;
};

export type TrackStackParamList = {
  Tracking: undefined;
  DeliveryStatus: undefined;
  QRTracking: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
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
