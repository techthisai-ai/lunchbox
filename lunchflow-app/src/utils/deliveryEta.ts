import { DEMO_DROP, DEMO_PICKUP } from '../constants/maps';
import { resolveMapPoint, estimateTravelMinutes, isRecentGpsLocation } from '../services/mapGeocoding';
import { DeliveryOrder, GeoPoint, getDropAddress } from '../types/delivery';

function resolvePickup(order: DeliveryOrder): GeoPoint {
  return resolveMapPoint(order.pickupLocation, order.pickupAddress, DEMO_PICKUP);
}

function resolveDrop(order: DeliveryOrder): GeoPoint {
  return resolveMapPoint(order.dropLocation, getDropAddress(order), DEMO_DROP);
}

export function getEtaDestination(order: DeliveryOrder): GeoPoint | null {
  if (!order.driver || order.status === 'delivered') return null;

  if (['in_transit', 'picked_up', 'at_drop'].includes(order.status)) {
    return resolveDrop(order);
  }

  if (!['booked', 'awaiting_driver', 'food_ready', 'pickup_closed'].includes(order.status)) {
    return resolvePickup(order);
  }

  return null;
}

export function getEtaDestinationLabel(order: DeliveryOrder): string {
  if (['in_transit', 'picked_up', 'at_drop'].includes(order.status)) {
    return order.school || getDropAddress(order);
  }
  return order.pickupAddress.split(',')[0]?.trim() || 'pickup';
}

export function computeLiveEtaMinutes(order: DeliveryOrder, now = Date.now()): number | null {
  if (!order.driver || order.status === 'delivered') return null;
  if (order.status === 'at_drop') return 1;

  if (order.driverLocation && isRecentGpsLocation(order.driverLocation.updatedAt)) {
    const destination = getEtaDestination(order);
    if (destination) {
      return estimateTravelMinutes(order.driverLocation, destination);
    }
  }

  if (order.estimatedArrivalAtIso) {
    const remainingMs = new Date(order.estimatedArrivalAtIso).getTime() - now;
    return Math.max(0, Math.ceil(remainingMs / 60000));
  }

  if (order.driver.etaMinutes != null) {
    return Math.max(0, order.driver.etaMinutes);
  }

  if (order.routePlan?.etaMinutes != null) {
    return Math.max(0, order.routePlan.etaMinutes);
  }

  return null;
}
