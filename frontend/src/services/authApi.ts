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

  getProfile: async (): Promise<User> => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  register: async (userData: { username: string; email: string; password: string; role?: string }): Promise<User> => {
    const res = await api.post('/auth/register', userData);
    return res.data;
  }
};
