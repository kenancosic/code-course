import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProgressState {
  totalXp: number;
  level: number;
  currentStreak: number;
  lastActivityDate: string | null;
}

interface ProgressComputed {
  xpToNextLevel: number;
  progressPercentage: number;
}

interface ProgressActions {
  addXp: (amount: number) => void;
  checkLevelUp: () => boolean;
  incrementStreak: () => void;
}

const XP_BASE = 100;
const XP_MULTIPLIER = 1.5;

const getXpForLevel = (level: number): number => {
  return Math.floor(XP_BASE * Math.pow(XP_MULTIPLIER, level - 1));
};

const getTotalXpForLevel = (level: number): number => {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += getXpForLevel(i);
  }
  return total;
};

export const useProgressStore = create<ProgressState & ProgressActions & ProgressComputed>()(
  persist(
    (set, get) => ({
      totalXp: 0,
      level: 1,
      currentStreak: 0,
      lastActivityDate: null,
      
      get xpToNextLevel() {
        const state = get();
        const xpForNextLevel = getTotalXpForLevel(state.level + 1);
        return xpForNextLevel - state.totalXp;
      },
      
      get progressPercentage() {
        const state = get();
        const xpForCurrentLevel = getTotalXpForLevel(state.level);
        const xpForNextLevel = getTotalXpForLevel(state.level + 1);
        const levelXp = state.totalXp - xpForCurrentLevel;
        const levelTotalXp = xpForNextLevel - xpForCurrentLevel;
        return Math.min(100, Math.max(0, (levelXp / levelTotalXp) * 100));
      },
      
      addXp: (amount) => set((state) => ({ totalXp: state.totalXp + amount })),
      
      checkLevelUp: () => {
        const state = get();
        const xpForNextLevel = getTotalXpForLevel(state.level + 1);
        if (state.totalXp >= xpForNextLevel) {
          set((state) => ({ level: state.level + 1 }));
          return true;
        }
        return false;
      },
      
      incrementStreak: () => set((state) => {
        const today = new Date().toISOString().split('T')[0];
        const lastDate = state.lastActivityDate;
        
        if (!lastDate) {
          return { currentStreak: 1, lastActivityDate: today };
        }
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (lastDate === today) {
          return state;
        } else if (lastDate === yesterdayStr) {
          return { currentStreak: state.currentStreak + 1, lastActivityDate: today };
        } else {
          return { currentStreak: 1, lastActivityDate: today };
        }
      }),
    }),
    {
      name: 'progress-storage',
    }
  )
);
