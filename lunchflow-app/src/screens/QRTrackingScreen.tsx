import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PickupVerificationModal } from '../components/PickupVerificationModal';
import { colors } from '../constants/theme';
import { useDelivery } from '../context/DeliveryContext';
import { TrackStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<TrackStackParamList, 'QRTracking'>;

export function QRTrackingScreen({ navigation }: Props) {
  const { order } = useDelivery();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ flex: 1 }} />
      <PickupVerificationModal visible order={order} onClose={() => navigation.goBack()} />
    </SafeAreaView>
  );
}
