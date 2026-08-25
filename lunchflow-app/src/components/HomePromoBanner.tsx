import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { brandHeadingStyle, taglineStyle } from '../constants/fonts';
import { colors, radius, shadow, spacing } from '../constants/theme';

export type PromoAction = 'subscription' | 'referral' | 'track';

type PromoSlide = {
  id: string;
  eyebrow: string;
  title: string;
  titleAccent: string;
  sub: string;
  cta: string;
  discount: string;
  action: PromoAction;
  gradient: readonly [string, string, string];
};

const PROMO_LUNCH_ART = require('../../assets/driver-promo-meal.png');

const SLIDES: PromoSlide[] = [
  {
    id: 'offer',
    eyebrow: 'Made with Love',
    title: 'Healthy Food',
    titleAccent: 'Happy Kids!',
    sub: 'Daily lunch delivery from home to school.',
    cta: 'Order Now',
    discount: '20%\nOFF',
    action: 'subscription',
    gradient: [colors.orangeLight, colors.yellowLight, colors.white],
  },
  {
    id: 'refer',
    eyebrow: 'Refer & Earn',
    title: 'Share LunchFlow',
    titleAccent: 'With Friends',
    sub: 'Invite families and earn rewards when they join.',
    cta: 'Refer Now',
    discount: 'Bonus',
    action: 'referral',
    gradient: [colors.greenLight, colors.yellowLight, colors.white],
  },
  {
    id: 'track',
    eyebrow: 'Trusted Delivery',
    title: 'Fresh Lunch',
    titleAccent: 'On Time',
    sub: 'Live tracking, OTP pickup, and verified drivers.',
    cta: 'View Plans',
    discount: 'Live',
    action: 'track',
    gradient: [colors.yellow, colors.yellowLight, colors.white],
  },
];

type Props = {
  width: number;
  onAction: (action: PromoAction) => void;
};

function PromoDecor() {
  return (
    <>
      <View style={[decor.petal, decor.petalOne]} />
      <View style={[decor.petal, decor.petalTwo]} />
      <View style={[decor.petal, decor.petalThree]} />
    </>
  );
}

function PromoLunchVisual({ discount }: { discount: string }) {
  return (
    <View style={art.wrap}>
      <View style={art.clip}>
        <Image source={PROMO_LUNCH_ART} style={art.photo} resizeMode="cover" accessibilityLabel="Homemade lunch plate" />
      </View>
      <View style={art.badge}>
        <Text style={art.badgeText}>{discount}</Text>
      </View>
    </View>
  );
}

function PromoSlideContent({
  slide,
  onAction,
}: {
  slide: PromoSlide;
  onAction: (action: PromoAction) => void;
}) {
  const isOffer = slide.id === 'offer';

  return (
    <LinearGradient
      colors={slide.gradient}
      start={{ x: 0, y: 0.15 }}
      end={{ x: 1, y: 1 }}
      style={styles.slideInner}
    >
      <PromoDecor />
      <View style={styles.content}>
        <View style={styles.copy}>
          <View style={styles.eyebrowPill}>
            <Text style={[styles.eyebrow, isOffer && styles.eyebrowTagline]}>{slide.eyebrow}</Text>
          </View>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.titleAccent}>{slide.titleAccent}</Text>
          <Text style={styles.sub}>{slide.sub}</Text>
          <Pressable style={styles.cta} onPress={() => onAction(slide.action)}>
            <Text style={styles.ctaText}>{slide.cta}</Text>
          </Pressable>
        </View>
        {isOffer ? <PromoLunchVisual discount={slide.discount} /> : <PromoBadgeOnly discount={slide.discount} />}
      </View>
    </LinearGradient>
  );
}

function PromoBadgeOnly({ discount }: { discount: string }) {
  return (
    <View style={art.badgeOnlyWrap}>
      <View style={art.badge}>
        <Text style={art.badgeText}>{discount}</Text>
      </View>
    </View>
  );
}

export function HomePromoBanner({ width, onAction }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const slideHeight = useMemo(() => Math.max(204, Math.round(width * 0.54)), [width]);

  const goToSlide = (index: number, animated = true) => {
    const next = ((index % SLIDES.length) + SLIDES.length) % SLIDES.length;
    activeIndexRef.current = next;
    setActiveIndex(next);
    scrollRef.current?.scrollTo({ x: width * next, animated });
  };

  useEffect(() => {
    if (!width) return undefined;
    const timer = setInterval(() => {
      goToSlide(activeIndexRef.current + 1);
    }, 3800);
    return () => clearInterval(timer);
  }, [width]);

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    const next = Math.max(0, Math.min(SLIDES.length - 1, index));
    activeIndexRef.current = next;
    setActiveIndex(next);
  };

  return (
    <View style={[styles.shell, { width }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        decelerationRate="fast"
        snapToInterval={width}
        snapToAlignment="center"
        style={{ width }}
        contentContainerStyle={{ width: width * SLIDES.length }}
      >
        {SLIDES.map((slide) => (
          <View key={slide.id} style={{ width, height: slideHeight }}>
            <PromoSlideContent slide={slide} onAction={onAction} />
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots} pointerEvents="box-none">
        {SLIDES.map((slide, index) => (
          <Pressable
            key={slide.id}
            style={[styles.dot, index === activeIndex && styles.dotActive]}
            onPress={() => goToSlide(index)}
            accessibilityRole="button"
            accessibilityLabel={`Show promo slide ${index + 1}`}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignSelf: 'center',
    borderRadius: 22,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.yellowLight,
    ...shadow.card,
  },
  slideInner: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 38,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    maxWidth: '58%',
    justifyContent: 'flex-start',
    zIndex: 1,
  },
  eyebrowPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(228, 94, 26, 0.12)',
  },
  eyebrow: { fontSize: 11, fontWeight: '500', color: colors.orange, lineHeight: 14 },
  eyebrowTagline: { fontSize: 14, ...taglineStyle(), color: colors.orange, lineHeight: 18 },
  title: { fontSize: 22, ...brandHeadingStyle(), color: colors.text, lineHeight: 26 },
  titleAccent: { fontSize: 22, ...brandHeadingStyle(), color: colors.orange, lineHeight: 28, marginBottom: 4 },
  sub: { fontSize: 12, color: colors.muted, lineHeight: 17, fontWeight: '500' },
  cta: {
    alignSelf: 'flex-start',
    backgroundColor: colors.orange,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 12,
  },
  ctaText: { color: colors.onPrimary, fontSize: 13, fontWeight: '800' },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#E8D9C8',
  },
  dotActive: {
    width: 22,
    borderRadius: 4,
    backgroundColor: colors.orange,
  },
});

const art = StyleSheet.create({
  wrap: {
    width: 128,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    paddingTop: 6,
    paddingRight: 6,
  },
  clip: {
    width: 118,
    height: 118,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.orangeLight,
  },
  photo: {
    width: 118,
    height: 118,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    ...shadow.subtle,
  },
  badgeText: {
    color: colors.onPrimary,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 12,
  },
  badgeOnlyWrap: {
    width: 72,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    paddingTop: 6,
    paddingRight: 6,
  },
});

const decor = StyleSheet.create({
  petal: {
    position: 'absolute',
    width: 16,
    height: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(228, 94, 26, 0.1)',
    transform: [{ rotate: '-24deg' }],
  },
  petalOne: { top: 14, right: 28 },
  petalTwo: { top: 52, right: 14, width: 12, height: 7, opacity: 0.75 },
  petalThree: { bottom: 48, right: 36, width: 10, height: 6, opacity: 0.55 },
});
