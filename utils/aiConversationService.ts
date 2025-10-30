import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, runTransaction, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  stocks?: Array<{
    ticker: string;
    companyName: string;
    price: number;
    priceChange: number;
    priceChangePercent: number;
  }>;
  news?: Array<{
    headline: string;
    summary: string;
    source: string;
    url: string;
    datetime: number;
    related: string;
  }>;
  timestamp: Date;
}

export interface AIConversation {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  context: {
    screen: string;
    data: any;
    suggestion: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

class AIConversationService {
  private readonly COLLECTION_NAME = 'ai_conversations';

  private toFirestoreMessage(msg: ChatMessage) {
    const cleanMsg: any = {
      sender: msg.sender,
      text: msg.text,
      timestamp: Timestamp.fromDate(msg.timestamp),
    };
    if (msg.stocks && msg.stocks.length > 0) {
      cleanMsg.stocks = msg.stocks;
    }
    if (msg.news && msg.news.length > 0) {
      cleanMsg.news = msg.news;
    }
    return cleanMsg;
  }

  /**
   * Save a new conversation to Firebase
   */
  async saveConversation(
    userId: string,
    messages: ChatMessage[],
    context: any,
    title?: string
  ): Promise<string> {
    try {
      const conversationId = doc(collection(db, this.COLLECTION_NAME)).id;
      const now = new Date();
      
      // Clean messages to remove undefined values (Firebase doesn't allow them)
      const cleanMessages = messages.map(msg => this.toFirestoreMessage(msg));
      
      const conversation = {
        userId,
        title: title || this.generateTitle(messages),
        messages: cleanMessages,
        context,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      };

      await setDoc(doc(db, this.COLLECTION_NAME, conversationId), conversation);
      return conversationId;
    } catch (error) {
      console.error('Error saving conversation:', error);
      throw error;
    }
  }

  /**
   * Update an existing conversation
   */
  async updateConversationContext(conversationId: string, context: any): Promise<void> {
    try {
      const now = new Date();
      await updateDoc(doc(db, this.COLLECTION_NAME, conversationId), {
        context,
        updatedAt: Timestamp.fromDate(now),
      });
    } catch (error) {
      console.error('Error updating conversation context:', error);
      throw error;
    }
  }

  /**
   * Append a single message atomically to avoid race conditions
   */
  async appendMessage(conversationId: string, message: ChatMessage): Promise<void> {
    try {
      const ref = doc(db, this.COLLECTION_NAME, conversationId);
      const now = new Date();

      await runTransaction(db, async (txn) => {
        const snapshot = await txn.get(ref);
        if (!snapshot.exists()) {
          throw new Error('Conversation not found');
        }
        const data: any = snapshot.data();
        const existing = Array.isArray(data.messages) ? data.messages : [];
        const newMessages = [...existing, this.toFirestoreMessage(message)];
        txn.update(ref, {
          messages: newMessages,
          updatedAt: Timestamp.fromDate(now),
        });
      });
    } catch (error) {
      console.error('Error appending message:', error);
      throw error;
    }
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId: string): Promise<AIConversation[]> {
    try {
      const conversationsRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        conversationsRef,
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const conversations: AIConversation[] = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        conversations.push({
          id: doc.id,
          userId: data.userId,
          title: data.title,
          messages: (data.messages || []).map((msg: any) => ({
            ...msg,
            timestamp: msg.timestamp.toDate(),
          })),
          context: data.context,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        });
      });

      return conversations;
    } catch (error) {
      console.error('Error getting user conversations:', error);
      throw error;
    }
  }

  /**
   * Get a specific conversation by ID
   */
  async getConversation(conversationId: string): Promise<AIConversation | null> {
    try {
      const ref = doc(db, this.COLLECTION_NAME, conversationId);
      const snapshot = await getDoc(ref);
      if (!snapshot.exists()) return null;
      const data: any = snapshot.data();
      return {
        id: snapshot.id,
        userId: data.userId,
        title: data.title,
        messages: (data.messages || []).map((msg: any) => ({
          ...msg,
          timestamp: msg.timestamp.toDate(),
        })),
        context: data.context,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      };
    } catch (error) {
      console.error('Error getting conversation:', error);
      throw error;
    }
  }

  /**
   * Generate a title for the conversation based on the first user message
   */
  private generateTitle(messages: ChatMessage[]): string {
    const firstUserMessage = messages.find(msg => msg.sender === 'user');
    if (!firstUserMessage) {
      return 'AI Conversation';
    }

    // Truncate and clean up the title
    const title = firstUserMessage.text.trim();
    return title.length > 50 ? title.substring(0, 47) + '...' : title;
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.COLLECTION_NAME, conversationId));
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  /**
   * Clean up truly empty conversations (conversations with no messages at all)
   */
  async cleanupBlankConversations(userId: string): Promise<void> {
    try {
      const conversationsRef = collection(db, this.COLLECTION_NAME);
      const q = query(
        conversationsRef,
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const conversationsToDelete: string[] = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        const messages = data.messages || [];
        
        // Only delete conversations that are completely empty (no messages at all)
        // Don't delete conversations with AI messages as they might be new conversations
        if (messages.length === 0) {
          conversationsToDelete.push(doc.id);
        }
      });

      // Delete blank conversations
      for (const id of conversationsToDelete) {
        await this.deleteConversation(id);
      }

      if (conversationsToDelete.length > 0) {
        console.log(`Cleaned up ${conversationsToDelete.length} empty conversations`);
      }
    } catch (error) {
      console.error('Error cleaning up blank conversations:', error);
      // Don't throw - this is a cleanup operation and shouldn't block loading
    }
  }
}

export const aiConversationService = new AIConversationService();
