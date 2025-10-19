import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/context/ThemeContext';
import { NotesProvider } from './src/context/NotesContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { Platform } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import StopwatchService from './src/services/StopwatchService';

export default function App() {
  useEffect(() => {
    let Notifications = null;
    try {
      Notifications = require('expo-notifications');
    } catch {}

    if (!Notifications || Platform.OS === 'web') return;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
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

    // Açılışta bildirim iznini iste (web değilken)
    (async () => {
      try {
        await StopwatchService.ensureNotificationPermission();
      } catch {}
    })();
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
