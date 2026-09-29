import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { syslogApi } from '@/services/syslogApi';
import { deviceApi } from '@/services/deviceApi';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { 
  ScrollText, Search, Play, Pause, Trash2, Download, 
  Filter, AlertTriangle, ShieldAlert, CheckCircle2, RefreshCw, Terminal, Server
} from 'lucide-react';
import { SyslogMessage } from '@/types/syslog';

export default function SyslogPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();

  const [selectedDevice, setSelectedDevice] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);

  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch registered devices for the filter dropdown
  const { data: devices = [] } = useQuery({
    queryKey: ['devices'],
    queryFn: () => deviceApi.getDevices(),
  });

  // Fetch 24-hour syslog stats
  const { data: stats } = useQuery({
    queryKey: ['syslog-stats'],
    queryFn: () => syslogApi.getStats(),
    refetchInterval: 15000,
  });

  // Fetch syslog messages with query filters
  const { data: syslogData, isLoading, refetch } = useQuery({
    queryKey: ['syslog', selectedDevice, selectedSeverity, searchQuery, page],
    queryFn: () => syslogApi.getSyslogs({
      device_id: selectedDevice !== 'ALL' ? Number(selectedDevice) : undefined,
      severity: selectedSeverity !== 'ALL' ? selectedSeverity : undefined,
      search: searchQuery.trim() || undefined,
      page,
      limit: 100,
    }),
    refetchInterval: isPaused ? false : 5000,
  });

  const messages: SyslogMessage[] = syslogData?.items || [];

  // Auto-scroll when new messages arrive and stream is not paused
  useEffect(() => {
    if (!isPaused && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isPaused]);

  const handleClearLogs = async () => {
    if (!confirm('Yakin ingin menghapus seluruh riwayat Syslog dari database?')) return;
    try {
      await syslogApi.clearSyslogs();
      toast.success('Seluruh riwayat Syslog berhasil dibersihkan.');
      queryClient.invalidateQueries({ queryKey: ['syslog'] });
      queryClient.invalidateQueries({ queryKey: ['syslog-stats'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Gagal menghapus log.');
    }
  };

  const handleExportLogs = () => {
    if (messages.length === 0) {
      toast.error('Tidak ada log untuk diekspor.');
      return;
    }
    const logText = messages.map(m => 
      `[${m.timestamp}] [${m.severity}] [${m.host}${m.device_name ? ` (${m.device_name})` : ''}] [${m.topic || m.facility}] ${m.message}`
    ).join('\n');

    const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `syslog-export-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Log berhasil diunduh.');
  };

  const getSeverityBadgeClass = (severity: string) => {
    const s = severity.toUpperCase();
    if (s === 'EMERGENCY' || s === 'CRITICAL' || s === 'ALERT') {
      return 'bg-red-500/10 text-red-400 border-red-500/30';
    }
    if (s === 'ERROR') {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    }
    if (s === 'WARNING') {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }
    if (s === 'NOTICE' || s === 'INFO') {
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    }
    return 'bg-slate-800 text-slate-400 border-slate-700';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-cyan-400" />
            Syslog Receiver & Log Real-Time
          </h2>
          <p className="text-sm text-slate-400">
            Penerima sentral log jaringan MikroTik melalui protokol UDP Port 514 dengan integrasi alert otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsPaused(!isPaused)}
            className={`text-xs border-slate-800 ${
              isPaused 
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/40 hover:bg-amber-500/20' 
                : 'bg-slate-900/50 text-slate-300 hover:text-white'
            }`}
          >
            {isPaused ? (
              <>
                <Play className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
                Lanjutkan Stream
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5 mr-1.5 text-cyan-400" />
                Jeda Stream
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportLogs}
            className="border-slate-800 bg-slate-900/50 text-slate-300 hover:text-white text-xs"
          >
            <Download className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
            Ekspor TXT
          </Button>

          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearLogs}
              className="border-slate-800 bg-slate-900/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Bersihkan Log
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => refetch()}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* 24-Hour Stats Row */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl p-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Total Log (24j)</span>
            <ScrollText className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100 mt-1">
            {stats?.total ?? 0}
          </div>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl p-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Kritis / Emergency</span>
            <ShieldAlert className="h-4 w-4 text-red-400" />
          </div>
          <div className="text-xl font-bold font-mono text-red-400 mt-1">
            {(stats?.emergency ?? 0) + (stats?.critical ?? 0)}
          </div>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl p-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Error</span>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-400 mt-1">
            {stats?.error ?? 0}
          </div>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl p-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Warning</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {stats?.warning ?? 0}
          </div>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl p-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Informasi / Notice</span>
            <CheckCircle2 className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
            {(stats?.info ?? 0) + (stats?.notice ?? 0)}
          </div>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl p-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex-1 flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Cari pesan log, topik, atau alamat IP..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-9 bg-slate-950 border-slate-800 text-xs text-slate-100 placeholder:text-slate-500"
              />
            </div>

            {/* Device Filter */}
            <select
              value={selectedDevice}
              onChange={(e) => {
                setSelectedDevice(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="ALL">Semua Perangkat</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.host || d.ip_address})
                </option>
              ))}
            </select>
          </div>

          {/* Severity Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {['ALL', 'CRITICAL', 'ERROR', 'WARNING', 'INFO'].map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => {
                  setSelectedSeverity(sev);
                  setPage(1);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                  selectedSeverity === sev
                    ? 'bg-slate-800 text-white border-slate-700 shadow-sm'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Terminal Log Console */}
      <Card className="border-slate-800 bg-slate-950 rounded-xl overflow-hidden font-mono shadow-2xl">
        {/* Terminal Header Bar */}
        <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500/80 inline-block" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
            <span className="text-slate-300 font-semibold ml-2 flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-cyan-400" />
              NOVA Syslog Stream Terminal (0.0.0.0:514/UDP)
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span>Menampilkan {messages.length} dari {syslogData?.total ?? 0} log</span>
            {isPaused && (
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold animate-pulse">
                STREAM DIJEDA
              </span>
            )}
          </div>
        </div>

        {/* Console Body */}
        <div className="p-4 max-h-[580px] overflow-y-auto space-y-1.5 text-xs text-slate-300">
          {isLoading && messages.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <div className="h-6 w-6 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto" />
              <p>Menghubungkan ke aliran Syslog...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-2 font-sans">
              <ScrollText className="h-8 w-8 mx-auto text-slate-600 mb-2" />
              <p className="font-semibold text-slate-400 text-sm">Belum ada paket Syslog yang diterima</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Konfigurasikan MikroTik dengan perintah:<br />
                <code className="text-cyan-400 bg-slate-900 px-2 py-1 rounded inline-block mt-2 font-mono">
                  /system logging action add name=nova target=remote remote=&lt;IP_NOVA&gt; remote-port=514<br />
                  /system logging add action=nova topics=info,warning,error,critical
                </code>
              </p>
            </div>
          ) : (
            messages.map((log) => {
              const formattedTime = new Date(log.timestamp).toLocaleTimeString([], {
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
              });

              return (
                <div 
                  key={log.id} 
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-2.5 p-1.5 rounded hover:bg-slate-900/60 transition-colors border-l-2 border-transparent hover:border-cyan-500/50 group"
                >
                  {/* Timestamp */}
                  <span className="text-[11px] text-slate-500 shrink-0 select-none">
                    {formattedTime}
                  </span>

                  {/* Severity Badge */}
                  <Badge 
                    variant="outline" 
                    className={`text-[9px] uppercase font-mono px-1.5 py-0 shrink-0 ${getSeverityBadgeClass(log.severity)}`}
                  >
                    {log.severity}
                  </Badge>

                  {/* Host / Device Tag */}
                  <span className="text-[11px] text-cyan-400/90 font-medium shrink-0 truncate max-w-[180px]">
                    {log.device_name || log.host}
                  </span>

                  {/* Topic Tag */}
                  {log.topic && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-amber-300/80 border border-slate-800 shrink-0">
                      {log.topic}
                    </span>
                  )}

                  {/* Message Payload */}
                  <span className="text-slate-200 break-words flex-1 selection:bg-cyan-500/30 selection:text-white">
                    {log.message}
                  </span>
                </div>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </div>
      </Card>
    </div>
  );
}
