import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BellOff, Clock, CheckCircle2, Play } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { deviceApi } from '@/services/deviceApi';
import { Device } from '@/types/device';
import { toast } from 'sonner';

interface SnoozeDeviceModalProps {
  device: Device | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESET_DURATIONS = [
  { label: '30 Menit', minutes: 30 },
  { label: '1 Jam', minutes: 60 },
  { label: '2 Jam', minutes: 120 },
  { label: '6 Jam', minutes: 360 },
  { label: '24 Jam', minutes: 1440 },
];

export const SnoozeDeviceModal: React.FC<SnoozeDeviceModalProps> = ({
  device,
  open,
  onOpenChange,
}) => {
  const queryClient = useQueryClient();
  const [selectedMinutes, setSelectedMinutes] = useState<number>(60);
  const [reason, setReason] = useState<string>('Maintenance Rutin / Perbaikan Gedung');

  const snoozeMutation = useMutation({
    mutationFn: () =>
      deviceApi.snoozeDevice(device!.id, {
        duration_minutes: selectedMinutes,
        reason: reason.trim() || 'Maintenance Window',
      }),
    onSuccess: () => {
      toast.success(`Mode Maintenance (Snooze) diaktifkan untuk ${device?.name}`);
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      if (device?.id) {
        queryClient.invalidateQueries({ queryKey: ['device', String(device.id)] });
      }
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Gagal mengatur Mode Maintenance perangkat');
    },
  });

  const unsnoozeMutation = useMutation({
    mutationFn: () => deviceApi.unsnoozeDevice(device!.id),
    onSuccess: () => {
      toast.success(`Mode Maintenance dinonaktifkan untuk ${device?.name}`);
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      if (device?.id) {
        queryClient.invalidateQueries({ queryKey: ['device', String(device.id)] });
      }
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Gagal menonaktifkan Mode Maintenance');
    },
  });

  if (!device) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border border-slate-800 text-slate-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <BellOff className="h-4 w-4" />
            </div>
            <div>
              <span>Mode Maintenance (Alert Snooze)</span>
              <p className="text-xs font-normal text-slate-400 mt-0.5">
                {device.name} ({device.host})
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {device.is_snoozed ? (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Status Snooze Aktif
                </span>
                {device.snooze_until && (
                  <span className="text-[11px] font-mono text-amber-400">
                    s/d {new Date(device.snooze_until).toLocaleString('id-ID')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                Alasan: <strong className="text-white">{device.snooze_reason || 'Maintenance Window'}</strong>
              </p>
              <Button
                type="button"
                onClick={() => unsnoozeMutation.mutate()}
                disabled={unsnoozeMutation.isPending}
                className="w-full mt-2 min-h-[44px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs"
              >
                <Play className="h-3.5 w-3.5 mr-1.5" /> Akhiri Snooze & Aktifkan Kembali Alert
              </Button>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label className="text-xs text-slate-300">Pilih Durasi Penangguhan Alert</Label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_DURATIONS.map((p) => (
                <button
                  key={p.minutes}
                  type="button"
                  onClick={() => setSelectedMinutes(p.minutes)}
                  className={`py-2 px-3 min-h-[44px] rounded-lg text-xs font-mono border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    selectedMinutes === p.minutes
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2 min-h-[44px]">
                <input
                  type="number"
                  min={5}
                  max={10080}
                  value={selectedMinutes}
                  onChange={(e) => setSelectedMinutes(Number(e.target.value) || 60)}
                  aria-label="Durasi snooze dalam menit"
                  className="w-full bg-transparent text-xs font-mono text-amber-400 focus:outline-none text-center"
                />
                <span className="text-[10px] text-slate-400 font-mono">mnt</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Catatan / Alasan Maintenance</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Pemadaman listrik gedung / upgrade firmware"
              className="min-h-[44px] bg-slate-950 border-slate-800 text-slate-200 text-xs"
            />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Selama periode ini, NOVA tetap mengumpulkan metrik perangkat namun menahan pengiriman notifikasi Telegram agar tidak memicu spam alert.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="min-h-[44px] bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800 text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => snoozeMutation.mutate()}
              disabled={snoozeMutation.isPending}
              className="min-h-[44px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              {snoozeMutation.isPending ? 'Menyimpan...' : `Aktifkan Snooze (${selectedMinutes} Menit)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
