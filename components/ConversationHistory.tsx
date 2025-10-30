import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { AIConversation } from '../utils/aiConversationService';

interface ConversationHistoryProps {
  conversations: AIConversation[];
  currentConversation: AIConversation | null;
  onSelectConversation: (conversation: AIConversation) => void;
  onNewConversation: () => void;
  onClose: () => void;
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  conversations,
  currentConversation,
  onSelectConversation,
  onNewConversation,
  onClose,
}) => {
  console.log('ConversationHistory - Received conversations:', conversations.length);
  console.log('ConversationHistory - Current conversation:', currentConversation?.id);
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getLastMessage = (conversation: AIConversation) => {
    if (conversation.messages.length === 0) return 'No messages';
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    return lastMessage.text.length > 50 
      ? lastMessage.text.substring(0, 50) + '...'
      : lastMessage.text;
  };

  const renderConversation = ({ item }: { item: AIConversation }) => {
    const isSelected = currentConversation?.id === item.id;
    
    return (
      <Pressable
        style={[
          styles.conversationItem,
          isSelected && styles.selectedConversation
        ]}
        onPress={() => onSelectConversation(item)}
      >
        <View style={styles.conversationHeader}>
          <Text style={[
            styles.conversationTitle,
            isSelected && styles.selectedText
          ]}>
            {item.title}
          </Text>
          <Text style={[
            styles.conversationDate,
            isSelected && styles.selectedSubtext
          ]}>
            {formatDate(item.updatedAt)}
          </Text>
        </View>
        <Text style={[
          styles.conversationPreview,
          isSelected && styles.selectedSubtext
        ]}>
          {getLastMessage(item)}
        </Text>
        <View style={styles.conversationStats}>
          <Text style={[
            styles.messageCount,
            isSelected && styles.selectedSubtext
          ]}>
            {item.messages.length} messages
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Conversation History</Text>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={24} color="#ffffff" />
        </Pressable>
      </View>
      
      <Pressable style={styles.newConversationButton} onPress={onNewConversation}>
        <MaterialCommunityIcons name="plus" size={20} color="#17bf2d" />
        <Text style={styles.newConversationText}>New Conversation</Text>
      </Pressable>
      
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        style={styles.conversationList}
        contentContainerStyle={styles.conversationListContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e22',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#17bf2d',
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3e',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
  closeButton: {
    padding: 5,
  },
  newConversationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B22',
    margin: 20,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#17bf2d',
    borderStyle: 'dashed',
  },
  newConversationText: {
    color: '#17bf2d',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins',
    marginLeft: 10,
  },
  conversationList: {
    flex: 1,
  },
  conversationListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  conversationItem: {
    backgroundColor: '#161B22',
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a3e',
  },
  selectedConversation: {
    backgroundColor: '#17bf2d',
    borderColor: '#17bf2d',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Poppins',
    flex: 1,
  },
  selectedText: {
    color: '#ffffff',
  },
  conversationDate: {
    fontSize: 12,
    color: '#6E7681',
    fontFamily: 'Poppins',
  },
  selectedSubtext: {
    color: '#ffffff',
    opacity: 0.8,
  },
  conversationPreview: {
    fontSize: 14,
    color: '#C9D1D9',
    fontFamily: 'Poppins',
    marginBottom: 8,
    lineHeight: 20,
  },
  conversationStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageCount: {
    fontSize: 12,
    color: '#6E7681',
    fontFamily: 'Poppins',
  },
});
