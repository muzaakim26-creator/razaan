import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Edit2,
  Loader2,
  Search,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/supabase';
import { ROLE_LABELS, formatTanggalSingkat } from '../../lib/constants';
import type { ManagedUser, UserRole } from '../../types';

interface UsersResponse {
  users: ManagedUser[];
}

export default function UserManagementPage() {
  const { session, profile } = useAuth();
  const { id: routeUserId } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('guru');
  const [nip, setNip] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [saving, setSaving] = useState(false);

  // Hard Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<UsersResponse>('/api/users', session.access_token);
      setUsers(res.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar user.');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Support dynamic route /app/users/:id to directly open edit modal for that user
  useEffect(() => {
    if (routeUserId && users.length > 0) {
      const found = users.find((u) => u.id === routeUserId);
      if (found) {
        openEditModal(found);
      }
    }
  }, [routeUserId, users]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (q) {
        return (
          u.full_name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.nip || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [users, search, roleFilter]);

  function openAddModal() {
    setEditingUser(null);
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('guru');
    setNip('');
    setJabatan('');
    setError(null);
    setModalOpen(true);
  }

  function openEditModal(user: ManagedUser) {
    setEditingUser(user);
    setFullName(user.full_name);
    setEmail(user.email);
    setPassword('');
    setRole(user.role);
    setNip(user.nip || '');
    setJabatan(user.jabatan || '');
    setError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    if (routeUserId) {
      navigate('/app/users', { replace: true });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.access_token) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (editingUser) {
        await apiFetch(`/api/users/${editingUser.id}`, session.access_token, {
          method: 'PUT',
          body: JSON.stringify({
            full_name: fullName,
            email,
            role,
            nip,
            jabatan,
            ...(password ? { password } : {}),
          }),
        });
        setSuccessMsg(
          `Data pengguna ${fullName} berhasil diperbarui dan disinkronkan dengan Supabase Auth.`
        );
      } else {
        await apiFetch('/api/users', session.access_token, {
          method: 'POST',
          body: JSON.stringify({
            full_name: fullName,
            email,
            password,
            role,
            nip,
            jabatan,
          }),
        });
        setSuccessMsg(
          `Pengguna baru ${fullName} berhasil dibuat dan disinkronkan dengan Supabase Auth.`
        );
      }
      closeModal();
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan data pengguna.');
    } finally {
      setSaving(false);
    }
  }

  async function handleHardDelete() {
    if (!session?.access_token || !deleteTarget) return;
    setDeleting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await apiFetch<{ message: string }>(
        `/api/users/${deleteTarget.id}`,
        session.access_token,
        {
          method: 'DELETE',
        }
      );
      setSuccessMsg(res.message);
      setDeleteTarget(null);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus pengguna.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">User Management</h2>
          <p className="text-sm text-slate-600 mt-1">
            Kelola seluruh akun pengguna aplikasi. Penambahan, perubahan, dan penghapusan
            tersinkron penuh hingga Supabase Authentication.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah User Baru</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="usr-search" className="block text-xs font-medium text-slate-600 mb-1">
            Cari Pengguna
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="usr-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nama, email, atau NIP..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
            />
          </div>
        </div>

        <div>
          <label htmlFor="usr-role" className="block text-xs font-medium text-slate-600 mb-1">
            Filter Peran
          </label>
          <select
            id="usr-role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
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

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center gap-3 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-red-600" />
            <span>Menyinkronkan daftar pengguna dari Supabase Auth...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Tidak ada pengguna yang sesuai dengan pencarian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Nama Lengkap</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Peran</th>
                  <th className="px-4 py-3">NIP / Jabatan</th>
                  <th className="px-4 py-3">Terdaftar</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const isSelf = u.id === profile?.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                        {u.full_name}
                        {isSelf && (
                          <span className="ml-2 text-xs text-red-600 font-semibold">
                            · Anda
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {u.email}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            u.role === 'admin'
                              ? 'text-red-700'
                              : u.role === 'guru'
                                ? 'text-slate-900'
                                : 'text-slate-600'
                          }`}
                        >
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                        <span className="font-mono tabular-nums">{u.nip || '-'}</span>
                        {u.jabatan ? ` · ${u.jabatan}` : ''}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {formatTanggalSingkat(u.created_at.slice(0, 10))}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => setDeleteTarget(u)}
                            title={
                              isSelf
                                ? 'Tidak dapat menghapus akun yang sedang login'
                                : 'Hapus permanen hingga Supabase Auth'
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-600 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="text-lg font-bold text-slate-900">
                {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Tutup modal"
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="usr-fullname"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Nama Lengkap
                </label>
                <input
                  id="usr-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Budi Santoso, S.Kom"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                />
              </div>

              <div>
                <label
                  htmlFor="usr-email"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Email Login (Supabase Auth)
                </label>
                <input
                  id="usr-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="budi@smkprimaunggul.sch.id"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                />
              </div>

              <div>
                <label
                  htmlFor="usr-password"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  {editingUser
                    ? 'Kata Sandi Baru (Kosongkan jika tidak diubah)'
                    : 'Kata Sandi (Minimal 8 Karakter)'}
                </label>
                <input
                  id="usr-password"
                  type="password"
                  required={!editingUser}
                  minLength={editingUser ? 0 : 8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingUser ? 'Biarkan kosong jika tetap' : 'Minimal 8 karakter'}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="usr-form-role"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Peran (Role)
                  </label>
                  <select
                    id="usr-form-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                  >
                    <option value="admin">Admin</option>
                    <option value="guru">Guru</option>
                    <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="usr-nip"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    NIP / Nomor Induk (Opsional)
                  </label>
                  <input
                    id="usr-nip"
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="199001152019031002"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="usr-jabatan"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Jabatan / Bidang Tugas (Opsional)
                </label>
                <input
                  id="usr-jabatan"
                  type="text"
                  value={jabatan}
                  onChange={(e) => setJabatan(e.target.value)}
                  placeholder="Contoh: Guru Produktif TKJ / Staf Tata Usaha"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
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
                  <span>{editingUser ? 'Simpan Perubahan' : 'Buat User'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hard Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Hapus Permanen Pengguna?
                </h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Akun{' '}
                  <span className="font-semibold text-slate-900">
                    {deleteTarget.full_name}
                  </span>{' '}
                  ({deleteTarget.email}) akan dihapus secara permanen dari tabel profil,
                  riwayat absensi karyawan, dan{' '}
                  <span className="font-semibold text-red-700">
                    Supabase Authentication (Hard Delete)
                  </span>
                  .
                </p>
              </div>
            </div>

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
                onClick={handleHardDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Hapus Permanen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
