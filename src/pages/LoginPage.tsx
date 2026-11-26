import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Copy,
  Database,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ResilientImage } from '../components/ResilientImage';
import { apiFetch } from '../lib/supabase';

export default function LoginPage() {
  const navigate = useNavigate();
  const { configStatus, session, profile, loading, signIn, refreshConfigStatus } = useAuth();

  const [mode, setMode] = useState<'login' | 'first-admin'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [nip, setNip] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [checkingConfig, setCheckingConfig] = useState(false);
  const [initializingDb, setInitializingDb] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (!loading && session && profile) {
      navigate('/app', { replace: true });
    }
  }, [loading, session, profile, navigate]);

  useEffect(() => {
    if (configStatus?.configured && configStatus.schemaReady && !configStatus.hasUsers) {
      setMode('first-admin');
    } else if (configStatus?.hasUsers) {
      setMode('login');
    }
  }, [configStatus]);

  async function handleCheckConfig() {
    setCheckingConfig(true);
    setErrorMsg(null);
    try {
      await refreshConfigStatus();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memeriksa konfigurasi.');
    } finally {
      setCheckingConfig(false);
    }
  }

  async function handleAutoInitDb() {
    setInitializingDb(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      const res = await apiFetch<{ message: string }>('/api/config/init-db', null, {
        method: 'POST',
      });
      setInfoMsg(res.message);
      await refreshConfigStatus();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal menginisialisasi tabel relasional.'
      );
    } finally {
      setInitializingDb(false);
    }
  }

  async function handleCopySql() {
    try {
      const res = await apiFetch<{ sql: string }>('/api/config/schema-sql', null);
      await navigator.clipboard.writeText(res.sql);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      setErrorMsg('Gagal menyalin SQL ke clipboard.');
    }
  }

  async function handleSubmitLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setSubmitting(true);

    try {
      await signIn(email, password);
      navigate('/app', { replace: true });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal masuk ke sistem.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitFirstAdmin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setSubmitting(true);

    try {
      await apiFetch('/api/auth/register-first-admin', null, {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          nip,
        }),
      });
      await signIn(email, password);
      await refreshConfigStatus();
      navigate('/app', { replace: true });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mendaftarkan admin pertama.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white grid grid-cols-1 lg:grid-cols-12">
      {/* Left Architectural Visual */}
      <div className="hidden lg:block lg:col-span-5 relative bg-slate-900 overflow-hidden">
        <ResilientImage
          src="/src/assets/images/login_campus_hall_1795396269643.jpg"
          alt="Koridor modern SMK Prima Unggul"
          className="w-full h-full object-cover opacity-90"
          fallbackLabel="SMK Prima Unggul"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20 flex flex-col justify-between p-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </Link>

          <div>
            <p className="text-xs font-semibold tracking-wide text-red-400 mb-2">
              Portal Presensi Digital
            </p>
            <h2 className="text-2xl font-bold text-white leading-snug mb-2">
              SMK Prima Unggul
            </h2>
            <p className="text-sm text-slate-200 leading-relaxed max-w-sm">
              Sistem absensi siswa dan karyawan terintegrasi Supabase Authentication
              untuk Admin, Guru, dan Tenaga Kependidikan.
            </p>
          </div>
        </div>
      </div>

      {/* Right Authentication Form */}
      <div className="lg:col-span-7 flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-20 bg-neutral-50">
        <div className="w-full max-w-md mx-auto">
          <div className="lg:hidden mb-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-red-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Beranda</span>
            </Link>
          </div>

          <div className="mb-8">
            <p className="text-xs font-semibold text-red-600 mb-1">
              SMK Prima Unggul
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {mode === 'first-admin'
                ? 'Aktivasi Akun Admin Pertama'
                : 'Masuk ke Portal Absensi'}
            </h1>
            <p className="text-sm text-slate-600 mt-1.5">
              {mode === 'first-admin'
                ? 'Pengguna pertama yang dibuat pada Supabase Authentication otomatis ditetapkan sebagai Admin.'
                : 'Gunakan email dan kata sandi yang terdaftar pada sistem sekolah.'}
            </p>
          </div>

          {/* Setup Status Banners when Supabase env or schema not ready */}
          {configStatus && !configStatus.configured && (
            <div className="bg-white border border-red-200 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-3">
                <Database className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {configStatus.schemaError
                      ? 'Konfigurasi Supabase Tidak Valid'
                      : 'Koneksi Supabase Belum Dikonfigurasi'}
                  </h2>
                  {configStatus.schemaError && (
                    <p className="mt-2 text-xs font-mono text-red-800 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      {configStatus.schemaError}
                    </p>
                  )}
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {configStatus.schemaError
                      ? 'Pastikan SUPABASE_URL diisi dengan URL proyek HTTPS (contoh: https://proyek-anda.supabase.co), bukan kunci API (sb_publishable_...).'
                      : 'Tambahkan variabel berikut pada panel Secrets / environment server agar autentikasi dan database Supabase aktif:'}
                  </p>
                  {configStatus.missingVars.length > 0 && (
                    <ul className="mt-3 space-y-1 text-xs font-mono text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
                      {configStatus.missingVars.map((envName) => (
                        <li key={envName}>{envName}</li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={handleCheckConfig}
                    disabled={checkingConfig}
                    className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${checkingConfig ? 'animate-spin' : ''}`} />
                    <span>Periksa Status Server</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {configStatus?.configured && !configStatus.schemaReady && (
            <div className="bg-white border border-amber-200 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-3">
                <Database className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold text-slate-900">
                    Tabel Database Supabase Belum Dibuat
                  </h2>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Koneksi Supabase berhasil, namun skema tabel belum ditemukan. Jalankan
                    script SQL dari <span className="font-mono">supabase/schema.sql</span> di
                    SQL Editor Supabase Anda.
                  </p>
                  {configStatus.schemaError && (
                    <p className="mt-2 text-xs font-mono text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded">
                      {configStatus.schemaError}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {configStatus.dbUrlConfigured && (
                      <button
                        type="button"
                        onClick={handleAutoInitDb}
                        disabled={initializingDb}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {initializingDb ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Database className="w-3.5 h-3.5" />
                        )}
                        <span>Buat Tabel Otomatis</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                        configStatus.dbUrlConfigured
                          ? 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                          : 'text-white bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSql ? 'SQL Lengkap Tersalin' : 'Salin SQL Lengkap'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCheckConfig}
                      disabled={checkingConfig}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${checkingConfig ? 'animate-spin' : ''}`} />
                      <span>Cek Ulang Tabel</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
            {configStatus?.configured && configStatus.schemaReady && !configStatus.hasUsers && (
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setMode('first-admin');
                    setErrorMsg(null);
                  }}
                  className={`flex-1 px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    mode === 'first-admin'
                      ? 'bg-white text-red-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Buat Admin Pertama
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                  }}
                  className={`flex-1 px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    mode === 'login'
                      ? 'bg-white text-red-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sudah Punya Akun
                </button>
              </div>
            )}

            {errorMsg && (
              <div
                role="alert"
                className="mb-5 px-4 py-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg"
              >
                {errorMsg}
              </div>
            )}

            {infoMsg && (
              <div className="mb-5 px-4 py-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
                {infoMsg}
              </div>
            )}

            {mode === 'first-admin' ? (
              <form onSubmit={handleSubmitFirstAdmin} className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
                  <ShieldCheck className="w-4 h-4 text-red-600 shrink-0" />
                  <span>
                    Belum ada pengguna di Supabase Auth. Akun ini akan otomatis menjadi Admin.
                  </span>
                </div>

                <div>
                  <label
                    htmlFor="admin-fullname"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Nama Lengkap
                  </label>
                  <input
                    id="admin-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Drs. Ahmad Fauzi"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admin-nip"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    NIP / Nomor Pegawai (Opsional)
                  </label>
                  <input
                    id="admin-nip"
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="198504122010011005"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admin-email"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Email Admin
                  </label>
                  <input
                    id="admin-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@smkprimaunggul.sch.id"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admin-password"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Kata Sandi (Minimal 8 Karakter)
                  </label>
                  <div className="relative">
                    <input
                      id="admin-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 8 karakter"
                      className="w-full px-3.5 py-2.5 pr-10 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !configStatus?.configured || !configStatus?.schemaReady}
                  className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Daftarkan Admin &amp; Masuk</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmitLogin} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@smkprimaunggul.sch.id"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi"
                      className="w-full px-3.5 py-2.5 pr-10 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !configStatus?.configured}
                  className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Masuk ke Sistem</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
