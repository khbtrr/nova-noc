import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDevices } from '@/hooks/useDevices';
import { toast } from 'sonner';
import { Network, CheckCircle2, AlertCircle } from 'lucide-react';

interface AddDeviceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddDeviceModal({ open, onOpenChange }: AddDeviceModalProps) {
  const { createDevice } = useDevices();
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
  });

  const handleTypeChange = (type: 'MIKROTIK' | 'SNMP') => {
    setFormData((prev) => ({
      ...prev,
      device_type: type,
      port: type === 'MIKROTIK' ? 8728 : 161,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.host) {
      toast.error('Mohon lengkapi nama dan IP/Host perangkat.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createDevice(formData);
      toast.success(`Perangkat ${formData.name} berhasil ditambahkan ke monitoring.`);
      onOpenChange(false);
      setFormData({
        name: '',
        host: '',
        device_type: 'MIKROTIK',
        port: 8728,
        username: 'admin',
        password: '',
        snmp_community: 'public',
        snmp_version: 'v2c',
        poll_interval: 30,
        group: 'Core Infrastructure',
        location: 'Server Room',
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Gagal menyimpan perangkat.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] border-slate-800 bg-slate-900 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base text-slate-100">
            <Network className="h-5 w-5 text-cyan-400" />
            Tambah Perangkat Monitoring Baru
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Integrasikan router MikroTik via RouterOS API atau perangkat jaringan via SNMP.
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
                  placeholder="••••••••"
                  className="bg-slate-900 border-slate-800 text-xs mt-1"
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
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan & Mulai Monitoring'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
