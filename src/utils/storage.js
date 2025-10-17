/**
 * Storage utility functions for AsyncStorage operations
 * Provides a clean API for storing and retrieving data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Store data with given key
export const storeData = async (key, value) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
    return true;
  } catch (error) {
    console.error(`Error storing ${key}:`, error);
    return false;
  }
};

// Get data for given key
export const getData = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error(`Error retrieving ${key}:`, error);
    return null;
  }
};

// Remove data for given key
export const removeData = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing ${key}:`, error);
    return false;
  }
};

// Clear all app data
export const clearAllData = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys);
    return true;
  } catch (error) {
    console.error('Error clearing all data:', error);
    return false;
  }
};

// Get all stored keys
export const getAllKeys = async () => {
  try {
    return await AsyncStorage.getAllKeys();
  } catch (error) {
    console.error('Error getting all keys:', error);
    return [];
  }
};

// Storage keys used in the app
export const STORAGE_KEYS = {
  NOTES: 'notes',
  STUDY_SESSIONS: 'studySessions',
  THEME_PREFERENCE: 'themePreference',
  USER_SETTINGS: 'userSettings',
};

export default {
  storeData,
  getData,
  removeData,
  clearAllData,
  getAllKeys,
  STORAGE_KEYS,
};