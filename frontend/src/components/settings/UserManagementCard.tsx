import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, CreateUserDTO } from '@/services/userApi';
import { useAuthStore } from '@/stores/authStore';
import { Users, UserPlus, Trash2, Shield, User as UserIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function UserManagementCard() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [formData, setFormData] = useState<CreateUserDTO>({
    username: '',
    email: '',
    password: '',
    role: 'viewer',
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: userApi.getUsers,
  });

  const createMutation = useMutation({
    mutationFn: userApi.createUser,
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`Pengguna ${newUser.username} berhasil didaftarkan!`);
      setIsAddModalOpen(false);
      setFormData({ username: '', email: '', password: '', role: 'viewer' });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Gagal mendaftarkan pengguna baru.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: userApi.deleteUser,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(res.message || 'Pengguna berhasil dihapus.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Gagal menghapus pengguna.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.email.trim() || !formData.password.trim()) {
      toast.warning('Semua kolom formulir wajib diisi.');
      return;
    }
    if (formData.password.length < 6) {
      toast.warning('Password minimal 6 karakter.');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleDelete = (userId: string | number, username: string) => {
    if (String(userId) === String(currentUser?.id) || username === currentUser?.username) {
      toast.error('Anda tidak dapat menghapus akun Anda sendiri.');
      return;
    }
    if (window.confirm(`Yakin ingin menghapus pengguna "${username}"? Tindakan ini tidak dapat dibatalkan.`)) {
      deleteMutation.mutate(userId);
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base text-slate-100 flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-400" />
              Manajemen Pengguna & Hak Akses
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Kelola akun operator dan viewer. Registrasi publik ditutup untuk menjamin keamanan operasional NOC.
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold text-xs h-8 gap-1.5 self-start sm:self-auto"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Tambah Pengguna
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-8 text-slate-500 text-xs gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
            Memuat daftar pengguna...
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Pengguna</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Peran (Role)</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {users && users.length > 0 ? (
                  users.map((u) => {
                    const isSelf = String(u.id) === String(currentUser?.id) || u.username === currentUser?.username;
                    const isAdmin = u.role === 'admin';
                    return (
                      <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-semibold text-[11px]">
                              {u.username ? u.username[0].toUpperCase() : 'U'}
                            </div>
                            <span className="font-medium text-slate-200">{u.username}</span>
                            {isSelf && (
                              <span className="text-[10px] text-cyan-400 font-mono">(Anda)</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">{u.email}</td>
                        <td className="py-2.5 px-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-mono uppercase ${
                              isAdmin
                                ? 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10'
                                : 'border-slate-700 text-slate-300 bg-slate-800/40'
                            }`}
                          >
                            {u.role}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1.5 text-emerald-400 text-[11px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Aktif
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isSelf || deleteMutation.isPending}
                            onClick={() => handleDelete(u.id, u.username)}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30"
                            title={isSelf ? 'Tidak dapat menghapus akun sendiri' : 'Hapus Pengguna'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      Tidak ada pengguna lain terdaftar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Add User Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4 text-cyan-400" />
              Pendaftaran Pengguna Baru
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Buat kredensial akun operator baru untuk mengakses sistem NOVA NOC.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
            <div>
              <label className="text-xs font-medium text-slate-300">Username</label>
              <Input
                required
                placeholder="misal: noc_operator_1"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="bg-slate-950 border-slate-800 text-xs mt-1 text-slate-200"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300">Email</label>
              <Input
                required
                type="email"
                placeholder="operator@nova.local"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-slate-950 border-slate-800 text-xs mt-1 text-slate-200"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300">Password</label>
              <Input
                required
                type="password"
                placeholder="Minimal 6 karakter"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="bg-slate-950 border-slate-800 text-xs mt-1 text-slate-200"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300">Peran & Hak Akses (Role)</label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'viewer' })}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    formData.role === 'viewer'
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium text-xs">
                    <UserIcon className="h-3.5 w-3.5" />
                    Viewer / Operator
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Hanya pantau telemetri (Read-Only)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'admin' })}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    formData.role === 'admin'
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium text-xs">
                    <Shield className="h-3.5 w-3.5" />
                    Administrator
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Akses penuh & eksekusi remediasi
                  </span>
                </button>
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createMutation.isPending}
                className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold text-xs gap-1.5"
              >
                {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Daftarkan Pengguna
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
