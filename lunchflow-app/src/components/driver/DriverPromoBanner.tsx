import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { brandHeadingStyle } from '../../constants/fonts';
import { colors, palette, shadow, spacing } from '../../constants/theme';

const MEAL = require('../../../assets/driver-promo-meal.png');
const TIFFIN = require('../../../assets/login-food-cutout.png');

const SLIDES = [
  {
    id: 'healthy',
    title: 'Healthy Meals\nSimpler Life',
    sub: 'Fresh ingredients, homemade with love',
    image: MEAL,
  },
  {
    id: 'fresh',
    title: 'Packed Fresh\nDelivered Fast',
    sub: 'Home-cooked meals on the road with care',
    image: TIFFIN,
  },
];

const AUTO_MS = 3800;

export function DriverPromoBanner() {
  const scrollRef = useRef<ScrollView>(null);
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(Dimensions.get('window').width - spacing.md * 2);

  const goToSlide = useCallback(
    (nextIndex: number, animated = true) => {
      if (!width) return;
      const next = ((nextIndex % SLIDES.length) + SLIDES.length) % SLIDES.length;
      indexRef.current = next;
      setIndex(next);
      scrollRef.current?.scrollTo({ x: width * next, animated });
    },
    [width],
  );

  useFocusEffect(
    useCallback(() => {
      if (!width) return undefined;
      const timer = setInterval(() => {
        goToSlide(indexRef.current + 1);
      }, AUTO_MS);
      return () => clearInterval(timer);
    }, [width, goToSlide]),
  );

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, next));
    indexRef.current = clamped;
    setIndex(clamped);
  };

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => {
        const next = Math.round(e.nativeEvent.layout.width);
        if (next > 0 && next !== width) setWidth(next);
      }}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        onScroll={Platform.OS === 'web' ? onScrollEnd : undefined}
        scrollEventThrottle={16}
        style={styles.pager}
      >
        {SLIDES.map((slide) => (
          <View key={slide.id} style={[styles.slide, { width }]}>
            <LinearGradient
              colors={[palette.forestSoft, palette.forest, '#3A4222']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              <Ionicons name="leaf" size={42} color="rgba(255,255,255,0.08)" style={styles.leafOne} />
              <Ionicons name="leaf-outline" size={28} color="rgba(255,255,255,0.1)" style={styles.leafTwo} />
              <View style={styles.copy}>
                <Text style={styles.title}>{slide.title}</Text>
                <Text style={styles.sub}>{slide.sub}</Text>
              </View>
              <Image source={slide.image} style={styles.image} resizeMode="cover" />
            </LinearGradient>
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {SLIDES.map((slide, i) => (
          <View key={slide.id} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 2 },
  pager: { borderRadius: 22, overflow: 'hidden', ...shadow.card },
  slide: { overflow: 'hidden' },
  card: {
    minHeight: 104,
    borderRadius: 22,
    paddingLeft: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  leafOne: { position: 'absolute', top: 6, left: 86 },
  leafTwo: { position: 'absolute', bottom: 12, left: 48 },
  copy: { flex: 1, minWidth: 0, zIndex: 2, paddingRight: 8 },
  title: {
    fontSize: 17,
    lineHeight: 21,
    color: colors.onPrimary,
    ...brandHeadingStyle(),
  },
  sub: {
    fontSize: 11,
    lineHeight: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    fontWeight: '500',
  },
  image: {
    width: 96,
    height: 104,
    marginRight: -8,
    marginVertical: -12,
    borderTopRightRadius: 22,
    borderBottomRightRadius: 22,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(81,91,47,0.22)',
  },
  dotActive: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: palette.forest,
  },
});
