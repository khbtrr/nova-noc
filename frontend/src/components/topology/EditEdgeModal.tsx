import React, { useState, useEffect } from 'react';
import { Edge } from '@xyflow/react';
import { X, Cable, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditEdgeModalProps {
  open: boolean;
  edge: Edge | null;
  onClose: () => void;
  onSave: (edgeId: string, updated: { label: string; stroke: string; strokeWidth: number; animated: boolean }) => void;
  onDelete: (edgeId: string) => void;
}

const COLOR_PRESETS = [
  { label: '10G SFP+ Fiber (Cyan)', value: '#06b6d4', width: 2.5, animated: true },
  { label: '1G Trunk / Copper (Sky)', value: '#38bdf8', width: 1.5, animated: false },
  { label: 'PoE / Access Link (Emerald)', value: '#10b981', width: 1.5, animated: false },
  { label: 'Backup / Tunnel (Amber)', value: '#eab308', width: 1.5, animated: false },
];

export const EditEdgeModal: React.FC<EditEdgeModalProps> = ({
  open,
  edge,
  onClose,
  onSave,
  onDelete,
}) => {
  const [label, setLabel] = useState('');
  const [stroke, setStroke] = useState('#38bdf8');
  const [strokeWidth, setStrokeWidth] = useState(1.5);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (edge) {
      setLabel(typeof edge.label === 'string' ? edge.label : '');
      setStroke((edge.style?.stroke as string) || '#38bdf8');
      setStrokeWidth(Number(edge.style?.strokeWidth) || 1.5);
      setAnimated(Boolean(edge.animated));
    }
  }, [edge]);

  if (!open || !edge) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(edge.id, {
      label: label.trim(),
      stroke,
      strokeWidth,
      animated,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Cable className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Edit Kabel / Koneksi Link</h3>
              <p className="text-xs text-slate-400 font-mono truncate max-w-[260px]">
                {edge.source} ke {edge.target}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Nama Interface / Keterangan Kabel
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Contoh: sfp-sfpplus1 (10G Fiber)"
              className="w-full min-h-[44px] px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-2">
              Tipe & Warna Jalur Koneksi
            </label>
            <div className="space-y-1.5">
              {COLOR_PRESETS.map((preset) => {
                const isSelected = stroke.toLowerCase() === preset.value.toLowerCase();
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      setStroke(preset.value);
                      setStrokeWidth(preset.width);
                      setAnimated(preset.animated);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 min-h-[44px] rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                      isSelected
                        ? 'border-cyan-500/50 bg-slate-800 text-slate-100'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-3 w-6 rounded-full"
                        style={{ backgroundColor: preset.value }}
                      />
                      <span className="font-medium">{preset.label}</span>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div>
              <div className="font-semibold text-slate-200">Animasi Aliran Paket</div>
              <div className="text-[11px] text-slate-400">Tampilkan garis putus-putus bergerak</div>
            </div>
            <input
              type="checkbox"
              checked={animated}
              onChange={(e) => setAnimated(e.target.checked)}
              aria-label="Animasi aliran paket"
              className="h-5 w-5 accent-cyan-500 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onDelete(edge.id);
                onClose();
              }}
              className="min-h-[44px] border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Hapus Garis Ini
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="min-h-[44px] border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="min-h-[44px] bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold"
              >
                Simpan
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
