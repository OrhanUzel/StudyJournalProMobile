import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import AddNoteScreen from '../screens/AddNoteScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import StopwatchScreen from '../screens/StopwatchScreen';
import RecordsListScreen from '../screens/RecordsListScreen';
import RecordDetailScreen from '../screens/RecordDetailScreen';

// Import theme context
import { useTheme } from '../context/ThemeContext';

// Create navigators
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Home stack navigator (for Home screen and Add Note screen)
const HomeStack = () => {
  const { theme } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: theme.textColor,
        cardStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen 
        name="HomeScreen" 
        component={HomeScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AddNote" 
        component={AddNoteScreen} 
        options={{ 
          title: 'Not Ekle',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
    </Stack.Navigator>
  );
};

// Stopwatch stack navigator
const StopwatchStack = () => {
  const { theme } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: theme.textColor,
        cardStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen 
        name="Stopwatch" 
        component={StopwatchScreen} 
        options={{ 
          title: 'Kronometre',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
    </Stack.Navigator>
  );
};

// Records stack navigator
const RecordsStack = () => {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: theme.textColor,
        cardStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen 
        name="RecordsList" 
        component={RecordsListScreen} 
        options={{ 
          title: 'Çalışma Günlüğüm',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
      <Stack.Screen 
        name="RecordDetail" 
        component={RecordDetailScreen} 
        options={{ 
          title: 'Kayıt Detayı',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
    </Stack.Navigator>
  );
};

// Main app navigator with bottom tabs
const AppNavigator = () => {
  const { theme } = useTheme();
  
  return (
    <Tab.Navigator
      initialRouteName="Stopwatch"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === 'Stopwatch') {
            iconName = focused ? 'timer' : 'timer-outline';
          } else if (route.name === 'Records') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Statistics') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.primaryColor,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.borderColor,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen name="Stopwatch" component={StopwatchStack} options={{ title: 'Kronometre' }} />
      <Tab.Screen name="Records" component={RecordsStack} options={{ title: 'Çalışma Günlüğüm' }} />
      <Tab.Screen name="Statistics" component={StatisticsScreen} options={{ title: 'İstatistikler' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Ayarlar' }} />
    </Tab.Navigator>
  );
};

export default AppNavigator;