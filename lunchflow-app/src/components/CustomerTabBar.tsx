import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors, shadow } from '../constants/theme';
import { useDelivery } from '../context/DeliveryContext';
import { MainTabParamList } from '../navigation/types';
import { callDriver } from '../utils/phoneCall';

const BAR_HEIGHT = 64;
const FAB_SIZE = 62;
const NOTCH_R = 36;

type TabDef = {
  name: keyof MainTabParamList;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
};

const LEFT_TABS: TabDef[] = [
  { name: 'Home', label: 'Home', icon: 'home-outline', iconFocused: 'home' },
  { name: 'Track', label: 'Track', icon: 'navigate-outline', iconFocused: 'navigate' },
];

const RIGHT_TABS: TabDef[] = [
  { name: 'Subscription', label: 'Plan', icon: 'card-outline', iconFocused: 'card' },
  { name: 'Profile', label: 'Profile', icon: 'person-outline', iconFocused: 'person' },
];

function shouldHideTabBar(descriptors: BottomTabBarProps['descriptors'], state: BottomTabBarProps['state']) {
  const focused = state.routes[state.index];
  const options = descriptors[focused.key]?.options;
  const style = StyleSheet.flatten(options?.tabBarStyle);
  return style?.display === 'none';
}

/** Full-width bar with a circular notch at the top center for the call FAB. */
function buildNotchedPath(width: number, height: number) {
  const cx = width / 2;
  const r = NOTCH_R;
  return `
    M 0 0
    L ${cx - r} 0
    A ${r} ${r} 0 0 1 ${cx + r} 0
    L ${width} 0
    L ${width} ${height}
    L 0 ${height}
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
  const color = focused ? colors.orange : colors.muted;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tabItem, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={tab.label}
    >
      <Ionicons name={focused ? tab.iconFocused : tab.icon} size={22} color={color} />
      <Text style={[styles.tabLabel, { color }]}>{tab.label}</Text>
      {focused ? <View style={styles.activeUnderline} /> : <View style={styles.activeUnderlineSpacer} />}
    </Pressable>
  );
}

export function CustomerTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { order } = useDelivery();
  const [barWidth, setBarWidth] = useState(0);
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'web' ? 8 : 4);

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
            <Path d={buildNotchedPath(barWidth, BAR_HEIGHT)} fill={colors.white} />
          </Svg>
        ) : (
          <View style={[styles.barFallback, { height: BAR_HEIGHT }]} />
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
          <View style={styles.fabBtn}>
            <Ionicons name="call" size={26} color={colors.onPrimary} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    ...shadow.subtle,
  },
  barShell: {
    position: 'relative',
    overflow: 'visible',
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
    backgroundColor: colors.white,
  },
  barContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  side: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  centerSpacer: {
    width: FAB_SIZE + 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  activeUnderline: {
    width: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.orange,
    marginTop: 1,
  },
  activeUnderlineSpacer: {
    width: 16,
    height: 3,
    marginTop: 1,
  },
  pressed: {
    opacity: 0.85,
  },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    top: -6,
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
  fabBtn: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    ...shadow.card,
  },
});
