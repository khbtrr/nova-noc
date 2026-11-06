import React, { useState } from 'react';
import { Activity, Lock, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    await login(username.trim(), password);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto w-14 h-14 bg-cyan-500/10 rounded-xl border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Activity className="h-7 w-7" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-wider text-white">NOVA</CardTitle>
            <CardDescription className="text-slate-400 text-xs font-mono uppercase tracking-widest mt-1">
              Network Observation & Vigilance Assistant
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-300">Username</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="username"
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-9 min-h-[44px] bg-slate-950/60 border-slate-800 text-slate-100 focus:border-cyan-500"
                  autoComplete="username"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 min-h-[44px] bg-slate-950/60 border-slate-800 text-slate-100 focus:border-cyan-500"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !username.trim() || !password}
              className="w-full min-h-[44px] bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold mt-4 transition-colors"
            >
              {isLoading ? 'Mengautentikasi...' : 'Masuk ke NOC'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
