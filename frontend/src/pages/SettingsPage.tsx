import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Send, Key, Clock, ShieldCheck, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { settingsApi, SystemSettingsData } from '@/services/settingsApi';
import { useAuthStore } from '@/stores/authStore';
import { UserManagementCard } from '@/components/settings/UserManagementCard';

export const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [settings, setSettings] = useState<SystemSettingsData | null>(null);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);

  useEffect(() => {
    settingsApi.getSettings().then(setSettings).catch(() => {});
  }, []);

  const handleTestTelegram = async () => {
    setIsTestingTelegram(true);
    try {
      const res = await settingsApi.testTelegram('[NOVA NOC] Pesan uji koneksi dari Dashboard NOVA berhasil terkirim.');
      toast.success(res.message);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Gagal mengirim pesan tes Telegram. Periksa konfigurasi .env Anda.';
      toast.error(msg);
    } finally {
      setIsTestingTelegram(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Pengaturan Sistem</h1>
        <p className="text-sm text-slate-400">Konfigurasi mesin polling, integrasi notifikasi, dan kredensial AI</p>
      </div>

      {isAdmin && <UserManagementCard />}

      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-slate-900 border-slate-800/80">
          <CardHeader>
            <CardTitle className="text-base text-slate-100 flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-400" /> Konfigurasi Mesin Polling
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Pengaturan pengumpulan telemetri global untuk perangkat MikroTik & SNMP
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Interval Polling Default (detik)</Label>
                <Input
                  type="number"
                  value={settings?.default_poll_interval ?? 30}
                  disabled
                  className="bg-slate-950/60 border-slate-800 text-slate-300 font-mono min-h-[44px]"
                />
                <p className="text-[11px] text-slate-400">Diatur melalui variabel <code className="text-cyan-400">DEFAULT_POLL_INTERVAL</code> pada file <code className="text-cyan-400">.env</code></p>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Mode Operasi</Label>
                <Input
                  type="text"
                  value={settings?.debug_mode ? 'Development / Debug' : 'Production'}
                  disabled
                  className="bg-slate-950/60 border-slate-800 text-slate-300 font-mono min-h-[44px]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                  <Send className="h-4 w-4 text-sky-400" /> Integrasi Bot Telegram
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Pengiriman notifikasi peringatan real-time ke grup operasional NOC
                </CardDescription>
              </div>
              {settings && (
                <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${settings.telegram_configured ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                  {settings.telegram_configured ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  {settings.telegram_configured ? 'Terkonfigurasi' : 'Belum Diatur'}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Status Bot Token</Label>
                <Input
                  type="text"
                  value={settings?.telegram_configured ? 'Tersimpan di Server (.env)' : 'Belum diatur di .env'}
                  disabled
                  className="bg-slate-950/60 border-slate-800 text-slate-400 font-mono min-h-[44px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Target Chat ID</Label>
                <Input
                  value={settings?.telegram_chat_id || 'Belum diatur'}
                  disabled
                  className="bg-slate-950/60 border-slate-800 text-slate-300 font-mono min-h-[44px]"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <p className="text-xs text-slate-400">
                Ubah <code className="text-cyan-400">TELEGRAM_BOT_TOKEN</code> & <code className="text-cyan-400">TELEGRAM_CHAT_ID</code> pada file <code className="text-cyan-400">.env</code>
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={isTestingTelegram || !settings?.telegram_configured}
                onClick={handleTestTelegram}
                className="min-h-[44px] border-sky-500/30 text-sky-400 hover:bg-sky-500/10"
              >
                {isTestingTelegram ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Kirim Pesan Tes ke Telegram
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                  <Key className="h-4 w-4 text-cyan-400" /> Konfigurasi Google Gemini AI
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Kredensial LLM untuk diagnostik otomatis dan asisten percakapan NOC
                </CardDescription>
              </div>
              {settings && (
                <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${settings.gemini_configured ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
                  {settings.gemini_configured ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                  {settings.gemini_configured ? 'Gemini API Aktif' : 'Mode Diagnostik Lokal'}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Status Gemini API Key</Label>
                <Input
                  type="text"
                  value={settings?.gemini_configured ? 'Terkonfigurasi di Server (.env)' : 'Menggunakan Diagnostik Lokal'}
                  disabled
                  className="bg-slate-950/60 border-slate-800 text-slate-400 font-mono min-h-[44px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Model Aktif</Label>
                <Input
                  value="gemini-2.5-flash"
                  disabled
                  className="bg-slate-950/60 border-slate-800 text-slate-300 font-mono min-h-[44px]"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Atur <code className="text-cyan-400">GEMINI_API_KEY</code> pada file <code className="text-cyan-400">.env</code> di server backend untuk mengaktifkan analisis generatif penuh.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
