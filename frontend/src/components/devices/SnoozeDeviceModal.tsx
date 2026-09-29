import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { deviceApi } from '@/services/deviceApi';
import { toast } from 'sonner';
import { BellOff, Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Device } from '@/types/device';
import { useQueryClient } from '@tanstack/react-query';

interface SnoozeDeviceModalProps {
  device: Device | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const PRESET_DURATIONS = [
  { label: '30 Menit', value: 30 },
  { label: '1 Jam', value: 60 },
  { label: '2 Jam', value: 120 },
  { label: '4 Jam', value: 240 },
  { label: '8 Jam', value: 480 },
  { label: '24 Jam', value: 1440 },
];

const PRESET_REASONS = [
  'Pemeliharaan Terjadwal (Scheduled Maintenance)',
  'Perbaikan Jalur / Sambungan Fiber Optic',
  'Penggantian Hardware / Modul SFP',
  'Upgrade Firmware / RouterOS',
  'Investigasi & Troubleshooting Jaringan',
];

export default function SnoozeDeviceModal({ device, open, onOpenChange, onSuccess }: SnoozeDeviceModalProps) {
  const queryClient = useQueryClient();
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customMinutes, setCustomMinutes] = useState<number>(90);
  const [reason, setReason] = useState<string>(PRESET_REASONS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!device) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const duration = isCustomDuration ? Number(customMinutes) : selectedDuration;
    if (!duration || duration <= 0) {
      toast.error('Durasi snooze harus lebih dari 0 menit.');
      setIsSubmitting(false);
      return;
    }

    try {
      await deviceApi.snoozeDevice(device.id, {
        duration_minutes: duration,
        reason: reason.trim() || 'Pemeliharaan Terjadwal',
      });

      toast.success(`Mode maintenance diaktifkan untuk ${device.name} selama ${duration} menit.`);
      queryClient.invalidateQueries({ queryKey: ['device', String(device.id)] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Gagal mengaktifkan mode maintenance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100 p-6">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <BellOff className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-100">
                Mode Maintenance (Snooze Alert)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Hentikan evaluasi alert sementara tanpa memutus logging telemetri ke InfluxDB
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Target Device Info */}
          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Perangkat:</span>
              <span className="font-semibold text-slate-200">{device.name}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-slate-400">Host / IP:</span>
              <span className="font-mono text-cyan-400">{device.host || device.ip_address}</span>
            </div>
          </div>

          {/* Duration Presets */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-cyan-400" />
              Pilih Durasi Jeda
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_DURATIONS.map((preset) => {
                const isSelected = !isCustomDuration && selectedDuration === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      setIsCustomDuration(false);
                      setSelectedDuration(preset.value);
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                        : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsCustomDuration(!isCustomDuration)}
              className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2 pt-1 block"
            >
              {isCustomDuration ? '← Kembali ke durasi preset' : 'Atur durasi kustom (menit)...'}
            </button>

            {isCustomDuration && (
              <div className="pt-1">
                <label className="text-[11px] text-slate-400">Durasi Kustom (Menit):</label>
                <Input
                  type="number"
                  min="1"
                  max="43200"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(Number(e.target.value))}
                  className="mt-1 bg-slate-950 border-slate-800 text-xs font-mono text-slate-200"
                  placeholder="Contoh: 90"
                  required
                />
              </div>
            )}
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
              Alasan Maintenance
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              {PRESET_REASONS.map((r) => (
                <option key={r} value={r} className="bg-slate-900 text-slate-200">
                  {r}
                </option>
              ))}
              <option value="custom" className="bg-slate-900 text-slate-200">
                Alasan lainnya (Ketik manual)...
              </option>
            </select>

            {reason === 'custom' && (
              <Input
                type="text"
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tuliskan alasan pemeliharaan spesifik..."
                className="mt-2 bg-slate-950 border-slate-800 text-xs text-slate-200"
                required
              />
            )}
          </div>

          {/* Note */}
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-300/90 leading-relaxed">
            Peringatan: Selama mode maintenance aktif, perangkat tidak akan memicu notifikasi Telegram atau alert baru. Setelah durasi berakhir, sistem otomatis kembali ke mode pengawasan penuh.
          </div>

          <DialogFooter className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-800 bg-slate-950 text-slate-300 hover:text-white text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow-md shadow-amber-600/20"
            >
              <BellOff className="h-3.5 w-3.5 mr-1.5" />
              {isSubmitting ? 'Mengaktifkan...' : 'Aktifkan Maintenance'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
