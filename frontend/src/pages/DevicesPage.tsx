import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Server, RefreshCw } from 'lucide-react';
import { DeviceList } from '@/components/devices/DeviceList';
import { AddDeviceModal } from '@/components/devices/AddDeviceModal';
import { EditDeviceModal } from '@/components/devices/EditDeviceModal';
import { SnoozeDeviceModal } from '@/components/devices/SnoozeDeviceModal';
import { useDevices } from '@/hooks/useDevices';
import { useAuthStore } from '@/stores/authStore';
import { Device } from '@/types/device';
import { toast } from 'sonner';

export const DevicesPage: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [snoozingDevice, setSnoozingDevice] = useState<Device | null>(null);

  const { devices, isLoading, isError, refetch, deleteDevice } = useDevices();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const handleDelete = async (id: string | number) => {
    try {
      await deleteDevice(id);
      toast.success('Perangkat berhasil dihapus dari daftar pemantauan.');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Gagal menghapus perangkat.');
    }
  };

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
            className="min-h-[44px] border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Segarkan
          </Button>
          {isAdmin && (
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="min-h-[44px] bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold"
            >
              <Plus className="mr-2 h-4 w-4" />
              Tambah Perangkat
            </Button>
          )}
        </div>
      </div>

      <DeviceList
        devices={devices || []}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        onDelete={handleDelete}
        onEdit={(device) => setEditingDevice(device)}
        onSnooze={(device) => setSnoozingDevice(device)}
      />

      <AddDeviceModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
      />

      <EditDeviceModal
        open={!!editingDevice}
        onOpenChange={(open) => !open && setEditingDevice(null)}
        device={editingDevice}
      />

      <SnoozeDeviceModal
        open={!!snoozingDevice}
        onOpenChange={(open) => !open && setSnoozingDevice(null)}
        device={snoozingDevice}
      />
    </div>
  );
};

export default DevicesPage;
