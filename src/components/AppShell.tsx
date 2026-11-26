import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../lib/constants';

export default function AppShell() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [rekapOpen, setRekapOpen] = useState(() => location.pathname.startsWith('/app/rekap'));
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
    if (location.pathname.startsWith('/app/rekap')) {
      setRekapOpen(true);
    }
  }, [location.pathname]);

  if (!profile) {
    return null;
  }

  const role = profile.role;
  const isAdmin = role === 'admin';
  const isGuru = role === 'guru';

  function getPageTitle(): string {
    const p = location.pathname;
    if (p === '/app' || p === '/app/') return 'Dashboard';
    if (p.startsWith('/app/absensi-karyawan')) return 'Absensi Karyawan';
    if (p.startsWith('/app/absensi-siswa')) return 'Absensi Siswa';
    if (p.startsWith('/app/rekap/karyawan')) return 'Rekap Absensi Karyawan';
    if (p.startsWith('/app/rekap/siswa')) return 'Rekap Absensi Siswa';
    if (p.startsWith('/app/data-siswa')) return 'Data Siswa';
    if (p.startsWith('/app/users')) return 'User Management';
    return 'Dashboard';
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap ${
      isActive
        ? 'bg-red-600 text-white font-semibold'
        : 'text-slate-700 hover:bg-red-50/70 hover:text-red-700 font-medium'
    }`;

  const subLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block pl-10 pr-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${
      isActive
        ? 'bg-red-50 text-red-700 font-semibold'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
    }`;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Brand Block */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 shrink-0">
        <Link to="/" className="min-w-0">
          <p className="text-base font-bold tracking-tight text-slate-900 truncate">
            SMK Prima Unggul
          </p>
          <p className="text-xs text-red-600 font-medium truncate">
            Sistem Absensi Sekolah
          </p>
        </Link>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Tutup menu"
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <NavLink to="/app" end className={navLinkClass}>
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/app/absensi-karyawan" className={navLinkClass}>
          <UserCheck className="w-4 h-4 shrink-0" />
          <span>Absensi Karyawan</span>
        </NavLink>

        {(isAdmin || isGuru) && (
          <NavLink to="/app/absensi-siswa" className={navLinkClass}>
            <ClipboardCheck className="w-4 h-4 shrink-0" />
            <span>Absensi Siswa</span>
          </NavLink>
        )}

        {(isAdmin || isGuru) && (
          <div>
            <button
              type="button"
              onClick={() => setRekapOpen((prev) => !prev)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                location.pathname.startsWith('/app/rekap')
                  ? 'text-red-700 bg-red-50/50 font-semibold'
                  : 'text-slate-700 hover:bg-red-50/70 hover:text-red-700'
              }`}
            >
              <span className="flex items-center gap-3">
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span>Rekap Absensi</span>
              </span>
              {rekapOpen ? (
                <ChevronDown className="w-4 h-4 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 shrink-0" />
              )}
            </button>

            {rekapOpen && (
              <div className="mt-1 space-y-1">
                {isAdmin && (
                  <NavLink to="/app/rekap/karyawan" className={subLinkClass}>
                    Absensi Karyawan
                  </NavLink>
                )}
                <NavLink to="/app/rekap/siswa" className={subLinkClass}>
                  Absensi Siswa
                </NavLink>
              </div>
            )}
          </div>
        )}

        {isAdmin && (
          <NavLink to="/app/data-siswa" className={navLinkClass}>
            <GraduationCap className="w-4 h-4 shrink-0" />
            <span>Data Siswa</span>
          </NavLink>
        )}

        {isAdmin && (
          <NavLink to="/app/users" className={navLinkClass}>
            <Users className="w-4 h-4 shrink-0" />
            <span>User Management</span>
          </NavLink>
        )}
      </nav>

      {/* Bottom User Identity Summary */}
      <div className="p-4 border-t border-slate-200 bg-neutral-50/70">
        <p className="text-sm font-semibold text-slate-900 truncate">{profile.full_name}</p>
        <p className="text-xs text-slate-500 mt-0.5 truncate">
          {ROLE_LABELS[profile.role]}
          {profile.nip ? ` · ${profile.nip}` : ''}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Desktop Left Sidebar (260px) */}
      <aside className="hidden lg:block w-[260px] shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10">{sidebarContent}</div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header Bar with Logout on Top-Right */}
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu samping"
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-red-600 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline text-slate-400">SMK Prima Unggul</span>
              <span className="hidden sm:inline text-slate-300">/</span>
              <h1 className="font-semibold text-slate-900 truncate">{getPageTitle()}</h1>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-slate-900 leading-tight">
                {profile.full_name}
              </p>
              <p className="text-xs text-slate-500 leading-tight mt-0.5">
                {ROLE_LABELS[profile.role]}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span>{loggingOut ? 'Keluar...' : 'Logout'}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
