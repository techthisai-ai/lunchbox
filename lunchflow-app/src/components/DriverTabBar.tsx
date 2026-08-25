import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, palette, shadow } from '../constants/theme';
import { DriverTabParamList } from '../navigation/types';

const BAR_HEIGHT = 58;
const SLOT = 36;

type TabDef = {
  name: keyof DriverTabParamList;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const TABS: TabDef[] = [
  { name: 'DriverHome', label: 'Home', icon: 'home-outline' },
  { name: 'DriverRoute', label: 'Route', icon: 'paper-plane-outline' },
  { name: 'DriverDeliveries', label: 'Deliveries', icon: 'location-outline' },
  { name: 'DriverProfile', label: 'Profile', icon: 'person-outline' },
];

function shouldHideTabBar(descriptors: BottomTabBarProps['descriptors'], state: BottomTabBarProps['state']) {
  const focused = state.routes[state.index];
  const options = descriptors[focused.key]?.options;
  const style = StyleSheet.flatten(options?.tabBarStyle);
  return style?.display === 'none';
}

export function DriverTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'web' ? 14 : 8);

  if (shouldHideTabBar(descriptors, state)) {
    return null;
  }

  const focusedName = state.routes[state.index]?.name;

  const goTo = (name: keyof DriverTabParamList) => {
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

  return (
    <View style={[styles.wrap, { paddingBottom: bottomPad }]}>
      <LinearGradient
        colors={[palette.forestSoft, palette.forest, '#3A4222']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.pill}
      >
        {TABS.map((tab) => {
          const focused = focusedName === tab.name;
          return (
            <Pressable
              key={tab.name}
              onPress={() => goTo(tab.name)}
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
        })}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bg,
    flexShrink: 0,
    zIndex: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  pill: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    ...shadow.card,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
});
