import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCheck, Loader2, Save, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/supabase';
import { STUDENT_STATUS_META, getTodayWib } from '../../lib/constants';
import type { StudentAttendanceRow, StudentAttendanceStatus } from '../../types';

interface StudentAttendanceResponse {
  date: string;
  availableClasses: string[];
  rows: StudentAttendanceRow[];
}

export default function StudentAttendancePage() {
  const { session, profile } = useAuth();

  const [date, setDate] = useState(getTodayWib);
  const [selectedKelas, setSelectedKelas] = useState('');
  const [search, setSearch] = useState('');
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [rows, setRows] = useState<StudentAttendanceRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ date });
      if (selectedKelas) params.set('kelas', selectedKelas);
      const res = await apiFetch<StudentAttendanceResponse>(
        `/api/attendance/students?${params.toString()}`,
        session.access_token
      );
      setAvailableClasses(res.availableClasses);
      setRows(res.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar siswa.');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, date, selectedKelas]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.nama.toLowerCase().includes(q) ||
        r.nis.toLowerCase().includes(q) ||
        r.kelas.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const counts = useMemo(() => {
    const summary = { hadir: 0, sakit: 0, izin: 0, alpha: 0, belum: 0 };
    for (const r of rows) {
      if (r.status === 'hadir') summary.hadir += 1;
      else if (r.status === 'sakit') summary.sakit += 1;
      else if (r.status === 'izin') summary.izin += 1;
      else if (r.status === 'alpha') summary.alpha += 1;
      else summary.belum += 1;
    }
    return summary;
  }, [rows]);

  function updateRowStatus(studentId: string, nextStatus: StudentAttendanceStatus) {
    setRows((prev) =>
      prev.map((row) => (row.student_id === studentId ? { ...row, status: nextStatus } : row))
    );
  }

  function updateRowNote(studentId: string, catatan: string) {
    setRows((prev) =>
      prev.map((row) => (row.student_id === studentId ? { ...row, catatan } : row))
    );
  }

  function markAllPresent() {
    const visibleIds = new Set(filteredRows.map((r) => r.student_id));
    setRows((prev) =>
      prev.map((row) =>
        visibleIds.has(row.student_id) ? { ...row, status: 'hadir' } : row
      )
    );
  }

  async function handleSave() {
    if (!session?.access_token) return;
    const entries = rows
      .filter((r) => r.status !== null)
      .map((r) => ({
        student_id: r.student_id,
        status: r.status,
        catatan: r.catatan,
      }));

    if (entries.length === 0) {
      setError('Pilih status kehadiran minimal untuk satu siswa sebelum menyimpan.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await apiFetch<{ message: string }>(
        '/api/attendance/students/bulk',
        session.access_token,
        {
          method: 'POST',
          body: JSON.stringify({ date, entries }),
        }
      );
      setSuccessMsg(res.message);
      await loadRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan absensi siswa.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Absensi Siswa</h2>
          <p className="text-sm text-slate-600 mt-1">
            Pilih tanggal dan kelas untuk mencatat kehadiran siswa harian.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={markAllPresent}
            disabled={filteredRows.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            <CheckCheck className="w-4 h-4 text-emerald-600" />
            <span>Tandai Semua Hadir</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || rows.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Simpan Absensi</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="stu-att-date" className="block text-xs font-medium text-slate-600 mb-1">
            Tanggal
          </label>
          <input
            id="stu-att-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
          />
        </div>

        <div>
          <label htmlFor="stu-att-kelas" className="block text-xs font-medium text-slate-600 mb-1">
            Filter Kelas
          </label>
          <select
            id="stu-att-kelas"
            value={selectedKelas}
            onChange={(e) => setSelectedKelas(e.target.value)}
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
          <label htmlFor="stu-att-search" className="block text-xs font-medium text-slate-600 mb-1">
            Cari Siswa
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="stu-att-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="NIS atau nama siswa..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
            />
          </div>
        </div>
      </div>

      {/* Live Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
          <p className="text-xs text-slate-500">Hadir</p>
          <p className="text-xl font-bold text-emerald-700 tabular-nums">{counts.hadir}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
          <p className="text-xs text-slate-500">Sakit</p>
          <p className="text-xl font-bold text-sky-700 tabular-nums">{counts.sakit}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
          <p className="text-xs text-slate-500">Izin</p>
          <p className="text-xl font-bold text-amber-700 tabular-nums">{counts.izin}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
          <p className="text-xs text-slate-500">Alpha</p>
          <p className="text-xl font-bold text-red-600 tabular-nums">{counts.alpha}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 col-span-2 sm:col-span-1">
          <p className="text-xs text-slate-500">Belum Diisi</p>
          <p className="text-xl font-bold text-slate-700 tabular-nums">{counts.belum}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
          {successMsg}
        </div>
      )}

      {/* Attendance Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center gap-3 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-red-600" />
            <span>Memuat daftar siswa...</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-slate-900">Belum ada data siswa aktif</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Data siswa perlu ditambahkan terlebih dahulu oleh Admin pada menu Data Siswa
              sebelum guru dapat mengisi presensi harian.
            </p>
            {profile?.role === 'admin' && (
              <Link
                to="/app/data-siswa"
                className="inline-flex items-center mt-4 px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Tambah Data Siswa
              </Link>
            )}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Tidak ada siswa yang cocok dengan filter pencarian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">NIS</th>
                  <th className="px-4 py-3">Nama Siswa</th>
                  <th className="px-4 py-3">Kelas</th>
                  <th className="px-4 py-3">Status Kehadiran</th>
                  <th className="px-4 py-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <tr key={row.student_id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {row.nis}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                      {row.nama}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {row.kelas} · {row.jurusan}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                        {(['hadir', 'sakit', 'izin', 'alpha'] as StudentAttendanceStatus[]).map(
                          (st) => {
                            const active = row.status === st;
                            const activeStyle =
                              st === 'hadir'
                                ? 'bg-emerald-600 text-white'
                                : st === 'sakit'
                                  ? 'bg-sky-600 text-white'
                                  : st === 'izin'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-red-600 text-white';

                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => updateRowStatus(row.student_id, st)}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                                  active
                                    ? `${activeStyle} shadow-sm`
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {STUDENT_STATUS_META[st].label}
                              </button>
                            );
                          }
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 min-w-[200px]">
                      <input
                        type="text"
                        value={row.catatan}
                        onChange={(e) => updateRowNote(row.student_id, e.target.value)}
                        placeholder="Keterangan opsional..."
                        maxLength={200}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                      />
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
