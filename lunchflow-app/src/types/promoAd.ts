export type PromoAdAudience = 'customer' | 'driver' | 'onboarding';
export type PromoAdDisplayType = 'banner' | 'composed';
export type PromoAdAssetKey = 'tiffin-sticker' | 'meal-plate';
export type PromoAdOnboardingStep = 1 | 2;

export type PromoAd = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  imageAssetKey?: PromoAdAssetKey;
  bannerImageUrl?: string;
  displayType?: PromoAdDisplayType;
  gradientStart: string;
  gradientEnd: string;
  audience: PromoAdAudience;
  /** Onboarding intro screen (1 = Get Started, 2 = Next). */
  onboardingStep?: PromoAdOnboardingStep;
  sortOrder: number;
  isActive: boolean;
  removed?: boolean;
  createdAt: string;
  updatedAt: string;
};
