import { RootStackParamList } from './types';

type AdminRootNavigation = {
  reset: (state: {
    index: number;
    routes: { name: keyof RootStackParamList; params?: object }[];
  }) => void;
  replace: (name: keyof RootStackParamList, params?: object) => void;
};

export function goToAdminPortal(navigation: AdminRootNavigation) {
  navigation.reset({
    index: 0,
    routes: [{ name: 'AdminPortal' }],
  });
}
