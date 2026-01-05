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
        <AdsBanner
          unitId={bannerUnitId}
          containerStyle={{ paddingHorizontal: 8, paddingTop: 8, paddingBottom: 8, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.background }}
        />
      )}

      <BottomTabBar {...props} />
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
