import React, { createContext, useContext, useEffect, useState } from 'react';
import { AIConversation, ChatMessage, aiConversationService } from '../utils/aiConversationService';
import { useAuth } from './AuthContext';

interface AIConversationContextType {
  currentConversation: AIConversation | null;
  conversations: AIConversation[];
  loading: boolean;
  error: string | null;
  saveMessage: (message: ChatMessage) => Promise<string | null>;
  startNewConversation: (context: any) => Promise<void>;
  updateConversationContext: (context: any) => Promise<void>;
  loadConversation: (conversationId: string) => Promise<AIConversation | null>;
  loadUserConversations: () => Promise<void>;
  clearError: () => void;
}

const AIConversationContext = createContext<AIConversationContextType | undefined>(undefined);

export const useAIConversation = () => {
  const context = useContext(AIConversationContext);
  if (!context) {
    throw new Error('useAIConversation must be used within an AIConversationProvider');
  }
  return context;
};

interface AIConversationProviderProps {
  children: React.ReactNode;
}

export const AIConversationProvider: React.FC<AIConversationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [currentConversation, setCurrentConversation] = useState<AIConversation | null>(null);
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingContext, setPendingContext] = useState<any | null>(null);
  

  // Load user conversations when user changes
  useEffect(() => {
    if (user) {
      loadUserConversations();
    } else {
      setConversations([]);
      setCurrentConversation(null);
    }
  }, [user]);

  const saveMessage = async (message: ChatMessage): Promise<string | null> => {
    if (!user) {
      setError('User must be logged in to save conversations');
      return null;
    }

    try {
      setError(null);
      if (currentConversation) {
        const conversationId = currentConversation.id;
        // Append atomically to Firestore to avoid race conditions
        await aiConversationService.appendMessage(conversationId, message);

        // Update local state optimistically
        setCurrentConversation(prev => prev ? {
          ...prev,
          messages: [...prev.messages, message],
          updatedAt: new Date(),
        } : null);
        // Also keep list in sync
        setConversations(prev => prev.map(c => c.id === conversationId ? {
          ...c,
          messages: [...c.messages, message],
          updatedAt: new Date(),
        } : c));
        
        return conversationId;
      } else {
        // Create a new conversation for the first message (user or AI)
        const initialContext = pendingContext || { screen: 'general', data: null, suggestion: 'New conversation' };
        const newConversationId = await aiConversationService.saveConversation(
          user.uid,
          [message],
          initialContext
        );
        
        const conversation: AIConversation = {
          id: newConversationId,
          userId: user.uid,
          title: aiConversationService['generateTitle']([message]),
          messages: [message],
          context: initialContext,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        setCurrentConversation(conversation);
        setConversations(prev => [conversation, ...prev]);
        setPendingContext(null);
        
        return newConversationId;
      }
    } catch (error: any) {
      console.error('Error saving message:', error);
      setError('Failed to save message');
      return null;
    }
  };

  const startNewConversation = async (context: any) => {
    if (!user) {
      setError('User must be logged in to start conversations');
      return;
    }

    try {
      setError(null);
      setPendingContext(context || { screen: 'general', data: null, suggestion: 'New conversation' });
      // Only clear current conversation if we're explicitly starting a new one
      // This should only happen when user manually clicks "New Conversation"
      // or when the app is restarted
      setCurrentConversation(null);
    } catch (error: any) {
      console.error('Error starting new conversation:', error);
      setError('Failed to start new conversation');
    }
  };

  const updateConversationContext = async (context: any) => {
    if (!user || !currentConversation) {
      return;
    }

    try {
      setError(null);
      
      // Update the current conversation's context without creating a new conversation
      const updatedConversation = {
        ...currentConversation,
        context: context,
        updatedAt: new Date()
      };
      
      // Update the conversation context in Firebase
      await aiConversationService.updateConversationContext(
        currentConversation.id,
        context
      );
      
      setCurrentConversation(updatedConversation);
    } catch (error: any) {
      console.error('Error updating conversation context:', error);
      setError('Failed to update conversation context');
    }
  };

  const loadConversation = async (conversationId: string): Promise<AIConversation | null> => {
    if (!user) {
      setError('User must be logged in to load conversations');
      return null;
    }

    try {
      setError(null);
      setLoading(true);
      
      const conversation = await aiConversationService.getConversation(conversationId);
      if (conversation) {
        setCurrentConversation(conversation);
        // Update conversations list entry
        setConversations(prev => prev.map(c => c.id === conversation.id ? conversation : c));
        return conversation;
      } else {
        setError('Conversation not found');
        return null;
      }
    } catch (error: any) {
      console.error('Error loading conversation:', error);
      setError('Failed to load conversation');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const loadUserConversations = async () => {
    if (!user) {
      setError('User must be logged in to load conversations');
      return;
    }

    try {
      setError(null);
      setLoading(true);

      // Load user conversations
      const userConversations = await aiConversationService.getUserConversations(user.uid);
      setConversations(userConversations);
    } catch (error: any) {
      console.error('AIConversationContext - Error loading user conversations:', error);
      console.error('AIConversationContext - Error details:', error.message, error.code);
      setError(`Failed to load conversations: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    currentConversation,
    conversations,
    loading,
    error,
    saveMessage,
    startNewConversation,
    updateConversationContext,
    loadConversation,
    loadUserConversations,
    clearError,
  };

  return (
    <AIConversationContext.Provider value={value}>
      {children}
    </AIConversationContext.Provider>
  );
};
