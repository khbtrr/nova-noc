import { api } from './api';

import { User } from '@/types/user';

export interface CreateUserDTO {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'viewer';
}

export const userApi = {
  getUsers: async (): Promise<User[]> => {
    const res = await api.get<User[]>('/users');
    return res.data;
  },

  createUser: async (data: CreateUserDTO): Promise<User> => {
    const res = await api.post<User>('/users', data);
    return res.data;
  },

  deleteUser: async (userId: string | number): Promise<{ status: string; message: string }> => {
    const res = await api.delete(`/users/${userId}`);
    return res.data;
  },
};
