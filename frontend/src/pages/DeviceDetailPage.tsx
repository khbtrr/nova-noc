import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DeviceDetail } from '@/components/devices/DeviceDetail';
import { useDevice } from '@/hooks/useDevices';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export const DeviceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: device, isLoading, isError, refetch } = useDevice(id || '');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 rounded-lg bg-slate-800 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-900 border border-slate-800 animate-pulse" />
          ))}
        </div>
        <div className="h-80 rounded-xl bg-slate-900 border border-slate-800 animate-pulse" />
      </div>
    );
  }

  if (isError || !device) {
    return (
      <Card className="bg-slate-900 border-rose-500/30">
        <CardContent className="py-12 px-6 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-rose-400 mx-auto" />
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-100">Perangkat Tidak Ditemukan</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Gagal memuat informasi perangkat ID #{id}. Perangkat mungkin telah dihapus atau koneksi ke server terputus.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/devices')}
              className="min-h-[44px] border-slate-800 bg-slate-950 text-slate-300"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Kembali ke Inventaris
            </Button>
            <Button
              onClick={() => refetch()}
              className="min-h-[44px] bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" /> Coba Lagi
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <DeviceDetail device={device} />;
};

export default DeviceDetailPage;
