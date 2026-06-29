export type DeliveryType = 'school' | 'college' | 'office';

/** @deprecated legacy stored values */
export type LegacyDeliveryType = 'student' | 'other';

export type FoodReadyStudentEntry = {
  name: string;
  dropLocation: string;
  classSection: string;
  deliveryType: DeliveryType;
};

export type FoodReadyDetails = {
  name: string;
  pickupAddress: string;
  dropAddress: string;
  /** Comma-separated names for display and legacy callers */
  person: string;
  /** One or more student / employee names */
  persons?: string[];
  /** Full student rows with drop location and class / section */
  students?: FoodReadyStudentEntry[];
  /** Primary delivery type for legacy callers */
  deliveryType: DeliveryType;
  /** One or more selected where options */
  deliveryTypes?: DeliveryType[];
};

export function emptyFoodReadyStudent(deliveryType: DeliveryType = 'school'): FoodReadyStudentEntry {
  return { name: '', dropLocation: '', classSection: '', deliveryType };
}

export function normalizeDeliveryTypes(
  value?: DeliveryType | DeliveryType[] | null,
  fallback: DeliveryType = 'school',
): DeliveryType[] {
  if (Array.isArray(value) && value.length) {
    return [...new Set(value.map((entry) => normalizeDeliveryType(entry)))];
  }
  if (value) {
    return [normalizeDeliveryType(value)];
  }
  return [fallback];
}

export function buildFoodReadyStudents(
  initial?: Partial<FoodReadyDetails> & { studentEntries?: FoodReadyStudentEntry[] },
): FoodReadyStudentEntry[] {
  const defaultTypes = normalizeDeliveryTypes(
    initial?.deliveryTypes ?? initial?.studentEntries?.map((entry) => entry.deliveryType),
    normalizeDeliveryType(initial?.deliveryType),
  );
  const defaultType = defaultTypes[0];

  if (initial?.students?.length) {
    return initial.students.map((entry) => ({
      ...emptyFoodReadyStudent(defaultType),
      ...entry,
      deliveryType: normalizeDeliveryType(entry.deliveryType ?? defaultType),
    }));
  }
  if (initial?.studentEntries?.length) {
    return initial.studentEntries.map((entry) => ({
      ...emptyFoodReadyStudent(defaultType),
      ...entry,
      deliveryType: normalizeDeliveryType(entry.deliveryType ?? defaultType),
    }));
  }
  const names = parsePersonList(initial?.persons ?? initial?.person);
  const drop = initial?.dropAddress ?? '';
  return names.map((name) => ({ ...emptyFoodReadyStudent(defaultType), name, dropLocation: drop }));
}

export function formatStudentDisplayName(entries: FoodReadyStudentEntry[]): string {
  return entries
    .filter((entry) => entry.name.trim())
    .map((entry) => {
      const detail = entry.classSection.trim();
      return detail ? `${entry.name.trim()} (${detail})` : entry.name.trim();
    })
    .join(', ');
}

export function formatStudentDropAddresses(entries: FoodReadyStudentEntry[]): string {
  const drops = entries
    .filter((entry) => entry.name.trim())
    .map((entry) => entry.dropLocation.trim())
    .filter(Boolean);
  return [...new Set(drops)].join(' | ');
}

export function foodReadyStudentsToLegacy(entries: FoodReadyStudentEntry[]): {
  person: string;
  persons: string[];
  dropAddress: string;
} {
  const filled = entries.filter((entry) => entry.name.trim());
  const persons = filled.map((entry) => entry.name.trim());
  return {
    person: formatStudentDisplayName(filled),
    persons,
    dropAddress: formatStudentDropAddresses(filled) || filled[0]?.dropLocation.trim() || '',
  };
}

export function parsePersonList(value?: string | string[]): string[] {
  if (Array.isArray(value)) {
    const list = value.map((entry) => entry.trim()).filter(Boolean);
    return list.length ? list : [''];
  }
  const list = (value ?? '')
    .split(/[,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  return list.length ? list : [''];
}

export function formatPersonList(persons: string[]): string {
  return persons.map((entry) => entry.trim()).filter(Boolean).join(', ');
}

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
  phone?: string;
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
  deliveryTypes?: DeliveryType[];
  pickupAddress: string;
  dropAddress: string;
  estimatedArrival: string | null;
  estimatedArrivalAtIso?: string | null;
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
  assignedDriverPhone?: string;
  deliverySlotId?: string;
  deliverySlotLabel?: string;
  studentEntries?: FoodReadyStudentEntry[];
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
