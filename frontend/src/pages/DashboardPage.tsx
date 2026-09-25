import React from 'react';
import OverviewPanel from '@/components/dashboard/OverviewPanel';
import DeviceCard from '@/components/dashboard/DeviceCard';
import TrafficChart from '@/components/dashboard/TrafficChart';
import AlertFeed from '@/components/dashboard/AlertFeed';
import AIInsightPanel from '@/components/dashboard/AIInsightPanel';
import { HistoricalChart } from '@/components/dashboard/HistoricalChart';
import { TopologyMap } from '@/components/dashboard/TopologyMap';
import { useDevices } from '@/hooks/useDevices';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Button } from '@/components/ui/button';
import { PlusCircle, RefreshCw, Server } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { devices, isLoading, refetch } = useDevices();
  
  useWebSocket();

  const deviceList = devices || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            Monitoring & Telemetri Jaringan
          </h2>
          <p className="text-sm text-slate-400">
            Pemantauan performa router MikroTik, perangkat SNMP, dan anomali jaringan secara real-time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()} 
            className="border-slate-800 bg-slate-900/50 text-slate-300 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            size="sm" 
            onClick={() => navigate('/devices')}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
          >
            <PlusCircle className="h-4 w-4 mr-1.5" />
            Tambah Perangkat
          </Button>
        </div>
      </div>
      
      {/* 1. Overview Summary Stats */}
      <OverviewPanel />
      
      {/* 2. Device Status Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Perangkat Jaringan Aktif</h3>
          <span 
            onClick={() => navigate('/devices')}
            className="text-xs text-cyan-400 hover:underline cursor-pointer"
          >
            Lihat Semua Perangkat ({deviceList.length})
          </span>
        </div>
        {deviceList.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {deviceList.map((dev: any) => (
              <DeviceCard key={dev.id} device={dev} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center">
            <Server className="h-8 w-8 text-slate-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-200">Belum ada perangkat jaringan terdaftar</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Tambahkan router MikroTik atau switch SNMP untuk memulai polling metrik CPU, RAM, dan trafik bandwidth.
            </p>
            <Button
              size="sm"
              onClick={() => navigate('/devices')}
              className="mt-4 bg-cyan-600 hover:bg-cyan-500 text-white text-xs"
            >
              <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
              Daftarkan Perangkat Baru
            </Button>
          </div>
        )}
      </div>
      
      {/* 3. Traffic & AI & Alerts Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrafficChart />
        </div>
        <div>
          <AIInsightPanel />
        </div>
      </div>

      {/* 4. Historical Trends & Live Alert Feed */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <HistoricalChart deviceId={deviceList[0]?.id} />
        </div>
        <div>
          <AlertFeed />
        </div>
      </div>

      {/* 5. Network Topology Visualizer */}
      <TopologyMap />
    </div>
  );
}
