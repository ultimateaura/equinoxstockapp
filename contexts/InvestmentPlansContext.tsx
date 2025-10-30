import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';

export interface InvestmentPlan {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface InvestmentPlansContextType {
  plans: InvestmentPlan[];
  loading: boolean;
  addPlan: (name: string, targetAmount: number, currentAmount: number) => Promise<void>;
  updatePlan: (id: string, name: string, targetAmount: number, currentAmount: number) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  loadPlans: () => Promise<void>;
}

const InvestmentPlansContext = createContext<InvestmentPlansContextType | undefined>(undefined);

export const useInvestmentPlans = () => {
  const context = useContext(InvestmentPlansContext);
  if (!context) {
    throw new Error('useInvestmentPlans must be used within an InvestmentPlansProvider');
  }
  return context;
};

interface InvestmentPlansProviderProps {
  children: React.ReactNode;
}

export const InvestmentPlansProvider: React.FC<InvestmentPlansProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [loading, setLoading] = useState(false);

  // Load plans when user changes
  useEffect(() => {
    if (user) {
      loadPlans();
    } else {
      setPlans([]);
    }
  }, [user]);

  const loadPlans = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const plansRef = collection(db, 'investment_plans');
      const q = query(plansRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      const loadedPlans: InvestmentPlan[] = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        loadedPlans.push({
          id: doc.id,
          name: data.name,
          targetAmount: data.targetAmount,
          currentAmount: data.currentAmount,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        });
      });

      setPlans(loadedPlans);
    } catch (error) {
      console.error('Error loading investment plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPlan = async (name: string, targetAmount: number, currentAmount: number) => {
    if (!user) return;

    try {
      const planId = doc(collection(db, 'investment_plans')).id;
      const now = new Date();

      const planData = {
        userId: user.uid,
        name,
        targetAmount,
        currentAmount,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'investment_plans', planId), planData);

      const newPlan: InvestmentPlan = {
        id: planId,
        name,
        targetAmount,
        currentAmount,
        createdAt: now,
        updatedAt: now,
      };

      setPlans(prev => [...prev, newPlan]);
    } catch (error) {
      console.error('Error adding investment plan:', error);
      throw error;
    }
  };

  const updatePlan = async (id: string, name: string, targetAmount: number, currentAmount: number) => {
    if (!user) return;

    try {
      const now = new Date();
      const updateData = {
        name,
        targetAmount,
        currentAmount,
        updatedAt: now,
      };

      await setDoc(doc(db, 'investment_plans', id), updateData, { merge: true });

      setPlans(prev =>
        prev.map(plan =>
          plan.id === id
            ? { ...plan, name, targetAmount, currentAmount, updatedAt: now }
            : plan
        )
      );
    } catch (error) {
      console.error('Error updating investment plan:', error);
      throw error;
    }
  };

  const deletePlan = async (id: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'investment_plans', id));
      setPlans(prev => prev.filter(plan => plan.id !== id));
    } catch (error) {
      console.error('Error deleting investment plan:', error);
      throw error;
    }
  };

  const value = {
    plans,
    loading,
    addPlan,
    updatePlan,
    deletePlan,
    loadPlans,
  };

  return (
    <InvestmentPlansContext.Provider value={value}>
      {children}
    </InvestmentPlansContext.Provider>
  );
};

