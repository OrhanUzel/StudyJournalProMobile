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
import { useLanguage } from '../context/LanguageContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const HomeStack = () => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  
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
          title: t('nav.add_note'),
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
    </Stack.Navigator>
  );
};

const StopwatchStack = () => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  
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
        name="StopwatchMain" 
        component={StopwatchScreen} 
        options={{ 
          title: t('nav.stopwatch'),
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
    </Stack.Navigator>
  );
};

const RecordsStack = () => {
  const { theme } = useTheme();
  const { t } = useLanguage();

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
          title: t('nav.records'),
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
      <Stack.Screen 
        name="RecordDetail" 
        component={RecordDetailScreen} 
        options={{ 
          title: t('nav.record_detail'),
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
    </Stack.Navigator>
  );
};

const AppNavigator = () => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  
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
      <Tab.Screen name="Stopwatch" component={StopwatchStack} options={{ title: t('nav.stopwatch') }} />
      <Tab.Screen name="Records" component={RecordsStack} options={{ title: t('nav.records') }} />
      <Tab.Screen name="Statistics" component={StatisticsScreen} options={{ title: t('nav.statistics') }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: t('nav.settings') }} />
    </Tab.Navigator>
  );
};

export default AppNavigator;