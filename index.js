import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Suppress Expo Go Android remote push warning while keeping local notifications
if (Platform.OS === 'android') {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const first = args?.[0] ?? '';
    const msg = typeof first === 'string' ? first : String(first);
    const isExpoGo = Constants?.appOwnership === 'expo';
    const isExpoPushWarning = msg.includes('expo-notifications') && msg.includes('Expo Go') && msg.toLowerCase().includes('push');
    if (isExpoGo && isExpoPushWarning) {
      // Ignore only the specific Expo Go remote push warning
      return;
    }
    originalConsoleError(...args);
  };

  const originalConsoleWarn = console.warn;
  console.warn = (...args) => {
    const first = args?.[0] ?? '';
    const msg = typeof first === 'string' ? first : String(first);
    const isExpoGo = Constants?.appOwnership === 'expo';
    const isExpoPushWarning = msg.includes('expo-notifications') && msg.includes('Expo Go') && msg.toLowerCase().includes('push');
    if (isExpoGo && isExpoPushWarning) {
      // Ignore only the specific Expo Go remote push warning
      return;
    }
    originalConsoleWarn(...args);
  };
}

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
