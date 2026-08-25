/** Default map center — Chennai, Tamil Nadu */
export const DEFAULT_MAP_CENTER = { lat: 13.0827, lng: 80.2707 };
/** Demo pickup — Chennai residential area */
export const DEMO_PICKUP = { lat: 13.0418, lng: 80.2341 };
/** Demo drop — Chennai school / college zone */
export const DEMO_DROP = { lat: 13.0067, lng: 80.2576 };
/** Thisaiyanvilai / Idaichivilai area (Kanyakumari district) */
export const IDAICHIvilai_CENTER = { lat: 8.297, lng: 77.318 };
/** Nagercoil town center */
export const NAGERCOIL_CENTER = { lat: 8.1833, lng: 77.4119 };
/** @deprecated use IDAICHIvilai_CENTER */
export const KANYAKUMARI_CENTER = IDAICHIvilai_CENTER;
/** Max distance (km) from Chennai center for a stored coordinate to be trusted by default */
export const CHENNAI_SERVICE_RADIUS_KM = 150;

type LocalityEntry = {
  tokens: string[];
  point: { lat: number; lng: number };
  /** Higher priority wins when multiple tokens match the same address */
  priority: number;
  trustRadiusKm: number;
};

const KNOWN_LOCALITY_COORDS: LocalityEntry[] = [
  {
    tokens: [
      'thisai technologies',
      'thisai tech',
      'thisaiyanvilai',
      'thisaiyan vilai',
      'thisaiyan',
      'idaichivilai',
      'idaichivil',
      'idai chivilai',
      'thisai',
    ],
    point: IDAICHIvilai_CENTER,
    priority: 22,
    trustRadiusKm: 14,
  },
  {
    tokens: ['nagercoil', 'nagarkovil', 'nager coil'],
    point: NAGERCOIL_CENTER,
    priority: 20,
    trustRadiusKm: 12,
  },
  {
    tokens: ['marthandam'],
    point: { lat: 8.3014, lng: 77.4122 },
    priority: 20,
    trustRadiusKm: 18,
  },
  {
    tokens: ['tirunelveli', 'thirunelveli', 'nellai', 'palayamkottai'],
    point: { lat: 8.7139, lng: 77.7567 },
    priority: 20,
    trustRadiusKm: 18,
  },
  {
    tokens: ['tuticorin', 'thoothukudi', 'toothukudi'],
    point: { lat: 8.7642, lng: 78.1348 },
    priority: 18,
    trustRadiusKm: 16,
  },
  {
    tokens: ['tenkasi'],
    point: { lat: 8.9593, lng: 77.3152 },
    priority: 18,
    trustRadiusKm: 14,
  },
  {
    tokens: ['kanyakumari', 'kumari'],
    point: { lat: 8.0883, lng: 77.5385 },
    priority: 8,
    trustRadiusKm: 40,
  },
  { tokens: ['chennai'], point: DEFAULT_MAP_CENTER, priority: 10, trustRadiusKm: CHENNAI_SERVICE_RADIUS_KM },
  { tokens: ['coimbatore'], point: { lat: 11.0168, lng: 76.9558 }, priority: 10, trustRadiusKm: 40 },
  { tokens: ['madurai'], point: { lat: 9.9252, lng: 78.1198 }, priority: 10, trustRadiusKm: 40 },
];

function hashAddress(address: string): number {
  let hash = 0;
  for (let i = 0; i < address.length; i += 1) {
    hash = (hash << 5) - hash + address.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function offsetPoint(point: { lat: number; lng: number }, address: string): { lat: number; lng: number } {
  const hash = hashAddress(address.trim().toLowerCase());
  return {
    lat: point.lat + (((hash % 100) - 50) / 10000),
    lng: point.lng + ((((hash >> 8) % 100) - 50) / 10000),
  };
}

export function resolveKnownLocalityMatch(address: string): LocalityEntry | null {
  const normalized = address.trim().toLowerCase();
  if (!normalized) return null;

  let best: LocalityEntry | null = null;
  let bestTokenLength = 0;

  for (const entry of KNOWN_LOCALITY_COORDS) {
    for (const token of entry.tokens) {
      if (!normalized.includes(token)) continue;
      if (
        !best ||
        entry.priority > best.priority ||
        (entry.priority === best.priority && token.length > bestTokenLength)
      ) {
        best = entry;
        bestTokenLength = token.length;
      }
    }
  }

  return best;
}

export function resolveKnownLocalityPoint(address: string): { lat: number; lng: number } | null {
  const match = resolveKnownLocalityMatch(address);
  if (!match) return null;
  return offsetPoint(match.point, address);
}

export function resolveAddressLocalityAnchor(
  address: string,
): { point: { lat: number; lng: number }; radiusKm: number } | null {
  const match = resolveKnownLocalityMatch(address);
  if (!match) return null;
  return { point: match.point, radiusKm: match.trustRadiusKm };
}
