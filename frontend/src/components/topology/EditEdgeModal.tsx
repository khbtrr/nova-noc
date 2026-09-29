import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Network, Trash2, X, Cable, Zap } from 'lucide-react';

export interface EdgeModalData {
  id?: string;
  source: string;
  target: string;
  sourceLabel?: string;
  targetLabel?: string;
  label?: string;
  mediaType?: 'fiber' | 'ethernet' | 'wan' | 'wireless';
  animated?: boolean;
  isNew?: boolean;
}

interface EditEdgeModalProps {
  isOpen: boolean;
  data: EdgeModalData | null;
  onClose: () => void;
  onSave: (edgeData: {
    id?: string;
    source: string;
    target: string;
    label: string;
    mediaType: 'fiber' | 'ethernet' | 'wan' | 'wireless';
    animated: boolean;
    style: Record<string, any>;
  }) => void;
  onDelete?: (edgeId: string) => void;
}

export const EditEdgeModal: React.FC<EditEdgeModalProps> = ({
  isOpen,
  data,
  onClose,
  onSave,
  onDelete,
}) => {
  const [label, setLabel] = useState('');
  const [mediaType, setMediaType] = useState<'fiber' | 'ethernet' | 'wan' | 'wireless'>('ethernet');
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (data) {
      setLabel(data.label || '');
      setMediaType(data.mediaType || 'ethernet');
      setAnimated(Boolean(data.animated));
    }
  }, [data]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  const getStyleForMedia = (type: 'fiber' | 'ethernet' | 'wan' | 'wireless') => {
    switch (type) {
      case 'fiber':
        return { stroke: '#06b6d4', strokeWidth: 2 };
      case 'wan':
        return { stroke: '#10b981', strokeWidth: 2 };
      case 'wireless':
        return { stroke: '#a855f7', strokeWidth: 1.5 };
      case 'ethernet':
      default:
        return { stroke: '#38bdf8', strokeWidth: 1.5 };
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: data.id,
      source: data.source,
      target: data.target,
      label: label.trim(),
      mediaType,
      animated,
      style: getStyleForMedia(mediaType),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900 text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Cable className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                {data.isNew ? 'Hubungkan Perangkat Baru' : 'Sesuaikan Sambungan Kabel'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Konfigurasi kabel fisik antar perangkat jaringan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleFormSubmit} className="p-5 space-y-4 text-xs">
          {/* Endpoint Connection Banner */}
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 flex items-center justify-between gap-3 text-slate-300">
            <div className="flex-1 truncate">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Sumber (Parent)</div>
              <div className="text-xs font-semibold text-cyan-300 truncate" title={data.sourceLabel || data.source}>
                {data.sourceLabel || data.source}
              </div>
            </div>
            <div className="text-slate-500">→</div>
            <div className="flex-1 truncate text-right">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Tujuan (Child)</div>
              <div className="text-xs font-semibold text-sky-300 truncate" title={data.targetLabel || data.target}>
                {data.targetLabel || data.target}
              </div>
            </div>
          </div>

          {/* Label / Port Input */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
              Label Port / Keterangan Link
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Contoh: Port 24 (UTP Cat6), SFP+ 10G Trunk, PoE..."
              className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Media Type Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
              Tipe Media & Warna Kabel
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMediaType('fiber')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors ${
                  mediaType === 'fiber'
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400"></span>
                <div>
                  <div className="font-semibold text-slate-200">Fiber Optic 10G</div>
                  <div className="text-[10px] text-slate-400">Cyan Glow (Trunk SFP+)</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMediaType('ethernet')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors ${
                  mediaType === 'ethernet'
                    ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-sky-400"></span>
                <div>
                  <div className="font-semibold text-slate-200">Ethernet 1G UTP</div>
                  <div className="text-[10px] text-slate-400">Sky Blue (Switch Distribution)</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMediaType('wan')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors ${
                  mediaType === 'wan'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                <div>
                  <div className="font-semibold text-slate-200">WAN Uplink</div>
                  <div className="text-[10px] text-slate-400">Emerald (JLM / ION ISP)</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMediaType('wireless')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors ${
                  mediaType === 'wireless'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-300'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-purple-400"></span>
                <div>
                  <div className="font-semibold text-slate-200">Wireless / AP Link</div>
                  <div className="text-[10px] text-slate-400">Purple (Access Point)</div>
                </div>
              </button>
            </div>
          </div>

          {/* Animated Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-cyan-400" />
              <div>
                <div className="font-semibold text-slate-200">Animasi Aliran Trafik</div>
                <div className="text-[10px] text-slate-400">Tampilkan titik bergerak di kabel</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={animated}
              onChange={(e) => setAnimated(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-600 focus:ring-cyan-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800">
            {data.id && onDelete ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => onDelete(data.id!)}
                className="bg-rose-950 text-rose-300 hover:bg-rose-900 border border-rose-800 text-xs flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus Kabel
              </Button>
            ) : (
              <div></div>
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium"
              >
                {data.isNew ? 'Pasang Sambungan' : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
};
