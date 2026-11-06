import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserPlus,
  Trash2,
  KeyRound,
  Shield,
  Eye,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { userApi } from '@/services/userApi';
import { User } from '@/types/user';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

export const UserManagementCard: React.FC = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'viewer'>('viewer');

  const [resetUserTarget, setResetUserTarget] = useState<User | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.getUsers(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      userApi.createUser({
        username: newUsername.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
      }),
    onSuccess: (created) => {
      toast.success(`Akun pengguna "${created.username}" (${created.role}) berhasil dibuat`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsAddOpen(false);
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('viewer');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Gagal membuat akun pengguna baru');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: { role?: 'admin' | 'viewer'; is_active?: boolean } }) =>
      userApi.updateUser(id, payload),
    onSuccess: () => {
      toast.success('Hak akses / status akun berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Gagal memperbarui akun pengguna');
    },
  });

  const resetPwMutation = useMutation({
    mutationFn: () => userApi.resetPassword(resetUserTarget!.id, resetPasswordValue),
    onSuccess: () => {
      toast.success(`Password untuk "${resetUserTarget?.username}" berhasil direset`);
      setResetUserTarget(null);
      setResetPasswordValue('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Gagal mereset password');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => userApi.deleteUser(id),
    onSuccess: () => {
      toast.success('Akun pengguna berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Gagal menghapus akun');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newEmail.trim() || newPassword.length < 6) {
      toast.error('Pastikan username, email valid, dan password minimal 6 karakter.');
      return;
    }
    createMutation.mutate();
  };

  return (
    <Card className="bg-slate-900 border-slate-800/80">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base text-slate-100 flex items-center gap-2">
            <Users className="h-4 w-4 text-cyan-400" /> Manajemen Pengguna & Hak Akses (RBAC)
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Kelola akun operator NOC: <strong className="text-cyan-400">Admin</strong> (Akses Penuh) &{' '}
            <strong className="text-slate-300">Viewer</strong> (Monitoring Read-Only)
          </CardDescription>
        </div>

        <Button
          size="sm"
          onClick={() => setIsAddOpen(true)}
          className="min-h-[44px] bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs"
        >
          <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Tambah Pengguna
        </Button>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400 font-mono">Memuat daftar pengguna...</div>
        ) : (
          <div className="rounded-lg border border-slate-800 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-950/70">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Username</TableHead>
                  <TableHead className="text-slate-400">Email</TableHead>
                  <TableHead className="text-slate-400">Peran (Role)</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-right text-slate-400">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const isSelf = String(u.id) === String(currentUser?.id) || u.username === currentUser?.username;
                  return (
                    <TableRow key={u.id} className="border-slate-800/60 hover:bg-slate-800/30">
                      <TableCell className="font-mono font-semibold text-slate-100">
                        {u.username}
                        {isSelf && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                            ANDA
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400 font-mono">{u.email}</TableCell>
                      <TableCell>
                        <select
                          disabled={isSelf || updateMutation.isPending}
                          value={u.role}
                          onChange={(e) =>
                            updateMutation.mutate({
                              id: u.id,
                              payload: { role: e.target.value as 'admin' | 'viewer' },
                            })
                          }
                          aria-label={`Ubah peran ${u.username}`}
                          className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 min-h-[38px] text-xs font-mono text-slate-200 disabled:opacity-60"
                        >
                          <option value="admin">ADMIN (Full Access)</option>
                          <option value="viewer">VIEWER (Read-Only)</option>
                        </select>
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          disabled={isSelf || updateMutation.isPending}
                          onClick={() =>
                            updateMutation.mutate({
                              id: u.id,
                              payload: { is_active: !(u.is_active ?? true) },
                            })
                          }
                          className="disabled:opacity-60 min-h-[38px] inline-flex items-center"
                        >
                          {u.is_active !== false ? (
                            <Badge variant="success" className="text-[10px] gap-1 cursor-pointer">
                              <CheckCircle2 className="h-3 w-3" /> AKTIF
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px] gap-1 cursor-pointer">
                              <XCircle className="h-3 w-3" /> NONAKTIF
                            </Badge>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setResetUserTarget(u);
                            setResetPasswordValue('');
                          }}
                          className="min-h-[40px] px-2.5 text-xs text-amber-400 hover:bg-amber-500/10"
                        >
                          <KeyRound className="h-3.5 w-3.5 mr-1" /> Reset Password
                        </Button>
                        {!isSelf && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Hapus akun ${u.username}`}
                            onClick={() => {
                              if (window.confirm(`Hapus akun pengguna "${u.username}"?`)) {
                                deleteMutation.mutate(u.id);
                              }
                            }}
                            className="min-h-[40px] min-w-[40px] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="bg-slate-900 border border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <UserPlus className="h-4 w-4 text-cyan-400" /> Buat Akun Pengguna Baru
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Username Login</Label>
              <Input
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Contoh: operator_noc"
                className="min-h-[44px] bg-slate-950 border-slate-800 text-slate-200 font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Alamat Email</Label>
              <Input
                required
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="operator@nova.local"
                className="min-h-[44px] bg-slate-950 border-slate-800 text-slate-200 font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Password (Minimal 6 Karakter)</Label>
              <Input
                required
                type="password"
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Masukkan password awal"
                className="min-h-[44px] bg-slate-950 border-slate-800 text-slate-200 font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Level Hak Akses (Role)</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewRole('viewer')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    newRole === 'viewer'
                      ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs">
                    <Eye className="h-3.5 w-3.5" /> Viewer
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Hanya lihat dashboard, topologi, syslog & flow (Aman untuk tamu/staf)
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setNewRole('admin')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    newRole === 'admin'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs">
                    <Shield className="h-3.5 w-3.5" /> Administrator
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Akses penuh: tambah/edit perangkat, eksekusi remediasi & kelola user
                  </p>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                className="min-h-[44px] bg-slate-950 border-slate-800 text-slate-300 text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="min-h-[44px] bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs"
              >
                {createMutation.isPending ? 'Menyimpan...' : 'Buat Akun'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetUserTarget} onOpenChange={(o) => !o && setResetUserTarget(null)}>
        <DialogContent className="bg-slate-900 border border-slate-800 text-slate-100 max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <KeyRound className="h-4 w-4 text-amber-400" /> Reset Password Pengguna
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <p className="text-xs text-slate-400">
              Masukkan password baru untuk akun <strong className="text-slate-100">{resetUserTarget?.username}</strong>:
            </p>
            <Input
              type="password"
              value={resetPasswordValue}
              onChange={(e) => setResetPasswordValue(e.target.value)}
              placeholder="Password baru (min. 6 karakter)"
              className="min-h-[44px] bg-slate-950 border-slate-800 text-slate-200 font-mono text-xs"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetUserTarget(null)}
                className="min-h-[44px] bg-slate-950 border-slate-800 text-slate-300 text-xs"
              >
                Batal
              </Button>
              <Button
                type="button"
                disabled={resetPasswordValue.length < 6 || resetPwMutation.isPending}
                onClick={() => resetPwMutation.mutate()}
                className="min-h-[44px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs"
              >
                {resetPwMutation.isPending ? 'Menyimpan...' : 'Simpan Password Baru'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
