import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PromoBannerImage } from '../components/PromoBannerImage';
import { colors, radius, shadow, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { goToCustomerHome } from '../navigation/customerRoutes';
import { RootStackParamList } from '../navigation/types';
import { markCustomerOnboardingComplete } from '../services/onboardingStorage';
import {
  ONBOARDING_AD_ASPECT,
  OnboardingPageAds,
  prefetchOnboardingPageAds,
  readCachedOnboardingPageAds,
  subscribeToOnboardingPageAds,
} from '../services/promoAdService';
import { PromoAd, PromoAdOnboardingStep } from '../types/promoAd';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomerOnboarding'>;

const ONBOARDING_PAGE_COUNT = 2;
const ONBOARDING_AD_AUTO_SCROLL_MS = 4000;
const ONBOARDING_MAX_LOAD_MS = 1000;
const ONBOARDING_IMAGE_MAX_HEIGHT = 520;

function resolveOnboardingSlideHeight(pageWidth: number, windowHeight: number): number {
  const idealHeight = pageWidth / ONBOARDING_AD_ASPECT;
  const cappedByViewport = windowHeight * 0.58;
  return Math.round(Math.min(idealHeight, cappedByViewport, ONBOARDING_IMAGE_MAX_HEIGHT));
}

function hasOnboardingAds(pages: OnboardingPageAds): boolean {
  return pages.step1.some((ad) => ad.bannerImageUrl) || pages.step2.some((ad) => ad.bannerImageUrl);
}

function OnboardingAdminSlide({
  slide,
  width,
  height,
}: {
  slide: PromoAd;
  width: number;
  height: number;
}) {
  if (!slide.bannerImageUrl) return null;

  return (
    <View style={[styles.slidePage, { width, height }]}>
      <PromoBannerImage
        uri={slide.bannerImageUrl}
        width={width}
        height={height}
        accessibilityLabel="Onboarding banner"
      />
    </View>
  );
}

function PageDots({ activeIndex }: { activeIndex: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: ONBOARDING_PAGE_COUNT }, (_, index) => (
        <View key={index} style={[styles.dot, index === activeIndex && styles.dotActive]} />
      ))}
    </View>
  );
}

function AdDots({
  ads,
  activeIndex,
  onSelect,
}: {
  ads: PromoAd[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  if (ads.length <= 1) return null;

  return (
    <View style={styles.adDotsRow}>
      {ads.map((ad, index) => (
        <Pressable
          key={ad.id}
          style={[styles.adDot, index === activeIndex && styles.adDotActive]}
          onPress={() => onSelect(index)}
          accessibilityRole="button"
          accessibilityLabel={`Show onboarding ad ${index + 1}`}
        />
      ))}
    </View>
  );
}

function OnboardingAdCarousel({
  ads,
  width,
  height,
  adIndex,
  onAdIndexChange,
}: {
  ads: PromoAd[];
  width: number;
  height: number;
  adIndex: number;
  onAdIndexChange: (index: number) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const activeIndexRef = useRef(adIndex);
  const liveAds = ads.filter((ad) => ad.bannerImageUrl);

  const goToSlide = useCallback(
    (index: number, animated = true) => {
      if (!width || liveAds.length === 0) return;
      const nextIndex =
        liveAds.length > 1
          ? ((index % liveAds.length) + liveAds.length) % liveAds.length
          : 0;
      activeIndexRef.current = nextIndex;
      onAdIndexChange(nextIndex);
      scrollRef.current?.scrollTo({ x: width * nextIndex, animated });
    },
    [liveAds.length, onAdIndexChange, width],
  );

  useEffect(() => {
    activeIndexRef.current = adIndex;
    scrollRef.current?.scrollTo({ x: adIndex * width, animated: false });
  }, [adIndex, width, liveAds.length]);

  useEffect(() => {
    if (activeIndexRef.current >= liveAds.length) {
      goToSlide(0, false);
    }
  }, [goToSlide, liveAds.length]);

  useFocusEffect(
    useCallback(() => {
      if (!width || liveAds.length <= 1) return undefined;

      const interval = setInterval(() => {
        goToSlide(activeIndexRef.current + 1);
      }, ONBOARDING_AD_AUTO_SCROLL_MS);

      return () => clearInterval(interval);
    }, [goToSlide, liveAds.length, width]),
  );

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width || liveAds.length === 0) return;
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    const clamped = Math.max(0, Math.min(liveAds.length - 1, nextIndex));
    activeIndexRef.current = clamped;
    onAdIndexChange(clamped);
  };

  if (liveAds.length === 0) {
    return <View style={[styles.emptySlide, { width, height }]} />;
  }

  if (liveAds.length === 1) {
    return <OnboardingAdminSlide slide={liveAds[0]!} width={width} height={height} />;
  }

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      pagingEnabled
      nestedScrollEnabled
      bounces={false}
      showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={handleScrollEnd}
      onScroll={Platform.OS === 'web' ? handleScrollEnd : undefined}
      scrollEventThrottle={16}
      style={{ width, height }}
      contentContainerStyle={{ width: width * liveAds.length, height }}
      decelerationRate="fast"
    >
      {liveAds.map((ad) => (
        <OnboardingAdminSlide key={ad.id} slide={ad} width={width} height={height} />
      ))}
    </ScrollView>
  );
}

export function CustomerOnboardingScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { width: windowWidth, height, contentMaxWidth, isWide } = useResponsive();
  const pageWidth = isWide ? contentMaxWidth : windowWidth;
  const initialAds = readCachedOnboardingPageAds();
  const [pageAds, setPageAds] = useState<OnboardingPageAds>(initialAds);
  const [showPage, setShowPage] = useState(() => hasOnboardingAds(initialAds));
  const [pageIndex, setPageIndex] = useState(0);
  const [step1AdIndex, setStep1AdIndex] = useState(0);
  const [step2AdIndex, setStep2AdIndex] = useState(0);

  const slideHeight = resolveOnboardingSlideHeight(pageWidth, height);
  const isGetStartedPage = pageIndex === 0;
  const currentAds = isGetStartedPage ? pageAds.step1 : pageAds.step2;
  const currentAdIndex = isGetStartedPage ? step1AdIndex : step2AdIndex;
  const setCurrentAdIndex = isGetStartedPage ? setStep1AdIndex : setStep2AdIndex;
  const liveAds = currentAds.filter((ad) => ad.bannerImageUrl);

  useEffect(() => {
    void prefetchOnboardingPageAds();
    const timeout = setTimeout(() => setShowPage(true), ONBOARDING_MAX_LOAD_MS);
    const unsubscribe = subscribeToOnboardingPageAds((pages) => {
      setPageAds(pages);
      if (hasOnboardingAds(pages)) {
        setShowPage(true);
        clearTimeout(timeout);
      }
    });
    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    setStep1AdIndex(0);
    setStep2AdIndex(0);
  }, [pageAds.step1.length, pageAds.step2.length]);

  const goToCurrentAd = useCallback(
    (index: number) => {
      setCurrentAdIndex(index);
    },
    [setCurrentAdIndex],
  );

  const finishOnboarding = async () => {
    const phone = user?.phone;
    if (phone) {
      await markCustomerOnboardingComplete(phone);
    }
    goToCustomerHome(navigation);
  };

  const handlePrimary = async () => {
    if (isGetStartedPage) {
      setPageIndex(1);
      return;
    }
    await finishOnboarding();
  };

  if (!showPage) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.loadingScreen, { maxWidth: pageWidth, alignSelf: 'center', width: '100%' }]}>
          <ActivityIndicator size="large" color={colors.orange} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { maxWidth: pageWidth, alignSelf: 'center', width: '100%' }]}>
        <View style={[styles.pageHost, { width: pageWidth, height: slideHeight }]}>
          <OnboardingAdCarousel
            ads={currentAds}
            width={pageWidth}
            height={slideHeight}
            adIndex={currentAdIndex}
            onAdIndexChange={setCurrentAdIndex}
          />
        </View>

        <View style={styles.controls}>
          <AdDots ads={liveAds} activeIndex={currentAdIndex} onSelect={goToCurrentAd} />
          <PageDots activeIndex={pageIndex} />
          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                !isGetStartedPage && styles.primaryBtnGreen,
                pressed && styles.primaryBtnPressed,
              ]}
              onPress={() => void handlePrimary()}
            >
              <Text style={styles.primaryBtnText}>{isGetStartedPage ? 'Get Started' : 'Next'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    fontWeight: '600',
  },
  pageHost: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    alignSelf: 'center',
    ...shadow.card,
  },
  slidePage: {
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  emptySlide: {
    backgroundColor: colors.white,
  },
  controls: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  adDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  adDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#E8D9C8',
  },
  adDotActive: {
    width: 22,
    backgroundColor: colors.orange,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(228, 94, 26, 0.35)',
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.orange,
  },
  footer: {
    paddingTop: spacing.xs,
  },
  primaryBtn: {
    backgroundColor: colors.orange,
    borderRadius: radius.full,
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    alignSelf: 'stretch',
    ...shadow.card,
  },
  primaryBtnGreen: {
    backgroundColor: colors.primary,
  },
  primaryBtnPressed: { opacity: 0.94 },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.onPrimary,
  },
});
