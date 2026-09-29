import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { flowApi } from '@/services/flowApi';
import { toast } from 'sonner';
import { 
  ArrowLeftRight, 
  Search, 
  Play, 
  Pause, 
  RefreshCw, 
  Terminal, 
  Copy, 
  Check, 
  Laptop, 
  Globe, 
  Server, 
  ShieldCheck, 
  Activity, 
  Layers, 
  Hash, 
  Zap, 
  ExternalLink 
} from 'lucide-react';
import { TopTalkerItem, ProtocolItem, ConversationItem, FlowStatus } from '@/types/flow';

export default function TrafficFlowPage() {
  const [windowTime, setWindowTime] = useState<string>('5m');
  const [activeTab, setActiveTab] = useState<'talkers' | 'destinations' | 'conversations' | 'protocols'>('talkers');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Queries
  const { data: status, refetch: refetchStatus } = useQuery<FlowStatus>({
    queryKey: ['flow-status'],
    queryFn: () => flowApi.getStatus(),
    refetchInterval: isPaused ? false : 5000,
  });

  const { data: topTalkers = [], isLoading: isLoadingTalkers, refetch: refetchTalkers } = useQuery<TopTalkerItem[]>({
    queryKey: ['flow-top-talkers', windowTime],
    queryFn: () => flowApi.getTopTalkers(windowTime, 50),
    refetchInterval: isPaused ? false : 5000,
  });

  const { data: topDestinations = [], isLoading: isLoadingDestinations, refetch: refetchDestinations } = useQuery<TopTalkerItem[]>({
    queryKey: ['flow-top-destinations', windowTime],
    queryFn: () => flowApi.getTopDestinations(windowTime, 50),
    refetchInterval: isPaused ? false : 5000,
  });

  const { data: conversations = [], isLoading: isLoadingConversations, refetch: refetchConversations } = useQuery<ConversationItem[]>({
    queryKey: ['flow-conversations', windowTime],
    queryFn: () => flowApi.getConversations(windowTime, 50),
    refetchInterval: isPaused ? false : 5000,
  });

  const { data: protocols = [], isLoading: isLoadingProtocols, refetch: refetchProtocols } = useQuery<ProtocolItem[]>({
    queryKey: ['flow-protocols', windowTime],
    queryFn: () => flowApi.getProtocols(windowTime),
    refetchInterval: isPaused ? false : 5000,
  });

  const handleManualRefresh = () => {
    refetchStatus();
    refetchTalkers();
    refetchDestinations();
    refetchConversations();
    refetchProtocols();
    toast.success('Data NetFlow diperbarui');
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num || 0);
  };

  // Filtered lists based on search
  const filteredTalkers = topTalkers.filter(t => 
    t.ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.hostname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDestinations = topDestinations.filter(d => 
    d.ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.hostname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredConversations = conversations.filter(c => 
    c.src_ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.src_hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.dst_ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.dst_hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.protocol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group protocols into Transport vs Services
  const transportProtocols = protocols.filter(p => p.type === 'protocol');
  const serviceProtocols = protocols.filter(p => p.type === 'service');
  const dominantService = serviceProtocols.length > 0 ? serviceProtocols[0] : null;

  const mikrotikConfigScript = `/ip traffic-flow
set enabled=yes interfaces=all active-flow-timeout=1m inactive-flow-timeout=15s
/ip traffic-flow target
add dst-address=IP_SERVER_NOVA port=2055 version=5`;

  const copyConfigScript = () => {
    navigator.clipboard.writeText(mikrotikConfigScript);
    setCopiedCode(true);
    toast.success('Skrip konfigurasi disalin ke clipboard');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
              Traffic Flow & Top Talkers
            </h2>
            {status?.is_running ? (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs px-2.5 py-0.5 font-mono">
                UDP 2055 Aktif
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs px-2.5 py-0.5">
                Receiver Standby
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Analisis aliran paket NetFlow v5 real-time, identifikasi pemakaian bandwidth klien, dan protokol aktif.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsGuideOpen(true)}
            className="border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <Terminal className="h-3.5 w-3.5 mr-1.5 text-cyan-400" />
            Panduan MikroTik
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
            className={`border-slate-800 text-slate-300 hover:text-white ${
              isPaused ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-slate-900/60'
            }`}
          >
            {isPaused ? (
              <>
                <Play className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                Lanjutkan Stream
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
                Jeda Stream
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            className="border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Throughput */}
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Throughput NetFlow</p>
              <h3 className="text-xl font-bold font-mono text-slate-100 mt-1">
                {(status?.live_throughput_mbps || 0).toFixed(2)} <span className="text-sm font-normal text-slate-400">Mbps</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Laju aliran data terpantau</p>
            </div>
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Zap className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Unique Talkers */}
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Klien Aktif ({windowTime})</p>
              <h3 className="text-xl font-bold font-mono text-slate-100 mt-1">
                {topTalkers.length} <span className="text-sm font-normal text-slate-400">IP Host</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                {topTalkers.filter(t => t.is_local).length} lokal LAN terdeteksi
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Laptop className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Total Flows */}
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Total Aliran Flow</p>
              <h3 className="text-xl font-bold font-mono text-slate-100 mt-1">
                {formatNumber(status?.total_flows_processed || 0)}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                {formatBytes(status?.total_bytes_processed || 0)} diproses
              </p>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Dominant Service */}
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Layanan Dominan</p>
              <h3 className="text-xl font-bold text-slate-100 mt-1 truncate max-w-[130px]">
                {dominantService ? dominantService.name : 'N/A'}
              </h3>
              <p className="text-[11px] font-mono text-cyan-400 mt-1">
                {dominantService ? `${dominantService.percent.toFixed(1)}% pangsa bandwidth` : 'Menunggu paket...'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Globe className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Filter Bar & Window Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900/40">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant={activeTab === 'talkers' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('talkers')}
            className={activeTab === 'talkers' ? 'bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs' : 'text-slate-400 text-xs'}
          >
            <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" />
            Top Talkers (Klien Sumber)
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'destinations' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('destinations')}
            className={activeTab === 'destinations' ? 'bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs' : 'text-slate-400 text-xs'}
          >
            <Globe className="h-3.5 w-3.5 mr-1.5" />
            Top Destinasi
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'conversations' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('conversations')}
            className={activeTab === 'conversations' ? 'bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs' : 'text-slate-400 text-xs'}
          >
            <Activity className="h-3.5 w-3.5 mr-1.5" />
            Percakapan Aktif
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'protocols' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('protocols')}
            className={activeTab === 'protocols' ? 'bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs' : 'text-slate-400 text-xs'}
          >
            <Layers className="h-3.5 w-3.5 mr-1.5" />
            Distribusi Protokol
          </Button>
        </div>

        {/* Window Selectors & Search */}
        <div className="flex items-center gap-2">
          {/* Time Window Buttons */}
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950 p-1">
            {['1m', '5m', '15m', '30m', '1h'].map((w) => (
              <button
                key={w}
                onClick={() => setWindowTime(w)}
                className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-colors ${
                  windowTime === w
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {w}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-48 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <Input
              type="text"
              placeholder="Cari IP, host, protokol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600 h-8"
            />
          </div>
        </div>
      </div>

      {/* 4. Tab 1: Top Talkers Table */}
      {activeTab === 'talkers' && (
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur">
          <CardHeader className="p-4 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4 text-cyan-400" />
                  Klien Pengirim Bandwidth Terbesar ({windowTime})
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Perangkat dalam jaringan yang menghasilkan aliran paket keluar terbanyak.
                </CardDescription>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {filteredTalkers.length} IP terdaftar
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingTalkers && topTalkers.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <Activity className="h-6 w-6 animate-spin text-cyan-500 mx-auto mb-2" />
                Mengagregasi aliran paket NetFlow...
              </div>
            ) : filteredTalkers.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <Server className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-300 font-medium">Belum ada data aliran NetFlow untuk periode ini</p>
                <p className="text-slate-500 mt-1 max-w-md mx-auto">
                  Pastikan router MikroTik telah dikonfigurasi untuk mengekspor Traffic Flow ke IP server NOVA pada port 2055 UDP.
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsGuideOpen(true)}
                  className="mt-4 bg-cyan-600 hover:bg-cyan-500 text-white text-xs"
                >
                  Lihat Cara Konfigurasi MikroTik
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-medium border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">Rank</th>
                      <th className="py-3 px-4">Alamat IP Klien</th>
                      <th className="py-3 px-4">Nama Host (DHCP / DNS)</th>
                      <th className="py-3 px-4">Tipe</th>
                      <th className="py-3 px-4 text-right">Laju Bandwidth</th>
                      <th className="py-3 px-4 text-right">Total Akumulasi</th>
                      <th className="py-3 px-4 text-right">Paket</th>
                      <th className="py-3 px-4 w-44">Pangsa Trafik (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredTalkers.map((talker) => (
                      <tr key={talker.ip} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 text-center font-mono font-semibold text-slate-400">
                          #{talker.rank}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-semibold text-slate-100">
                            {talker.ip}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {talker.hostname && talker.hostname !== talker.ip ? (
                            <span className="font-medium text-cyan-400 flex items-center gap-1.5">
                              <Laptop className="h-3 w-3 shrink-0" />
                              {talker.hostname}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">Tidak teridentifikasi di DHCP</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {talker.is_local ? (
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                              Lokal LAN
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-slate-800 text-slate-400 border-slate-700">
                              Publik WAN
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">
                          {talker.mbps.toFixed(2)} Mbps
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                          {formatBytes(talker.bytes)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">
                          {formatNumber(talker.packets)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, Math.max(4, talker.percent_share))}%` }}
                              />
                            </div>
                            <span className="font-mono text-slate-300 w-12 text-right">
                              {talker.percent_share.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 5. Tab 2: Top Destinations Table */}
      {activeTab === 'destinations' && (
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur">
          <CardHeader className="p-4 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-400" />
                  Alamat IP Tujuan Terbesar ({windowTime})
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Server atau IP publik yang paling banyak menerima pengiriman data dari klien.
                </CardDescription>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {filteredDestinations.length} tujuan terdaftar
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredDestinations.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <Globe className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-300 font-medium">Belum ada data destinasi untuk periode ini</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-medium border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">Rank</th>
                      <th className="py-3 px-4">Alamat IP Destinasi</th>
                      <th className="py-3 px-4">Nama Host / Layanan</th>
                      <th className="py-3 px-4">Tipe</th>
                      <th className="py-3 px-4 text-right">Laju Bandwidth</th>
                      <th className="py-3 px-4 text-right">Total Akumulasi</th>
                      <th className="py-3 px-4 text-right">Paket</th>
                      <th className="py-3 px-4 w-44">Pangsa (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredDestinations.map((dest) => (
                      <tr key={dest.ip} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 text-center font-mono font-semibold text-slate-400">
                          #{dest.rank}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-100">
                          {dest.ip}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {dest.hostname && dest.hostname !== dest.ip ? (
                            <span className="text-cyan-400 font-medium">{dest.hostname}</span>
                          ) : (
                            <span className="text-slate-500 italic">Internet Endpoint</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {dest.is_local ? (
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                              Lokal LAN
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30">
                              Publik WAN
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">
                          {dest.mbps.toFixed(2)} Mbps
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                          {formatBytes(dest.bytes)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">
                          {formatNumber(dest.packets)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(4, dest.percent_share))}%` }}
                              />
                            </div>
                            <span className="font-mono text-slate-300 w-12 text-right">
                              {dest.percent_share.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 6. Tab 3: Active Conversations Table */}
      {activeTab === 'conversations' && (
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur">
          <CardHeader className="p-4 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-purple-400" />
                  Percakapan Aliran Dua Titik (Conversations) ({windowTime})
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Pasangan koneksi aktif antara host pengirim dan server tujuan beserta port aplikasi.
                </CardDescription>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {filteredConversations.length} koneksi aktif
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredConversations.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <Activity className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-300 font-medium">Belum ada percakapan terdata</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-medium border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">Rank</th>
                      <th className="py-3 px-4">Klien Sumber (Source)</th>
                      <th className="py-3 px-4">Destinasi & Port</th>
                      <th className="py-3 px-4">Layanan Aplikasi</th>
                      <th className="py-3 px-4">Protokol</th>
                      <th className="py-3 px-4 text-right">Kecepatan</th>
                      <th className="py-3 px-4 text-right">Volume Data</th>
                      <th className="py-3 px-4 w-36">Pangsa (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredConversations.map((conv) => (
                      <tr key={`${conv.src_ip}-${conv.dst_ip}-${conv.service}`} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 text-center font-mono font-semibold text-slate-400">
                          #{conv.rank}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono font-semibold text-slate-100">{conv.src_ip}</div>
                          {conv.src_hostname && (
                            <div className="text-[10px] text-cyan-400 truncate max-w-[150px]">{conv.src_hostname}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono text-slate-200">{conv.dst_ip}</div>
                          {conv.dst_hostname && (
                            <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{conv.dst_hostname}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className="bg-slate-800 text-slate-200 border-slate-700 font-mono text-[10px]">
                            {conv.service}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400 uppercase">
                          {conv.protocol}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">
                          {conv.mbps.toFixed(2)} Mbps
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                          {formatBytes(conv.bytes)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-purple-500 h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(4, conv.percent))}%` }}
                              />
                            </div>
                            <span className="font-mono text-slate-400 text-[11px] w-10 text-right">
                              {conv.percent.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 7. Tab 4: Protocol & Service Distribution */}
      {activeTab === 'protocols' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: Application Services */}
          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur">
            <CardHeader className="p-4 border-b border-slate-800">
              <CardTitle className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Globe className="h-4 w-4 text-cyan-400" />
                Layanan Aplikasi (Port Well-Known)
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Porsi konsumsi bandwidth berdasarkan port layanan tujuan.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {serviceProtocols.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Belum ada statistik layanan aplikasi
                </div>
              ) : (
                serviceProtocols.map((svc) => (
                  <div key={svc.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{svc.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400">{formatBytes(svc.bytes)}</span>
                        <span className="font-mono font-bold text-cyan-400 w-12 text-right">
                          {svc.percent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-cyan-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(3, svc.percent))}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Section 2: Transport Protocols */}
          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur">
            <CardHeader className="p-4 border-b border-slate-800">
              <CardTitle className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-400" />
                Protokol Transport (Layer 4)
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Perbandingan protokol jaringan TCP, UDP, ICMP, dan enkapsulasi lainnya.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {transportProtocols.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Belum ada data protokol transport
                </div>
              ) : (
                transportProtocols.map((proto) => (
                  <div key={proto.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold text-slate-200 uppercase">{proto.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400">{formatBytes(proto.bytes)}</span>
                        <span className="font-mono font-bold text-purple-400 w-12 text-right">
                          {proto.percent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(3, proto.percent))}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 8. MikroTik Configuration Modal */}
      <Dialog open={isGuideOpen} onOpenChange={setIsGuideOpen}>
        <DialogContent className="max-w-xl bg-slate-900 border-slate-800 text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base text-slate-100 flex items-center gap-2">
              <Terminal className="h-5 w-5 text-cyan-400" />
              Panduan Konfigurasi MikroTik Traffic Flow (NetFlow v5)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Jalankan perintah ini di Terminal Winbox atau SSH Router MikroTik utama Anda untuk mengirimkan telemetri aliran paket ke NOVA.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <p className="text-xs font-semibold text-slate-300 mb-1.5">
                Perintah MikroTik RouterOS:
              </p>
              <div className="relative rounded-lg bg-slate-950 p-3 font-mono text-xs text-cyan-300 border border-slate-800">
                <pre className="whitespace-pre-wrap">{mikrotikConfigScript}</pre>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyConfigScript}
                  className="absolute top-2 right-2 h-7 px-2 border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  {copiedCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span className="ml-1 text-[11px]">{copiedCode ? 'Disalin' : 'Salin'}</span>
                </Button>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
              <div className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-bold">1</span>
                <p>
                  Ganti <code className="text-cyan-300 bg-slate-800 px-1 py-0.5 rounded">IP_SERVER_NOVA</code> dengan alamat IP server tempat NOVA dijalankan (misal: 192.168.1.100).
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-bold">2</span>
                <p>
                  Port UDP default NOVA NetFlow Receiver adalah <code className="text-cyan-300 bg-slate-800 px-1 py-0.5 rounded">2055</code>.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-bold">3</span>
                <p>
                  NOVA secara otomatis memetakan IP klien lokal ke nama hostname aktif yang terdaftar di DHCP Leases router utama.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setIsGuideOpen(false)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs"
            >
              Tutup Panduan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
