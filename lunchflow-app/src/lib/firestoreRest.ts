import { Platform } from 'react-native';

export const FIRESTORE_REST_PROJECT = 'lunchbox-b660d';
export const FIRESTORE_REST_KEY = 'AIzaSyBMf_YlehISPQsIJvD-N3HlygVQyTkZrnM';

export function isMobileWebBrowser(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    )
  );
}

export function restDecodeField(field: Record<string, unknown>): unknown {
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return Number(field.integerValue);
  if ('doubleValue' in field) return Number(field.doubleValue);
  if ('booleanValue' in field) return field.booleanValue;
  if ('nullValue' in field) return null;
  if ('mapValue' in field && field.mapValue && typeof field.mapValue === 'object') {
    const mapFields = (field.mapValue as { fields?: Record<string, Record<string, unknown>> }).fields ?? {};
    return Object.fromEntries(
      Object.entries(mapFields).map(([key, value]) => [key, restDecodeField(value)]),
    );
  }
  if ('arrayValue' in field && field.arrayValue && typeof field.arrayValue === 'object') {
    const values = (field.arrayValue as { values?: Record<string, unknown>[] }).values ?? [];
    return values.map((value) => restDecodeField(value as Record<string, unknown>));
  }
  return undefined;
}

export function decodeRestDocument<T extends Record<string, unknown>>(
  doc: { name: string; fields?: Record<string, Record<string, unknown>> },
): T & { id: string } {
  const id = doc.name.split('/').pop() ?? '';
  const data = Object.fromEntries(
    Object.entries(doc.fields ?? {}).map(([key, value]) => [key, restDecodeField(value)]),
  ) as T;
  return { ...data, id };
}

export async function runFirestoreQuery(
  collectionId: string,
  fieldPath: string,
  value: string,
): Promise<Array<{ name: string; fields?: Record<string, Record<string, unknown>> }>> {
  const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_REST_PROJECT}/databases/(default)/documents:runQuery?key=${FIRESTORE_REST_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath },
            op: 'EQUAL',
            value: { stringValue: value },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Firestore query failed (${response.status})`);
  }

  const rows = (await response.json()) as Array<{ document?: { name: string; fields?: Record<string, Record<string, unknown>> } }>;
  return rows.map((row) => row.document).filter((doc): doc is NonNullable<typeof doc> => Boolean(doc));
}
