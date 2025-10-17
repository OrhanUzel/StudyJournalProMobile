import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Create context for notes management
const NotesContext = createContext();

// Custom hook for using notes context
export const useNotes = () => useContext(NotesContext);

// Notes provider component
export const NotesProvider = ({ children }) => {
  // State for storing notes and study sessions
  const [notes, setNotes] = useState([]);
  const [studySessions, setStudySessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load notes from AsyncStorage on component mount
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const storedNotes = await AsyncStorage.getItem('notes');
        const storedSessions = await AsyncStorage.getItem('studySessions');
        
        if (storedNotes) {
          setNotes(JSON.parse(storedNotes));
        }
        
        if (storedSessions) {
          setStudySessions(JSON.parse(storedSessions));
        }
      } catch (error) {
        console.error('Error loading notes:', error);
        Alert.alert('Error', 'Failed to load your notes.');
      } finally {
        setLoading(false);
      }
    };

    loadNotes();
  }, []);

  // Save notes to AsyncStorage whenever they change
  useEffect(() => {
    const saveNotes = async () => {
      try {
        await AsyncStorage.setItem('notes', JSON.stringify(notes));
      } catch (error) {
        console.error('Error saving notes:', error);
      }
    };

    if (!loading) {
      saveNotes();
    }
  }, [notes, loading]);

  // Save study sessions to AsyncStorage whenever they change
  useEffect(() => {
    const saveSessions = async () => {
      try {
        await AsyncStorage.setItem('studySessions', JSON.stringify(studySessions));
      } catch (error) {
        console.error('Error saving study sessions:', error);
      }
    };

    if (!loading) {
      saveSessions();
    }
  }, [studySessions, loading]);

  // Add a new note
  const addNote = (note) => {
    const newNote = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...note,
    };
    setNotes((prevNotes) => [newNote, ...prevNotes]);
    
    // Also record a study session when adding a note
    if (note.duration) {
      addStudySession({
        date: new Date().toISOString(),
        duration: note.duration,
        subject: note.title,
      });
    }
    
    return newNote;
  };

  // Add a study session
  const addStudySession = (session) => {
    const newSession = {
      id: Date.now().toString(),
      ...session,
    };
    setStudySessions((prevSessions) => [...prevSessions, newSession]);
    return newSession;
  };

  // Delete a note
  const deleteNote = (noteId) => {
    setNotes((prevNotes) => prevNotes.filter((note) => note.id !== noteId));
  };

  // Clear all notes
  const clearAllNotes = async () => {
    try {
      await AsyncStorage.removeItem('notes');
      await AsyncStorage.removeItem('studySessions');
      setNotes([]);
      setStudySessions([]);
    } catch (error) {
      console.error('Error clearing notes:', error);
      Alert.alert('Error', 'Failed to clear notes.');
    }
  };

  // Get study statistics
  const getStudyStats = (period = 'week') => {
    const now = new Date();
    let startDate;
    
    if (period === 'week') {
      // Get start of current week (Sunday)
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay());
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      // Get start of current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      // Default to last 7 days
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    }
    
    // Filter sessions within the period
    const filteredSessions = studySessions.filter(
      (session) => new Date(session.date) >= startDate
    );
    
    return filteredSessions;
  };

  // Context value
  const value = {
    notes,
    studySessions,
    loading,
    addNote,
    deleteNote,
    clearAllNotes,
    addStudySession,
    getStudyStats,
  };

  return (
    <NotesContext.Provider value={value}>
      {children}
    </NotesContext.Provider>
  );
};

export default NotesContext;