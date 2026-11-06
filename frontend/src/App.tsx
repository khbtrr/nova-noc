import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DevicesPage } from '@/pages/DevicesPage';
import { DeviceDetailPage } from '@/pages/DeviceDetailPage';
import { AlertsPage } from '@/pages/AlertsPage';
import { AIAssistantPage } from '@/pages/AIAssistantPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { TopologyPage } from '@/pages/TopologyPage';
import { SyslogPage } from '@/pages/SyslogPage';
import { TrafficFlowPage } from '@/pages/TrafficFlowPage';
import { useAuthStore } from '@/stores/authStore';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="devices" element={<DevicesPage />} />
        <Route path="devices/:id" element={<DeviceDetailPage />} />
        <Route path="topology" element={<TopologyPage />} />
        <Route path="flow" element={<TrafficFlowPage />} />
        <Route path="syslog" element={<SyslogPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="ai" element={<AIAssistantPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
