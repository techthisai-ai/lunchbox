import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminWebPortal } from '../screens/admin/AdminWebPortal';
import { AdminLoginScreen } from '../screens/admin/AdminLoginScreen';
import { colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export type AdminWebStackParamList = {
  AdminLogin: undefined;
  AdminPortal: undefined;
};

const Stack = createNativeStackNavigator<AdminWebStackParamList>();

export function AdminWebNavigator() {
  const { user, loading } = useAuth();
  const isAdminLoggedIn = user?.role === 'admin';

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.orange} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      key={isAdminLoggedIn ? 'admin-portal' : 'admin-login'}
      initialRouteName={isAdminLoggedIn ? 'AdminPortal' : 'AdminLogin'}
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

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
