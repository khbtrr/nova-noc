import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDevices } from '@/hooks/useDevices';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { Device } from '@/types/device';

interface EditDeviceModalProps {
  device: Device | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function EditDeviceModal({ device, open, onOpenChange, onSuccess }: EditDeviceModalProps) {
  const { updateDevice } = useDevices();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    host: '',
    device_type: 'MIKROTIK' as 'MIKROTIK' | 'SNMP',
    port: 8728,
    username: 'admin',
    password: '',
    snmp_community: 'public',
    snmp_version: 'v2c',
    poll_interval: 30,
    group: 'Core Infrastructure',
    location: 'Server Room',
    is_enabled: true,
  });

  useEffect(() => {
    if (device && open) {
      const rawType = String(device.device_type || device.type || 'MIKROTIK').toUpperCase();
      const normalizedType: 'MIKROTIK' | 'SNMP' = rawType.includes('SNMP') ? 'SNMP' : 'MIKROTIK';
      setFormData({
        name: device.name || '',
        host: device.host || device.ip_address || '',
        device_type: normalizedType,
        port: device.port || (normalizedType === 'MIKROTIK' ? 8728 : 161),
        username: device.username || 'admin',
        password: '',
        snmp_community: device.snmp_community || 'public',
        snmp_version: device.snmp_version || 'v2c',
        poll_interval: device.poll_interval || 30,
        group: device.group || 'Core Infrastructure',
        location: device.location || 'Server Room',
        is_enabled: device.is_enabled ?? true,
      });
    }
  }, [device, open]);

  const handleTypeChange = (type: 'MIKROTIK' | 'SNMP') => {
    setFormData((prev) => ({
      ...prev,
      device_type: type,
      port: type === 'MIKROTIK' ? 8728 : 161,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!device) return;

    if (!formData.name.trim() || !formData.host.trim()) {
      toast.error('Mohon lengkapi nama dan IP/Host perangkat.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, any> = {
        name: formData.name.trim(),
        host: formData.host.trim(),
        device_type: formData.device_type,
        port: Number(formData.port),
        poll_interval: Number(formData.poll_interval),
        group: formData.group.trim(),
        location: formData.location.trim(),
        is_enabled: formData.is_enabled,
      };

      if (formData.device_type === 'MIKROTIK') {
        payload.username = formData.username.trim();
        if (formData.password.trim()) {
          payload.password = formData.password.trim();
        }
      } else {
        payload.snmp_community = formData.snmp_community.trim();
        payload.snmp_version = formData.snmp_version;
      }

      await updateDevice({ id: device.id, data: payload });
      toast.success(`Perangkat ${formData.name} berhasil diperbarui.`);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Gagal memperbarui perangkat.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] border-slate-800 bg-slate-900 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base text-slate-100">
            <Pencil className="h-4 w-4 text-cyan-400" />
            Edit Perangkat: {device?.name || 'Monitoring'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Perbarui parameter koneksi, polling interval, atau lokasi perangkat jaringan.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300">Nama Perangkat</label>
              <Input
                placeholder="e.g. Core CCR2004"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-slate-950 border-slate-800 text-xs mt-1"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300">IP Address / Host</label>
              <Input
                placeholder="192.168.88.1"
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                className="bg-slate-950 border-slate-800 text-xs font-mono mt-1"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300">Tipe Koneksi</label>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => handleTypeChange('MIKROTIK')}
                  className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium border transition-colors ${
                    formData.device_type === 'MIKROTIK'
                      ? 'bg-cyan-600/20 border-cyan-500 text-cyan-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  MikroTik API
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('SNMP')}
                  className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium border transition-colors ${
                    formData.device_type === 'SNMP'
                      ? 'bg-cyan-600/20 border-cyan-500 text-cyan-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  SNMP
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300">Port</label>
              <Input
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                className="bg-slate-950 border-slate-800 text-xs mt-1"
              />
            </div>
          </div>

          {formData.device_type === 'MIKROTIK' ? (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div>
                <label className="text-xs font-medium text-slate-300">Username RouterOS</label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="admin"
                  className="bg-slate-900 border-slate-800 text-xs mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300">Password</label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Biarkan kosong jika tidak diubah"
                  className="bg-slate-900 border-slate-800 text-xs mt-1 placeholder:text-[11px] placeholder:text-slate-500"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div>
                <label className="text-xs font-medium text-slate-300">SNMP Community</label>
                <Input
                  value={formData.snmp_community}
                  onChange={(e) => setFormData({ ...formData, snmp_community: e.target.value })}
                  placeholder="public"
                  className="bg-slate-900 border-slate-800 text-xs mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300">SNMP Version</label>
                <select
                  value={formData.snmp_version}
                  onChange={(e) => setFormData({ ...formData, snmp_version: e.target.value })}
                  className="w-full mt-1 rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200"
                >
                  <option value="v2c">SNMP v2c</option>
                  <option value="v3">SNMP v3</option>
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300">Polling (Detik)</label>
              <Input
                type="number"
                value={formData.poll_interval}
                onChange={(e) => setFormData({ ...formData, poll_interval: Number(e.target.value) })}
                className="bg-slate-950 border-slate-800 text-xs mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300">Grup Perangkat</label>
              <Input
                value={formData.group}
                onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                className="bg-slate-950 border-slate-800 text-xs mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300">Lokasi Fisik</label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="bg-slate-950 border-slate-800 text-xs mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300">Status Monitoring</label>
            <select
              value={formData.is_enabled ? 'true' : 'false'}
              onChange={(e) => setFormData({ ...formData, is_enabled: e.target.value === 'true' })}
              className="w-full mt-1 rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200"
            >
              <option value="true">Aktif (Polling Rutin)</option>
              <option value="false">Nonaktif (Jeda Polling)</option>
            </select>
          </div>

          <DialogFooter className="mt-6 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-800 text-slate-400"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
