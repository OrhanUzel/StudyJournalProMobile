import { Platform } from 'react-native';
import * as TrackingTransparency from 'expo-tracking-transparency';

let cachedStatus = null;

export async function ensureTrackingPermission() {
  if (Platform.OS !== 'ios') return true;
  try {
    const current = await TrackingTransparency.getTrackingPermissionsAsync();
    cachedStatus = current?.status || current?.granted ? 'granted' : current?.status;
    if (current?.status === 'granted' || current?.status === 'authorized') {
      return true;
    }
    const requested = await TrackingTransparency.requestTrackingPermissionsAsync();
    cachedStatus = requested?.status;
    return requested?.status === 'granted' || requested?.status === 'authorized';
  } catch {
    return false;
  }
}

export const wasTrackingPrompted = () => cachedStatus !== null;

export default {
  ensureTrackingPermission,
  wasTrackingPrompted,
};





