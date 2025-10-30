import {
    User,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut,
    updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../config/firebase';
import ErrorHandler from '../utils/errorHandler';

interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: Date;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (name: string, avatarUrl?: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user ? `User logged in: ${user.email}` : 'No user');
      setUser(user);
      if (user) {
        // Load user profile from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const profileData = userDoc.data();
            setUserProfile({
              name: profileData.name || user.displayName || '',
              email: profileData.email || user.email || '',
              avatarUrl: profileData.avatarUrl,
              createdAt: profileData.createdAt?.toDate() || new Date(),
            });
          } else {
            // Create initial profile if it doesn't exist
            const newProfile: UserProfile = {
              name: user.displayName || '',
              email: user.email || '',
              avatarUrl: user.photoURL || undefined,
              createdAt: new Date(),
            };
            await setDoc(doc(db, 'users', user.uid), {
              ...newProfile,
              createdAt: new Date(),
            });
            setUserProfile(newProfile);
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
          setError('Failed to load user profile');
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (name: string, email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      
      // Check if Firebase is properly configured
      if (auth.app.options.projectId === 'demo-project') {
        throw new Error('Firebase not configured. Please set up your Firebase project. See FIREBASE_SETUP.md for instructions.');
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update the user's display name
      await updateProfile(user, { displayName: name });

      // Create user profile in Firestore
      const userProfile: UserProfile = {
        name,
        email,
        createdAt: new Date(),
      };

      await setDoc(doc(db, 'users', user.uid), {
        ...userProfile,
        createdAt: new Date(),
      });

      setUserProfile(userProfile);
    } catch (error: any) {
      const errorMessage = error.message || getErrorMessage(error.code);
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      
      // Check if Firebase is properly configured
      if (auth.app.options.projectId === 'demo-project') {
        throw new Error('Firebase not configured. Please set up your Firebase project. See FIREBASE_SETUP.md for instructions.');
      }
      
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      const errorMessage = error.message || getErrorMessage(error.code);
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    try {
      setError(null);
      await signOut(auth);
      setUserProfile(null);
      // Note: setUser will be called automatically by onAuthStateChanged when signOut completes
    } catch (error: any) {
      setError(getErrorMessage(error.code));
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      setError(getErrorMessage(error.code));
      throw error;
    }
  };

  const updateUserProfile = async (name: string, avatarUrl?: string) => {
    try {
      setError(null);
      if (!user) throw new Error('No user logged in');

      // Update Firebase Auth profile
      await updateProfile(user, { 
        displayName: name,
        photoURL: avatarUrl 
      });

      // Update Firestore profile
      const updatedProfile = {
        name,
        avatarUrl,
        email: user.email,
      };

      await setDoc(doc(db, 'users', user.uid), updatedProfile, { merge: true });

      setUserProfile(prev => prev ? { ...prev, name, avatarUrl } : null);
    } catch (error: any) {
      setError(getErrorMessage(error.code));
      throw error;
    }
  };

  const clearError = () => {
    setError(null);
  };

  const getErrorMessage = (error: any): string => {
    return ErrorHandler.getErrorMessage(error);
  };

  const value = {
    user,
    userProfile,
    loading,
    error,
    signUp,
    signIn,
    signOutUser,
    resetPassword,
    updateUserProfile,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
