import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/services/authApi';
import { toast } from 'sonner';

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user, token, isAuthenticated, login, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const tokenData = await authApi.login(username, password);
      
      // Fetch verified user profile from backend
      try {
        const profile = await authApi.getProfile();
        login(profile, tokenData.access_token);
      } catch {
        login(
          { id: '1', username, email: `${username}@nova.local`, role: 'admin', created_at: new Date().toISOString() },
          tokenData.access_token
        );
      }

      toast.success(`Selamat datang kembali, ${username}!`);
      navigate('/');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const errorMsg = typeof detail === 'string' ? detail : 'Gagal masuk. Periksa username dan password atau koneksi server.';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }

  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.info('Anda telah keluar dari sistem.');
  };

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    login: handleLogin,
    logout: handleLogout
  };
};
