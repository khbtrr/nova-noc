import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/services/settingsApi';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { Settings, Send, Bot, Shield, Server, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [testMessage, setTestMessage] = useState('🔔 Test notifikasi NOVA NOC: Bot Telegram siap digunakan!');
  const [isSendingTest, setIsSendingTest] = useState(false);

  const { data: systemSettings, isLoading, refetch } = useQuery({
    queryKey: ['system-settings'],
    queryFn: settingsApi.getSettings,
  });

  const handleSendTelegramTest = async () => {
    setIsSendingTest(true);
    try {
      const res = await settingsApi.testTelegram(testMessage);
      toast.success(res.message || 'Pesan tes Telegram berhasil dikirim!');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Gagal mengirim pesan Telegram. Pastikan bot token terkonfigurasi.');
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl pb-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <Settings className="h-6 w-6 text-cyan-400" />
          Pengaturan Sistem NOVA
        </h2>
        <p className="text-sm text-slate-400">
          Konfigurasi bot Telegram, model AI Gemini, polling interval, dan preferensi akun operasional.
        </p>
      </div>

      <div className="grid gap-6">
        {/* 1. Telegram Bot Integration */}
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                <Send className="h-4 w-4 text-cyan-400" />
                Notifikasi Bot Telegram
              </CardTitle>
              {systemSettings?.telegram_configured ? (
                <Badge variant="success" className="text-[10px] flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Terhubung
                </Badge>
              ) : (
                <Badge variant="warning" className="text-[10px] flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Belum Dikonfigurasi
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs text-slate-400">
              Kirim alert instan ketika terjadi insiden link down, CPU overload, atau memory leak ke channel/grup Telegram tim NOC.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-300 font-medium">Chat ID Terdaftar</label>
                <Input
                  disabled
                  value={systemSettings?.telegram_chat_id || '(Dikonfigurasi via .env)'}
                  className="bg-slate-950 border-slate-800 text-xs font-mono mt-1 text-slate-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-medium">Status Pengiriman</label>
                <Input
                  disabled
                  value={systemSettings?.telegram_configured ? 'Aktif (Auto-dispatch)' : 'Non-aktif'}
                  className="bg-slate-950 border-slate-800 text-xs mt-1 text-slate-400"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <label className="text-xs text-slate-300 font-medium">Uji Coba Kirim Notifikasi Telegram</label>
              <div className="flex gap-2">
                <Input
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Ketik pesan tes..."
                  className="bg-slate-900 border-slate-800 text-xs"
                />
                <Button
                  size="sm"
                  onClick={handleSendTelegramTest}
                  disabled={isSendingTest}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs shrink-0"
                >
                  <Send className="h-3.5 w-3.5 mr-1" />
                  {isSendingTest ? 'Mengirim...' : 'Kirim Tes'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. AI Model Status (Gemini) */}
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                <Bot className="h-4 w-4 text-purple-400" />
                Google Gemini AI Model Engine
              </CardTitle>
              {systemSettings?.gemini_configured ? (
                <Badge variant="success" className="text-[10px]">
                  Gemini 2.5 Flash Siap
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">
                  Mode Heuristik Offline
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs text-slate-400">
              Mesin kecerdasan buatan untuk inferensi anomali, kalkulasi health score, dan percakapan interaktif troubleshooting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-slate-300">
            <p>
              Untuk mengaktifkan model generatif mutakhir Gemini 2.5 Flash, masukkan <code className="text-cyan-400 bg-slate-950 px-1 py-0.5 rounded">GEMINI_API_KEY</code> pada file <code className="text-slate-200">.env</code> Anda.
            </p>
            <p className="text-slate-400">
              Saat ini sistem menggunakan engine analisa diagnostik telemetri internal dengan komputasi skor kesehatan 0-100 real-time.
            </p>
          </CardContent>
        </Card>

        {/* 3. Monitoring Engine Config */}
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-base text-slate-100 flex items-center gap-2">
              <Server className="h-4 w-4 text-cyan-400" />
              Parameter Engine Polling
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Konfigurasi siklus interval pengambilan data dari perangkat jaringan.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-300 font-medium">Default Polling Interval</label>
              <Input
                disabled
                value={`${systemSettings?.default_poll_interval || 30} Detik (Configurable per-device)`}
                className="bg-slate-950 border-slate-800 text-xs mt-1 text-slate-400"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 font-medium">Protokol Didukung</label>
              <Input
                disabled
                value="MikroTik RouterOS API (TCP 8728) & SNMP v2c/v3 (UDP 161)"
                className="bg-slate-950 border-slate-800 text-xs mt-1 text-slate-400"
              />
            </div>
          </CardContent>
        </Card>

        {/* 4. Operator Profile */}
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-base text-slate-100 flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              Profil Akun NOC Operator
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-4">
            <div>
              <span className="text-xs text-slate-400 block">Username</span>
              <span className="text-sm font-semibold text-slate-100 mt-1 block">{user?.username || 'admin'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Hak Akses (Role)</span>
              <Badge variant="outline" className="mt-1 text-xs border-cyan-500/30 text-cyan-400 uppercase">
                {user?.role || 'ADMIN'}
              </Badge>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Email Kontak</span>
              <span className="text-sm text-slate-300 mt-1 block">{user?.email || 'admin@nova.local'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
