import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: any | null;
  profile: User | null;
  loading: boolean;
  setUser: (user: any | null) => void;
  setProfile: (profile: User | null) => void;
  setLoading: (loading: boolean) => void;
  setUserProfile: (user: any | null, profile: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setUserProfile: (user, profile) => set({ user, profile }),
}));
