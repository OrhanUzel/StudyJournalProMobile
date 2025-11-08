import React from 'react';
import { Platform, View } from 'react-native';
import Constants from 'expo-constants';

export default function AdsBanner({ unitId, size, containerStyle }) {
  const isExpoGo = Constants?.appOwnership === 'expo';
  if (Platform.OS === 'web' || isExpoGo) {
    return null;
  }

  const { BannerAd, BannerAdSize } = require('react-native-google-mobile-ads');
  const finalSize = size || BannerAdSize.ADAPTIVE_BANNER;
  return (
    <View style={containerStyle}>
      <BannerAd unitId={unitId} size={finalSize} />
    </View>
  );
}