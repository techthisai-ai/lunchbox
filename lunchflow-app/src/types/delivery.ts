export type DeliveryType = 'school' | 'college' | 'office';

/** @deprecated legacy stored values */
export type LegacyDeliveryType = 'student' | 'other';

export type FoodReadyDetails = {
  name: string;
  pickupAddress: string;
  dropAddress: string;
  person: string;
  deliveryType: DeliveryType;
};

export function normalizeDeliveryType(type?: DeliveryType | LegacyDeliveryType | string): DeliveryType {
  if (type === 'college' || type === 'other') return 'college';
  if (type === 'office') return 'office';
  if (type === 'school' || type === 'student') return 'school';
  return 'school';
}

export type DeliveryStatus =
  | 'booked'
  | 'food_ready'
  | 'awaiting_driver'
  | 'driver_assigned'
  | 'at_pickup'
  | 'pickup_verified'
  | 'picked_up'
  | 'in_transit'
  | 'at_drop'
  | 'delivered'
  | 'pickup_closed';

export type DeliveryProofMeta = {
  otpVerified?: boolean;
  qrVerified?: boolean;
  gpsLat?: number;
  gpsLng?: number;
  proofImageUrl?: string;
};

export type DeliveryDriver = {
  id: string;
  name: string;
  vehicle: string;
  rating: string;
  initials: string;
  etaMinutes: number | null;
};

export type GeoPoint = {
  lat: number;
  lng: number;
};

export type DriverLocation = GeoPoint & {
  updatedAt: string;
};

export type RouteStop = {
  orderId: string;
  type: 'pickup' | 'drop';
  address: string;
  label: string;
  sequence: number;
};

export type RoutePlan = {
  stops: RouteStop[];
  totalStops: number;
  etaMinutes: number;
  plannedAt: string;
};

export type DeliveryOrder = {
  id: string;
  customerId: string;
  customerPhone: string;
  customerName: string;
  status: DeliveryStatus;
  studentName: string;
  school: string;
  deliveryType: DeliveryType;
  pickupAddress: string;
  dropAddress: string;
  estimatedArrival: string | null;
  bookedAt: string | null;
  foodReadyAt: string | null;
  pickupVerifiedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  pickupOtp: string;
  qrCode: string;
  pickupLocation: GeoPoint | null;
  dropLocation: GeoPoint | null;
  driverLocation: DriverLocation | null;
  driver: DeliveryDriver | null;
  routePlan: RoutePlan | null;
  date: string;
  batchId?: string;
  pickupReadyAtIso?: string | null;
  pickupExpiresAtIso?: string | null;
  pickupClosedAt?: string | null;
  deliveryProof?: DeliveryProofMeta | null;
};

export type DeliveryProfile = {
  name: string;
  studentName: string;
  school: string;
  address: string;
  deliveryType?: DeliveryType;
};

export function getDropAddress(order: Pick<DeliveryOrder, 'dropAddress' | 'school'>): string {
  return order.dropAddress || order.school;
}

export function getDeliveryTypeLabel(type: DeliveryType | LegacyDeliveryType | string): string {
  const normalized = normalizeDeliveryType(type);
  if (normalized === 'office') return 'Office';
  if (normalized === 'college') return 'College';
  return 'School';
}

export function getPersonLabel(type: DeliveryType | LegacyDeliveryType | string): string {
  const normalized = normalizeDeliveryType(type);
  if (normalized === 'office') return 'Employee Name';
  if (normalized === 'college') return 'Student Name';
  return 'Student Name';
}

export function getInstitutionLabel(type: DeliveryType | LegacyDeliveryType | string): string {
  const normalized = normalizeDeliveryType(type);
  if (normalized === 'office') return 'Office Name';
  if (normalized === 'college') return 'College Name';
  return 'School Name';
}

export function getDetailLabel(type: DeliveryType | LegacyDeliveryType | string): string {
  const normalized = normalizeDeliveryType(type);
  if (normalized === 'office') return 'Department / Floor';
  if (normalized === 'college') return 'Course / Year / Section';
  return 'Class / Section';
}

export const REGISTRATION_TYPE_OPTIONS: { id: DeliveryType; label: string }[] = [
  { id: 'school', label: 'Student' },
  { id: 'college', label: 'College' },
  { id: 'office', label: 'Office' },
];
