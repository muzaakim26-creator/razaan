import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit2, Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/supabase';
import { JURUSAN_LIST } from '../../lib/constants';
import type { JurusanCode, Student } from '../../types';

interface StudentsResponse {
  students: Student[];
}

export default function StudentsMasterPage() {
  const { session } = useAuth();
  const { kelas: paramKelas } = useParams<{ kelas?: string }>();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterJurusan, setFilterJurusan] = useState('');
  const [filterKelas, setFilterKelas] = useState(paramKelas || '');

  // Form modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [nis, setNis] = useState('');
  const [nama, setNama] = useState('');
  const [kelas, setKelas] = useState('');
  const [jurusan, setJurusan] = useState<JurusanCode>('TKJ');
  const [aktif, setAktif] = useState(true);
  const [saving, setSaving] = useState(false);

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadStudents = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<StudentsResponse>('/api/students', session.access_token);
      setStudents(res.students);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data siswa.');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const availableClasses = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.kelas))).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (filterJurusan && s.jurusan !== filterJurusan) return false;
      if (filterKelas && s.kelas !== filterKelas) return false;
      if (q) {
        return (
          s.nama.toLowerCase().includes(q) ||
          s.nis.toLowerCase().includes(q) ||
          s.kelas.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [students, search, filterJurusan, filterKelas]);

  function handleKelasChange(val: string) {
    setKelas(val);
    const upper = val.toUpperCase();
    const matched = JURUSAN_LIST.find((j) =>
      new RegExp(`\\b${j.code}\\b`).test(upper)
    );
    if (matched) {
      setJurusan(matched.code);
    }
  }

  function openAddModal() {
    setEditingStudent(null);
    setNis('');
    setNama('');
    setKelas('');
    setJurusan('TKJ');
    setAktif(true);
    setError(null);
    setModalOpen(true);
  }

  function openEditModal(student: Student) {
    setEditingStudent(student);
    setNis(student.nis);
    setNama(student.nama);
    setKelas(student.kelas);
    setJurusan(student.jurusan);
    setAktif(student.aktif);
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.access_token) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (editingStudent) {
        await apiFetch(`/api/students/${editingStudent.id}`, session.access_token, {
          method: 'PUT',
          body: JSON.stringify({ nis, nama, kelas, jurusan, aktif }),
        });
        setSuccessMsg(`Data siswa ${nama} berhasil diperbarui.`);
      } else {
        await apiFetch('/api/students', session.access_token, {
          method: 'POST',
          body: JSON.stringify({ nis, nama, kelas, jurusan }),
        });
        setSuccessMsg(`Siswa ${nama} berhasil ditambahkan.`);
      }
      setModalOpen(false);
      await loadStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan data siswa.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!session?.access_token || !deleteTarget) return;
    setDeleting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await apiFetch(`/api/students/${deleteTarget.id}`, session.access_token, {
        method: 'DELETE',
      });
      setSuccessMsg(`Data siswa ${deleteTarget.nama} berhasil dihapus.`);
      setDeleteTarget(null);
      await loadStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus data siswa.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Data Induk Siswa</h2>
          <p className="text-sm text-slate-600 mt-1">
            Kelola NIS, nama, kelas, dan jurusan siswa untuk kebutuhan presensi oleh guru.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Siswa</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="stu-search" className="block text-xs font-medium text-slate-600 mb-1">
            Cari NIS / Nama
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="stu-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ketik NIS atau nama siswa..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
            />
          </div>
        </div>

        <div>
          <label htmlFor="stu-jurusan" className="block text-xs font-medium text-slate-600 mb-1">
            Jurusan
          </label>
          <select
            id="stu-jurusan"
            value={filterJurusan}
            onChange={(e) => setFilterJurusan(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
          >
            <option value="">Semua Jurusan</option>
            {JURUSAN_LIST.map((j) => (
              <option key={j.code} value={j.code}>
                {j.code} — {j.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="stu-kelas" className="block text-xs font-medium text-slate-600 mb-1">
            Kelas
          </label>
          <select
            id="stu-kelas"
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
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

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center gap-3 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-red-600" />
            <span>Memuat data siswa...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-slate-900">Belum ada data siswa</p>
            <p className="text-xs text-slate-500 mt-1">
              Tambahkan data siswa pertama agar guru dapat memulai presensi kelas.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Siswa Pertama</span>
            </button>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Tidak ada siswa yang sesuai dengan filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">NIS</th>
                  <th className="px-4 py-3">Nama Lengkap</th>
                  <th className="px-4 py-3">Kelas</th>
                  <th className="px-4 py-3">Jurusan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                      {s.nis}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                      {s.nama}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{s.kelas}</td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-red-600 whitespace-nowrap">
                      {s.jurusan}
                    </td>
                    <td
                      className={`px-4 py-3 font-medium whitespace-nowrap ${
                        s.aktif ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    >
                      {s.aktif ? 'Aktif' : 'Nonaktif'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(s)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(s)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-600 hover:text-white transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="text-lg font-bold text-slate-900">
                {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Tutup modal"
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="form-nis" className="block text-sm font-medium text-slate-700 mb-1">
                  NIS (Nomor Induk Siswa)
                </label>
                <input
                  id="form-nis"
                  type="text"
                  required
                  value={nis}
                  onChange={(e) => setNis(e.target.value)}
                  placeholder="Contoh: 20261001"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                />
              </div>

              <div>
                <label htmlFor="form-nama" className="block text-sm font-medium text-slate-700 mb-1">
                  Nama Lengkap Siswa
                </label>
                <input
                  id="form-nama"
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Siti Rahmawati"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="form-jurusan"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Jurusan
                  </label>
                  <select
                    id="form-jurusan"
                    value={jurusan}
                    onChange={(e) => setJurusan(e.target.value as JurusanCode)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                  >
                    {JURUSAN_LIST.map((j) => (
                      <option key={j.code} value={j.code}>
                        {j.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="form-kelas"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Kelas
                  </label>
                  <input
                    id="form-kelas"
                    type="text"
                    required
                    value={kelas}
                    onChange={(e) => handleKelasChange(e.target.value)}
                    placeholder="Contoh: X TKJ 1"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                  />
                </div>
              </div>

              {editingStudent && (
                <label className="flex items-center gap-2 text-sm text-slate-700 pt-1">
                  <input
                    type="checkbox"
                    checked={aktif}
                    onChange={(e) => setAktif(e.target.checked)}
                    className="rounded border-slate-300 text-red-600 focus:ring-red-600"
                  />
                  <span>Siswa aktif mengikuti pembelajaran</span>
                </label>
              )}

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingStudent ? 'Simpan Perubahan' : 'Tambahkan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-900">Hapus Data Siswa?</h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Anda akan menghapus data siswa{' '}
              <span className="font-semibold text-slate-900">{deleteTarget.nama}</span> (NIS{' '}
              <span className="font-mono">{deleteTarget.nis}</span>) beserta riwayat
              absensinya. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirmed}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Ya, Hapus Siswa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
