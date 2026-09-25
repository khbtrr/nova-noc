import { useState } from 'react';
import { Activity, ShieldCheck, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const { login, isLoading } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(username, password);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 relative">
      <Card className="w-full max-w-md relative z-10 border-slate-800 bg-slate-900/80 backdrop-blur-xl">
        <CardHeader className="space-y-3 text-center pb-4">
          <div className="flex justify-center mb-1">
            <div className="rounded-2xl bg-cyan-500/10 p-4 border border-cyan-500/20 text-cyan-400">
              <Activity className="h-9 w-9" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-100">
            NOVA
          </CardTitle>
          <CardDescription className="text-xs text-slate-400 font-medium">
            Network Operations & Telemetry Analytics &bull; NOC Platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" /> Username
              </label>
              <Input 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-500 h-10 text-sm"
                placeholder="admin"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-slate-400" /> Password
              </label>
              <Input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-950/80 border-slate-800 text-slate-100 placeholder:text-slate-500 h-10 text-sm"
                placeholder="••••••••"
              />
            </div>

            <div className="text-[11px] text-slate-500 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-cyan-400 font-semibold">Demo Credentials:</span> <br/>
              Username: <code className="text-slate-300">admin</code> &bull; Password: <code className="text-slate-300">admin123</code>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium h-10" 
              disabled={isLoading}
            >
              {isLoading ? 'Mengautentikasi...' : 'Masuk ke NOC Dashboard'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
