import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Terminal,
  Search,
  RefreshCw,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  Info,
  Pause,
  Play,
  ChevronLeft,
  ChevronRight,
  Radio,
} from 'lucide-react';
import { syslogApi } from '@/services/syslogApi';
import { useDevices } from '@/hooks/useDevices';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const SEVERITY_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  EMERGENCY: { bg: 'bg-rose-600/20', text: 'text-rose-400', border: 'border-rose-500/40', label: 'EMERG' },
  ALERT: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/40', label: 'ALERT' },
  CRITICAL: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40', label: 'CRIT' },
  ERROR: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/40', label: 'ERROR' },
  WARNING: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40', label: 'WARN' },
  NOTICE: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30', label: 'NOTICE' },
  INFO: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'INFO' },
  DEBUG: { bg: 'bg-slate-800', text: 'text-slate-400', border: 'border-slate-700', label: 'DEBUG' },
};

export const SyslogPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { devices } = useDevices();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [selectedDevice, setSelectedDevice] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [isLiveStream, setIsLiveStream] = useState<boolean>(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: stats } = useQuery({
    queryKey: ['syslog-stats'],
    queryFn: () => syslogApi.getStats(),
    refetchInterval: isLiveStream ? 10000 : false,
  });

  const { data: logData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['syslog', selectedDevice, selectedSeverity, selectedTopic, debouncedSearch, page],
    queryFn: () =>
      syslogApi.getMessages({
        device_id: selectedDevice !== 'ALL' ? Number(selectedDevice) : undefined,
        severity: selectedSeverity !== 'ALL' ? selectedSeverity : undefined,
        topic: selectedTopic || undefined,
        search: debouncedSearch || undefined,
        page,
        limit: 100,
      }),
    refetchInterval: isLiveStream ? 5000 : false,
  });

  const clearMutation = useMutation({
    mutationFn: () => syslogApi.clearMessages(),
    onSuccess: () => {
      toast.success('Seluruh log historis berhasil dibersihkan');
      queryClient.invalidateQueries({ queryKey: ['syslog'] });
      queryClient.invalidateQueries({ queryKey: ['syslog-stats'] });
    },
    onError: () => {
      toast.error('Gagal membersihkan riwayat log');
    },
  });

  const logs = logData?.items || [];
  const totalPages = logData?.pages || 1;
  const totalCount = logData?.total || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2.5">
                Pusat Log Sistem (Syslog)
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${
                    isLiveStream
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  <Radio className="h-3 w-3" />
                  {isLiveStream ? 'UDP 5140 Aktif' : 'Jeda Stream'}
                </span>
              </h1>
              <p className="text-sm text-slate-400">
                Penerima log terpusat RFC 3164 dari perangkat MikroTik RouterOS & switch jaringan
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsLiveStream(!isLiveStream)}
            className={`min-h-[44px] border-slate-800 ${
              isLiveStream
                ? 'bg-slate-900 text-amber-400 hover:bg-slate-800'
                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
            }`}
          >
            {isLiveStream ? (
              <>
                <Pause className="h-3.5 w-3.5 mr-1.5" /> Jeda Live Stream
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 mr-1.5" /> Lanjutkan Stream
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="min-h-[44px] bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin text-cyan-400' : ''}`} />
            Segarkan
          </Button>

          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (window.confirm('Yakin ingin menghapus seluruh riwayat Syslog?')) {
                  clearMutation.mutate();
                }
              }}
              disabled={clearMutation.isPending || totalCount === 0}
              className="min-h-[44px] bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Bersihkan
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Log (24 Jam)</p>
              <p className="text-2xl font-bold text-slate-100 font-mono mt-1">{stats?.total ?? 0}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Terminal className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Kritis & Darurat</p>
              <p className="text-2xl font-bold text-rose-400 font-mono mt-1">
                {(stats?.emergency ?? 0) + (stats?.critical ?? 0) + (stats?.alert ?? 0)}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Error & Warning</p>
              <p className="text-2xl font-bold text-amber-400 font-mono mt-1">
                {(stats?.error ?? 0) + (stats?.warning ?? 0)}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Informasi & Sistem</p>
              <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                {(stats?.info ?? 0) + (stats?.notice ?? 0) + (stats?.debug ?? 0)}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Info className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-800/80">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="relative md:col-span-5">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari pesan log, alamat IP, user, interface..."
                className="pl-9 min-h-[44px] bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-500"
              />
            </div>

            <div className="md:col-span-4">
              <select
                value={selectedDevice}
                onChange={(e) => {
                  setSelectedDevice(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter perangkat sumber"
                className="w-full min-h-[44px] px-3 rounded-md bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
              >
                <option value="ALL">Semua Perangkat Sumber</option>
                {devices.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.name} ({d.host})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <select
                value={selectedTopic}
                onChange={(e) => {
                  setSelectedTopic(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter topik log"
                className="w-full min-h-[44px] px-3 rounded-md bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
              >
                <option value="">Semua Topik (MikroTik)</option>
                <option value="system">System</option>
                <option value="interface">Interface</option>
                <option value="firewall">Firewall</option>
                <option value="dhcp">DHCP</option>
                <option value="account">Account / Login</option>
                <option value="critical">Critical</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-slate-400 mr-1 font-medium">Severity:</span>
            {['ALL', 'CRITICAL', 'ERROR', 'WARNING', 'INFO', 'DEBUG'].map((sev) => {
              const active = selectedSeverity === sev;
              return (
                <button
                  key={sev}
                  type="button"
                  onClick={() => {
                    setSelectedSeverity(sev);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 min-h-[38px] rounded-md text-xs font-mono uppercase transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                    active
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {sev === 'ALL' ? 'SEMUA LEVEL' : sev}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-mono font-semibold text-slate-300">
              Aliran Log Syslog ({totalCount} entri cocok)
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Halaman {page} dari {totalPages}
          </div>
        </div>

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto divide-y divide-slate-900 font-mono text-xs">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400">Memuat aliran Syslog dari database...</div>
          ) : logs.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-2">
              <Terminal className="h-8 w-8 text-slate-600 mx-auto" />
              <p className="text-slate-300 font-sans text-sm font-medium">Belum ada pesan Syslog yang tercatat</p>
              <p className="text-slate-400 font-sans text-xs max-w-lg mx-auto">
                Arahkan konfigurasi remote logging MikroTik ke IP Server NOVA pada port UDP <code className="text-cyan-400">5140</code>:
                <br />
                <code className="inline-block mt-2 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-cyan-300 font-mono text-[11px]">
                  /system logging action add name=nova target=remote remote=&lt;IP_SERVER&gt; remote-port=5140
                </code>
              </p>
            </div>
          ) : (
            logs.map((log) => {
              const sevStyle = SEVERITY_CONFIG[log.severity?.toUpperCase()] || SEVERITY_CONFIG.INFO;
              const dateObj = new Date(log.timestamp);
              const timeStr = dateObj.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });
              const dateStr = dateObj.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
              });

              return (
                <div
                  key={log.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-2.5 hover:bg-slate-900/60 transition-colors"
                >
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-slate-400 w-28 shrink-0">
                      {dateStr} {timeStr}
                    </span>

                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider border text-center w-16 shrink-0 ${sevStyle.bg} ${sevStyle.text} ${sevStyle.border}`}
                    >
                      {sevStyle.label}
                    </span>

                    <span
                      className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400 font-medium truncate max-w-[160px]"
                      title={log.host}
                    >
                      {log.device_name || log.host}
                    </span>

                    {log.topic && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-900/80 text-slate-400 border border-slate-800/80 text-[10px]">
                        {log.topic}
                      </span>
                    )}
                  </div>

                  <div className="text-slate-200 break-all sm:pl-2 flex-1">{log.message}</div>
                </div>
              );
            })
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-t border-slate-800 text-xs text-slate-400">
            <span>Menampilkan {logs.length} dari {totalCount} entri</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="min-h-[40px] px-3 bg-slate-950 border-slate-800 text-slate-300"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="min-h-[40px] px-3 bg-slate-950 border-slate-800 text-slate-300"
              >
                Berikutnya <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
