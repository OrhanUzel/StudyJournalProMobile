import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  Animated
} from 'react-native';
import { useNotes } from '../context/NotesContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

/**
 * AddNoteScreen component for creating and editing study notes
 * with smooth animations
 */
const AddNoteScreen = ({ navigation, route }) => {
  const { addNote } = useNotes();
  const { theme, spacing, borderRadius } = useTheme();
  
  // Check if we're editing an existing note
  const existingNote = route.params?.note;
  
  // Form state
  const [title, setTitle] = useState(existingNote?.title || '');
  const [content, setContent] = useState(existingNote?.content || '');
  const [duration, setDuration] = useState(
    existingNote?.duration ? String(existingNote.duration) : ''
  );
  
  // Animation for form elements
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // Run entry animation on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Handle saving the note with exit animation
  const handleSave = () => {
    if (!title.trim()) {
      alert('Please enter a title for your note');
      return;
    }
    
    // Create note object
    const noteData = {
      title: title.trim(),
      content: content.trim(),
      duration: duration ? parseInt(duration, 10) : null,
      timestamp: Date.now(),
    };
    
    // Add note and run exit animation before navigating back
    addNote(noteData);
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -30,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.goBack();
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={[
            styles.formContainer,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Title Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Title</Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: theme.surface,
                  color: theme.text,
                  borderColor: theme.border,
                  borderRadius: borderRadius.md,
                }
              ]}
              placeholder="What did you study?"
              placeholderTextColor={theme.textSecondary}
              value={title}
              onChangeText={setTitle}
              autoFocus
            />
          </View>
          
          {/* Duration Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>
              Duration (minutes)
            </Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: theme.surface,
                  color: theme.text,
                  borderColor: theme.border,
                  borderRadius: borderRadius.md,
                }
              ]}
              placeholder="How long did you study?"
              placeholderTextColor={theme.textSecondary}
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
            />
          </View>
          
          {/* Content Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Notes</Text>
            <TextInput
              style={[
                styles.textArea,
                { 
                  backgroundColor: theme.surface,
                  color: theme.text,
                  borderColor: theme.border,
                  borderRadius: borderRadius.md,
                }
              ]}
              placeholder="What did you learn? Any key insights?"
              placeholderTextColor={theme.textSecondary}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />
          </View>
          
          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              { 
                backgroundColor: theme.primary,
                borderRadius: borderRadius.md,
              }
            ]}
            onPress={handleSave}
          >
            <Ionicons name="save-outline" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>
              {existingNote ? 'Update Note' : 'Save Note'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  formContainer: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 150,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    fontSize: 16,
  },
  saveButton: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default AddNoteScreen;