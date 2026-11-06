import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/services/authApi';
import { toast } from 'sonner';

function decodeJwtPayload(token: string): { sub?: string; role?: 'admin' | 'viewer' } {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return {};
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(base64));
  } catch {
    return {};
  }
}

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user, token, isAuthenticated, login, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const tokenData = await authApi.login(username, password);
      const accessToken = tokenData.access_token;

      try {
        const profile = await authApi.getProfile(accessToken);
        login(profile, accessToken);
      } catch {
        const claims = decodeJwtPayload(accessToken);
        const resolvedRole = claims.role === 'admin' ? 'admin' : 'viewer';
        login(
          {
            id: claims.sub || '1',
            username,
            email: `${username}@nova.local`,
            role: resolvedRole,
            created_at: new Date().toISOString()
          },
          accessToken
        );
      }

      toast.success(`Selamat datang kembali, ${username}`);
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
