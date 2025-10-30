import { addDoc, collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export const testFirebasePermissions = async () => {
  try {
    console.log('Testing Firebase permissions...');
    
    // Check if user is authenticated
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log('No authenticated user - skipping permissions test');
      return { 
        success: true, 
        message: 'No user authenticated - test skipped',
        skipped: true 
      };
    }
    
    console.log('Testing with authenticated user:', currentUser.uid);
    
    // Test reading from ai_conversations collection
    const conversationsRef = collection(db, 'ai_conversations');
    const q = query(conversationsRef, where('userId', '==', currentUser.uid));
    const querySnapshot = await getDocs(q);
    
    console.log('Successfully read from ai_conversations collection');
    console.log('Found conversations:', querySnapshot.size);
    
    // Test creating a test conversation with actual user ID
    const testConversation = {
      userId: currentUser.uid,
      title: 'Permission Test',
      messages: [{
        sender: 'user',
        text: 'Test message',
        timestamp: new Date()
      }],
      context: {
        screen: 'general',
        data: null,
        suggestion: 'Test'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await addDoc(conversationsRef, testConversation);
    console.log('Successfully created test conversation:', docRef.id);
    
    // Clean up test document
    await deleteDoc(doc(db, 'ai_conversations', docRef.id));
    console.log('Successfully deleted test conversation');
    
    return { success: true, message: 'Firebase permissions working correctly' };
  } catch (error: any) {
    console.error('Firebase permissions test failed:', error);
    return { 
      success: false, 
      message: `Firebase permissions error: ${error.message}`,
      code: error.code,
      details: error
    };
  }
};
