export type UserRole = 'admin' | 'guru' | 'tenaga_kependidikan';

export type JurusanCode = 'TKJ' | 'DKV' | 'AK' | 'BC' | 'MPLB' | 'BD';

export type EmployeeAttendanceStatus = 'hadir' | 'izin' | 'sakit';

export type StudentAttendanceStatus = 'hadir' | 'sakit' | 'izin' | 'alpha';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  nip: string | null;
  jabatan: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ManagedUser extends UserProfile {
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
}

export interface Student {
  id: string;
  nis: string;
  nama: string;
  kelas: string;
  jurusan: JurusanCode;
  aktif: boolean;
  created_at: string;
}

export interface EmployeeAttendanceRecord {
  id: string;
  user_id: string;
  tanggal: string;
  status: EmployeeAttendanceStatus;
  check_in_at: string;
  check_out_at: string | null;
  catatan: string | null;
  profiles?: {
    full_name: string;
    email: string;
    role: UserRole;
    nip: string | null;
    jabatan: string | null;
  };
}

export interface StudentAttendanceRow {
  student_id: string;
  nis: string;
  nama: string;
  kelas: string;
  jurusan: JurusanCode;
  attendance_id: string | null;
  status: StudentAttendanceStatus | null;
  catatan: string;
  updated_at: string | null;
}

export interface StudentAttendanceRecapItem {
  id: string;
  student_id: string;
  tanggal: string;
  status: StudentAttendanceStatus;
  catatan: string | null;
  recorded_by: string | null;
  students?: {
    nis: string;
    nama: string;
    kelas: string;
    jurusan: JurusanCode;
  };
  recorder?: {
    full_name: string;
  } | null;
}

export interface AppConfigStatus {
  configured: boolean;
  missingVars: string[];
  dbUrlConfigured: boolean;
  schemaReady: boolean;
  schemaError: string | null;
  hasUsers: boolean;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
}

export interface DashboardSummary {
  todayDate: string;
  myAttendanceToday: EmployeeAttendanceRecord | null;
  myMonthStats: {
    hadir: number;
    izin: number;
    sakit: number;
  };
  employeeTodayStats?: {
    totalEmployees: number;
    hadir: number;
    izin: number;
    sakit: number;
    belumAbsen: number;
  };
  studentTodayStats?: {
    totalStudents: number;
    hadir: number;
    sakit: number;
    izin: number;
    alpha: number;
    belumDiabsen: number;
  };
  recentEmployeeActivity?: EmployeeAttendanceRecord[];
}
