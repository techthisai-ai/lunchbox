import { OrderDoc, OrderStatus } from '../config';

export type StatusMessage = {
  title: string;
  sms: string;
  whatsapp: string;
  push: string;
};

function dropLabel(order: OrderDoc): string {
  return order.dropAddress || order.school || 'delivery location';
}

export function buildStatusMessage(status: OrderStatus, order: OrderDoc): StatusMessage | null {
  const student = order.studentName || 'your lunchbox';
  const orderId = order.id || 'order';
  const driverName = order.driver?.name ?? 'your driver';
  const vehicle = order.driver?.vehicle ?? '';
  const pickup = order.pickupAddress || 'pickup location';
  const drop = dropLabel(order);
  const eta = order.estimatedArrival ? ` ETA ${order.estimatedArrival}.` : '';
  const otp = order.pickupOtp ? ` Pickup OTP: ${order.pickupOtp}.` : '';

  switch (status) {
    case 'booked':
      return {
        title: 'Order Booked',
        sms: `LunchFlow: Order ${orderId} booked for ${student}.`,
        whatsapp: `Your LunchFlow order ${orderId} for ${student} is confirmed.`,
        push: `Order booked for ${student}.`,
      };
    case 'food_ready':
    case 'awaiting_driver':
      return {
        title: 'Food Ready',
        sms: `LunchFlow: Food ready for ${student}. Share OTP at pickup.${otp}`,
        whatsapp: `Food is ready for ${student}. We are assigning a driver.${otp}`,
        push: `Food ready for ${student}.${otp ? ` OTP ${order.pickupOtp}` : ''}`,
      };
    case 'pickup_closed':
      return {
        title: 'Pickup Closed',
        sms: `LunchFlow: Pickup window expired for order ${orderId}.`,
        whatsapp: `Pickup window expired for order ${orderId}. Please contact support if needed.`,
        push: `Pickup window expired for order ${orderId}.`,
      };
    case 'driver_assigned':
      return {
        title: 'Driver Assigned',
        sms: `LunchFlow: ${driverName} assigned for ${student}.${eta}`,
        whatsapp: `Driver ${driverName}${vehicle ? ` (${vehicle})` : ''} is assigned for ${student}.${eta}`,
        push: `${driverName} is on the way.${eta}`,
      };
    case 'at_pickup':
      return {
        title: 'Driver at Pickup',
        sms: `LunchFlow: ${driverName} arrived at ${pickup}.`,
        whatsapp: `${driverName} has reached your pickup location: ${pickup}.`,
        push: `${driverName} arrived at pickup.`,
      };
    case 'pickup_verified':
      return {
        title: 'Pickup Verified',
        sms: `LunchFlow: Pickup verified for ${student}.`,
        whatsapp: `Pickup confirmed for ${student}. Your lunchbox is being collected.`,
        push: `Pickup verified for ${student}.`,
      };
    case 'picked_up':
    case 'in_transit':
      return {
        title: 'Out for Delivery',
        sms: `LunchFlow: Picked up for ${student}. Heading to ${drop}.`,
        whatsapp: `Lunchbox picked up for ${student} and heading to ${drop}.`,
        push: `Lunchbox picked up. Heading to ${drop}.`,
      };
    case 'at_drop':
      return {
        title: 'Arrived at Drop',
        sms: `LunchFlow: Driver arrived at ${drop}.`,
        whatsapp: `Your lunchbox has reached ${drop}.`,
        push: `Driver arrived at ${drop}.`,
      };
    case 'delivered':
      return {
        title: 'Delivered',
        sms: `LunchFlow: Delivered to ${drop}${order.deliveredAt ? ` at ${order.deliveredAt}` : ''}.`,
        whatsapp: `Lunchbox delivered successfully to ${drop}. Thank you for using LunchFlow!`,
        push: `Delivered to ${drop}.`,
      };
    default:
      return null;
  }
}

export function buildDriverAssignmentMessage(order: OrderDoc): StatusMessage {
  const student = order.studentName || 'customer';
  const pickup = order.pickupAddress || 'pickup location';
  return {
    title: 'New Pickup Assigned',
    sms: `LunchFlow: New pickup for ${student} at ${pickup}.`,
    whatsapp: `New pickup assigned: ${student} at ${pickup}.`,
    push: `New pickup: ${student} · ${pickup}`,
  };
}
