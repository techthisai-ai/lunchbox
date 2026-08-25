import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, LayoutChangeEvent, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import { colors, palette, shadow } from '../constants/theme';
import { useDelivery } from '../context/DeliveryContext';
import { resetCustomerProfileTab } from '../navigation/customerRoutes';
import { MainTabParamList } from '../navigation/types';
import { callDriver } from '../utils/phoneCall';

const BAR_HEIGHT = 58;
const FAB_SIZE = 58;
const NOTCH_R = 32;
const PILL_R = 29;
const SLOT = 36;

type TabDef = {
  name: keyof MainTabParamList;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const LEFT_TABS: TabDef[] = [
  { name: 'Home', label: 'Home', icon: 'home-outline' },
  { name: 'Track', label: 'Track', icon: 'navigate-outline' },
];

const RIGHT_TABS: TabDef[] = [
  { name: 'Subscription', label: 'Plan', icon: 'calendar-outline' },
  { name: 'Profile', label: 'Profile', icon: 'person-outline' },
];

function shouldHideTabBar(descriptors: BottomTabBarProps['descriptors'], state: BottomTabBarProps['state']) {
  const focused = state.routes[state.index];
  const options = descriptors[focused.key]?.options;
  const style = StyleSheet.flatten(options?.tabBarStyle);
  return style?.display === 'none';
}

function buildNotchedPill(width: number, height: number) {
  const cx = width / 2;
  const r = Math.min(PILL_R, height / 2);
  const n = NOTCH_R;
  return `
    M ${r} 0
    L ${cx - n} 0
    A ${n} ${n} 0 0 1 ${cx + n} 0
    L ${width - r} 0
    A ${r} ${r} 0 0 1 ${width} ${r}
    L ${width} ${height - r}
    A ${r} ${r} 0 0 1 ${width - r} ${height}
    L ${r} ${height}
    A ${r} ${r} 0 0 1 0 ${height - r}
    L 0 ${r}
    A ${r} ${r} 0 0 1 ${r} 0
    Z
  `;
}

function TabItem({
  tab,
  focused,
  onPress,
}: {
  tab: TabDef;
  focused: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tabItem, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={tab.label}
    >
      <View style={[styles.iconSlot, focused && styles.iconSlotActive]}>
        <Ionicons name={tab.icon} size={20} color={colors.onPrimary} />
      </View>
      {focused ? <View style={styles.activeDot} /> : <View style={styles.activeDotSpacer} />}
    </Pressable>
  );
}

export function CustomerTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { order } = useDelivery();
  const [barWidth, setBarWidth] = useState(0);
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'web' ? 14 : 8);

  if (shouldHideTabBar(descriptors, state)) {
    return null;
  }

  const focusedName = state.routes[state.index]?.name;

  const onBarLayout = (e: LayoutChangeEvent) => {
    const next = Math.round(e.nativeEvent.layout.width);
    if (next !== barWidth) setBarWidth(next);
  };

  const goTo = (name: keyof MainTabParamList) => {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return;
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) {
      if (name === 'Profile') {
        resetCustomerProfileTab(navigation);
        return;
      }
      navigation.navigate(name);
    }
  };

  const handleCallDriver = () => {
    if (!order) {
      Alert.alert('No driver yet', 'A pickup driver has not been assigned yet.');
      return;
    }
    void callDriver(order);
  };

  return (
    <View style={[styles.wrap, { paddingBottom: bottomPad }]}>
      <View style={styles.barShell} onLayout={onBarLayout}>
        {barWidth > 0 ? (
          <Svg width={barWidth} height={BAR_HEIGHT} style={styles.barSvg}>
            <Defs>
              <SvgGradient id="navBarFill" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={palette.forestSoft} />
                <Stop offset="0.55" stopColor={palette.forest} />
                <Stop offset="1" stopColor="#3A4222" />
              </SvgGradient>
            </Defs>
            <Path d={buildNotchedPill(barWidth, BAR_HEIGHT)} fill="url(#navBarFill)" />
          </Svg>
        ) : (
          <View style={styles.barFallback} />
        )}

        <View style={[styles.barContent, { height: BAR_HEIGHT }]}>
          <View style={styles.side}>
            {LEFT_TABS.map((tab) => (
              <TabItem key={tab.name} tab={tab} focused={focusedName === tab.name} onPress={() => goTo(tab.name)} />
            ))}
          </View>

          <View style={styles.centerSpacer} />

          <View style={styles.side}>
            {RIGHT_TABS.map((tab) => (
              <TabItem key={tab.name} tab={tab} focused={focusedName === tab.name} onPress={() => goTo(tab.name)} />
            ))}
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={handleCallDriver}
          accessibilityRole="button"
          accessibilityLabel="Call pickup driver"
        >
          <View style={styles.fabGlow} />
          <View style={styles.fabBtn}>
            <Ionicons name="call" size={24} color={colors.orange} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bg,
    flexShrink: 0,
    zIndex: 20,
    paddingHorizontal: 16,
    paddingTop: 22,
  },
  barShell: {
    position: 'relative',
    overflow: 'visible',
    ...shadow.card,
  },
  barSvg: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  barFallback: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: BAR_HEIGHT,
    borderRadius: 999,
    backgroundColor: colors.green,
  },
  barContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  side: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  centerSpacer: {
    width: FAB_SIZE + 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
    paddingTop: 6,
  },
  iconSlot: {
    width: SLOT,
    height: SLOT,
    borderRadius: SLOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSlotActive: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.orange,
    marginTop: 3,
  },
  activeDotSpacer: {
    width: 6,
    height: 6,
    marginTop: 3,
  },
  pressed: {
    opacity: 0.85,
  },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    top: -22,
    left: '50%',
    marginLeft: -FAB_SIZE / 2,
    width: FAB_SIZE,
    height: FAB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  fabPressed: {
    transform: [{ scale: 0.96 }],
  },
  fabGlow: {
    position: 'absolute',
    width: FAB_SIZE + 10,
    height: FAB_SIZE + 10,
    borderRadius: (FAB_SIZE + 10) / 2,
    backgroundColor: 'rgba(228, 94, 26, 0.22)',
  },
  fabBtn: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
});
