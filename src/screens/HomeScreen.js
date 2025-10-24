import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, Animated } from 'react-native';
import { useNotes } from '../context/NotesContext';
import { useTheme } from '../context/ThemeContext';
import NoteCard from '../components/NoteCard';
import AddButton from '../components/AddButton';
import ConfirmDialog from '../components/ConfirmDialog';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

/**
 * HomeScreen component displays the list of notes and provides navigation to add new notes
 */
const HomeScreen = ({ navigation }) => {
  const { notes, deleteNote } = useNotes();
  const { theme, spacing } = useTheme();
  const [fadeAnim] = useState(new Animated.Value(1));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  
  // Array of motivational quotes
  const motivationalQuotes = [
    "Study hard what interests you the most in the most undisciplined way possible.",
    "The more that you read, the more things you will know.",
    "Education is the passport to the future.",
    "The beautiful thing about learning is nobody can take it away from you.",
    "The expert in anything was once a beginner.",
  ];
  
  // Get random quote
  const [quote, setQuote] = useState('');
  
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * motivationalQuotes.length);
    setQuote(motivationalQuotes[randomIndex]);
  }, []);

  // Handle note deletion with confirmation
  const handleDeleteNote = (noteId) => {
    setDeleteTargetId(noteId);
    setShowDeleteConfirm(true);
  };

  // Navigate to add note screen
  const handleAddNote = () => {
    navigation.navigate('AddNote');
  };

  // Render empty state when no notes
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        No study notes yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        Tap the + button to add your first note
      </Text>
    </View>
  );

  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Study Journal</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {quote}
        </Text>
      </View>

      {/* Notes List */}
      <FlatList
        data={notes}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Animated.View style={{ opacity: fadeAnim }}>
            <NoteCard
              note={item}
              onPress={() => navigation.navigate('AddNote', { note: item })}
              onDelete={handleDeleteNote}
            />
          </Animated.View>
        )}
        contentContainerStyle={[
          styles.listContent,
          { 
            paddingHorizontal: spacing.md,
            paddingBottom: Math.max(80, insets.bottom + tabBarHeight + 24),
          },
          notes.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Themed Delete Confirm */}
      <ConfirmDialog
        visible={showDeleteConfirm}
        title={'Delete Note'}
        message={'Are you sure you want to delete this note?'}
        cancelText={'Cancel'}
        confirmText={'Delete'}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            if (deleteTargetId != null) {
              deleteNote(deleteTargetId);
            }
            fadeAnim.setValue(1);
            setDeleteTargetId(null);
          });
        }}
      />

      {/* Add Button */}
      <AddButton onPress={handleAddNote} style={{ bottom: insets.bottom + tabBarHeight + 16 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 80,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default HomeScreen;