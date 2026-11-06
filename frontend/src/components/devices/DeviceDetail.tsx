import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Cpu,
  HardDrive,
  Clock,
  Activity,
  Bot,
  Network,
  Route,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  Pencil,
  Zap,
  RefreshCw,
  Terminal,
  History,
  BellOff,
  Play,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Device } from '@/types/device';
import {
  useDeviceMetrics,
  useDeviceInterfaces,
  useDeviceDHCPLeases,
  useDeviceRoutes,
  useDeviceRemediationLogs,
} from '@/hooks/useMetrics';
import { aiApi } from '@/services/aiApi';
import { deviceApi } from '@/services/deviceApi';
import { remediationApi } from '@/services/remediationApi';
import { syslogApi } from '@/services/syslogApi';
import { useAuthStore } from '@/stores/authStore';
import { EditDeviceModal } from './EditDeviceModal';
import { SnoozeDeviceModal } from './SnoozeDeviceModal';
import { toast } from 'sonner';

interface DeviceDetailProps {
  device: Device;
}

export const DeviceDetail: React.FC<DeviceDetailProps> = ({ device }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const isMikrotik = String(device.device_type || device.type || '').toUpperCase() === 'MIKROTIK';

  const statusUpper = String(device.status || 'OFFLINE').toUpperCase();
  const isOnline = statusUpper === 'ONLINE';
  const isWarning = statusUpper === 'WARNING';

  const { metrics } = useDeviceMetrics(device.id);
  const { interfaces } = useDeviceInterfaces(device.id);
  const { dhcpLeases } = useDeviceDHCPLeases(device.id);
  const { routes } = useDeviceRoutes(device.id);
  const { logs: remediationLogs, refetch: refetchRemediationLogs } = useDeviceRemediationLogs(device.id);

  const [activeTab, setActiveTab] = useState<'interfaces' | 'dhcp' | 'routes' | 'syslog' | 'remediation' | 'ai'>('interfaces');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSnoozeOpen, setIsSnoozeOpen] = useState(false);
  const [execAction, setExecAction] = useState<string | null>(null);

  const unsnoozeMutation = useMutation({
    mutationFn: () => deviceApi.unsnoozeDevice(device.id),
    onSuccess: () => {
      toast.success(`Maintenance Mode dinonaktifkan untuk ${device.name}`);
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['device', String(device.id)] });
    },
    onError: () => {
      toast.error('Gagal menonaktifkan mode maintenance');
    },
  });

  const { data: deviceSyslogs, isLoading: loadingSyslogs } = useQuery({
    queryKey: ['device-syslog', String(device.id)],
    queryFn: () => syslogApi.getMessages({ device_id: Number(device.id), limit: 50 }),
    refetchInterval: activeTab === 'syslog' ? 5000 : false,
  });

  const handleRemediation = async (actionType: string, target: string = 'global') => {
    setExecAction(`${actionType}-${target}`);
    try {
      const res = await remediationApi.executeAction({
        device_id: Number(device.id),
        action_type: actionType,
        target,
      });
      if (res.success) {
        toast.success(`[NOVA Act] ${res.message}`);
      } else {
        toast.error(`[NOVA Act] ${res.message}`);
      }
      refetchRemediationLogs();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Gagal mengeksekusi aksi remediasi.');
    } finally {
      setExecAction(null);
    }
  };

  const handleRunAI = async () => {
    setIsAnalyzing(true);
    try {
      const res = await aiApi.analyzeDevice(String(device.id));
      setAiAnalysis(res.analysis);
    } catch {
      setAiAnalysis('Analisis perangkat tidak dapat diselesaikan saat ini.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await deviceApi.testSavedDevice(device.id);
      setTestResult(res);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch {
      const fallback = { success: false, message: `Tidak dapat menjangkau ${device.host}:${device.port || 8728}` };
      setTestResult(fallback);
      toast.error(fallback.message);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/devices')}
            aria-label="Kembali ke daftar perangkat"
            className="min-h-[44px] min-w-[44px] text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-100">{device.name}</h1>
              <Badge variant={isOnline ? 'success' : isWarning ? 'warning' : 'destructive'}>
                {statusUpper}
              </Badge>
              {device.is_snoozed && (
                <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-[10px] gap-1">
                  <BellOff className="h-3 w-3" /> MAINTENANCE SNOOZE
                </Badge>
              )}
            </div>
            <p className="text-xs font-mono text-slate-400 mt-1">
              {device.host} • Port {device.port || 8728} • {(device.device_type || 'SNMP').toUpperCase()} • {metrics?.board_name || 'RouterOS'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="min-h-[44px] bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-cyan-400"
          >
            {isTesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin text-cyan-400" /> : <Activity className="h-4 w-4 mr-2 text-cyan-400" />}
            Tes Koneksi
          </Button>

          {isAdmin && (
            <>
              {device.is_snoozed ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={unsnoozeMutation.isPending}
                  onClick={() => unsnoozeMutation.mutate()}
                  className="min-h-[44px] border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                >
                  <Play className="h-3.5 w-3.5 mr-1.5" /> Akhiri Snooze
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsSnoozeOpen(true)}
                  className="min-h-[44px] border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                >
                  <BellOff className="h-3.5 w-3.5 mr-1.5" /> Snooze Alert
                </Button>
              )}

              <Button
                size="sm"
                onClick={() => setIsEditOpen(true)}
                className="min-h-[44px] bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold"
              >
                <Pencil className="h-4 w-4 mr-1.5" /> Edit Perangkat
              </Button>
            </>
          )}
        </div>
      </div>

      {device.is_snoozed && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-200">
          <div className="flex items-center gap-2.5">
            <BellOff className="h-4 w-4 text-amber-400 shrink-0" />
            <div>
              <strong>Perangkat dalam Mode Maintenance (Snooze Aktif):</strong> Notifikasi Telegram ditangguhkan sementara untuk perangkat ini.
              {device.snooze_reason && <span className="ml-1 text-amber-300">Alasan: "{device.snooze_reason}"</span>}
              {device.snooze_until && (
                <span className="ml-2 font-mono text-[11px] text-amber-400">
                  (Berakhir: {new Date(device.snooze_until).toLocaleString('id-ID')})
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {testResult && (
        <div
          className={`p-3 rounded-lg border flex items-center gap-2.5 text-xs font-mono ${
            testResult.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {testResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
          <span>{testResult.message}</span>
        </div>
      )}

      <Card className="bg-slate-900 border-slate-800/80">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">NOVA Act (Tindakan Mitigasi & Diagnostik Terarah)</h3>
              <p className="text-xs text-slate-400">
                Eksekusi aksi ke perangkat secara aman dengan pencatatan jejak audit otomatis
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={execAction !== null}
              onClick={() => handleRemediation('RUN_DIAGNOSTICS')}
              className="min-h-[40px] bg-slate-950 border-slate-800 text-amber-400 hover:bg-amber-500/10 text-xs font-mono"
            >
              <Terminal className={`h-3.5 w-3.5 mr-1.5 ${execAction === 'RUN_DIAGNOSTICS-global' ? 'animate-pulse' : ''}`} />
              Uji Jalur Ping & WAN
            </Button>
            {isAdmin && isMikrotik && (
              <Button
                size="sm"
                variant="outline"
                disabled={execAction !== null}
                onClick={() => handleRemediation('FLUSH_DNS')}
                className="min-h-[40px] bg-slate-950 border-slate-800 text-cyan-400 hover:bg-cyan-500/10 text-xs font-mono"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${execAction === 'FLUSH_DNS-global' ? 'animate-spin' : ''}`} />
                Flush DNS Cache
              </Button>
            )}
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                disabled={execAction !== null}
                onClick={() => handleRemediation('ACKNOWLEDGE')}
                className="min-h-[40px] bg-slate-950 border-slate-800 text-emerald-400 hover:bg-emerald-500/10 text-xs font-mono"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Acknowledge Semua Alert
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="bg-slate-900 border-slate-800/80">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Beban CPU</span>
              <Cpu className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-100">{metrics?.cpu_load ?? 0}%</div>
            <Progress value={metrics?.cpu_load ?? 0} indicatorClassName="bg-cyan-500" />
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800/80">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Penggunaan Memori</span>
              <HardDrive className="h-4 w-4 text-sky-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-100">{metrics?.memory_usage ?? 0}%</div>
            <Progress value={metrics?.memory_usage ?? 0} indicatorClassName="bg-sky-500" />
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800/80">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Ping Lokal (RTT)</span>
              <Activity className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-100">
              {metrics?.latency_ms !== undefined ? `${metrics.latency_ms.toFixed(1)} ms` : '0.0 ms'}
            </div>
            <p className={`text-[11px] font-mono ${(metrics?.packet_loss ?? 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              Packet Loss: {metrics?.packet_loss ?? 0}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800/80">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Ping WAN (8.8.8.8)</span>
              <Network className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-100">
              {metrics?.wan_latency_ms !== undefined ? `${metrics.wan_latency_ms.toFixed(1)} ms` : '0.0 ms'}
            </div>
            <p className={`text-[11px] font-mono ${(metrics?.wan_packet_loss ?? 0) > 0 ? 'text-rose-400' : 'text-cyan-400'}`}>
              WAN Loss: {metrics?.wan_packet_loss ?? 0}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800/80">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Waktu Aktif Sistem</span>
              <Clock className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-lg font-bold font-mono text-slate-100 pt-1 truncate">{metrics?.uptime || 'N/A'}</div>
            <p className="text-[11px] text-slate-400">Versi OS: {metrics?.version || 'N/A'}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800/80">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Kesehatan Koneksi</span>
              <Activity className={`h-4 w-4 ${isOnline ? 'text-emerald-400' : isWarning ? 'text-amber-400' : 'text-rose-400'}`} />
            </div>
            <div className={`text-lg font-bold font-mono pt-1 ${isOnline ? 'text-emerald-400' : isWarning ? 'text-amber-400' : 'text-rose-400'}`}>
              {isOnline ? 'Terhubung' : isWarning ? 'Peringatan' : 'Terputus'}
            </div>
            <p className="text-[11px] text-slate-400">Polling setiap {device.poll_interval || 30} dtk</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'interfaces', label: 'Antarmuka (Interfaces)', icon: Network },
          { id: 'dhcp', label: 'Sewa DHCP (Leases)', icon: Users },
          { id: 'routes', label: 'Tabel Routing', icon: Route },
          { id: 'syslog', label: `Syslog (${deviceSyslogs?.total ?? 0})`, icon: Terminal },
          { id: 'remediation', label: `Log Mitigasi (${remediationLogs.length})`, icon: History },
          { id: 'ai', label: 'Diagnostik AI', icon: Bot },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
              activeTab === tab.id
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <tab.icon className="h-4 w-4 shrink-0" />
            {tab.label}
          </button>
        ))}
      </div>

      <Card className="bg-slate-900 border-slate-800/80">
        <CardContent className="p-6">
          {activeTab === 'interfaces' && (
            <Table>
              <TableHeader className="border-slate-800">
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-400">Nama</TableHead>
                  <TableHead className="text-slate-400">Tipe</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-right text-slate-400">RX Bytes</TableHead>
                  <TableHead className="text-right text-slate-400">TX Bytes</TableHead>
                  {isAdmin && <TableHead className="text-right text-slate-400">Tindakan</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {interfaces.length === 0 ? (
                  <TableRow className="border-slate-800">
                    <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-8 text-slate-400">
                      Belum ada data antarmuka untuk perangkat ini. Pastikan perangkat dapat dijangkau saat siklus polling.
                    </TableCell>
                  </TableRow>
                ) : (
                  interfaces.map((iface, i) => (
                    <TableRow key={i} className="border-slate-800/60">
                      <TableCell className="font-mono font-semibold text-slate-200">{iface.name}</TableCell>
                      <TableCell className="text-xs text-slate-400 uppercase">{iface.type}</TableCell>
                      <TableCell>
                        <Badge variant={iface.running ? 'success' : 'secondary'}>
                          {iface.running ? 'RUNNING' : 'DOWN'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-cyan-400">
                        {((iface.rx_bytes || 0) / 1048576).toFixed(2)} MB
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-sky-400">
                        {((iface.tx_bytes || 0) / 1048576).toFixed(2)} MB
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          {isMikrotik ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={execAction !== null}
                              onClick={() => handleRemediation('RESTART_INTERFACE', iface.name)}
                              className="min-h-[38px] text-[11px] font-mono text-amber-400 hover:bg-amber-500/10 border border-amber-500/20"
                            >
                              <RefreshCw className={`h-3 w-3 mr-1 ${execAction === `RESTART_INTERFACE-${iface.name}` ? 'animate-spin' : ''}`} />
                              Restart
                            </Button>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-400">Read-Only (SNMP)</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {activeTab === 'dhcp' && (
            <Table>
              <TableHeader className="border-slate-800">
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-400">Alamat IP</TableHead>
                  <TableHead className="text-slate-400">Alamat MAC</TableHead>
                  <TableHead className="text-slate-400">Nama Host</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dhcpLeases.length === 0 ? (
                  <TableRow className="border-slate-800">
                    <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                      Tidak ada daftar sewa DHCP aktif pada perangkat ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  dhcpLeases.map((lease, i) => (
                    <TableRow key={i} className="border-slate-800/60">
                      <TableCell className="font-mono text-cyan-400">{lease.address}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-400">{lease.mac_address}</TableCell>
                      <TableCell className="text-slate-200">{lease.host_name}</TableCell>
                      <TableCell>
                        <Badge variant="success" className="uppercase text-[10px]">
                          {lease.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {activeTab === 'routes' && (
            <Table>
              <TableHeader className="border-slate-800">
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-400">Alamat Tujuan (Destination)</TableHead>
                  <TableHead className="text-slate-400">Gateway</TableHead>
                  <TableHead className="text-slate-400">Jarak (Distance)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routes.length === 0 ? (
                  <TableRow className="border-slate-800">
                    <TableCell colSpan={3} className="text-center py-8 text-slate-400">
                      Tabel routing tidak tersedia untuk perangkat ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  routes.map((r, i) => (
                    <TableRow key={i} className="border-slate-800/60">
                      <TableCell className="font-mono text-slate-200">{r.dst_address}</TableCell>
                      <TableCell className="font-mono text-cyan-400">{r.gateway}</TableCell>
                      <TableCell className="font-mono text-slate-400">{r.distance}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {activeTab === 'syslog' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base text-slate-100">Aliran Syslog Perangkat</CardTitle>
                  <p className="text-xs text-slate-400">
                    50 pesan log terbaru yang dikirim dari {device.name} ({device.host})
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/syslog')}
                  className="min-h-[40px] border-slate-800 bg-slate-950 text-cyan-400 hover:bg-slate-800 text-xs"
                >
                  Buka Pusat Syslog
                </Button>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950 divide-y divide-slate-900 font-mono text-xs max-h-[420px] overflow-y-auto">
                {loadingSyslogs ? (
                  <div className="py-12 text-center text-slate-400">Memuat log perangkat...</div>
                ) : !deviceSyslogs?.items || deviceSyslogs.items.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 font-sans">
                    Belum ada pesan Syslog yang diterima dari perangkat ini.
                  </div>
                ) : (
                  deviceSyslogs.items.map((log) => (
                    <div key={log.id} className="flex flex-col sm:flex-row sm:items-center gap-2 px-3.5 py-2 hover:bg-slate-900/60">
                      <span className="text-slate-400 w-36 shrink-0">
                        {new Date(log.timestamp).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                      <Badge
                        variant={
                          ['EMERGENCY', 'ALERT', 'CRITICAL', 'ERROR'].includes(log.severity?.toUpperCase())
                            ? 'destructive'
                            : log.severity?.toUpperCase() === 'WARNING'
                              ? 'warning'
                              : 'secondary'
                        }
                        className="text-[10px] w-20 justify-center shrink-0"
                      >
                        {log.severity}
                      </Badge>
                      {log.topic && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[10px] shrink-0">
                          {log.topic}
                        </span>
                      )}
                      <span className="text-slate-200 break-all">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'remediation' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base text-slate-100">Jejak Audit Remediasi (NOVA Act)</CardTitle>
                  <p className="text-xs text-slate-400">
                    Riwayat tindakan mitigasi yang dieksekusi dari Dashboard maupun Telegram Bot
                  </p>
                </div>
              </div>
              {remediationLogs.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-slate-400 border border-dashed border-slate-800 rounded-lg">
                  Belum ada riwayat tindakan mitigasi pada perangkat ini.
                </div>
              ) : (
                <Table>
                  <TableHeader className="border-slate-800">
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-400">Waktu</TableHead>
                      <TableHead className="text-slate-400">Tipe Aksi</TableHead>
                      <TableHead className="text-slate-400">Target</TableHead>
                      <TableHead className="text-slate-400">Kanal & Eksekutor</TableHead>
                      <TableHead className="text-slate-400">Status</TableHead>
                      <TableHead className="text-slate-400">Detail Output</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {remediationLogs.map((log) => (
                      <TableRow key={log.id} className="border-slate-800/60">
                        <TableCell className="font-mono text-xs text-slate-400 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold text-cyan-400">
                          {log.action_type}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-300">{log.target}</TableCell>
                        <TableCell className="text-xs text-slate-300">
                          <Badge variant="secondary" className="mr-1.5 text-[10px]">
                            {log.trigger_channel}
                          </Badge>
                          <span className="font-mono text-slate-400">{log.executed_by}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.status === 'SUCCESS' ? 'success' : 'destructive'} className="text-[10px]">
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-300 max-w-md">{log.output_details}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base text-slate-100">Pemeriksaan Mendalam Perangkat</CardTitle>
                  <p className="text-xs text-slate-400">Evaluasi metrik dan konfigurasi untuk {device.name}</p>
                </div>
                <Button
                  onClick={handleRunAI}
                  disabled={isAnalyzing}
                  className="min-h-[44px] bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold"
                >
                  <Bot className="h-4 w-4 mr-2" />
                  {isAnalyzing ? 'Menganalisis...' : 'Jalankan Diagnostik'}
                </Button>
              </div>

              {aiAnalysis ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                  {aiAnalysis}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-sm border border-dashed border-slate-800 rounded-xl">
                  Klik "Jalankan Diagnostik" untuk menghasilkan laporan pemeriksaan lengkap bagi perangkat ini.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <EditDeviceModal open={isEditOpen} onOpenChange={setIsEditOpen} device={device} />
      <SnoozeDeviceModal open={isSnoozeOpen} onOpenChange={setIsSnoozeOpen} device={device} />
    </div>
  );
};
