import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import AdsBanner from '../components/AdsBanner';
import { getBannerUnitId } from '../config/adMobIds';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Custom tab bar that shows a thin banner ad just above the bottom tabs.
 * It respects Safe Area Insets and app theme. AdsBanner internally hides
 * itself on Web, Expo Go, Turkey region, or when ads are disabled.
 */
const CustomTabBar = (props) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const bannerHeight = 50; // Approx height for BannerAdSize.BANNER
  const {
    bannerUnitId = getBannerUnitId(),
    bannerEnabled = true,
  } = props;

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.background }]}> 
      {bannerEnabled && (
        <View style={[styles.bannerContainer, { borderTopColor: theme.border }]}> 
          <AdsBanner
            unitId={bannerUnitId}
            containerStyle={{ paddingVertical: 4, width: '100%' }}
          />
        </View>
      )}

      <BottomTabBar {...props} />

      {/* Reserve safe area at very bottom so ad and tabs never collide with system gesture area */}
      {insets.bottom > 0 && (
        <View style={{ height: Math.max(insets.bottom, 8) }} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 0,
  },
  bannerContainer: {
    borderTopWidth: 1,
    alignItems: 'center',
  },
});

export default CustomTabBar;