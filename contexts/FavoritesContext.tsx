import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';

interface FavoriteStock {
  ticker: string;
  companyName: string;
  price: number;
  priceChange: number;
  priceChangePercentage: number;
  image: string;
  addedAt: string;
}

interface FavoritesContextType {
  favoriteStocks: FavoriteStock[];
  addToFavorites: (stock: FavoriteStock) => void;
  removeFromFavorites: (ticker: string) => void;
  isFavorite: (ticker: string) => boolean;
  toggleFavorite: (stock: FavoriteStock) => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};

interface FavoritesProviderProps {
  children: React.ReactNode;
}

export const FavoritesProvider: React.FC<FavoritesProviderProps> = ({ children }) => {
  const [favoriteStocks, setFavoriteStocks] = useState<FavoriteStock[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Safely access auth context
  let user = null;
  try {
    const authContext = useAuth();
    user = authContext.user;
  } catch (error) {
    // Auth context not available yet
    console.log('Auth context not available in FavoritesProvider');
  }

  // Load favorites from Firestore when user changes
  useEffect(() => {
    if (!user) {
      setFavoriteStocks([]);
      setLoading(false);
      return;
    }

    // Check if Firestore is properly configured
    if (!db) {
      console.log('Firestore not initialized, using local storage only');
      setFavoriteStocks([]);
      setLoading(false);
      return;
    }

    try {
      const favoritesRef = doc(db, 'users', user.uid);
      
      const unsubscribe = onSnapshot(favoritesRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setFavoriteStocks(data.favorites || []);
        } else {
          setFavoriteStocks([]);
        }
        setLoading(false);
      }, (error) => {
        console.error('Error loading favorites from Firestore, using local storage:', error);
        setFavoriteStocks([]);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up Firestore listener:', error);
      setFavoriteStocks([]);
      setLoading(false);
    }
  }, [user]);

  const saveFavoritesToFirestore = async (favorites: FavoriteStock[]) => {
    if (!user || !db) return;
    
    try {
      await setDoc(doc(db, 'users', user.uid), {
        favorites: favorites
      }, { merge: true });
    } catch (error) {
      console.error('Error saving favorites to Firestore:', error);
      // Continue without crashing
    }
  };

  const addToFavorites = async (stock: FavoriteStock) => {
    const updatedFavorites = [...favoriteStocks, { ...stock, addedAt: new Date().toISOString() }];
    setFavoriteStocks(updatedFavorites);
    await saveFavoritesToFirestore(updatedFavorites);
  };

  const removeFromFavorites = async (ticker: string) => {
    const updatedFavorites = favoriteStocks.filter(stock => stock.ticker !== ticker);
    setFavoriteStocks(updatedFavorites);
    await saveFavoritesToFirestore(updatedFavorites);
  };

  const isFavorite = (ticker: string) => {
    return favoriteStocks.some(stock => stock.ticker === ticker);
  };

  const toggleFavorite = async (stock: FavoriteStock) => {
    if (isFavorite(stock.ticker)) {
      await removeFromFavorites(stock.ticker);
    } else {
      await addToFavorites(stock);
    }
  };

  const value: FavoritesContextType = {
    favoriteStocks,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    toggleFavorite,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};
