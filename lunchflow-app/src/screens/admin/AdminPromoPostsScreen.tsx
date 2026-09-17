import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { AdminPageLayout } from '../../components/admin/AdminPageLayout';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PromoBannerCropDialog } from '../../components/admin/PromoBannerCropDialog';
import { Input } from '../../components/Input';
import { colors, radius, spacing } from '../../constants/theme';
import { useAdminLayout } from '../../hooks/useAdminLayout';
import {
  countActiveCustomerHomeAds,
  countActiveOnboardingAds,
  createPromoAdId,
  deletePromoAd,
  listAllPromoAds,
  MAX_CUSTOMER_PROMO_ADS,
  MAX_ONBOARDING_ADS_PER_STEP,
  ONBOARDING_SLIDE_REFERENCE_HEIGHT,
  ONBOARDING_SLIDE_REFERENCE_WIDTH,
  PROMO_CAROUSEL_HEIGHT,
  PROMO_CAROUSEL_REFERENCE_WIDTH,
  savePromoAd,
  uploadPromoBannerImage,
} from '../../services/promoAdService';
import { PromoAd, PromoAdAssetKey } from '../../types/promoAd';

const PROMO_TIFFIN_STICKER = require('../../../assets/promo-tiffin-sticker.png');
const PROMO_LUNCH_BAG = require('../../../assets/lunch-bag.png');
const PROMO_MEAL_PLATE = require('../../../assets/driver-promo-meal.png');

const PROMO_ASSET_MAP: Record<PromoAdAssetKey, number> = {
  'tiffin-sticker': PROMO_TIFFIN_STICKER,
  'meal-plate': PROMO_MEAL_PLATE,
  'lunch-bag': PROMO_LUNCH_BAG,
  'tiffin-thankyou': require('../../../assets/promo-tiffin-thankyou-cutout.png'),
  'lunch-hero': require('../../../assets/promo-lunch-hero.png'),
};

type AdPlacement = 'customer_home' | 'onboarding_1' | 'onboarding_2';

const PLACEMENT_OPTIONS: { id: AdPlacement; label: string }[] = [
  { id: 'customer_home', label: 'Customer Home' },
  { id: 'onboarding_1', label: 'Onboarding 1' },
  { id: 'onboarding_2', label: 'Onboarding 2' },
];

function placementFromAd(ad: PromoAd): AdPlacement {
  if (ad.audience === 'onboarding' && ad.onboardingStep === 2) return 'onboarding_2';
  if (ad.audience === 'onboarding') return 'onboarding_1';
  return 'customer_home';
}

const ONBOARDING_PREVIEW_HEIGHT = 360;
const ONBOARDING_PREVIEW_WIDTH = Math.round(
  ONBOARDING_PREVIEW_HEIGHT * (ONBOARDING_SLIDE_REFERENCE_WIDTH / ONBOARDING_SLIDE_REFERENCE_HEIGHT),
);

function placementMeta(placement: AdPlacement) {
  if (placement === 'customer_home') {
    return {
      uploadHeight: PROMO_CAROUSEL_HEIGHT,
      uploadWidth: PROMO_CAROUSEL_REFERENCE_WIDTH,
      cropWidth: PROMO_CAROUSEL_REFERENCE_WIDTH,
      cropHeight: PROMO_CAROUSEL_HEIGHT,
      audience: 'customer' as const,
      onboardingStep: undefined,
      switchLabel: 'Show on customer home',
      listHint: `Customer home shows up to ${MAX_CUSTOMER_PROMO_ADS} live ads`,
      uploadSub: 'Crop to the customer home ad frame.',
      previewResizeMode: 'cover' as const,
    };
  }

  const step = placement === 'onboarding_1' ? 1 : 2;
  return {
    uploadHeight: ONBOARDING_PREVIEW_HEIGHT,
    uploadWidth: ONBOARDING_PREVIEW_WIDTH,
    cropWidth: ONBOARDING_SLIDE_REFERENCE_WIDTH,
    cropHeight: ONBOARDING_SLIDE_REFERENCE_HEIGHT,
    audience: 'onboarding' as const,
    onboardingStep: step as 1 | 2,
    switchLabel: `Show on onboarding screen ${step}`,
    listHint:
      step === 1
        ? `Get Started page — up to ${MAX_ONBOARDING_ADS_PER_STEP} live banners (swipe between them on the same page)`
        : `Next page — up to ${MAX_ONBOARDING_ADS_PER_STEP} live banners (swipe between them on the same page)`,
    uploadSub: 'Crop to full phone screen (portrait).',
    previewResizeMode: 'contain' as const,
  };
}

type Props = {
  onClose: () => void;
};

type Draft = {
  id?: string;
  bannerImageUrl: string;
  sortOrder: string;
  isActive: boolean;
  placement: AdPlacement;
  composedAd?: PromoAd;
};

function emptyDraft(placement: AdPlacement = 'customer_home'): Draft {
  return {
    bannerImageUrl: '',
    sortOrder: '1',
    isActive: true,
    placement,
  };
}

function draftFromAd(ad: PromoAd): Draft {
  return {
    id: ad.id,
    bannerImageUrl: ad.bannerImageUrl ?? '',
    sortOrder: String(ad.sortOrder),
    isActive: ad.isActive,
    placement: placementFromAd(ad),
    composedAd: ad.displayType === 'composed' && !ad.bannerImageUrl ? ad : undefined,
  };
}

function promoPreviewSource(ad: PromoAd): number | { uri: string } | null {
  if (ad.bannerImageUrl) return { uri: ad.bannerImageUrl };
  if (ad.imageAssetKey) return PROMO_ASSET_MAP[ad.imageAssetKey];
  if (ad.imageUrl) return { uri: ad.imageUrl };
  return null;
}

async function pickBannerImage(): Promise<string | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    throw new Error('Banner upload is available on the admin web portal.');
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      resolve(URL.createObjectURL(file));
    };
    input.click();
  });
}

export function AdminPromoPostsScreen({ onClose }: Props) {
  const { pageTitleSize } = useAdminLayout();
  const [ads, setAds] = useState<PromoAd[]>([]);
  const [placement, setPlacement] = useState<AdPlacement>('customer_home');
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PromoAd | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [cropSourceUri, setCropSourceUri] = useState<string | null>(null);
  const uploadSessionRef = useRef(0);

  const revokeBlobUri = (uri?: string | null) => {
    if (uri?.startsWith('blob:')) {
      URL.revokeObjectURL(uri);
    }
  };

  const refresh = useCallback(async () => {
    setAds(await listAllPromoAds());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const resetForm = () => {
    setDraft(emptyDraft(placement));
    setError('');
  };

  const handlePlacementChange = (nextPlacement: AdPlacement) => {
    setPlacement(nextPlacement);
    setDraft(emptyDraft(nextPlacement));
    setError('');
  };

  const handleEdit = (ad: PromoAd) => {
    const nextPlacement = placementFromAd(ad);
    setPlacement(nextPlacement);
    setDraft(draftFromAd(ad));
    setError('');
  };

  const handleDelete = (ad: PromoAd) => {
    setDeleteTarget(ad);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePromoAd(deleteTarget.id);
      if (draft.id === deleteTarget.id) resetForm();
      setDeleteTarget(null);
      await refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete ad post');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handlePickImage = async () => {
    setError('');
    try {
      const previewUri = await pickBannerImage();
      if (!previewUri) return;
      setCropSourceUri(previewUri);
    } catch (pickError) {
      setError(pickError instanceof Error ? pickError.message : 'Could not open image picker');
    }
  };

  const handleCropCancel = () => {
    uploadSessionRef.current += 1;
    setUploading(false);
    revokeBlobUri(cropSourceUri);
    setCropSourceUri(null);
    setError('');
  };

  const handleCropConfirm = async (croppedUri: string) => {
    const uploadSession = uploadSessionRef.current + 1;
    uploadSessionRef.current = uploadSession;
    const adId = draft.id ?? createPromoAdId();

    setError('');
    revokeBlobUri(cropSourceUri);
    setCropSourceUri(null);
    setDraft((current) => ({
      ...current,
      id: adId,
      bannerImageUrl: croppedUri,
    }));
    setUploading(true);

    try {
      const uploadedUrl = await uploadPromoBannerImage(adId, croppedUri);
      if (uploadSessionRef.current !== uploadSession) return;

      if (uploadedUrl !== croppedUri) {
        setDraft((current) => ({
          ...current,
          bannerImageUrl: uploadedUrl,
        }));
        revokeBlobUri(croppedUri);
      }
    } catch (pickError) {
      if (uploadSessionRef.current !== uploadSession) return;
      setError(pickError instanceof Error ? pickError.message : 'Could not upload banner image');
    } finally {
      if (uploadSessionRef.current === uploadSession) {
        setUploading(false);
      }
    }
  };

  const handleSave = async () => {
    setError('');
    const sortOrder = Number(draft.sortOrder);
    if (!Number.isFinite(sortOrder) || sortOrder < 0) {
      setError('Enter a valid sort order (0 or higher).');
      return;
    }

    const existing = draft.id ? ads.find((ad) => ad.id === draft.id) : undefined;
    const editingComposed = existing?.displayType === 'composed' && !draft.bannerImageUrl;

    if (!editingComposed && !draft.bannerImageUrl.trim()) {
      setError('Upload a banner image first.');
      return;
    }

    if (draft.isActive) {
      const meta = placementMeta(draft.placement);
      const alreadyActive = existing?.isActive ? 1 : 0;
      if (meta.audience === 'customer') {
        const activeCount = await countActiveCustomerHomeAds();
        if (activeCount - alreadyActive >= MAX_CUSTOMER_PROMO_ADS) {
          setError(`Only ${MAX_CUSTOMER_PROMO_ADS} ads can show on customer home. Hide another ad first.`);
          return;
        }
      } else if (meta.onboardingStep) {
        const activeCount = await countActiveOnboardingAds(meta.onboardingStep);
        if (activeCount - alreadyActive >= MAX_ONBOARDING_ADS_PER_STEP) {
          setError(`Only ${MAX_ONBOARDING_ADS_PER_STEP} ads can show on onboarding screen ${meta.onboardingStep}. Hide another one first.`);
          return;
        }
      }
    }

    const meta = placementMeta(draft.placement);

    setSaving(true);
    try {
      if (editingComposed && existing) {
        await savePromoAd({
          ...existing,
          sortOrder,
          isActive: draft.isActive,
        });
      } else if (existing) {
        await savePromoAd({
          ...existing,
          bannerImageUrl: draft.bannerImageUrl,
          displayType: 'banner',
          audience: meta.audience,
          onboardingStep: meta.onboardingStep,
          sortOrder,
          isActive: draft.isActive,
        });
      } else {
        await savePromoAd({
          id: draft.id ?? createPromoAdId(),
          title:
            meta.audience === 'onboarding'
              ? `${meta.onboardingStep === 2 ? 'Next' : 'Get Started'} · Order ${sortOrder}`
              : `Banner ${sortOrder}`,
          subtitle: '',
          bannerImageUrl: draft.bannerImageUrl,
          displayType: 'banner',
          gradientStart: colors.orange,
          gradientEnd: colors.orange,
          audience: meta.audience,
          onboardingStep: meta.onboardingStep,
          sortOrder,
          isActive: draft.isActive,
        });
      }
      resetForm();
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save ad post');
    } finally {
      setSaving(false);
    }
  };

  const activeMeta = placementMeta(placement);
  const visibleAds = ads.filter((ad) => placementFromAd(ad) === placement);

  return (
    <AdminPageLayout>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={onClose} accessibilityLabel="Back to dashboard">
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.pageTitle, { fontSize: pageTitleSize }]}>Ad Posts</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.formCard}>
          <View style={styles.placementRow}>
            {PLACEMENT_OPTIONS.map((option) => (
              <Pressable
                key={option.id}
                style={[styles.placementChip, placement === option.id && styles.placementChipActive]}
                onPress={() => handlePlacementChange(option.id)}
              >
                <Text style={[styles.placementChipText, placement === option.id && styles.placementChipTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>
            {draft.id ? (draft.composedAd ? 'Edit Default Post' : 'Edit Banner') : 'Add Banner'}
          </Text>

          {draft.composedAd && !draft.bannerImageUrl ? (
            <View style={styles.composedPreviewCard}>
              <Text style={styles.composedPreviewTitle}>{draft.composedAd.title}</Text>
              <Text style={styles.composedPreviewSub}>{draft.composedAd.subtitle}</Text>
              <Text style={styles.composedPreviewNote}>Default carousel post. Update order or visibility below.</Text>
            </View>
          ) : (
            <>
          <Pressable
            style={[
              styles.uploadBox,
              {
                width: activeMeta.uploadWidth,
                height: activeMeta.uploadHeight,
              },
            ]}
            onPress={() => void handlePickImage()}
            disabled={uploading || cropSourceUri != null}
          >
            {draft.bannerImageUrl ? (
              <Image
                source={{ uri: draft.bannerImageUrl }}
                style={[
                  styles.bannerPreview,
                  { width: activeMeta.uploadWidth, height: activeMeta.uploadHeight },
                  activeMeta.previewResizeMode === 'contain' &&
                    Platform.OS === 'web' &&
                    styles.bannerPreviewContainWeb,
                ]}
                resizeMode={activeMeta.previewResizeMode}
              />
            ) : (
              <View style={[styles.uploadPlaceholder, { height: activeMeta.uploadHeight }]}>
                <Ionicons name="image-outline" size={28} color={colors.orange} />
                <Text style={styles.uploadTitle}>Upload banner image</Text>
                <Text style={styles.uploadSub}>{activeMeta.uploadSub}</Text>
              </View>
            )}
            {uploading && !draft.bannerImageUrl ? (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator color={colors.white} />
              </View>
            ) : null}
          </Pressable>

          {draft.bannerImageUrl && !draft.composedAd ? (
            <Pressable style={styles.changeImageBtn} onPress={() => void handlePickImage()} disabled={uploading}>
              <Ionicons name="refresh-outline" size={16} color={colors.orange} />
              <Text style={styles.changeImageText}>Change image</Text>
            </Pressable>
          ) : null}
            </>
          )}

          <Input
            label="Sort Order"
            value={draft.sortOrder}
            onChangeText={(sortOrder) => setDraft((current) => ({ ...current, sortOrder }))}
            keyboardType="numeric"
            placeholder="1"
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{activeMeta.switchLabel}</Text>
            <Switch
              value={draft.isActive}
              onValueChange={(isActive) => setDraft((current) => ({ ...current, isActive }))}
              trackColor={{ false: colors.border, true: colors.orangeLight }}
              thumbColor={draft.isActive ? colors.orange : colors.white}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Button
              title={
                saving
                  ? 'Saving...'
                  : draft.id
                    ? draft.composedAd
                      ? 'Update Post'
                      : 'Update Banner'
                    : 'Publish Banner'
              }
              onPress={handleSave}
            />
            {draft.id ? (
              <Button title="Cancel Edit" variant="outline" onPress={resetForm} style={styles.secondaryBtn} />
            ) : null}
          </View>
        </View>

        <View style={styles.listCard}>
          <Text style={styles.sectionTitle}>All Ad Posts ({visibleAds.length})</Text>
          <Text style={styles.listHint}>{activeMeta.listHint}</Text>
          {visibleAds.length > 0 ? (
            visibleAds.map((ad) => {
              const preview = promoPreviewSource(ad);
              const isDefault = ad.id.startsWith('default-');
              return (
                <View key={ad.id} style={styles.listRow}>
                  {preview ? (
                    <View
                      style={[styles.listThumb, placement !== 'customer_home' && styles.listThumbPortrait]}
                    >
                      <Image
                        source={preview}
                        style={[
                          styles.listThumbImage,
                          placement !== 'customer_home' && Platform.OS === 'web' && styles.listThumbImageContainWeb,
                        ]}
                        resizeMode={placement === 'customer_home' ? 'cover' : 'contain'}
                      />
                    </View>
                  ) : (
                    <View style={styles.listThumbFallback}>
                      <Ionicons name="image-outline" size={18} color={colors.muted} />
                    </View>
                  )}
                  <View style={styles.listCopy}>
                    <View style={styles.listTitleRow}>
                      <Text style={styles.listTitle} numberOfLines={1}>
                        {ad.title}
                      </Text>
                      <Badge label={ad.isActive ? 'Live' : 'Hidden'} tone={ad.isActive ? 'green' : 'gray'} />
                    </View>
                    {ad.subtitle ? (
                      <Text style={styles.listSub} numberOfLines={2}>
                        {ad.subtitle}
                      </Text>
                    ) : null}
                    <Text style={styles.listMeta}>
                      Order {ad.sortOrder}
                      {isDefault ? ' · Default' : ''}
                    </Text>
                  </View>
                  <View style={styles.listActions}>
                    <Pressable style={styles.iconBtn} onPress={() => handleEdit(ad)} accessibilityLabel="Edit ad post">
                      <Ionicons name="create-outline" size={18} color={colors.orange} />
                    </Pressable>
                    <Pressable style={styles.iconBtn} onPress={() => handleDelete(ad)} accessibilityLabel="Delete ad post">
                      <Ionicons name="trash-outline" size={18} color={colors.red} />
                    </Pressable>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No banners yet. Upload your first banner above.</Text>
          )}
        </View>
      </View>

      <ConfirmDialog
        visible={deleteTarget != null}
        title="Delete ad post?"
        message={
          deleteTarget
            ? `"${deleteTarget.title}" will be removed from the customer home carousel.`
            : ''
        }
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        cancelLabel="Cancel"
        onConfirm={() => {
          if (!deleting) void confirmDelete();
        }}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />

      <PromoBannerCropDialog
        visible={cropSourceUri != null}
        imageUri={cropSourceUri}
        onCancel={handleCropCancel}
        onConfirm={(croppedUri) => void handleCropConfirm(croppedUri)}
        frameReferenceWidth={activeMeta.cropWidth}
        frameReferenceHeight={activeMeta.cropHeight}
      />
    </AdminPageLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: colors.text },
  content: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' },
  formCard: {
    width: '100%',
    maxWidth: PROMO_CAROUSEL_REFERENCE_WIDTH + spacing.lg * 2,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 4,
  },
  listCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 8 },
  placementRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  placementChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  placementChipActive: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeLight,
  },
  placementChipText: { fontSize: 12, fontWeight: '700', color: colors.muted },
  placementChipTextActive: { color: colors.orange },
  listHint: { fontSize: 12, color: colors.muted, lineHeight: 17, marginBottom: 10, marginTop: -4 },
  composedPreviewCard: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: 8,
    gap: 4,
  },
  composedPreviewTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  composedPreviewSub: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  composedPreviewNote: { fontSize: 11, color: colors.muted, marginTop: 4, fontWeight: '600' },
  uploadBox: {
    alignSelf: 'center',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    marginBottom: 8,
  },
  uploadPlaceholder: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: 6,
  },
  uploadTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  uploadSub: { fontSize: 12, color: colors.muted, textAlign: 'center', lineHeight: 17 },
  bannerPreview: {
    width: '100%',
    height: '100%',
  },
  bannerPreviewContainWeb: {
    objectFit: 'contain',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginBottom: 8,
  },
  changeImageText: { fontSize: 13, fontWeight: '700', color: colors.orange },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4,
  },
  switchLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  error: { color: colors.red, fontSize: 13, marginTop: 4 },
  actions: { gap: 10, marginTop: 8 },
  secondaryBtn: { marginTop: 0 },
  listRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    alignItems: 'center',
  },
  listThumb: {
    width: 72,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  listThumbPortrait: {
    width: 44,
    height: 78,
  },
  listThumbImage: {
    width: '100%',
    height: '100%',
  },
  listThumbImageContainWeb: {
    objectFit: 'contain',
  },
  listThumbFallback: {
    width: 72,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCopy: { flex: 1, minWidth: 0 },
  listTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  listTitle: { fontSize: 14, fontWeight: '800', color: colors.text, flex: 1 },
  listSub: { fontSize: 12, color: colors.muted, lineHeight: 17, marginBottom: 4 },
  listMeta: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  listActions: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 13, color: colors.muted, fontWeight: '600' },
});
