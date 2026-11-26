import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AppShell from './components/AppShell';
import DashboardPage from './pages/app/DashboardPage';
import EmployeeAttendancePage from './pages/app/EmployeeAttendancePage';
import StudentAttendancePage from './pages/app/StudentAttendancePage';
import EmployeeRecapPage from './pages/app/EmployeeRecapPage';
import StudentRecapPage from './pages/app/StudentRecapPage';
import StudentsMasterPage from './pages/app/StudentsMasterPage';
import UserManagementPage from './pages/app/UserManagementPage';
import type { UserRole } from './types';

function ProtectedAppRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center gap-3 text-sm text-slate-600">
        <Loader2 className="w-5 h-5 animate-spin text-red-600" />
        <span>Memverifikasi sesi pengguna...</span>
      </div>
    );
  }

  if (!session || !profile) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}) {
  const { profile } = useAuth();
  if (!profile || !allowedRoles.includes(profile.role)) {
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/app"
            element={
              <ProtectedAppRoute>
                <AppShell />
              </ProtectedAppRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="absensi-karyawan" element={<EmployeeAttendancePage />} />
            <Route
              path="absensi-siswa"
              element={
                <RoleGuard allowedRoles={['admin', 'guru']}>
                  <StudentAttendancePage />
                </RoleGuard>
              }
            />
            <Route
              path="rekap/karyawan"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <EmployeeRecapPage />
                </RoleGuard>
              }
            />
            <Route
              path="rekap/siswa"
              element={
                <RoleGuard allowedRoles={['admin', 'guru']}>
                  <StudentRecapPage />
                </RoleGuard>
              }
            />
            <Route
              path="data-siswa"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <StudentsMasterPage />
                </RoleGuard>
              }
            />
            <Route
              path="data-siswa/:kelas"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <StudentsMasterPage />
                </RoleGuard>
              }
            />
            <Route
              path="users"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <UserManagementPage />
                </RoleGuard>
              }
            />
            <Route
              path="users/:id"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <UserManagementPage />
                </RoleGuard>
              }
            />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
