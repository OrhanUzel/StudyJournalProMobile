import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import AnimatedCard from './AnimatedCard';

/**
 * NoteCard component displays a single note with title, content preview, and timestamp
 * @param {Object} props - Component props
 * @param {Object} props.note - Note object with title, content, and createdAt
 * @param {Function} props.onPress - Function to call when card is pressed
 * @param {Function} props.onDelete - Function to call when delete button is pressed
 * @param {Number} props.index - Index for animation sequencing
 */
const NoteCard = ({ note, onPress, onDelete, index }) => {
  const { theme, spacing, borderRadius, shadow } = useTheme();
  const { language } = useLanguage();
  
  // Format the date to a readable string
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const locale = language === 'en' ? 'en-US' : 'tr-TR';
    return date.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Truncate content if it's too long
  const truncateContent = (text, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <AnimatedCard index={index}>
      <TouchableOpacity
        style={[
          styles.card,
          shadow.md,
          {
            backgroundColor: theme.card,
            borderRadius: borderRadius.lg,
            borderColor: theme.border,
            marginBottom: spacing.md,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={styles.headerRow}>
            <Text
              style={[
                styles.title,
                { color: theme.text, marginBottom: spacing.xs },
              ]}
              numberOfLines={1}
            >
              {note.title}
            </Text>
            
            {onDelete && (
              <TouchableOpacity
                onPress={() => onDelete(note.id)}
                hitSlop={{ top: 20, right: 20, bottom: 20, left: 20 }}
              >
                <Ionicons name="trash-outline" size={18} color={theme.error} />
              </TouchableOpacity>
            )}
          </View>

          <Text
            style={[styles.content, { color: theme.textSecondary }]}
            numberOfLines={3}
          >
            {truncateContent(note.content)}
          </Text>
          
          <View style={styles.footer}>
            <Text style={[styles.timestamp, { color: theme.textSecondary }]}>
              {formatDate(note.createdAt)}
            </Text>
            
            {note.duration && (
              <View style={styles.durationTag}>
                <Ionicons name="time-outline" size={12} color={theme.primary} />
                <Text style={[styles.durationText, { color: theme.primary }]}>
                  {note.duration} min
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </AnimatedCard>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
  },
  durationTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default NoteCard;