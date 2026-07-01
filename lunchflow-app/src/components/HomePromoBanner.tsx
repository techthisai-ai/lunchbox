import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useRef, useState } from 'react';
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

const PROMO_LUNCH_ART = require('../../assets/promo-lunch-hero.png');

const SLIDES: PromoSlide[] = [
  {
    id: 'offer',
    eyebrow: 'Limited Offer',
    title: 'Healthy Food',
    titleAccent: 'Happy Kids!',
    sub: 'Daily lunch delivery from home to school.',
    cta: 'Order Now',
    discount: '20%\nOFF',
    action: 'subscription',
    gradient: ['#FCE4EC', '#FFF5F8', '#FFFFFF'],
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
    gradient: ['#F8E1F4', '#FFF7FB', '#FFFFFF'],
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
    gradient: ['#FFE8F0', '#FFF9FC', '#FFFFFF'],
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
        <Image source={PROMO_LUNCH_ART} style={art.photo} resizeMode="cover" accessibilityLabel="Lunch box and bag" />
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
            <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
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
  const [activeIndex, setActiveIndex] = useState(0);
  const slideHeight = useMemo(() => Math.max(204, Math.round(width * 0.54)), [width]);

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
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
            onPress={() => {
              setActiveIndex(index);
              scrollRef.current?.scrollTo({ x: width * index, animated: true });
            }}
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
    borderColor: '#F3D6E2',
    backgroundColor: '#FFF5F8',
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
    borderColor: 'rgba(233, 30, 99, 0.1)',
  },
  eyebrow: { fontSize: 11, fontWeight: '700', color: colors.orange, lineHeight: 14 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, lineHeight: 26 },
  titleAccent: { fontSize: 22, fontWeight: '800', color: colors.orange, lineHeight: 28, marginBottom: 4 },
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
    backgroundColor: '#E2CBD6',
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
    backgroundColor: '#FCE4EC',
  },
  photo: {
    width: 220,
    height: 118,
    marginLeft: -72,
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
    backgroundColor: 'rgba(233, 30, 99, 0.1)',
    transform: [{ rotate: '-24deg' }],
  },
  petalOne: { top: 14, right: 28 },
  petalTwo: { top: 52, right: 14, width: 12, height: 7, opacity: 0.75 },
  petalThree: { bottom: 48, right: 36, width: 10, height: 6, opacity: 0.55 },
});
