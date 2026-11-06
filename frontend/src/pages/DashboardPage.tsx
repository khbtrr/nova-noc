import React from 'react';
import { useDevices } from '@/hooks/useDevices';
import { useAlerts } from '@/hooks/useAlerts';
import { OverviewPanel } from '@/components/dashboard/OverviewPanel';
import { DualWanPanel } from '@/components/dashboard/DualWanPanel';
import { TrafficChart } from '@/components/dashboard/TrafficChart';
import { HistoricalChart } from '@/components/dashboard/HistoricalChart';
import { TopTalkersWidget } from '@/components/dashboard/TopTalkersWidget';
import { TopologyMap } from '@/components/dashboard/TopologyMap';
import { AlertFeed } from '@/components/dashboard/AlertFeed';
import { AIInsightPanel } from '@/components/dashboard/AIInsightPanel';
import { DeviceCard } from '@/components/dashboard/DeviceCard';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { devices } = useDevices();
  const { activeAlerts, acknowledgeAlert } = useAlerts();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Ringkasan Operasi Jaringan</h1>
          <p className="text-sm text-slate-400">Telemetri infrastruktur real-time dan diagnostik sistem</p>
        </div>
      </div>

      <OverviewPanel devices={devices} activeAlertsCount={activeAlerts.length} />

      <DualWanPanel devices={devices} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TrafficChart />
        <AIInsightPanel />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <HistoricalChart devices={devices} />
        </div>
        <div className="lg:col-span-1">
          <TopTalkersWidget />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TopologyMap devices={devices} />

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Node Terpantau</h2>
              <button
                type="button"
                onClick={() => navigate('/devices')}
                className="text-xs text-cyan-400 hover:underline font-medium min-h-[44px] px-2 inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded"
              >
                Lihat Semua Perangkat
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {devices.slice(0, 4).map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onClick={(id) => navigate(`/devices/${id}`)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <AlertFeed alerts={activeAlerts} onAcknowledge={acknowledgeAlert} />
        </div>
      </div>
    </div>
  );
};
