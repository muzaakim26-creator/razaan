import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Loader2, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/supabase';
import {
  EMPLOYEE_STATUS_META,
  ROLE_LABELS,
  downloadCsv,
  formatJamWib,
  formatTanggalSingkat,
  getMonthStartWib,
  getTodayWib,
} from '../../lib/constants';
import type {
  EmployeeAttendanceRecord,
  EmployeeAttendanceStatus,
  UserRole,
} from '../../types';

interface EmployeeRecapResponse {
  records: EmployeeAttendanceRecord[];
  startDate: string;
  endDate: string;
}

export default function EmployeeRecapPage() {
  const { session } = useAuth();

  const [startDate, setStartDate] = useState(getMonthStartWib);
  const [endDate, setEndDate] = useState(getTodayWib);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'log' | 'summary'>('log');

  const [records, setRecords] = useState<EmployeeAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecap = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (role) params.set('role', role);
      if (status) params.set('status', status);
      if (search.trim()) params.set('search', search.trim());

      const res = await apiFetch<EmployeeRecapResponse>(
        `/api/attendance/employees/recap?${params.toString()}`,
        session.access_token
      );
      setRecords(res.records);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal memuat rekap absensi karyawan.'
      );
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, startDate, endDate, role, status, search]);

  useEffect(() => {
    loadRecap();
  }, [loadRecap]);

  const summary = useMemo(() => {
    const counts = { total: records.length, hadir: 0, izin: 0, sakit: 0 };
    for (const r of records) {
      counts[r.status] += 1;
    }
    return counts;
  }, [records]);

  const employeeAggregates = useMemo(() => {
    const map = new Map<
      string,
      {
        user_id: string;
        full_name: string;
        nip: string;
        role: UserRole | null;
        hadir: number;
        izin: number;
        sakit: number;
        total: number;
      }
    >();

    for (const r of records) {
      const existing = map.get(r.user_id) || {
        user_id: r.user_id,
        full_name: r.profiles?.full_name || '-',
        nip: r.profiles?.nip || '-',
        role: r.profiles?.role || null,
        hadir: 0,
        izin: 0,
        sakit: 0,
        total: 0,
      };
      existing[r.status] += 1;
      existing.total += 1;
      map.set(r.user_id, existing);
    }

    return Array.from(map.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [records]);

  function handleExportCsv() {
    if (viewMode === 'summary') {
      downloadCsv(
        `ringkasan-absensi-karyawan-${startDate}-sd-${endDate}.csv`,
        ['Nama Karyawan', 'NIP', 'Peran', 'Hadir', 'Izin', 'Sakit', 'Total Hari'],
        employeeAggregates.map((a) => [
          a.full_name,
          a.nip,
          a.role ? ROLE_LABELS[a.role] : '-',
          a.hadir,
          a.izin,
          a.sakit,
          a.total,
        ])
      );
      return;
    }
    downloadCsv(
      `rekap-absensi-karyawan-${startDate}-sd-${endDate}.csv`,
      ['Tanggal', 'Nama Karyawan', 'NIP', 'Peran', 'Status', 'Jam Masuk', 'Jam Pulang', 'Catatan'],
      records.map((r) => [
        r.tanggal,
        r.profiles?.full_name || '-',
        r.profiles?.nip || '-',
        r.profiles?.role ? ROLE_LABELS[r.profiles.role] : '-',
        EMPLOYEE_STATUS_META[r.status].label,
        formatJamWib(r.check_in_at),
        r.check_out_at ? formatJamWib(r.check_out_at) : '-',
        r.catatan || '-',
      ])
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Rekap Absensi Karyawan</h2>
          <p className="text-sm text-slate-600 mt-1">
            Pemantauan kehadiran seluruh Admin, Guru, dan Tenaga Kependidikan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('log')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                viewMode === 'log'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Log Harian
            </button>
            <button
              type="button"
              onClick={() => setViewMode('summary')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                viewMode === 'summary'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ringkasan per Karyawan
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={records.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label htmlFor="rec-emp-start" className="block text-xs font-medium text-slate-600 mb-1">
            Dari Tanggal
          </label>
          <input
            id="rec-emp-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
          />
        </div>

        <div>
          <label htmlFor="rec-emp-end" className="block text-xs font-medium text-slate-600 mb-1">
            Sampai Tanggal
          </label>
          <input
            id="rec-emp-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
          />
        </div>

        <div>
          <label htmlFor="rec-emp-role" className="block text-xs font-medium text-slate-600 mb-1">
            Peran
          </label>
          <select
            id="rec-emp-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
          >
            <option value="">Semua Peran</option>
            {(['admin', 'guru', 'tenaga_kependidikan'] as UserRole[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="rec-emp-status" className="block text-xs font-medium text-slate-600 mb-1">
            Status
          </label>
          <select
            id="rec-emp-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
          >
            <option value="">Semua Status</option>
            {(['hadir', 'izin', 'sakit'] as EmployeeAttendanceStatus[]).map((st) => (
              <option key={st} value={st}>
                {EMPLOYEE_STATUS_META[st].label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="rec-emp-search" className="block text-xs font-medium text-slate-600 mb-1">
            Cari Karyawan
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="rec-emp-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nama, email, atau NIP..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
            />
          </div>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
          <p className="text-xs text-slate-500">Total Catatan</p>
          <p className="text-xl font-bold text-slate-900 tabular-nums">{summary.total}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
          <p className="text-xs text-slate-500">Hadir</p>
          <p className="text-xl font-bold text-emerald-700 tabular-nums">{summary.hadir}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
          <p className="text-xs text-slate-500">Izin</p>
          <p className="text-xl font-bold text-amber-700 tabular-nums">{summary.izin}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
          <p className="text-xs text-slate-500">Sakit</p>
          <p className="text-xl font-bold text-sky-700 tabular-nums">{summary.sakit}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center gap-3 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-red-600" />
            <span>Memuat rekap absensi karyawan...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Tidak ada data absensi karyawan untuk filter yang dipilih.
          </div>
        ) : viewMode === 'summary' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Nama Karyawan</th>
                  <th className="px-4 py-3">NIP</th>
                  <th className="px-4 py-3">Peran</th>
                  <th className="px-4 py-3 text-right">Hadir</th>
                  <th className="px-4 py-3 text-right">Izin</th>
                  <th className="px-4 py-3 text-right">Sakit</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employeeAggregates.map((agg) => (
                  <tr key={agg.user_id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                      {agg.full_name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {agg.nip}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {agg.role ? ROLE_LABELS[agg.role] : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700 tabular-nums">
                      {agg.hadir}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-amber-700 tabular-nums">
                      {agg.izin}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-sky-700 tabular-nums">
                      {agg.sakit}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 tabular-nums">
                      {agg.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Nama Karyawan</th>
                  <th className="px-4 py-3">NIP</th>
                  <th className="px-4 py-3">Peran</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Jam Masuk</th>
                  <th className="px-4 py-3 text-right">Jam Pulang</th>
                  <th className="px-4 py-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-medium text-slate-900 tabular-nums whitespace-nowrap">
                      {formatTanggalSingkat(r.tanggal)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                      {r.profiles?.full_name || '-'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {r.profiles?.nip || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {r.profiles?.role ? ROLE_LABELS[r.profiles.role] : '-'}
                    </td>
                    <td
                      className={`px-4 py-3 font-semibold whitespace-nowrap ${
                        EMPLOYEE_STATUS_META[r.status].textClass
                      }`}
                    >
                      {EMPLOYEE_STATUS_META[r.status].label}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {formatJamWib(r.check_in_at)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {r.check_out_at ? formatJamWib(r.check_out_at) : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.catatan || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
