import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminWebPortal } from '../screens/admin/AdminWebPortal';
import { AdminLoginScreen } from '../screens/admin/AdminLoginScreen';
import { colors } from '../constants/theme';

export type AdminWebStackParamList = {
  AdminLogin: undefined;
  AdminPortal: undefined;
};

const Stack = createNativeStackNavigator<AdminWebStackParamList>();

export function AdminWebNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
      <Stack.Screen name="AdminPortal">
        {({ navigation }) => (
          <AdminWebPortal
            onLogout={() => {
              navigation.reset({ index: 0, routes: [{ name: 'AdminLogin' }] });
            }}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
