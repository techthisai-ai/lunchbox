import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FullWidthProvider } from '../../context/FullWidthContext';
import { RootStackParamList } from '../../navigation/types';
import { AdminWebPortal } from './AdminWebPortal';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminPortal'>;

export function AdminPortalScreen({ navigation }: Props) {
  return (
    <FullWidthProvider enabled={true}>
      <AdminWebPortal
        onLogout={() => {
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        }}
      />
    </FullWidthProvider>
  );
}
