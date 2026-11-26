import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, MapPin, Phone, Mail } from 'lucide-react';
import { ResilientImage } from '../components/ResilientImage';
import { BIDANG_KEAHLIAN_CLUSTERS, JURUSAN_LIST } from '../lib/constants';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { session, profile } = useAuth();
  const isLoggedIn = Boolean(session && profile);

  return (
    <div className="min-h-screen bg-neutral-50 text-slate-900 flex flex-col">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <Link
            to="/"
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            SMK Prima Unggul
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#profil"
              className="hover:text-red-600 transition-colors whitespace-nowrap shrink-0"
            >
              Profil
            </a>
            <a
              href="#jurusan"
              className="hover:text-red-600 transition-colors whitespace-nowrap shrink-0"
            >
              Jurusan
            </a>
            <a
              href="#sistem-absensi"
              className="hover:text-red-600 transition-colors whitespace-nowrap shrink-0"
            >
              Sistem Absensi
            </a>
            <a
              href="#kontak"
              className="hover:text-red-600 transition-colors whitespace-nowrap shrink-0"
            >
              Kontak
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <Link
              to={isLoggedIn ? '/app' : '/login'}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap shrink-0"
            >
              <span>{isLoggedIn ? 'Buka Aplikasi' : 'Masuk Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section id="profil" className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-center">
                <p className="text-xs font-semibold tracking-wide text-red-600 mb-3">
                  Sekolah Menengah Kejuruan Terpadu
                </p>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-[1.12] text-balance mb-5">
                  Mencetak Lulusan Vokasi Kompeten, Disiplin, dan Siap Industri
                </h1>
                <p className="text-base text-slate-600 leading-relaxed max-w-xl mb-8">
                  SMK Prima Unggul adalah institusi pendidikan menengah kejuruan yang
                  memadukan kurikulum berbasis proyek industri, laboratorium praktik
                  modern, serta tata kelola kedisiplinan digital bagi siswa, guru,
                  dan tenaga kependidikan.
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    to={isLoggedIn ? '/app' : '/login'}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>{isLoggedIn ? 'Masuk ke Dashboard' : 'Masuk ke Sistem Absensi'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <a
                    href="#jurusan"
                    className="inline-flex items-center px-5 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                  >
                    Lihat Program Keahlian
                  </a>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="relative h-72 sm:h-96 lg:h-full min-h-[340px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                  <ResilientImage
                    src="/src/assets/images/hero_smk_campus_1795396269380.jpg"
                    alt="Gedung utama kampus SMK Prima Unggul"
                    className="w-full h-full object-cover"
                    fallbackLabel="Kampus Utama SMK Prima Unggul"
                  />
                </div>
              </div>
            </div>

            {/* 4-Column Proof Strip */}
            <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-2xl lg:text-3xl font-bold text-slate-900 tabular-nums">
                  3 Rumpun
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  Bidang keahlian inti terstruktur
                </p>
              </div>
              <div>
                <p className="text-2xl lg:text-3xl font-bold text-red-600 tabular-nums">
                  6 Kompetensi
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  TKJ, DKV, AK, BC, MPLB, dan BD
                </p>
              </div>
              <div>
                <p className="text-2xl lg:text-3xl font-bold text-slate-900 tabular-nums">
                  100% Digital
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  Presensi siswa dan karyawan harian
                </p>
              </div>
              <div>
                <p className="text-2xl lg:text-3xl font-bold text-slate-900 tabular-nums">
                  3 Peran Akses
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  Admin, Guru, dan Tenaga Kependidikan
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Program Keahlian Section */}
        <section id="jurusan" className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-semibold tracking-wide text-red-600 mb-2">
              Program Keahlian SMK Prima Unggul
            </p>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 text-balance mb-4">
              Tiga Rumpun Keahlian dengan Enam Kompetensi Spesifik
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              Setiap jurusan dirancang bersama mitra industri untuk membekali siswa
              dengan sertifikasi keahlian nyata di bidang teknologi, media kreatif,
              serta manajemen bisnis.
            </p>
          </div>

          {/* 3 Rumpun Keahlian Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {BIDANG_KEAHLIAN_CLUSTERS.map((cluster) => (
              <div
                key={cluster.index}
                className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-red-600 tabular-nums mb-2">
                    {cluster.index}
                  </p>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {cluster.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">
                    {cluster.summary}
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-100 text-xs font-semibold text-slate-700">
                  Kompetensi: {cluster.majors.join(' · ')}
                </div>
              </div>
            ))}
          </div>

          {/* Visual Showcase + 6 Jurusan Detail Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 items-stretch">
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
              <div className="aspect-[16/9] bg-slate-100 overflow-hidden">
                <ResilientImage
                  src="/src/assets/images/lab_tkj_dkv_1795396269562.jpg"
                  alt="Laboratorium praktik TKJ dan DKV SMK Prima Unggul"
                  className="w-full h-full object-cover"
                  fallbackLabel="Laboratorium Komputer & Desain"
                />
              </div>
              <div className="p-6">
                <p className="text-xs font-medium text-slate-500 mb-1">
                  Fasilitas Praktik · Laboratorium Jaringan &amp; Studio Desain
                </p>
                <h3 className="text-lg font-bold text-slate-900">
                  Lingkungan Belajar Berstandar Industri
                </h3>
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                  Perangkat jaringan enterprise, workstation grafis terkalibrasi,
                  serta laboratorium akuntansi dan perkantoran disiapkan untuk
                  memastikan rasio praktik langsung yang optimal bagi setiap siswa.
                </p>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
              <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                <ResilientImage
                  src="/src/assets/images/studio_broadcast_ak_1795396270109.jpg"
                  alt="Studio Broadcasting dan Bisnis Digital SMK Prima Unggul"
                  className="w-full h-full object-cover"
                  fallbackLabel="Studio Broadcasting & Bisnis Digital"
                />
              </div>
              <div className="p-6 flex-1 flex flex-col justify-center">
                <p className="text-xs font-medium text-slate-500 mb-1">
                  Studio Produksi · Penyiaran &amp; Niaga Digital
                </p>
                <h3 className="text-lg font-bold text-slate-900">
                  Studio Broadcasting &amp; Inkubator Bisnis
                </h3>
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                  Siswa Broadcasting dan Bisnis Digital berlatih langsung memproduksi
                  siaran, kampanye digital, hingga pengelolaan toko daring nyata.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {JURUSAN_LIST.map((item) => (
              <article
                key={item.code}
                className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-baseline justify-between gap-4 mb-2">
                    <span className="text-sm font-bold text-red-600 font-mono">
                      {item.code}
                    </span>
                    <span className="text-xs text-slate-500 truncate">
                      {item.cluster}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {item.name}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">
                    {item.description}
                  </p>
                </div>
                <p className="pt-3 border-t border-slate-100 text-xs text-slate-500">
                  {item.competencies}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Sistem Absensi Section */}
        <section
          id="sistem-absensi"
          className="bg-white border-t border-b border-slate-200 py-16 lg:py-20"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold tracking-wide text-red-600 mb-2">
                  Portal Presensi Terpadu
                </p>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 text-balance">
                  Alur Absensi Siswa dan Karyawan dalam Satu Sistem
                </h2>
              </div>
              <Link
                to={isLoggedIn ? '/app' : '/login'}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto"
              >
                <span>{isLoggedIn ? 'Buka Dashboard' : 'Login Sekarang'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border border-slate-200 rounded-xl p-6 bg-neutral-50">
                <p className="text-xs font-semibold text-red-600 mb-2">
                  Peran 01 · Administrator
                </p>
                <h3 className="text-lg font-bold text-slate-900 mb-3">
                  Admin Sekolah
                </h3>
                <ul className="space-y-2.5 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>Dashboard ringkasan kehadiran karyawan dan siswa harian</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>Kelola master data siswa (NIS, Nama, Kelas, Jurusan)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>
                      User Management tersinkron penuh hingga hard delete Supabase Auth
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>Rekap absensi karyawan dan siswa dengan ekspor CSV</span>
                  </li>
                </ul>
              </div>

              <div className="border border-slate-200 rounded-xl p-6 bg-neutral-50">
                <p className="text-xs font-semibold text-red-600 mb-2">
                  Peran 02 · Pengajar
                </p>
                <h3 className="text-lg font-bold text-slate-900 mb-3">
                  Guru Mata Pelajaran &amp; Wali Kelas
                </h3>
                <ul className="space-y-2.5 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>Absensi mandiri masuk dan pulang pada menu Absensi Karyawan</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>Input presensi siswa per kelas (Hadir, Sakit, Izin, Alpha)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>Akses rekap absensi siswa berdasarkan rentang tanggal</span>
                  </li>
                </ul>
              </div>

              <div className="border border-slate-200 rounded-xl p-6 bg-neutral-50">
                <p className="text-xs font-semibold text-red-600 mb-2">
                  Peran 03 · Staf Operasional
                </p>
                <h3 className="text-lg font-bold text-slate-900 mb-3">
                  Tenaga Kependidikan
                </h3>
                <ul className="space-y-2.5 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>Ringkasan status kehadiran pribadi bulan berjalan</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>Pencatatan check-in, check-out, izin, dan sakit mandiri</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>Riwayat kehadiran pribadi tercatat waktu WIB akurat</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Institutional Footer */}
      <footer id="kontak" className="bg-slate-900 text-slate-300">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <p className="text-base font-bold text-white mb-2">SMK Prima Unggul</p>
            <p className="text-sm text-slate-400 leading-relaxed">
              Sekolah Menengah Kejuruan berbasis kompetensi industri dengan program
              keahlian TKJ, DKV, AK, BC, MPLB, dan BD.
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-white mb-2">Kontak Sekolah</p>
            <p className="flex items-center gap-2 text-slate-400">
              <MapPin className="w-4 h-4 text-red-500 shrink-0" />
              <span>Jl. Pendidikan Vokasi No. 88, Tangerang</span>
            </p>
            <p className="flex items-center gap-2 text-slate-400">
              <Phone className="w-4 h-4 text-red-500 shrink-0" />
              <span className="tabular-nums">(021) 5578-9021</span>
            </p>
            <p className="flex items-center gap-2 text-slate-400">
              <Mail className="w-4 h-4 text-red-500 shrink-0" />
              <span>info@smkprimaunggul.sch.id</span>
            </p>
          </div>
          <div className="flex flex-col md:items-end justify-between text-sm">
            <div className="flex items-center gap-6 text-slate-400">
              <a href="#profil" className="hover:text-white transition-colors">
                Profil
              </a>
              <a href="#jurusan" className="hover:text-white transition-colors">
                Jurusan
              </a>
              <Link to="/login" className="hover:text-white transition-colors">
                Login
              </Link>
            </div>
            <p className="text-xs text-slate-500 mt-6 md:mt-0">
              © {new Date().getFullYear()} SMK Prima Unggul. Sistem Absensi Siswa &amp; Karyawan.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
