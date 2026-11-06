import { api } from './api';
import { User } from '@/types/user';

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export const authApi = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const res = await api.post('/auth/login', { username, password });
    return res.data;
  },

  getProfile: async (tokenOverride?: string): Promise<User> => {
    const headers = tokenOverride ? { Authorization: `Bearer ${tokenOverride}` } : undefined;
    const res = await api.get('/auth/me', { headers });
    return res.data;
  },

  register: async (userData: { username: string; email: string; password: string; role?: string }): Promise<User> => {
    const res = await api.post('/auth/register', userData);
    return res.data;
  }
};
