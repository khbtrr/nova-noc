import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Server, RefreshCw } from 'lucide-react';
import DeviceList from '@/components/devices/DeviceList';
import AddDeviceModal from '@/components/devices/AddDeviceModal';
import { useDevices } from '@/hooks/useDevices';

export default function DevicesPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { devices, isLoading, refetch } = useDevices();

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Server className="h-6 w-6 text-cyan-400" />
            Inventaris Perangkat Jaringan
          </h2>
          <p className="text-sm text-slate-400">
            Daftar perangkat router MikroTik, switch, dan perangkat SNMP yang terdaftar dalam polling engine.
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
            onClick={() => setIsAddModalOpen(true)}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Perangkat
          </Button>
        </div>
      </div>
      
      <DeviceList devices={devices || []} />

      <AddDeviceModal 
        open={isAddModalOpen} 
        onOpenChange={setIsAddModalOpen} 
      />
    </div>
  );
}
