import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useDevices } from '@/hooks/useDevices';
import { Device } from '@/types/device';

interface EditDeviceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: Device | null;
}

export const EditDeviceModal: React.FC<EditDeviceModalProps> = ({ open, onOpenChange, device }) => {
  const { updateDevice, isUpdating } = useDevices();

  const [formData, setFormData] = useState({
    name: '',
    host: '',
    device_type: 'MIKROTIK' as 'MIKROTIK' | 'SNMP',
    port: 8728,
    username: 'admin',
    password: '',
    snmp_community: '',
    snmp_version: '2c',
    poll_interval: 30,
    location: '',
    group: '',
    is_enabled: true,
  });

  useEffect(() => {
    if (device) {
      const dType = (device.device_type || device.type || 'MIKROTIK').toUpperCase() as 'MIKROTIK' | 'SNMP';
      setFormData({
        name: device.name || '',
        host: device.host || device.ip_address || '',
        device_type: dType === 'SNMP' ? 'SNMP' : 'MIKROTIK',
        port: device.port || (dType === 'SNMP' ? 161 : 8728),
        username: device.username || 'admin',
        password: '',
        snmp_community: '',
        snmp_version: device.snmp_version || '2c',
        poll_interval: device.poll_interval || 30,
        location: device.location || '',
        group: device.group || '',
        is_enabled: device.is_enabled !== false,
      });
    }
  }, [device]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!device) return;

    const payload: Record<string, any> = {
      name: formData.name,
      host: formData.host,
      device_type: formData.device_type,
      port: Number(formData.port),
      poll_interval: Number(formData.poll_interval),
      location: formData.location,
      group: formData.group,
      is_enabled: formData.is_enabled,
    };

    if (formData.device_type === 'MIKROTIK') {
      payload.username = formData.username;
      if (formData.password.trim() !== '') {
        payload.password = formData.password;
      }
    } else {
      payload.snmp_version = formData.snmp_version;
      if (formData.snmp_community.trim() !== '') {
        payload.snmp_community = formData.snmp_community.trim();
      }
    }

    await updateDevice({ id: device.id, data: payload });
    onOpenChange(false);
  };

  if (!device) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Perangkat Jaringan</DialogTitle>
          <DialogDescription className="text-slate-400">
            Perbarui parameter koneksi untuk <span className="text-cyan-400 font-semibold">{device.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nama Perangkat</Label>
              <Input
                placeholder="Core-Router-01"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="min-h-[44px] bg-slate-950 border-slate-800"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tipe Protokol</Label>
              <select
                value={formData.device_type}
                onChange={(e) => {
                  const type = e.target.value as 'MIKROTIK' | 'SNMP';
                  setFormData({
                    ...formData,
                    device_type: type,
                    port: type === 'MIKROTIK' ? 8728 : 161,
                  });
                }}
                className="flex min-h-[44px] w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                <option value="MIKROTIK">MikroTik RouterOS API</option>
                <option value="SNMP">SNMP v2c / v3</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Alamat IP / Host</Label>
              <Input
                placeholder="192.168.88.1"
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                className="min-h-[44px] bg-slate-950 border-slate-800 font-mono"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Port</Label>
              <Input
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                className="min-h-[44px] bg-slate-950 border-slate-800 font-mono"
                required
              />
            </div>
          </div>

          {formData.device_type === 'MIKROTIK' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username API</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="min-h-[44px] bg-slate-950 border-slate-800"
                />
              </div>
              <div className="space-y-2">
                <Label>Password API Baru (Opsional)</Label>
                <Input
                  type="password"
                  placeholder={device.has_password ? 'Kosongkan jika tidak diubah' : 'Masukkan password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="min-h-[44px] bg-slate-950 border-slate-800"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SNMP Community Baru (Opsional)</Label>
                <Input
                  type="password"
                  placeholder={device.has_snmp_community ? 'Tersimpan terenkripsi (kosongkan jika tetap)' : 'public'}
                  value={formData.snmp_community}
                  onChange={(e) => setFormData({ ...formData, snmp_community: e.target.value })}
                  className="min-h-[44px] bg-slate-950 border-slate-800 font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>Interval Polling (detik)</Label>
                <Input
                  type="number"
                  value={formData.poll_interval}
                  onChange={(e) => setFormData({ ...formData, poll_interval: Number(e.target.value) })}
                  className="min-h-[44px] bg-slate-950 border-slate-800 font-mono"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lokasi / Rak</Label>
              <Input
                placeholder="Data Center Rak A"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="min-h-[44px] bg-slate-950 border-slate-800"
              />
            </div>
            <div className="space-y-2">
              <Label>Status Pemantauan</Label>
              <select
                value={formData.is_enabled ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, is_enabled: e.target.value === 'true' })}
                className="flex min-h-[44px] w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                <option value="true">Aktif (Polling Berjalan)</option>
                <option value="false">Nonaktif (Dihentikan Sementara)</option>
              </select>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="min-h-[44px] text-slate-400">
              Batal
            </Button>
            <Button type="submit" disabled={isUpdating} className="min-h-[44px] bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold">
              {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
