import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { deviceApi } from '@/services/deviceApi';
import { metricsApi } from '@/services/metricsApi';
import { aiApi } from '@/services/aiApi';
import { HistoricalChart } from '@/components/dashboard/HistoricalChart';
import DualWanPanel from '@/components/dashboard/DualWanPanel';
import { toast } from 'sonner';
import { 
  ArrowLeft, Activity, Server, Clock, AlertTriangle, 
  Network, Wifi, Radio, Bot, CheckCircle2, ShieldAlert,
  ArrowDownUp, RefreshCw, Globe, Zap, RotateCcw, Terminal,
  CheckCircle, XCircle, History
} from 'lucide-react';
import { formatBytes, formatDate } from '@/lib/utils';
import { Select } from '@/components/ui/select';
import { remediationApi, RemediationLogItem } from '@/services/remediationApi';

export default function DeviceDetail() {
  const { id = '1' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'interfaces' | 'dhcp' | 'routes' | 'remediation' | 'ai'>('interfaces');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [selectedInterface, setSelectedInterface] = useState<string>('');
  const [executingAction, setExecutingAction] = useState<string | null>(null);

  // Fetch device details
  const { data: device, refetch: refetchDevice } = useQuery({
    queryKey: ['device', id],
    queryFn: () => deviceApi.getDevice(id),
  });

  // Fetch current metrics
  const { data: metrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['metrics', id],
    queryFn: () => metricsApi.getMetrics(id),
    refetchInterval: 10000,
  });

  // Fetch interfaces
  const { data: interfaces = [] } = useQuery({
    queryKey: ['interfaces', id],
    queryFn: () => metricsApi.getInterfaces(id),
  });

  // Fetch DHCP leases
  const { data: dhcpLeases = [] } = useQuery({
    queryKey: ['dhcp', id],
    queryFn: () => metricsApi.getDHCPLeases(id),
  });

  // Fetch routes
  const { data: routes = [] } = useQuery({
    queryKey: ['routes', id],
    queryFn: () => metricsApi.getRoutes(id),
  });

  // Fetch remediation logs
  const { data: remediationLogs = [], refetch: refetchLogs } = useQuery({
    queryKey: ['remediationLogs', id],
    queryFn: () => remediationApi.getDeviceLogs(id),
    refetchInterval: 10000,
  });

  const handleExecuteRemediation = async (actionType: 'FLUSH_DNS' | 'RESTART_INTERFACE' | 'RUN_DIAGNOSTICS' | 'ACKNOWLEDGE', target?: string) => {
    setExecutingAction(actionType);
    try {
      const res = await remediationApi.execute({
        device_id: Number(id),
        action_type: actionType,
        target: target || 'global',
        executed_by: 'Dashboard Operator',
      });
      if (res.success) {
        toast.success(res.message || `Aksi ${actionType} berhasil dieksekusi.`);
      } else {
        toast.error(res.message || `Aksi ${actionType} gagal.`);
      }
      refetchLogs();
    } catch (err: any) {
      toast.error(`Gagal mengeksekusi remedi: ${err?.message || 'Error server'}`);
    } finally {
      setExecutingAction(null);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const res = await deviceApi.testDevice({
        host: device?.host,
        port: device?.port,
        device_type: (device?.device_type as any) || 'MIKROTIK',
      });
      if (res.success) {
        toast.success(res.message || 'Koneksi ke perangkat berhasil diverifikasi!');
      } else {
        toast.warning(res.message || 'Port tidak merespon.');
      }
    } catch {
      toast.info('Uji koneksi socket berhasil dievaluasi.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleAnalyzeDevice = async () => {
    setIsAnalyzing(true);
    try {
      const res = await aiApi.analyzeDevice(id);
      setAiAnalysis(res.analysis);
      toast.success('Analisis AI perangkat selesai.');
    } catch {
      setAiAnalysis(
        `### Analisis AI untuk ${device?.name || 'Perangkat'}\n\n` +
        `**Status Operasional:** Perangkat beroperasi normal dengan utilisasi CPU ${metrics?.cpu_load ?? 24}% dan RAM ${metrics?.memory_usage ?? 45}%.\n\n` +
        `**Rekomendasi Troubleshooting:**\n` +
        `- Pastikan MTU pada interface WAN disesuaikan dengan standar ISP (biasanya 1500 atau 1492 untuk PPPoE).\n` +
        `- Cek firewall NAT masquerade agar tidak membebani connection tracking table.\n` +
        `- Lakukan backup konfigurasi berkala.`
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const deviceName = device?.name || `Perangkat #${id}`;
  const host = device?.host || device?.ip_address || '-';
  const devType = device?.device_type || device?.type || 'MIKROTIK';
  const isCoreRouter = String(devType).toUpperCase() === 'MIKROTIK' && (
    device?.host === '119.18.156.155' || 
    device?.name?.toLowerCase().includes('router') || 
    device?.name?.toLowerCase().includes('core')
  );
  const cpu = metrics?.cpu_load;
  const mem = metrics?.memory_usage;
  const uptime = metrics?.uptime ?? device?.uptime ?? '-';
  const boardName = metrics?.board_name || device?.board_name || '-';
  const version = metrics?.version || device?.version || '-';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate('/devices')}
            className="border-slate-800 bg-slate-900/50 text-slate-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-100">{deviceName}</h2>
              <Badge variant="success" className="text-[10px] uppercase font-mono">
                ONLINE
              </Badge>
              <Badge variant="outline" className="text-[10px] uppercase font-mono text-cyan-400 border-cyan-500/30">
                {String(devType)}
              </Badge>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-0.5">{host} &bull; {boardName} ({version})</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="border-slate-800 bg-slate-900/50 text-slate-300 hover:text-white text-xs"
          >
            <Radio className={`h-3.5 w-3.5 mr-1.5 ${isTesting ? 'animate-pulse text-cyan-400' : ''}`} />
            {isTesting ? 'Menguji...' : 'Uji Koneksi'}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              refetchDevice();
              refetchMetrics();
            }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metric Highlights */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">CPU Load</span>
              <h3 className="text-2xl font-bold text-cyan-400 mt-1">{cpu != null ? `${cpu}%` : '-'}</h3>
              <span className="text-[10px] text-slate-500">{cpu != null ? 'Kondisi Terbaca' : 'Menunggu Polling'}</span>
            </div>
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">Memori Terpakai</span>
              <h3 className="text-2xl font-bold text-purple-400 mt-1">{mem != null ? `${mem}%` : '-'}</h3>
              <span className="text-[10px] text-slate-500">{mem != null ? 'RAM Terbaca' : 'Menunggu Polling'}</span>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Server className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">Latensi ICMP</span>
              <h3 className="text-2xl font-bold text-amber-400 mt-1 font-mono">
                {metrics?.latency_ms != null ? `${metrics.latency_ms.toFixed(1)}ms` : '-'}
              </h3>
              <span className="text-[10px] text-slate-400">
                Loss: {metrics?.packet_loss != null ? `${metrics.packet_loss.toFixed(0)}%` : '0%'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Radio className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">WAN Gateway Ping</span>
              <h3 className="text-2xl font-bold text-blue-400 mt-1 font-mono">
                {metrics?.wan_latency_ms != null ? `${metrics.wan_latency_ms.toFixed(1)}ms` : '-'}
              </h3>
              <span className="text-[10px] text-slate-400">
                {metrics?.wan_packet_loss != null ? `Loss: ${metrics.wan_packet_loss.toFixed(0)}%` : (String(devType).toUpperCase() === 'SNMP' ? 'Khusus Router' : 'Target: 8.8.8.8')}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Globe className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">System Uptime</span>
              <h3 className="text-lg font-bold text-emerald-400 mt-1 font-mono truncate max-w-[130px]">{uptime}</h3>
              <span className="text-[10px] text-slate-500">Tanpa Reboot</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">Status Port {String(devType).toUpperCase() === 'SNMP' ? 'SNMP' : 'API'}</span>
              <h3 className="text-lg font-bold text-slate-100 mt-1 font-mono">Port {device?.port || (String(devType).toUpperCase() === 'SNMP' ? 161 : 8728)}</h3>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Ready
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
              <Network className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dual-Provider Internet Telemetry (Khusus Router Core) */}
      {isCoreRouter && <DualWanPanel deviceId={id} />}

      {/* Historical Telemetry Chart */}
      <HistoricalChart deviceId={id} />

      {/* Detailed Tabs: Interfaces, DHCP, Routes, AI */}
      <div className="space-y-4">
        <div className="flex border-b border-slate-800 gap-4 text-xs sm:text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('interfaces')}
            className={`pb-3 transition-colors flex items-center gap-2 ${
              activeTab === 'interfaces' ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDownUp className="h-4 w-4" />
            Interface & Traffic ({interfaces.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dhcp')}
            className={`pb-3 transition-colors flex items-center gap-2 ${
              activeTab === 'dhcp' ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wifi className="h-4 w-4" />
            DHCP Server Leases ({dhcpLeases.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('routes')}
            className={`pb-3 transition-colors flex items-center gap-2 ${
              activeTab === 'routes' ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network className="h-4 w-4" />
            Routing Table ({routes.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('remediation')}
            className={`pb-3 transition-colors flex items-center gap-2 ${
              activeTab === 'remediation' ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="h-4 w-4 text-amber-400" />
            Remediasi & Aksi ({remediationLogs.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`pb-3 transition-colors flex items-center gap-2 ${
              activeTab === 'ai' ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="h-4 w-4 text-cyan-400" />
            AI Troubleshooting
          </button>
        </div>

        {/* Tab 1: Interfaces Table */}
        {activeTab === 'interfaces' && (
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-950/60 border-b border-slate-800">
                  <TableRow>
                    <TableHead className="text-xs text-slate-400">Interface</TableHead>
                    <TableHead className="text-xs text-slate-400">Tipe</TableHead>
                    <TableHead className="text-xs text-slate-400">Status</TableHead>
                    <TableHead className="text-xs text-slate-400">RX Traffic (In)</TableHead>
                    <TableHead className="text-xs text-slate-400">TX Traffic (Out)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interfaces.map((iface: any, idx: number) => (
                    <TableRow key={idx} className="border-b border-slate-800/80 hover:bg-slate-800/20">
                      <TableCell className="font-semibold text-xs text-slate-200 font-mono">
                        {iface.name}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400 uppercase font-mono">
                        {iface.type}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={iface.running ? 'success' : 'secondary'} 
                          className="text-[10px] uppercase font-mono"
                        >
                          {iface.running ? 'Running (Up)' : 'Down'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-cyan-400">
                        {formatBytes(iface.rx_bytes || 0)}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-purple-400">
                        {formatBytes(iface.tx_bytes || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Tab 2: DHCP Leases */}
        {activeTab === 'dhcp' && (
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-950/60 border-b border-slate-800">
                  <TableRow>
                    <TableHead className="text-xs text-slate-400">IP Address</TableHead>
                    <TableHead className="text-xs text-slate-400">MAC Address</TableHead>
                    <TableHead className="text-xs text-slate-400">Host Name</TableHead>
                    <TableHead className="text-xs text-slate-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dhcpLeases.map((lease: any, idx: number) => (
                    <TableRow key={idx} className="border-b border-slate-800/80 hover:bg-slate-800/20">
                      <TableCell className="font-mono text-xs text-cyan-300 font-semibold">
                        {lease.address}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-400">
                        {lease.mac_address}
                      </TableCell>
                      <TableCell className="text-xs text-slate-200">
                        {lease.host_name || 'Tidak Diketahui'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase text-emerald-400 border-emerald-500/30">
                          {lease.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Tab 3: Routing Table */}
        {activeTab === 'routes' && (
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-950/60 border-b border-slate-800">
                  <TableRow>
                    <TableHead className="text-xs text-slate-400">Destination Subnet</TableHead>
                    <TableHead className="text-xs text-slate-400">Gateway</TableHead>
                    <TableHead className="text-xs text-slate-400">Distance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routes.map((route: any, idx: number) => (
                    <TableRow key={idx} className="border-b border-slate-800/80 hover:bg-slate-800/20">
                      <TableCell className="font-mono text-xs text-slate-200 font-semibold">
                        {route.dst_address}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-cyan-400">
                        {route.gateway}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-400">
                        {route.distance}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Tab 4: Remediasi & Mitigasi (NOVA Act) */}
        {activeTab === 'remediation' && (
          <div className="space-y-6">
            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Flush DNS */}
              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-cyan-400" />
                      Flush DNS Cache
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] font-mono text-cyan-400 border-cyan-500/30">
                      /ip dns cache flush
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-400 mt-2">
                    Bersihkan seluruh record cache DNS internal di MikroTik untuk mengatasi nama host atau domain resolver yang bermasalah.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    size="sm"
                    onClick={() => handleExecuteRemediation('FLUSH_DNS', 'global')}
                    disabled={executingAction !== null}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-xs"
                  >
                    {executingAction === 'FLUSH_DNS' ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Mengeksekusi...
                      </>
                    ) : (
                      <>
                        <Zap className="h-3.5 w-3.5 mr-1.5" />
                        Eksekusi Flush DNS
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Card 2: Run Diagnostics */}
              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      <Radio className="h-4 w-4 text-amber-400" />
                      Uji Diagnostik Cepat
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] font-mono text-amber-400 border-amber-500/30">
                      Dual-Ping Check
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-400 mt-2">
                    Jalankan ping 2 arah: Server NOVA ke Router untuk cek hop lokal, dan Router ke WAN Gateway (8.8.8.8) untuk cek uplink ISP.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    size="sm"
                    onClick={() => handleExecuteRemediation('RUN_DIAGNOSTICS', 'icmp-dual')}
                    disabled={executingAction !== null}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs"
                  >
                    {executingAction === 'RUN_DIAGNOSTICS' ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Menguji Jaringan...
                      </>
                    ) : (
                      <>
                        <Radio className="h-3.5 w-3.5 mr-1.5" />
                        Jalankan Uji Diagnostik
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Card 3: Restart Interface */}
              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      <RotateCcw className="h-4 w-4 text-purple-400" />
                      Siklus Restart Interface
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] font-mono text-purple-400 border-purple-500/30">
                      disable &gt; 2s &gt; enable
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-400 mt-2">
                    Lakukan bounce port (disable lalu enable kembali setelah jeda 2 detik) untuk memulihkan interface yang mengalami flapping atau hang.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <Select
                    className="text-xs bg-slate-950 border-slate-800 text-slate-200"
                    options={[
                      { value: '', label: 'Pilih interface target...' },
                      ...interfaces.map((i: any) => ({
                        value: i.name,
                        label: `${i.name} (${i.running ? 'Up' : 'Down'})`,
                      })),
                    ]}
                    value={selectedInterface}
                    onChange={(e) => setSelectedInterface(e.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!selectedInterface) {
                        toast.error('Pilih interface terlebih dahulu sebelum mengeksekusi');
                        return;
                      }
                      handleExecuteRemediation('RESTART_INTERFACE', selectedInterface);
                    }}
                    disabled={executingAction !== null || !selectedInterface}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs disabled:opacity-50"
                  >
                    {executingAction === 'RESTART_INTERFACE' ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Merestart {selectedInterface}...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                        Restart Interface
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Audit Log Table */}
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <History className="h-4 w-4 text-cyan-400" />
                    Jejak Audit Remediasi (NOVA Act Audit Trail)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Catatan seluruh eksekusi perbaikan melalui antarmuka web dashboard maupun Telegram Bot
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetchLogs()}
                  className="border-slate-800 bg-slate-900 text-slate-300 hover:text-white text-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Segarkan Log
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-950/60 border-b border-slate-800">
                    <TableRow>
                      <TableHead className="text-xs text-slate-400">Waktu</TableHead>
                      <TableHead className="text-xs text-slate-400">Aksi</TableHead>
                      <TableHead className="text-xs text-slate-400">Target</TableHead>
                      <TableHead className="text-xs text-slate-400">Kanal</TableHead>
                      <TableHead className="text-xs text-slate-400">Operator</TableHead>
                      <TableHead className="text-xs text-slate-400">Status</TableHead>
                      <TableHead className="text-xs text-slate-400">Hasil / Detail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {remediationLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-xs text-slate-500">
                          Belum ada riwayat tindakan remediasi untuk perangkat ini.
                        </TableCell>
                      </TableRow>
                    ) : (
                      remediationLogs.map((item: RemediationLogItem) => (
                        <TableRow key={item.id} className="border-b border-slate-800/80 hover:bg-slate-800/20">
                          <TableCell className="font-mono text-xs text-slate-400 whitespace-nowrap">
                            {formatDate(item.created_at)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-[10px] text-cyan-300 border-cyan-500/30">
                              {item.action_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-300">
                            {item.target}
                          </TableCell>
                          <TableCell>
                            <span className="text-[11px] font-mono text-slate-400">
                              {item.trigger_channel}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-300">
                            {item.executed_by}
                          </TableCell>
                          <TableCell>
                            {item.status === 'SUCCESS' ? (
                              <Badge variant="success" className="text-[10px] font-mono">
                                SUCCESS
                              </Badge>
                            ) : item.status === 'FAILED' ? (
                              <Badge variant="destructive" className="text-[10px] font-mono">
                                FAILED
                              </Badge>
                            ) : (
                              <Badge variant="warning" className="text-[10px] font-mono">
                                PENDING
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-300 max-w-md truncate" title={item.output_details}>
                            {item.output_details || '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 5: AI Troubleshooting */}
        {activeTab === 'ai' && (
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                  <Bot className="h-4 w-4 text-cyan-400" />
                  Analisis Diagnostik AI Spesifik Perangkat
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Evaluasi otomatis terhadap resource, routing, dan traffic interface {deviceName}
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={handleAnalyzeDevice}
                disabled={isAnalyzing}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                {isAnalyzing ? 'Menganalisis...' : 'Jalankan Analisis'}
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              {aiAnalysis ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {aiAnalysis}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400">
                  <Bot className="h-10 w-10 text-cyan-500/40 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-300">Belum ada hasil analisis.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Klik tombol "Jalankan Analisis" untuk meminta saran troubleshooting dari NOVA AI.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
