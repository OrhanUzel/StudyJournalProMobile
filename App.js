import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/context/ThemeContext';
import { NotesProvider } from './src/context/NotesContext';
import AppNavigator from './src/navigation/AppNavigator';

/**
 * Main App component that wraps the entire application
 * with necessary providers and navigation container
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NotesProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            <AppNavigator />
          </NavigationContainer>
        </NotesProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
