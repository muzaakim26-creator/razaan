import type {
  EmployeeAttendanceStatus,
  JurusanCode,
  StudentAttendanceStatus,
  UserRole,
} from '../types';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  guru: 'Guru',
  tenaga_kependidikan: 'Tenaga Kependidikan',
};

export const EMPLOYEE_STATUS_META: Record<
  EmployeeAttendanceStatus,
  { label: string; textClass: string; bgClass: string; borderClass: string }
> = {
  hadir: {
    label: 'Hadir',
    textClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
  },
  izin: {
    label: 'Izin',
    textClass: 'text-amber-700',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
  },
  sakit: {
    label: 'Sakit',
    textClass: 'text-sky-700',
    bgClass: 'bg-sky-50',
    borderClass: 'border-sky-200',
  },
};

export const STUDENT_STATUS_META: Record<
  StudentAttendanceStatus,
  { label: string; textClass: string; bgClass: string; borderClass: string }
> = {
  hadir: {
    label: 'Hadir',
    textClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
  },
  sakit: {
    label: 'Sakit',
    textClass: 'text-sky-700',
    bgClass: 'bg-sky-50',
    borderClass: 'border-sky-200',
  },
  izin: {
    label: 'Izin',
    textClass: 'text-amber-700',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
  },
  alpha: {
    label: 'Alpha',
    textClass: 'text-red-700',
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
  },
};

export interface JurusanInfo {
  code: JurusanCode;
  name: string;
  cluster: string;
  description: string;
  competencies: string;
}

export const JURUSAN_LIST: JurusanInfo[] = [
  {
    code: 'TKJ',
    name: 'Teknik Komputer & Jaringan',
    cluster: 'Teknologi Informasi & Komunikasi',
    description:
      'Merancang, mengonfigurasi, dan mengelola infrastruktur jaringan lokal, server cloud, serta keamanan sistem perusahaan.',
    competencies: 'MikroTik & Cisco Networking · Linux Server · Fiber Optik',
  },
  {
    code: 'DKV',
    name: 'Desain Komunikasi Visual',
    cluster: 'Teknologi Informasi & Komunikasi',
    description:
      'Mengembangkan solusi komunikasi visual melalui tipografi, identitas merek, ilustrasi digital, serta desain antarmuka modern.',
    competencies: 'Identitas Merek · Desain UI/UX · Produksi Grafis',
  },
  {
    code: 'BC',
    name: 'Broadcasting & Perfilman',
    cluster: 'Media Kreatif & Penyiaran',
    description:
      'Menguasai produksi program audio-visual, tata kamera sinematografi, penyutradaraan, dan penyuntingan pasca-produksi.',
    competencies: 'Sinematografi · Tata Suara Studio · Pasca-Produksi Video',
  },
  {
    code: 'BD',
    name: 'Bisnis Digital',
    cluster: 'Media Kreatif & Penyiaran',
    description:
      'Mengelola strategi niaga elektronik, analitik pemasaran digital, dan operasional bisnis berbasis platform daring.',
    competencies: 'E-Commerce · Analitik Pemasaran · Konten Komersial',
  },
  {
    code: 'MPLB',
    name: 'Manajemen Perkantoran & Layanan Bisnis',
    cluster: 'Manajemen & Keuangan Bisnis',
    description:
      'Mengelola tata kelola administrasi modern, korespondensi eksekutif, kearsipan digital, dan pelayanan prima organisasi.',
    competencies: 'Administrasi Digital · Kearsipan · Korespondensi Bisnis',
  },
  {
    code: 'AK',
    name: 'Akuntansi',
    cluster: 'Manajemen & Keuangan Bisnis',
    description:
      'Menyusun siklus laporan keuangan, akuntansi perpajakan, audit dasar, dan sistem akuntansi berbasis perangkat lunak.',
    competencies: 'Laporan Keuangan · Perpajakan · Perangkat Lunak Akuntansi',
  },
];

export const BIDANG_KEAHLIAN_CLUSTERS = [
  {
    index: '01.',
    title: 'Teknologi Informasi & Desain',
    majors: ['TKJ', 'DKV'] as JurusanCode[],
    summary:
      'Mempersiapkan teknisi jaringan berstandar industri serta desainer visual yang mampu menjawab kebutuhan komunikasi modern.',
  },
  {
    index: '02.',
    title: 'Penyiaran & Niaga Digital',
    majors: ['BC', 'BD'] as JurusanCode[],
    summary:
      'Menggabungkan kemampuan produksi konten audio-visual studio dengan strategi pemasaran dan ekosistem perdagangan digital.',
  },
  {
    index: '03.',
    title: 'Manajemen Perkantoran & Keuangan',
    majors: ['MPLB', 'AK'] as JurusanCode[],
    summary:
      'Mencetak tenaga administrasi perkantoran profesional dan analis pembukuan keuangan yang teliti serta akuntabel.',
  },
];

export function formatTanggalIndonesia(dateStr: string): string {
  if (!dateStr) return '-';
  const parsed = new Date(`${dateStr}T00:00:00+07:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

export function formatTanggalSingkat(dateStr: string): string {
  if (!dateStr) return '-';
  const parsed = new Date(`${dateStr}T00:00:00+07:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

export function formatJamWib(isoStr: string | null | undefined): string {
  if (!isoStr) return '-';
  const parsed = new Date(isoStr);
  if (Number.isNaN(parsed.getTime())) return '-';
  return (
    new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(parsed) + ' WIB'
  );
}

export function getTodayWib(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function getMonthStartWib(): string {
  return `${getTodayWib().slice(0, 7)}-01`;
}

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const escape = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvContent =
    '\uFEFF' +
    [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
