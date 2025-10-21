import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/context/ThemeContext';
import { NotesProvider } from './src/context/NotesContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AppNavigator from './src/navigation/AppNavigator';
import StopwatchService from './src/services/StopwatchService';

export default function App() {
  useEffect(() => {
    // Expo Go veya web ortamında bildirimleri tamamen devre dışı bırak
    if (Platform.OS === 'web' || (Constants?.appOwnership === 'expo')) {
      return;
    }

    let Notifications = null;
    try {
      Notifications = require('expo-notifications');
    } catch {}

    if (!Notifications) return;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === 'android') {
      (async () => {
        try {
          await Notifications.setNotificationChannelAsync('inactivity', {
            name: 'Inactivity',
            importance: Notifications.AndroidImportance.HIGH,
            sound: 'default',
            vibrationPattern: [0, 250, 250, 250],
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          });
        } catch {}
      })();
    }

    // Şimdilik izin isteme veya bildirim planlama yok
  }, []);

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <ThemeProvider>
          <NotesProvider>
            <NavigationContainer>
              <StatusBar style="auto" />
              <AppNavigator />
            </NavigationContainer>
          </NotesProvider>
        </ThemeProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
