import React, { useCallback, useEffect, useState } from 'react';
import { Clock, Loader2, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/supabase';
import {
  EMPLOYEE_STATUS_META,
  formatJamWib,
  formatTanggalIndonesia,
  formatTanggalSingkat,
} from '../../lib/constants';
import type { EmployeeAttendanceRecord, EmployeeAttendanceStatus } from '../../types';

interface EmployeeAttendanceMeResponse {
  todayDate: string;
  todayRecord: EmployeeAttendanceRecord | null;
  history: EmployeeAttendanceRecord[];
}

export default function EmployeeAttendancePage() {
  const { session, profile } = useAuth();

  const [data, setData] = useState<EmployeeAttendanceMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [status, setStatus] = useState<EmployeeAttendanceStatus>('hadir');
  const [catatan, setCatatan] = useState('');
  const [clockText, setClockText] = useState('');

  useEffect(() => {
    const updateClock = () => {
      setClockText(
        new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(new Date()) + ' WIB'
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<EmployeeAttendanceMeResponse>(
        '/api/attendance/employees/me',
        session.access_token
      );
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat absensi karyawan.');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.access_token) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await apiFetch('/api/attendance/employees/check-in', session.access_token, {
        method: 'POST',
        body: JSON.stringify({ status, catatan }),
      });
      setCatatan('');
      setSuccessMsg('Absensi masuk berhasil dicatat.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mencatat absensi masuk.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckOut() {
    if (!session?.access_token) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await apiFetch('/api/attendance/employees/check-out', session.access_token, {
        method: 'POST',
      });
      setSuccessMsg('Absensi pulang berhasil dicatat.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mencatat absensi pulang.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Absensi Mandiri Karyawan</h2>
          <p className="text-sm text-slate-600 mt-1">
            Seluruh Admin, Guru, dan Tenaga Kependidikan mencatat kehadiran harian di sini.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm font-mono font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg px-4 py-2 tabular-nums">
          <Clock className="w-4 h-4 text-red-600" />
          <span>{clockText}</span>
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

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 flex items-center justify-center gap-3 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin text-red-600" />
          <span>Memuat data kehadiran...</span>
        </div>
      ) : (
        <>
          {/* Today Check-In / Check-Out Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 mb-5">
              <div>
                <p className="text-xs font-medium text-slate-500">Tanggal Aktif</p>
                <p className="text-base font-bold text-slate-900">
                  {data?.todayDate ? formatTanggalIndonesia(data.todayDate) : '-'}
                </p>
              </div>
              <p className="text-xs text-slate-500">
                Pegawai: <span className="font-semibold text-slate-800">{profile?.full_name}</span>
              </p>
            </div>

            {!data?.todayRecord ? (
              <form onSubmit={handleCheckIn} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Pilih Status Kehadiran
                  </label>
                  <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    {(['hadir', 'izin', 'sakit'] as EmployeeAttendanceStatus[]).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setStatus(opt)}
                        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors whitespace-nowrap ${
                          status === opt
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {EMPLOYEE_STATUS_META[opt].label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="emp-catatan"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Catatan (Opsional — wajib dijelaskan jika Izin/Sakit)
                  </label>
                  <input
                    id="emp-catatan"
                    type="text"
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Contoh: Hadir tepat waktu di ruang guru / Izin keperluan keluarga"
                    maxLength={300}
                    className="w-full max-w-2xl px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  <span>Simpan Absensi Masuk</span>
                </button>
              </form>
            ) : (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 flex-1">
                  <div>
                    <p className="text-xs text-slate-500">Status</p>
                    <p
                      className={`text-lg font-bold mt-0.5 ${
                        EMPLOYEE_STATUS_META[data.todayRecord.status].textClass
                      }`}
                    >
                      {EMPLOYEE_STATUS_META[data.todayRecord.status].label}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Jam Masuk</p>
                    <p className="text-base font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                      {formatJamWib(data.todayRecord.check_in_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Jam Pulang</p>
                    <p className="text-base font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                      {data.todayRecord.check_out_at
                        ? formatJamWib(data.todayRecord.check_out_at)
                        : 'Belum tercatat'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Catatan</p>
                    <p className="text-sm text-slate-700 mt-0.5">
                      {data.todayRecord.catatan || '-'}
                    </p>
                  </div>
                </div>

                {!data.todayRecord.check_out_at && data.todayRecord.status === 'hadir' && (
                  <button
                    type="button"
                    onClick={handleCheckOut}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 self-start md:self-auto"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogOut className="w-4 h-4" />
                    )}
                    <span>Absen Pulang</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Personal Attendance History */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                Riwayat Kehadiran Pribadi (30 Terakhir)
              </h3>
            </div>

            {data && data.history.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Belum ada riwayat kehadiran tercatat untuk akun Anda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <tr>
                      <th className="px-6 py-3">Tanggal</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Jam Masuk</th>
                      <th className="px-6 py-3 text-right">Jam Pulang</th>
                      <th className="px-6 py-3">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.history || []).map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70">
                        <td className="px-6 py-3 font-medium text-slate-900 tabular-nums whitespace-nowrap">
                          {formatTanggalSingkat(row.tanggal)}
                        </td>
                        <td
                          className={`px-6 py-3 font-semibold whitespace-nowrap ${
                            EMPLOYEE_STATUS_META[row.status].textClass
                          }`}
                        >
                          {EMPLOYEE_STATUS_META[row.status].label}
                        </td>
                        <td className="px-6 py-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                          {formatJamWib(row.check_in_at)}
                        </td>
                        <td className="px-6 py-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                          {row.check_out_at ? formatJamWib(row.check_out_at) : '-'}
                        </td>
                        <td className="px-6 py-3 text-slate-600">
                          {row.catatan || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
