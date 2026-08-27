import { Alert } from 'react-native';
import { loadCustomerProfile } from '../services/orderHubService';
import {
  formatPickupAreaSlotLabel,
  getPickupAreaForAddress,
  isWithinPickupBookingWindow,
} from '../services/pickupAreaSlotService';

/** Prefer saved profile address so slot alerts follow profile edits immediately. */
export async function resolveCustomerPickupAddress(
  phone: string,
  orderPickupAddress?: string | null,
): Promise<string> {
  const profile = await loadCustomerProfile(phone);
  return profile.address?.trim() || orderPickupAddress?.trim() || '';
}

export async function getPickupSlotBlockInfo(
  pickupAddress: string,
): Promise<{ blocked: boolean; message: string | null }> {
  const area = await getPickupAreaForAddress(pickupAddress, { fresh: true });
  if (!area) {
    return { blocked: true, message: 'No pickup booking slot is configured for this area.' };
  }
  const message = formatPickupAreaSlotLabel(area);
  if (isWithinPickupBookingWindow(area)) {
    return { blocked: false, message };
  }
  return { blocked: true, message };
}

/** Shows the area pickup slot alert and returns true when booking must be blocked. */
export async function blockPickupOutsideAreaSlot(pickupAddress: string): Promise<boolean> {
  const { blocked, message } = await getPickupSlotBlockInfo(pickupAddress);
  if (!blocked) return false;
  Alert.alert('Pickup Slot', message ?? 'Pickup is not available right now.');
  return true;
}

export async function getPickupBookingBlockMessage(pickupAddress: string): Promise<string | null> {
  const area = await getPickupAreaForAddress(pickupAddress, { fresh: true });
  if (!area) return 'No pickup booking slot is configured for this area.';
  if (isWithinPickupBookingWindow(area)) return null;
  return formatPickupAreaSlotLabel(area);
}
