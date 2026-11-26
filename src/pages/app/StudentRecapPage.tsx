import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Loader2, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/supabase';
import {
  STUDENT_STATUS_META,
  downloadCsv,
  formatTanggalSingkat,
  getMonthStartWib,
  getTodayWib,
} from '../../lib/constants';
import type { StudentAttendanceRecapItem, StudentAttendanceStatus } from '../../types';

interface StudentRecapResponse {
  records: StudentAttendanceRecapItem[];
  startDate: string;
  endDate: string;
  availableClasses: string[];
}

export default function StudentRecapPage() {
  const { session } = useAuth();

  const [startDate, setStartDate] = useState(getMonthStartWib);
  const [endDate, setEndDate] = useState(getTodayWib);
  const [kelas, setKelas] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'log' | 'summary'>('log');

  const [records, setRecords] = useState<StudentAttendanceRecapItem[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecap = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (kelas) params.set('kelas', kelas);
      if (status) params.set('status', status);
      if (search.trim()) params.set('search', search.trim());

      const res = await apiFetch<StudentRecapResponse>(
        `/api/attendance/students/recap?${params.toString()}`,
        session.access_token
      );
      setRecords(res.records);
      setAvailableClasses(res.availableClasses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat rekap absensi siswa.');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, startDate, endDate, kelas, status, search]);

  useEffect(() => {
    loadRecap();
  }, [loadRecap]);

  const summary = useMemo(() => {
    const counts = { total: records.length, hadir: 0, sakit: 0, izin: 0, alpha: 0 };
    for (const r of records) {
      counts[r.status] += 1;
    }
    return counts;
  }, [records]);

  const studentAggregates = useMemo(() => {
    const map = new Map<
      string,
      {
        student_id: string;
        nis: string;
        nama: string;
        kelas: string;
        jurusan: string;
        hadir: number;
        sakit: number;
        izin: number;
        alpha: number;
        total: number;
      }
    >();

    for (const r of records) {
      const existing = map.get(r.student_id) || {
        student_id: r.student_id,
        nis: r.students?.nis || '-',
        nama: r.students?.nama || '-',
        kelas: r.students?.kelas || '-',
        jurusan: r.students?.jurusan || '-',
        hadir: 0,
        sakit: 0,
        izin: 0,
        alpha: 0,
        total: 0,
      };
      existing[r.status] += 1;
      existing.total += 1;
      map.set(r.student_id, existing);
    }

    return Array.from(map.values()).sort((a, b) =>
      a.kelas === b.kelas ? a.nama.localeCompare(b.nama) : a.kelas.localeCompare(b.kelas)
    );
  }, [records]);

  function handleExportCsv() {
    if (viewMode === 'summary') {
      downloadCsv(
        `ringkasan-absensi-siswa-${startDate}-sd-${endDate}.csv`,
        ['NIS', 'Nama Siswa', 'Kelas', 'Jurusan', 'Hadir', 'Sakit', 'Izin', 'Alpha', 'Total Hari'],
        studentAggregates.map((a) => [
          a.nis,
          a.nama,
          a.kelas,
          a.jurusan,
          a.hadir,
          a.sakit,
          a.izin,
          a.alpha,
          a.total,
        ])
      );
      return;
    }
    downloadCsv(
      `rekap-absensi-siswa-${startDate}-sd-${endDate}.csv`,
      ['Tanggal', 'NIS', 'Nama Siswa', 'Kelas', 'Jurusan', 'Status', 'Catatan', 'Pencatat'],
      records.map((r) => [
        r.tanggal,
        r.students?.nis || '-',
        r.students?.nama || '-',
        r.students?.kelas || '-',
        r.students?.jurusan || '-',
        STUDENT_STATUS_META[r.status].label,
        r.catatan || '-',
        r.recorder?.full_name || '-',
      ])
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Rekap Absensi Siswa</h2>
          <p className="text-sm text-slate-600 mt-1">
            Laporan kehadiran siswa berdasarkan rentang tanggal, kelas, dan status.
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
              Ringkasan per Siswa
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
          <label htmlFor="rec-stu-start" className="block text-xs font-medium text-slate-600 mb-1">
            Dari Tanggal
          </label>
          <input
            id="rec-stu-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
          />
        </div>

        <div>
          <label htmlFor="rec-stu-end" className="block text-xs font-medium text-slate-600 mb-1">
            Sampai Tanggal
          </label>
          <input
            id="rec-stu-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
          />
        </div>

        <div>
          <label htmlFor="rec-stu-kelas" className="block text-xs font-medium text-slate-600 mb-1">
            Kelas
          </label>
          <select
            id="rec-stu-kelas"
            value={kelas}
            onChange={(e) => setKelas(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
          >
            <option value="">Semua Kelas</option>
            {availableClasses.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="rec-stu-status" className="block text-xs font-medium text-slate-600 mb-1">
            Status
          </label>
          <select
            id="rec-stu-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
          >
            <option value="">Semua Status</option>
            {(['hadir', 'sakit', 'izin', 'alpha'] as StudentAttendanceStatus[]).map((st) => (
              <option key={st} value={st}>
                {STUDENT_STATUS_META[st].label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="rec-stu-search" className="block text-xs font-medium text-slate-600 mb-1">
            Cari NIS / Nama
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="rec-stu-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ketik NIS atau nama..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
            />
          </div>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
          <p className="text-xs text-slate-500">Total Catatan</p>
          <p className="text-xl font-bold text-slate-900 tabular-nums">{summary.total}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
          <p className="text-xs text-slate-500">Hadir</p>
          <p className="text-xl font-bold text-emerald-700 tabular-nums">{summary.hadir}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
          <p className="text-xs text-slate-500">Sakit</p>
          <p className="text-xl font-bold text-sky-700 tabular-nums">{summary.sakit}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
          <p className="text-xs text-slate-500">Izin</p>
          <p className="text-xl font-bold text-amber-700 tabular-nums">{summary.izin}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 col-span-2 sm:col-span-1">
          <p className="text-xs text-slate-500">Alpha</p>
          <p className="text-xl font-bold text-red-600 tabular-nums">{summary.alpha}</p>
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
            <span>Memuat rekap absensi siswa...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Tidak ada catatan absensi siswa pada rentang tanggal dan filter yang dipilih.
          </div>
        ) : viewMode === 'summary' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">NIS</th>
                  <th className="px-4 py-3">Nama Siswa</th>
                  <th className="px-4 py-3">Kelas</th>
                  <th className="px-4 py-3 text-right">Hadir</th>
                  <th className="px-4 py-3 text-right">Sakit</th>
                  <th className="px-4 py-3 text-right">Izin</th>
                  <th className="px-4 py-3 text-right">Alpha</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentAggregates.map((agg) => (
                  <tr key={agg.student_id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {agg.nis}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                      {agg.nama}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {agg.kelas} · {agg.jurusan}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700 tabular-nums">
                      {agg.hadir}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-sky-700 tabular-nums">
                      {agg.sakit}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-amber-700 tabular-nums">
                      {agg.izin}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600 tabular-nums">
                      {agg.alpha}
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
                  <th className="px-4 py-3">NIS</th>
                  <th className="px-4 py-3">Nama Siswa</th>
                  <th className="px-4 py-3">Kelas</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Catatan</th>
                  <th className="px-4 py-3">Dicatat Oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-medium text-slate-900 tabular-nums whitespace-nowrap">
                      {formatTanggalSingkat(r.tanggal)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {r.students?.nis || '-'}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                      {r.students?.nama || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {r.students ? `${r.students.kelas} · ${r.students.jurusan}` : '-'}
                    </td>
                    <td
                      className={`px-4 py-3 font-semibold whitespace-nowrap ${
                        STUDENT_STATUS_META[r.status].textClass
                      }`}
                    >
                      {STUDENT_STATUS_META[r.status].label}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.catatan || '-'}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {r.recorder?.full_name || '-'}
                    </td>
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
