import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/user';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

// Backend enum values are uppercase (ADMIN/VIEWER); the UI checks lowercase.
const normalizeUser = (user: User | null): User | null =>
  user ? { ...user, role: String(user.role || 'viewer').toLowerCase() as User['role'] } : null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => set({ user: normalizeUser(user), token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'nova-auth',
      merge: (persisted, current) => {
        const p = (persisted || {}) as Partial<AuthState>;
        return { ...current, ...p, user: normalizeUser(p.user ?? null) };
      },
    }
  )
);
