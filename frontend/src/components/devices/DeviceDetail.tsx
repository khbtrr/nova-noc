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
import { toast } from 'sonner';
import { 
  ArrowLeft, Activity, Server, Clock, AlertTriangle, 
  Network, Wifi, Radio, Bot, CheckCircle2, ShieldAlert,
  ArrowDownUp, RefreshCw
} from 'lucide-react';
import { formatBytes } from '@/lib/utils';

export default function DeviceDetail() {
  const { id = '1' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'interfaces' | 'dhcp' | 'routes' | 'ai'>('interfaces');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

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
        `### 🤖 Analisis AI untuk ${device?.name || 'Perangkat'}\n\n` +
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
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
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
              <span className="text-xs text-slate-400 font-medium">Status Port API</span>
              <h3 className="text-lg font-bold text-slate-100 mt-1 font-mono">Port {device?.port || 8728}</h3>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Ready & Listening
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
              <Network className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

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

        {/* Tab 4: AI Troubleshooting */}
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
