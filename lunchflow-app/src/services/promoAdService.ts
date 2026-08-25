import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDocs, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Platform } from 'react-native';
import { gradients } from '../constants/theme';
import { auth, db, storage } from '../lib/firebase';
import { PromoAd, PromoAdAudience } from '../types/promoAd';

const STORAGE_KEY = '@lunchflow_promo_ads';
const BANNER_MAX_WIDTH = 1400;
const BANNER_JPEG_QUALITY = 0.82;

/** Matches customer home carousel slot — width ÷ height */
export const PROMO_CAROUSEL_HEIGHT = 124;
/** Typical customer home ad width (phone content area). */
export const PROMO_CAROUSEL_REFERENCE_WIDTH = 358;
export const PROMO_CAROUSEL_ASPECT = PROMO_CAROUSEL_REFERENCE_WIDTH / PROMO_CAROUSEL_HEIGHT;

export const MAX_CUSTOMER_PROMO_ADS = 3;
export const MAX_ONBOARDING_ADS_PER_STEP = 2;
export const MIN_ONBOARDING_LIVE_SLIDES = 2;

/** Full-screen phone onboarding slide (portrait). */
export const ONBOARDING_SLIDE_REFERENCE_WIDTH = 390;
export const ONBOARDING_SLIDE_REFERENCE_HEIGHT = 844;
export const ONBOARDING_AD_REFERENCE_WIDTH = ONBOARDING_SLIDE_REFERENCE_WIDTH;
export const ONBOARDING_AD_HEIGHT = ONBOARDING_SLIDE_REFERENCE_HEIGHT;
export const ONBOARDING_AD_ASPECT = ONBOARDING_AD_REFERENCE_WIDTH / ONBOARDING_AD_HEIGHT;

export const BUILTIN_PROMO_AD_IDS = ['default-we-cook', 'default-thank-you'] as const;

function builtInPromoAds(): PromoAd[] {
  const stamp = '2026-01-01T00:00:00.000Z';
  return [
    {
      id: 'default-we-cook',
      title: 'You Cook • We Deliver',
      subtitle: 'Home-cooked meals packed with Chef Queen care.',
      displayType: 'composed',
      imageAssetKey: 'tiffin-sticker',
      gradientStart: gradients.premium[0],
      gradientEnd: gradients.premium[1],
      audience: 'customer',
      sortOrder: 1,
      isActive: true,
      createdAt: stamp,
      updatedAt: stamp,
    },
    {
      id: 'default-thank-you',
      title: 'Made with Love',
      subtitle: 'Delivered with care — thank you for trusting Chef Queen.',
      displayType: 'composed',
      imageAssetKey: 'meal-plate',
      gradientStart: gradients.primary[0],
      gradientEnd: gradients.primary[1],
      audience: 'customer',
      sortOrder: 2,
      isActive: true,
      createdAt: stamp,
      updatedAt: stamp,
    },
  ];
}

function mergeBuiltInPromoAds(stored: PromoAd[]): PromoAd[] {
  const byId = new Map(stored.map((ad) => [ad.id, ad]));
  for (const builtin of builtInPromoAds()) {
    if (!byId.has(builtin.id)) {
      byId.set(builtin.id, builtin);
    }
  }
  return sortAds([...byId.values()]);
}

function sortAds(ads: PromoAd[]): PromoAd[] {
  return [...ads].sort((a, b) => a.sortOrder - b.sortOrder || b.updatedAt.localeCompare(a.updatedAt));
}

async function readLocalAds(): Promise<PromoAd[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? sortAds(JSON.parse(raw) as PromoAd[]) : [];
  } catch {
    return [];
  }
}

async function writeLocalAds(ads: PromoAd[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sortAds(ads)));
}

async function syncFromFirestore(): Promise<PromoAd[]> {
  const local = await readLocalAds();
  try {
    const snap = await getDocs(collection(db, 'promo_ads'));
    const remote = snap.docs.map((entry) => ({ ...(entry.data() as PromoAd), id: entry.id }));
    const remoteIds = new Set(remote.map((ad) => ad.id));

    // Firestore is the source of truth; keep unsynced local custom ads as a fallback.
    const unsyncedLocal = local.filter(
      (ad) =>
        !remoteIds.has(ad.id) &&
        !BUILTIN_PROMO_AD_IDS.includes(ad.id as (typeof BUILTIN_PROMO_AD_IDS)[number]),
    );

    const merged = sortAds([...remote, ...unsyncedLocal]);
    await writeLocalAds(merged);
    return merged;
  } catch {
    // Local cache remains the fallback.
  }
  return readLocalAds();
}

export async function listAllPromoAds(): Promise<PromoAd[]> {
  const synced = await syncFromFirestore();
  const base = synced.length > 0 ? synced : await readLocalAds();
  const merged = mergeBuiltInPromoAds(base);
  if (merged.length !== base.length) {
    await writeLocalAds(merged);
  }
  return merged.filter((ad) => !ad.removed);
}

function isCustomerHomeAd(ad: PromoAd): boolean {
  return !ad.removed && ad.isActive && (ad.audience ?? 'customer') === 'customer';
}

export function parseActiveCustomerHomeAds(source: PromoAd[]): PromoAd[] {
  const merged = mergeBuiltInPromoAds(source.filter((ad) => !ad.removed));
  return merged
    .filter(isCustomerHomeAd)
    .sort((a, b) => a.sortOrder - b.sortOrder || b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_CUSTOMER_PROMO_ADS);
}

export async function listActivePromoAds(audience: PromoAdAudience = 'customer'): Promise<PromoAd[]> {
  if (audience === 'onboarding') {
    return listActiveOnboardingSlides();
  }

  try {
    return parseActiveCustomerHomeAds(await fetchPromoAdsFromFirestore());
  } catch {
    return parseActiveCustomerHomeAds(await listAllPromoAds());
  }
}

function normalizeOnboardingStep(value: PromoAd['onboardingStep']): 1 | 2 | undefined {
  if (value == null) return undefined;
  return Number(value) === 2 ? 2 : 1;
}

function promoAdFromFirestore(id: string, data: PromoAd): PromoAd {
  return {
    ...data,
    id,
    onboardingStep: normalizeOnboardingStep(data.onboardingStep),
  };
}

function matchesOnboardingStep(ad: PromoAd, step: 1 | 2): boolean {
  const adStep = normalizeOnboardingStep(ad.onboardingStep) ?? 1;
  return ad.audience === 'onboarding' && adStep === step;
}

function hasLiveOnboardingAds(pages: OnboardingPageAds): boolean {
  return pages.step1.some((ad) => ad.bannerImageUrl) || pages.step2.some((ad) => ad.bannerImageUrl);
}

let cachedOnboardingPages: OnboardingPageAds | null = null;
let onboardingPrefetchPromise: Promise<OnboardingPageAds> | null = null;

export function readCachedOnboardingPageAds(): OnboardingPageAds {
  return cachedOnboardingPages ?? { step1: [], step2: [] };
}

export function prefetchOnboardingPageAds(): Promise<OnboardingPageAds> {
  if (onboardingPrefetchPromise) return onboardingPrefetchPromise;

  onboardingPrefetchPromise = listOnboardingPageAds()
    .then((pages) => {
      cachedOnboardingPages = pages;
      return pages;
    })
    .finally(() => {
      onboardingPrefetchPromise = null;
    });

  return onboardingPrefetchPromise;
}

function isMobileWeb(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    )
  );
}

function restFieldValue(field: Record<string, unknown>): unknown {
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return Number(field.integerValue);
  if ('doubleValue' in field) return Number(field.doubleValue);
  if ('booleanValue' in field) return field.booleanValue;
  if ('nullValue' in field) return null;
  return undefined;
}

function promoAdFromRestDoc(doc: { name: string; fields?: Record<string, Record<string, unknown>> }): PromoAd {
  const id = doc.name.split('/').pop() ?? '';
  const data = Object.fromEntries(
    Object.entries(doc.fields ?? {}).map(([key, value]) => [key, restFieldValue(value)]),
  ) as PromoAd;
  return promoAdFromFirestore(id, data);
}

async function fetchPromoAdsViaRest(): Promise<PromoAd[]> {
  const url =
    'https://firestore.googleapis.com/v1/projects/lunchbox-b660d/databases/(default)/documents/promo_ads?key=AIzaSyBMf_YlehISPQsIJvD-N3HlygVQyTkZrnM';
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Could not load promo ads');
  }
  const json = (await response.json()) as { documents?: { name: string; fields?: Record<string, Record<string, unknown>> }[] };
  return (json.documents ?? []).map(promoAdFromRestDoc);
}

export async function listActiveOnboardingSlidesForStep(step: 1 | 2): Promise<PromoAd[]> {
  const ads = await listAllPromoAds();
  return ads
    .filter(
      (ad) =>
        ad.isActive &&
        !ad.removed &&
        matchesOnboardingStep(ad, step) &&
        ad.bannerImageUrl,
    )
    .sort((a, b) => a.sortOrder - b.sortOrder || b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_ONBOARDING_ADS_PER_STEP);
}

export type OnboardingPageAds = {
  step1: PromoAd[];
  step2: PromoAd[];
};

function parseOnboardingPageAds(source: PromoAd[]): OnboardingPageAds {
  const ads = source.filter((ad) => !ad.removed);
  const pick = (step: 1 | 2) =>
    ads
      .filter(
        (ad) => ad.isActive && matchesOnboardingStep(ad, step) && ad.bannerImageUrl,
      )
      .sort((a, b) => a.sortOrder - b.sortOrder || b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, MAX_ONBOARDING_ADS_PER_STEP);

  return {
    step1: pick(1),
    step2: pick(2),
  };
}

async function fetchPromoAdsFromFirestore(): Promise<PromoAd[]> {
  if (isMobileWeb()) {
    try {
      return await fetchPromoAdsViaRest();
    } catch {
      // Fall back to the Firestore SDK below.
    }
  }

  try {
    const snap = await getDocs(collection(db, 'promo_ads'));
    return snap.docs.map((entry) => promoAdFromFirestore(entry.id, entry.data() as PromoAd));
  } catch (error) {
    if (Platform.OS === 'web') {
      return fetchPromoAdsViaRest();
    }
    throw error;
  }
}

export async function listOnboardingPageAds(): Promise<OnboardingPageAds> {
  try {
    const pages = parseOnboardingPageAds(await fetchPromoAdsFromFirestore());
    cachedOnboardingPages = pages;
    return pages;
  } catch {
    const ads = await readLocalAds();
    const pages = parseOnboardingPageAds(ads);
    if (hasLiveOnboardingAds(pages)) {
      cachedOnboardingPages = pages;
    }
    return pages;
  }
}

/** Live onboarding banners grouped by screen (Get Started = 1, Next = 2). */
export async function listActiveOnboardingSlides(): Promise<PromoAd[]> {
  const pages = await listOnboardingPageAds();
  return [...pages.step1, ...pages.step2];
}

export async function listActiveOnboardingAd(step: 1 | 2): Promise<PromoAd | null> {
  const slides = await listActiveOnboardingSlidesForStep(step);
  return slides[0] ?? null;
}

export async function countActiveOnboardingAds(step: 1 | 2): Promise<number> {
  const ads = await listAllPromoAds();
  return ads.filter((ad) => ad.isActive && !ad.removed && matchesOnboardingStep(ad, step)).length;
}

export function subscribeToOnboardingPageAds(onPages: (pages: OnboardingPageAds) => void): () => void {
  let cancelled = false;
  let retryTimer: ReturnType<typeof setInterval> | null = null;

  const publishPages = (pages: OnboardingPageAds) => {
    if (cancelled) return;
    cachedOnboardingPages = pages;
    onPages(pages);
  };

  const cached = readCachedOnboardingPageAds();
  if (hasLiveOnboardingAds(cached)) {
    onPages(cached);
  }

  void readLocalAds().then((local) => {
    const pages = parseOnboardingPageAds(local);
    if (hasLiveOnboardingAds(pages)) {
      publishPages(pages);
    }
  });

  const syncRemoteToCache = (remote: PromoAd[]) => {
    void writeLocalAds(
      sortAds(
        remote.filter(
          (ad) => !BUILTIN_PROMO_AD_IDS.includes(ad.id as (typeof BUILTIN_PROMO_AD_IDS)[number]),
        ),
      ),
    );
  };

  const fetchAndPublish = async (): Promise<OnboardingPageAds> => {
    try {
      const remote = await fetchPromoAdsFromFirestore();
      if (cancelled) return parseOnboardingPageAds(remote);
      const pages = parseOnboardingPageAds(remote);
      publishPages(pages);
      syncRemoteToCache(remote);
      return pages;
    } catch {
      const local = await readLocalAds();
      const pages = parseOnboardingPageAds(local);
      if (!cancelled && hasLiveOnboardingAds(pages)) publishPages(pages);
      return pages;
    }
  };

  void fetchAndPublish();

  retryTimer = setInterval(() => {
    void fetchAndPublish().then((pages) => {
      if (hasLiveOnboardingAds(pages) && retryTimer) {
        clearInterval(retryTimer);
        retryTimer = null;
      }
    });
  }, 3000);

  try {
    const unsub = onSnapshot(
      collection(db, 'promo_ads'),
      (snapshot) => {
        const remote = snapshot.docs.map((entry) =>
          promoAdFromFirestore(entry.id, entry.data() as PromoAd),
        );
        const pages = parseOnboardingPageAds(remote);
        publishPages(pages);
        syncRemoteToCache(remote);
        if (hasLiveOnboardingAds(pages) && retryTimer) {
          clearInterval(retryTimer);
          retryTimer = null;
        }
      },
      () => {
        void fetchAndPublish();
      },
    );
    return () => {
      cancelled = true;
      if (retryTimer) clearInterval(retryTimer);
      unsub();
    };
  } catch {
    return () => {
      cancelled = true;
      if (retryTimer) clearInterval(retryTimer);
    };
  }
}

export function subscribeToOnboardingSlides(onSlides: (ads: PromoAd[]) => void): () => void {
  return subscribeToOnboardingPageAds(async (pages) => {
    onSlides(await listActiveOnboardingSlides());
  });
}

export function subscribeToOnboardingAd(step: 1 | 2, onAd: (ad: PromoAd | null) => void): () => void {
  const publish = async () => {
    onAd(await listActiveOnboardingAd(step));
  };

  void publish();

  try {
    return onSnapshot(
      collection(db, 'promo_ads'),
      async () => {
        await publish();
      },
      async () => {
        await publish();
      },
    );
  } catch {
    const interval = setInterval(() => {
      void publish();
    }, 8000);
    return () => clearInterval(interval);
  }
}

export async function countActivePromoAds(audience: PromoAdAudience = 'customer'): Promise<number> {
  const ads = await listAllPromoAds();
  return ads.filter((ad) => ad.isActive && !ad.removed && ad.audience === audience).length;
}

export async function countActiveCustomerHomeAds(): Promise<number> {
  return countActivePromoAds('customer');
}

export function subscribeToActivePromoAds(
  audience: PromoAdAudience,
  onAds: (ads: PromoAd[]) => void,
): () => void {
  if (audience === 'onboarding') {
    return subscribeToOnboardingSlides(onAds);
  }

  let cancelled = false;

  const publishFromRemote = (remote: PromoAd[]) => {
    if (cancelled) return;
    onAds(parseActiveCustomerHomeAds(remote));
  };

  const syncRemoteToCache = (remote: PromoAd[]) => {
    void writeLocalAds(
      sortAds(
        remote.filter(
          (ad) => !BUILTIN_PROMO_AD_IDS.includes(ad.id as (typeof BUILTIN_PROMO_AD_IDS)[number]),
        ),
      ),
    );
  };

  const fetchAndPublish = async () => {
    try {
      const remote = await fetchPromoAdsFromFirestore();
      if (cancelled) return;
      publishFromRemote(remote);
      syncRemoteToCache(remote);
    } catch {
      if (cancelled) return;
      const ads = await listAllPromoAds();
      onAds(parseActiveCustomerHomeAds(ads));
    }
  };

  void readLocalAds().then((local) => {
    if (local.length > 0) {
      publishFromRemote(local);
    }
  });

  void fetchAndPublish();

  try {
    const unsub = onSnapshot(
      collection(db, 'promo_ads'),
      (snapshot) => {
        const remote = snapshot.docs.map((entry) =>
          promoAdFromFirestore(entry.id, entry.data() as PromoAd),
        );
        publishFromRemote(remote);
        syncRemoteToCache(remote);
      },
      () => {
        void fetchAndPublish();
      },
    );
    return () => {
      cancelled = true;
      unsub();
    };
  } catch {
    const interval = setInterval(() => {
      void fetchAndPublish();
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }
}

export function createPromoAdId(): string {
  return `AD-${Date.now()}`;
}

export function defaultPromoGradient(): { gradientStart: string; gradientEnd: string } {
  return {
    gradientStart: gradients.premium[0],
    gradientEnd: gradients.premium[1],
  };
}

export async function savePromoAd(input: Omit<PromoAd, 'createdAt' | 'updatedAt'> & { createdAt?: string }): Promise<PromoAd> {
  const now = new Date().toISOString();
  const record: PromoAd = {
    ...input,
    title: input.title.trim() || `Ad ${input.sortOrder}`,
    subtitle: input.subtitle?.trim() ?? '',
    displayType: input.displayType ?? (input.bannerImageUrl ? 'banner' : 'composed'),
    bannerImageUrl: input.bannerImageUrl?.trim() || undefined,
    imageUrl: input.imageUrl?.trim() || undefined,
    imageAssetKey: input.imageAssetKey,
    audience: input.audience ?? 'customer',
    onboardingStep:
      input.audience === 'onboarding' ? (input.onboardingStep ?? 1) : input.onboardingStep,
    removed: input.removed === true,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };

  const local = mergeBuiltInPromoAds(await readLocalAds());
  const next = local.some((ad) => ad.id === record.id)
    ? local.map((ad) => (ad.id === record.id ? record : ad))
    : [record, ...local];
  await writeLocalAds(mergeBuiltInPromoAds(next));

  try {
    await setDoc(doc(db, 'promo_ads', record.id), record, { merge: true });
  } catch {
    // Local save still works when remote write fails.
  }

  return record;
}

export async function deletePromoAd(id: string): Promise<void> {
  if (BUILTIN_PROMO_AD_IDS.includes(id as (typeof BUILTIN_PROMO_AD_IDS)[number])) {
    const local = mergeBuiltInPromoAds(await readLocalAds());
    const existing =
      local.find((ad) => ad.id === id) ?? builtInPromoAds().find((ad) => ad.id === id);
    if (!existing) return;
    await savePromoAd({ ...existing, isActive: false, removed: true });
    return;
  }

  const local = mergeBuiltInPromoAds(await readLocalAds());
  await writeLocalAds(local.filter((ad) => ad.id !== id));
  try {
    await deleteDoc(doc(db, 'promo_ads', id));
  } catch {
    // Ignore remote delete failures.
  }
}

async function readPhotoBlob(localUri: string): Promise<Blob> {
  const response = await fetch(localUri);
  if (!response.ok) {
    throw new Error('Could not read the selected image.');
  }
  return response.blob();
}

async function compressBannerBlob(blob: Blob): Promise<Blob> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return blob;
  }

  try {
    const bitmap = await createImageBitmap(blob);
    if (bitmap.width <= BANNER_MAX_WIDTH) {
      bitmap.close?.();
      return blob;
    }

    const outWidth = BANNER_MAX_WIDTH;
    const outHeight = Math.round(outWidth * (bitmap.height / bitmap.width));

    const canvas = document.createElement('canvas');
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close?.();
      return blob;
    }

    ctx.drawImage(bitmap, 0, 0, outWidth, outHeight);
    bitmap.close?.();

    const compressed = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error('Could not compress image'))),
        'image/jpeg',
        BANNER_JPEG_QUALITY,
      );
    });

    return compressed.size < blob.size ? compressed : blob;
  } catch {
    return blob;
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.readAsDataURL(blob);
  });
}

export async function uploadPromoBannerImage(adId: string, localUri: string): Promise<string> {
  const rawBlob = await readPhotoBlob(localUri);
  const blob = await compressBannerBlob(rawBlob);
  const fileName = `${Date.now()}.jpg`;
  const storageRef = ref(storage, `promo-ads/${adId}/${fileName}`);

  if (!auth.currentUser) {
    const dataUrl = await blobToDataUrl(blob);
    if (dataUrl.length > 900_000) {
      throw new Error('Image is too large. Sign in again or choose a smaller banner.');
    }
    return dataUrl;
  }

  try {
    await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
    return getDownloadURL(storageRef);
  } catch {
    const dataUrl = await blobToDataUrl(blob);
    if (dataUrl.length > 900_000) {
      throw new Error('Image upload failed. Try a smaller banner image.');
    }
    return dataUrl;
  }
}
