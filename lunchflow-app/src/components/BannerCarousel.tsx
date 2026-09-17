import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Image,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PromoBannerImage } from './PromoBannerImage';
import { colors, shadow, spacing } from '../constants/theme';

/** Fixed height for every slide — min/max locked so content cannot resize the card. */
export const BANNER_CAROUSEL_HEIGHT = 160;
const CAROUSEL_IMAGE_SIZE = 112;
const CAROUSEL_BORDER_RADIUS = 22;
const SLIDE_BACKGROUND = '#C8521A';

export type BannerCarouselSlide =
  | {
      id: string;
      kind: 'banner';
      bannerImageUrl: string;
    }
  | {
      id: string;
      kind: 'composed';
      title: string;
      subtitle: string;
      colors: [string, string];
      image: ImageSourcePropType;
    };

type Props = {
  slides: BannerCarouselSlide[];
  autoScrollMs?: number;
};

type SlideFrameProps = {
  width: number;
  children: ReactNode;
};

/** Shared shell — identical width, height, background, and clipping for every slide. */
function SlideFrame({ width, children }: SlideFrameProps) {
  return (
    <View style={[styles.slideOuter, { width }]}>
      <View style={styles.slideCard}>{children}</View>
    </View>
  );
}

function ComposedSlideContent({ slide }: { slide: Extract<BannerCarouselSlide, { kind: 'composed' }> }) {
  return (
    <View style={styles.composedBody}>
      <View style={styles.copyColumn}>
        <Text style={styles.title} numberOfLines={2}>
          {slide.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={3}>
          {slide.subtitle}
        </Text>
      </View>
      <View style={styles.imageFrame}>
        <Image
          source={slide.image}
          style={styles.heroImage}
          resizeMode="cover"
          accessibilityLabel="Promotional illustration"
        />
      </View>
    </View>
  );
}

function BannerSlideContent({ slide }: { slide: Extract<BannerCarouselSlide, { kind: 'banner' }> }) {
  return (
    <View style={styles.bannerFill}>
      <PromoBannerImage
        uri={slide.bannerImageUrl}
        fill
        style={styles.bannerImage}
        accessibilityLabel="Promotional banner"
      />
    </View>
  );
}

export function BannerCarousel({ slides, autoScrollMs = 4000 }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideWidth, setSlideWidth] = useState(0);

  const goToSlide = useCallback(
    (index: number, animated = true) => {
      if (!slideWidth || slides.length === 0) return;
      const nextIndex = ((index % slides.length) + slides.length) % slides.length;
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
      scrollRef.current?.scrollTo({ x: slideWidth * nextIndex, animated });
    },
    [slideWidth, slides.length],
  );

  useEffect(() => {
    if (activeIndexRef.current >= slides.length) {
      goToSlide(0, false);
    }
  }, [slides.length, goToSlide]);

  useEffect(() => {
    if (!slideWidth || slides.length <= 1 || !autoScrollMs) return undefined;

    const interval = setInterval(() => {
      goToSlide(activeIndexRef.current + 1);
    }, autoScrollMs);

    return () => clearInterval(interval);
  }, [autoScrollMs, goToSlide, slideWidth, slides.length]);

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!slideWidth || slides.length === 0) return;
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    activeIndexRef.current = Math.max(0, Math.min(slides.length - 1, nextIndex));
    setActiveIndex(activeIndexRef.current);
  };

  if (slides.length === 0) {
    return null;
  }

  return (
    <View style={styles.shell}>
      <View
        style={styles.track}
        onLayout={(event) => {
          const width = event.nativeEvent.layout.width;
          if (width > 0 && width !== slideWidth) {
            setSlideWidth(width);
          }
        }}
      >
        {slideWidth > 0 ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScrollEnd}
            onScroll={Platform.OS === 'web' ? handleScrollEnd : undefined}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={slideWidth}
            snapToAlignment="start"
            style={[styles.scrollView, { width: slideWidth }]}
            contentContainerStyle={[styles.scrollContent, { width: slideWidth * slides.length }]}
          >
            {slides.map((slide) => (
              <SlideFrame key={slide.id} width={slideWidth}>
                {slide.kind === 'banner' ? (
                  <BannerSlideContent slide={slide} />
                ) : (
                  <ComposedSlideContent slide={slide} />
                )}
              </SlideFrame>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.measurePlaceholder} />
        )}
      </View>

      <View style={styles.dots} pointerEvents="none">
        {slides.map((slide, index) => (
          <View key={slide.id} style={[styles.dot, index === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const slideMetrics = {
  width: '100%' as const,
  height: BANNER_CAROUSEL_HEIGHT,
  minHeight: BANNER_CAROUSEL_HEIGHT,
  maxHeight: BANNER_CAROUSEL_HEIGHT,
};

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    marginBottom: spacing.sm,
  },
  track: {
    width: '100%',
    height: BANNER_CAROUSEL_HEIGHT,
    minHeight: BANNER_CAROUSEL_HEIGHT,
    maxHeight: BANNER_CAROUSEL_HEIGHT,
    borderRadius: CAROUSEL_BORDER_RADIUS,
    overflow: 'hidden',
    backgroundColor: SLIDE_BACKGROUND,
    ...shadow.card,
  },
  measurePlaceholder: {
    ...slideMetrics,
  },
  scrollView: {
    height: BANNER_CAROUSEL_HEIGHT,
    flexGrow: 0,
    flexShrink: 0,
  },
  scrollContent: {
    height: BANNER_CAROUSEL_HEIGHT,
    flexGrow: 0,
    flexShrink: 0,
  },
  slideOuter: {
    height: BANNER_CAROUSEL_HEIGHT,
    minHeight: BANNER_CAROUSEL_HEIGHT,
    maxHeight: BANNER_CAROUSEL_HEIGHT,
    flexGrow: 0,
    flexShrink: 0,
    overflow: 'hidden',
  },
  slideCard: {
    position: 'relative',
    ...slideMetrics,
    backgroundColor: SLIDE_BACKGROUND,
    borderRadius: CAROUSEL_BORDER_RADIUS,
    overflow: 'hidden',
  },
  composedBody: {
    width: '100%',
    height: '100%',
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 0,
    flexShrink: 0,
    overflow: 'hidden',
  },
  copyColumn: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    justifyContent: 'center',
    paddingRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.onPrimary,
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    fontWeight: '500',
    lineHeight: 20,
  },
  imageFrame: {
    width: CAROUSEL_IMAGE_SIZE,
    height: CAROUSEL_IMAGE_SIZE,
    minWidth: CAROUSEL_IMAGE_SIZE,
    minHeight: CAROUSEL_IMAGE_SIZE,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    flexGrow: 0,
    flexShrink: 0,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  bannerFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: SLIDE_BACKGROUND,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(200, 82, 26, 0.22)',
  },
  dotActive: {
    width: 22,
    height: 7,
    borderRadius: 4,
    backgroundColor: SLIDE_BACKGROUND,
  },
});
