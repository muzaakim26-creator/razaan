import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/supabase';
import {
  EMPLOYEE_STATUS_META,
  ROLE_LABELS,
  formatJamWib,
  formatTanggalIndonesia,
} from '../../lib/constants';
import type { DashboardSummary } from '../../types';

export default function DashboardPage() {
  const { session, profile } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!session?.access_token) return;
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<DashboardSummary>(
          '/api/dashboard/summary',
          session.access_token
        );
        if (active) setSummary(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Gagal memuat dashboard.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [session?.access_token]);

  if (!profile) return null;

  return (
    <div className="space-y-8">
      {/* Greeting Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-red-600 mb-1">
            {summary?.todayDate ? formatTanggalIndonesia(summary.todayDate) : 'Hari Ini'}
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Selamat datang, {profile.full_name}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Peran aktif: {ROLE_LABELS[profile.role]}
            {profile.jabatan ? ` · ${profile.jabatan}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            to="/app/absensi-karyawan"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
          >
            <span>Absensi Karyawan</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          {(profile.role === 'admin' || profile.role === 'guru') && (
            <Link
              to="/app/absensi-siswa"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <span>Absensi Siswa</span>
            </Link>
          )}
        </div>
      </div>

      {loading && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 flex items-center justify-center gap-3 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin text-red-600" />
          <span>Memuat ringkasan kehadiran...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {!loading && summary && (
        <>
          {/* Personal Attendance Status + Monthly Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">
                  Status Kehadiran Anda Hari Ini
                </p>
                {summary.myAttendanceToday ? (
                  <div className="mt-2">
                    <p
                      className={`text-2xl font-bold ${
                        EMPLOYEE_STATUS_META[summary.myAttendanceToday.status].textClass
                      }`}
                    >
                      {EMPLOYEE_STATUS_META[summary.myAttendanceToday.status].label}
                    </p>
                    <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Jam Masuk</p>
                        <p className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                          {formatJamWib(summary.myAttendanceToday.check_in_at)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Jam Pulang</p>
                        <p className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                          {summary.myAttendanceToday.check_out_at
                            ? formatJamWib(summary.myAttendanceToday.check_out_at)
                            : 'Belum absen pulang'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <p className="text-xl font-bold text-slate-900">Belum Absen Masuk</p>
                    <p className="text-sm text-slate-600 mt-1">
                      Silakan lakukan presensi mandiri melalui menu Absensi Karyawan.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100">
                <Link
                  to="/app/absensi-karyawan"
                  className="text-sm font-semibold text-red-600 hover:text-red-700 inline-flex items-center gap-1.5"
                >
                  <span>
                    {summary.myAttendanceToday
                      ? 'Lihat detail & absen pulang'
                      : 'Catat kehadiran sekarang'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
              <p className="text-xs font-medium text-slate-500 mb-4">
                Rekap Kehadiran Pribadi Bulan Berjalan
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-neutral-50 border border-slate-200">
                  <p className="text-xs text-slate-500">Hadir</p>
                  <p className="text-3xl font-bold text-emerald-700 tabular-nums mt-1">
                    {summary.myMonthStats.hadir}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Hari kerja</p>
                </div>
                <div className="p-4 rounded-lg bg-neutral-50 border border-slate-200">
                  <p className="text-xs text-slate-500">Izin</p>
                  <p className="text-3xl font-bold text-amber-700 tabular-nums mt-1">
                    {summary.myMonthStats.izin}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Hari kerja</p>
                </div>
                <div className="p-4 rounded-lg bg-neutral-50 border border-slate-200">
                  <p className="text-xs text-slate-500">Sakit</p>
                  <p className="text-3xl font-bold text-sky-700 tabular-nums mt-1">
                    {summary.myMonthStats.sakit}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Hari kerja</p>
                </div>
              </div>
            </div>
          </div>

          {/* Admin: Employee Overview */}
          {profile.role === 'admin' && summary.employeeTodayStats && (
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Kehadiran Karyawan Hari Ini
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mencakup Admin, Guru, dan Tenaga Kependidikan
                  </p>
                </div>
                <Link
                  to="/app/rekap/karyawan"
                  className="text-xs font-semibold text-red-600 hover:text-red-700 whitespace-nowrap"
                >
                  Buka Rekap Karyawan
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="p-4 rounded-lg bg-neutral-50 border border-slate-200">
                  <p className="text-xs text-slate-500">Total Karyawan</p>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
                    {summary.employeeTodayStats.totalEmployees}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-neutral-50 border border-slate-200">
                  <p className="text-xs text-slate-500">Hadir</p>
                  <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-1">
                    {summary.employeeTodayStats.hadir}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-neutral-50 border border-slate-200">
                  <p className="text-xs text-slate-500">Izin</p>
                  <p className="text-2xl font-bold text-amber-700 tabular-nums mt-1">
                    {summary.employeeTodayStats.izin}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-neutral-50 border border-slate-200">
                  <p className="text-xs text-slate-500">Sakit</p>
                  <p className="text-2xl font-bold text-sky-700 tabular-nums mt-1">
                    {summary.employeeTodayStats.sakit}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-neutral-50 border border-slate-200">
                  <p className="text-xs text-slate-500">Belum Absen</p>
                  <p className="text-2xl font-bold text-red-600 tabular-nums mt-1">
                    {summary.employeeTodayStats.belumAbsen}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Admin & Guru: Student Attendance Overview */}
          {(profile.role === 'admin' || profile.role === 'guru') &&
            summary.studentTodayStats && (
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Presensi Siswa Hari Ini
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Akumulasi presensi siswa aktif di seluruh kelas
                    </p>
                  </div>
                  <Link
                    to="/app/rekap/siswa"
                    className="text-xs font-semibold text-red-600 hover:text-red-700 whitespace-nowrap"
                  >
                    Buka Rekap Siswa
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="p-4 rounded-lg bg-neutral-50 border border-slate-200">
                    <p className="text-xs text-slate-500">Siswa Aktif</p>
                    <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
                      {summary.studentTodayStats.totalStudents}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-neutral-50 border border-slate-200">
                    <p className="text-xs text-slate-500">Hadir</p>
                    <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-1">
                      {summary.studentTodayStats.hadir}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-neutral-50 border border-slate-200">
                    <p className="text-xs text-slate-500">Sakit</p>
                    <p className="text-2xl font-bold text-sky-700 tabular-nums mt-1">
                      {summary.studentTodayStats.sakit}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-neutral-50 border border-slate-200">
                    <p className="text-xs text-slate-500">Izin</p>
                    <p className="text-2xl font-bold text-amber-700 tabular-nums mt-1">
                      {summary.studentTodayStats.izin}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-neutral-50 border border-slate-200">
                    <p className="text-xs text-slate-500">Alpha</p>
                    <p className="text-2xl font-bold text-red-600 tabular-nums mt-1">
                      {summary.studentTodayStats.alpha}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-neutral-50 border border-slate-200">
                    <p className="text-xs text-slate-500">Belum Diabsen</p>
                    <p className="text-2xl font-bold text-slate-700 tabular-nums mt-1">
                      {summary.studentTodayStats.belumDiabsen}
                    </p>
                  </div>
                </div>
              </div>
            )}

          {/* Admin: Recent Employee Activity Table */}
          {profile.role === 'admin' &&
            summary.recentEmployeeActivity &&
            summary.recentEmployeeActivity.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">
                    Absensi Karyawan Terbaru Hari Ini
                  </h3>
                  <Link
                    to="/app/rekap/karyawan"
                    className="text-xs font-semibold text-red-600 hover:text-red-700"
                  >
                    Lihat Semua
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <tr>
                        <th className="px-6 py-3">Nama Karyawan</th>
                        <th className="px-6 py-3">Peran</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Jam Masuk</th>
                        <th className="px-6 py-3 text-right">Jam Pulang</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summary.recentEmployeeActivity.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/70">
                          <td className="px-6 py-3 font-medium text-slate-900">
                            {item.profiles?.full_name || '-'}
                          </td>
                          <td className="px-6 py-3 text-slate-600">
                            {item.profiles?.role ? ROLE_LABELS[item.profiles.role] : '-'}
                          </td>
                          <td
                            className={`px-6 py-3 font-semibold ${
                              EMPLOYEE_STATUS_META[item.status].textClass
                            }`}
                          >
                            {EMPLOYEE_STATUS_META[item.status].label}
                          </td>
                          <td className="px-6 py-3 text-right font-mono tabular-nums text-slate-700">
                            {formatJamWib(item.check_in_at)}
                          </td>
                          <td className="px-6 py-3 text-right font-mono tabular-nums text-slate-700">
                            {item.check_out_at ? formatJamWib(item.check_out_at) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </>
      )}
    </div>
  );
}
