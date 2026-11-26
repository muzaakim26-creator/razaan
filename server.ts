import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type UserRole = 'admin' | 'guru' | 'tenaga_kependidikan';
const VALID_ROLES: UserRole[] = ['admin', 'guru', 'tenaga_kependidikan'];
const VALID_JURUSAN = ['TKJ', 'DKV', 'AK', 'BC', 'MPLB', 'BD'] as const;
const VALID_EMP_STATUS = ['hadir', 'izin', 'sakit'] as const;
const VALID_STU_STATUS = ['hadir', 'sakit', 'izin', 'alpha'] as const;

interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  nip: string | null;
  jabatan: string | null;
  created_at: string;
  updated_at?: string;
}

interface AuthenticatedRequest extends Request {
  authUser?: User;
  userProfile?: ProfileRow;
}

const SUPABASE_URL = process.env.SUPABASE_URL?.trim() || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY?.trim() || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL?.trim() || '';

function getMissingEnvVars(): string[] {
  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SUPABASE_ANON_KEY) missing.push('SUPABASE_ANON_KEY');
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  return missing;
}

const SCHEMA_FILE_PATH = path.resolve(__dirname, 'supabase', 'schema.sql');

async function runSchemaMigration(): Promise<void> {
  if (!SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL belum dikonfigurasi pada environment server.');
  }
  if (!fs.existsSync(SCHEMA_FILE_PATH)) {
    throw new Error('File supabase/schema.sql tidak ditemukan.');
  }
  const sql = fs.readFileSync(SCHEMA_FILE_PATH, 'utf8');
  const pool = new Pool({
    connectionString: SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });
  try {
    await pool.query(sql);
  } finally {
    await pool.end();
  }
}

let supabaseAdmin: SupabaseClient | null = null;
let supabaseInitError: string | null = null;

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  try {
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  } catch (err) {
    supabaseInitError =
      err instanceof Error ? err.message : 'Konfigurasi Supabase URL/Key tidak valid.';
    console.error('Gagal menginisialisasi Supabase client:', supabaseInitError);
  }
}

function getTodayJakartaDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

async function ensureUserProfile(authUser: User): Promise<ProfileRow> {
  if (!supabaseAdmin) {
    throw new Error('Supabase belum dikonfigurasi.');
  }

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (existing) {
    return existing as ProfileRow;
  }

  // Cek apakah user ini adalah user pertama di Supabase Authentication
  const { count: profileCount } = await supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const { data: listData } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 50,
  });

  const sortedAuthUsers = [...(listData?.users || [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const isFirstUser =
    (profileCount ?? 0) === 0 ||
    (sortedAuthUsers.length > 0 && sortedAuthUsers[0].id === authUser.id);

  const metaRole = authUser.user_metadata?.role;
  const resolvedRole: UserRole = isFirstUser
    ? 'admin'
    : VALID_ROLES.includes(metaRole)
      ? metaRole
      : 'tenaga_kependidikan';

  const fullName =
    (typeof authUser.user_metadata?.full_name === 'string' &&
      authUser.user_metadata.full_name.trim()) ||
    authUser.email?.split('@')[0] ||
    'Pengguna';

  const { data: created, error: insertError } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        id: authUser.id,
        email: authUser.email || '',
        full_name: fullName,
        role: resolvedRole,
        nip: typeof authUser.user_metadata?.nip === 'string' ? authUser.user_metadata.nip : null,
        jabatan:
          typeof authUser.user_metadata?.jabatan === 'string'
            ? authUser.user_metadata.jabatan
            : resolvedRole === 'admin'
              ? 'Administrator Sistem'
              : null,
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single();

  if (insertError || !created) {
    throw new Error(insertError?.message || 'Gagal menyinkronkan profil pengguna.');
  }

  // Sinkronkan app_metadata.role di Supabase Auth
  if (authUser.app_metadata?.role !== resolvedRole) {
    await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
      app_metadata: { ...(authUser.app_metadata || {}), role: resolvedRole },
    });
  }

  return created as ProfileRow;
}

async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!supabaseAdmin) {
    res.status(503).json({
      error: 'Konfigurasi Supabase belum lengkap pada server.',
    });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan login kembali.' });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({ error: 'Token autentikasi kosong.' });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: 'Sesi telah berakhir atau tidak valid.' });
      return;
    }

    const profile = await ensureUserProfile(data.user);
    req.authUser = data.user;
    req.userProfile = profile;
    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal memverifikasi autentikasi.';
    res.status(500).json({ error: message });
  }
}

function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userProfile) {
      res.status(401).json({ error: 'Pengguna belum terautentikasi.' });
      return;
    }
    if (!allowedRoles.includes(req.userProfile.role)) {
      res.status(403).json({
        error: 'Anda tidak memiliki izin untuk mengakses fitur ini.',
      });
      return;
    }
    next();
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // =========================================================================
  // 1. Konfigurasi Publik, Status Supabase & Inisialisasi Database Relasional
  // =========================================================================
  if (SUPABASE_DB_URL) {
    runSchemaMigration()
      .then(() => {
        console.log('Skema database relasional Supabase berhasil disinkronkan.');
      })
      .catch((err) => {
        console.warn(
          'Peringatan sinkronisasi awal schema Supabase:',
          err instanceof Error ? err.message : err
        );
      });
  }

  app.get('/api/config/schema-sql', (_req: Request, res: Response) => {
    if (!fs.existsSync(SCHEMA_FILE_PATH)) {
      res.status(404).json({ error: 'File schema.sql tidak ditemukan.' });
      return;
    }
    const sql = fs.readFileSync(SCHEMA_FILE_PATH, 'utf8');
    res.json({ sql });
  });

  app.post('/api/config/init-db', async (req: Request, res: Response) => {
    if (!SUPABASE_DB_URL) {
      res.status(400).json({
        error: 'SUPABASE_DB_URL belum diisi pada Secrets server.',
      });
      return;
    }

    // Jika tabel profiles sudah ada dan memiliki user, wajib otentikasi admin
    if (supabaseAdmin) {
      const { error: checkErr, count } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true });
      if (!checkErr && (count ?? 0) > 0) {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          res.status(401).json({ error: 'Diperlukan otorisasi Admin untuk menjalankan migrasi ulang.' });
          return;
        }
        const { data: userData } = await supabaseAdmin.auth.getUser(authHeader.slice(7).trim());
        if (!userData.user) {
          res.status(401).json({ error: 'Token tidak valid.' });
          return;
        }
        const profile = await ensureUserProfile(userData.user);
        if (profile.role !== 'admin') {
          res.status(403).json({ error: 'Hanya Admin yang dapat menjalankan migrasi ulang.' });
          return;
        }
      }
    }

    try {
      await runSchemaMigration();
      res.json({
        success: true,
        message: 'Tabel relasional, foreign key, trigger, dan RLS berhasil dibuat di Supabase.',
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Gagal menjalankan migrasi SQL ke Supabase.',
      });
    }
  });

  app.get('/api/config/status', async (_req: Request, res: Response) => {
    const missingVars = getMissingEnvVars();
    if (missingVars.length > 0 || !supabaseAdmin) {
      res.json({
        configured: false,
        missingVars,
        dbUrlConfigured: Boolean(SUPABASE_DB_URL),
        schemaReady: false,
        schemaError: supabaseInitError,
        hasUsers: false,
        supabaseUrl: SUPABASE_URL || null,
        supabaseAnonKey: SUPABASE_ANON_KEY || null,
      });
      return;
    }

    let schemaReady = true;
    let schemaError: string | null = null;
    let hasUsers = false;

    try {
      const { error: majorsErr } = await supabaseAdmin
        .from('majors')
        .select('code', { count: 'exact', head: true });
      const { error: classesErr } = await supabaseAdmin
        .from('classes')
        .select('id', { count: 'exact', head: true });
      const { error: profilesErr } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true });
      const { error: studentsErr } = await supabaseAdmin
        .from('students')
        .select('id', { count: 'exact', head: true });
      const { error: empErr } = await supabaseAdmin
        .from('employee_attendance')
        .select('id', { count: 'exact', head: true });
      const { error: stuErr } = await supabaseAdmin
        .from('student_attendance')
        .select('id', { count: 'exact', head: true });

      const firstErr =
        majorsErr || classesErr || profilesErr || studentsErr || empErr || stuErr;
      if (firstErr) {
        schemaReady = false;
        schemaError = firstErr.message;
      }

      const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });
      hasUsers = (usersPage?.users?.length || 0) > 0;
    } catch (err) {
      schemaReady = false;
      schemaError = err instanceof Error ? err.message : 'Gagal memeriksa koneksi database.';
    }

    res.json({
      configured: true,
      missingVars: [],
      dbUrlConfigured: Boolean(SUPABASE_DB_URL),
      schemaReady,
      schemaError,
      hasUsers,
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: SUPABASE_ANON_KEY,
    });
  });

  // =========================================================================
  // 2. Autentikasi & Bootstrap Admin Pertama
  // =========================================================================
  app.post('/api/auth/register-first-admin', async (req: Request, res: Response) => {
    if (!supabaseAdmin) {
      res.status(503).json({ error: 'Supabase belum dikonfigurasi.' });
      return;
    }

    const { email, password, full_name, nip } = req.body || {};

    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Format email tidak valid.' });
      return;
    }
    if (typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ error: 'Kata sandi minimal 8 karakter.' });
      return;
    }
    if (typeof full_name !== 'string' || full_name.trim().length < 2) {
      res.status(400).json({ error: 'Nama lengkap wajib diisi.' });
      return;
    }

    try {
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 2,
      });

      if (listError) {
        res.status(500).json({ error: listError.message });
        return;
      }

      if ((existingUsers?.users?.length || 0) > 0) {
        res.status(403).json({
          error: 'Admin pertama sudah terdaftar. Silakan masuk menggunakan akun yang ada.',
        });
        return;
      }

      const { data: createdAuth, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: email.trim().toLowerCase(),
          password,
          email_confirm: true,
          app_metadata: { role: 'admin' },
          user_metadata: {
            full_name: full_name.trim(),
            role: 'admin',
            nip: typeof nip === 'string' && nip.trim() ? nip.trim() : null,
            jabatan: 'Administrator Utama',
          },
        });

      if (createError || !createdAuth.user) {
        res.status(400).json({ error: createError?.message || 'Gagal membuat akun admin.' });
        return;
      }

      const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
        {
          id: createdAuth.user.id,
          email: createdAuth.user.email || email.trim().toLowerCase(),
          full_name: full_name.trim(),
          role: 'admin',
          nip: typeof nip === 'string' && nip.trim() ? nip.trim() : null,
          jabatan: 'Administrator Utama',
        },
        { onConflict: 'id' }
      );

      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(createdAuth.user.id, false);
        res.status(500).json({
          error: `Gagal menyimpan profil admin (pastikan schema SQL sudah dijalankan): ${profileError.message}`,
        });
        return;
      }

      res.status(201).json({
        message: 'Akun Admin pertama berhasil dibuat dan disinkronkan dengan Supabase Auth.',
        email: createdAuth.user.email,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Terjadi kesalahan saat mendaftarkan admin.',
      });
    }
  });

  app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    res.json({
      user: {
        id: req.authUser!.id,
        email: req.authUser!.email,
      },
      profile: req.userProfile,
    });
  });

  // =========================================================================
  // 3. Dashboard Summary (Role-Aware)
  // =========================================================================
  app.get('/api/dashboard/summary', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const profile = req.userProfile!;
    const today = getTodayJakartaDate();
    const monthStart = `${today.slice(0, 7)}-01`;

    try {
      const { data: myToday } = await supabaseAdmin!
        .from('employee_attendance')
        .select('*')
        .eq('user_id', profile.id)
        .eq('tanggal', today)
        .maybeSingle();

      const { data: myMonthRows } = await supabaseAdmin!
        .from('employee_attendance')
        .select('status')
        .eq('user_id', profile.id)
        .gte('tanggal', monthStart)
        .lte('tanggal', today);

      const myMonthStats = { hadir: 0, izin: 0, sakit: 0 };
      for (const row of myMonthRows || []) {
        if (row.status === 'hadir') myMonthStats.hadir += 1;
        else if (row.status === 'izin') myMonthStats.izin += 1;
        else if (row.status === 'sakit') myMonthStats.sakit += 1;
      }

      const payload: Record<string, unknown> = {
        todayDate: today,
        myAttendanceToday: myToday || null,
        myMonthStats,
      };

      if (profile.role === 'admin') {
        const { count: totalEmployees } = await supabaseAdmin!
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        const { data: empTodayRows } = await supabaseAdmin!
          .from('employee_attendance')
          .select('*, profiles(full_name, email, role, nip, jabatan)')
          .eq('tanggal', today)
          .order('check_in_at', { ascending: false });

        let hadir = 0;
        let izin = 0;
        let sakit = 0;
        for (const row of empTodayRows || []) {
          if (row.status === 'hadir') hadir += 1;
          else if (row.status === 'izin') izin += 1;
          else if (row.status === 'sakit') sakit += 1;
        }

        const totalEmp = totalEmployees || 0;
        payload.employeeTodayStats = {
          totalEmployees: totalEmp,
          hadir,
          izin,
          sakit,
          belumAbsen: Math.max(0, totalEmp - (hadir + izin + sakit)),
        };
        payload.recentEmployeeActivity = (empTodayRows || []).slice(0, 8);
      }

      if (profile.role === 'admin' || profile.role === 'guru') {
        const { count: totalStudents } = await supabaseAdmin!
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('aktif', true);

        const { data: stuTodayRows } = await supabaseAdmin!
          .from('student_attendance')
          .select('status')
          .eq('tanggal', today);

        let hadir = 0;
        let sakit = 0;
        let izin = 0;
        let alpha = 0;
        for (const row of stuTodayRows || []) {
          if (row.status === 'hadir') hadir += 1;
          else if (row.status === 'sakit') sakit += 1;
          else if (row.status === 'izin') izin += 1;
          else if (row.status === 'alpha') alpha += 1;
        }

        const totalStu = totalStudents || 0;
        payload.studentTodayStats = {
          totalStudents: totalStu,
          hadir,
          sakit,
          izin,
          alpha,
          belumDiabsen: Math.max(0, totalStu - (hadir + sakit + izin + alpha)),
        };
      }

      res.json(payload);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Gagal memuat ringkasan dashboard.',
      });
    }
  });

  // =========================================================================
  // 4. Absensi Karyawan (Semua Role: Admin, Guru, Tenaga Kependidikan)
  // =========================================================================
  app.get(
    '/api/attendance/employees/me',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      const today = getTodayJakartaDate();
      try {
        const { data: todayRecord, error: todayErr } = await supabaseAdmin!
          .from('employee_attendance')
          .select('*')
          .eq('user_id', req.userProfile!.id)
          .eq('tanggal', today)
          .maybeSingle();

        if (todayErr) {
          res.status(500).json({ error: todayErr.message });
          return;
        }

        const { data: history, error: histErr } = await supabaseAdmin!
          .from('employee_attendance')
          .select('*')
          .eq('user_id', req.userProfile!.id)
          .order('tanggal', { ascending: false })
          .limit(30);

        if (histErr) {
          res.status(500).json({ error: histErr.message });
          return;
        }

        res.json({
          todayDate: today,
          todayRecord: todayRecord || null,
          history: history || [],
        });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Gagal mengambil riwayat absensi.',
        });
      }
    }
  );

  app.post(
    '/api/attendance/employees/check-in',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      const { status, catatan } = req.body || {};
      if (!VALID_EMP_STATUS.includes(status)) {
        res.status(400).json({ error: 'Status absensi harus hadir, izin, atau sakit.' });
        return;
      }

      const today = getTodayJakartaDate();

      try {
        const { data: existing } = await supabaseAdmin!
          .from('employee_attendance')
          .select('id')
          .eq('user_id', req.userProfile!.id)
          .eq('tanggal', today)
          .maybeSingle();

        if (existing) {
          res.status(409).json({
            error: 'Anda sudah melakukan absensi masuk pada hari ini.',
          });
          return;
        }

        const cleanNotes =
          typeof catatan === 'string' && catatan.trim() ? catatan.trim().slice(0, 300) : null;

        const { data: inserted, error } = await supabaseAdmin!
          .from('employee_attendance')
          .insert({
            user_id: req.userProfile!.id,
            tanggal: today,
            status,
            check_in_at: new Date().toISOString(),
            catatan: cleanNotes,
          })
          .select('*')
          .single();

        if (error) {
          res.status(500).json({ error: error.message });
          return;
        }

        res.status(201).json({ record: inserted });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Gagal menyimpan absensi masuk.',
        });
      }
    }
  );

  app.post(
    '/api/attendance/employees/check-out',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      const today = getTodayJakartaDate();

      try {
        const { data: existing, error: fetchErr } = await supabaseAdmin!
          .from('employee_attendance')
          .select('*')
          .eq('user_id', req.userProfile!.id)
          .eq('tanggal', today)
          .maybeSingle();

        if (fetchErr) {
          res.status(500).json({ error: fetchErr.message });
          return;
        }

        if (!existing) {
          res.status(404).json({ error: 'Anda belum melakukan absensi masuk hari ini.' });
          return;
        }

        if (existing.check_out_at) {
          res.status(409).json({ error: 'Anda sudah melakukan absensi pulang hari ini.' });
          return;
        }

        const { data: updated, error: updateErr } = await supabaseAdmin!
          .from('employee_attendance')
          .update({ check_out_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select('*')
          .single();

        if (updateErr) {
          res.status(500).json({ error: updateErr.message });
          return;
        }

        res.json({ record: updated });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Gagal menyimpan absensi pulang.',
        });
      }
    }
  );

  // Rekap Absensi Karyawan (Admin Only)
  app.get(
    '/api/attendance/employees/recap',
    requireAuth,
    requireRole(['admin']),
    async (req: AuthenticatedRequest, res: Response) => {
      const today = getTodayJakartaDate();
      const startDate = isValidDateString(req.query.startDate)
        ? req.query.startDate
        : `${today.slice(0, 7)}-01`;
      const endDate = isValidDateString(req.query.endDate) ? req.query.endDate : today;
      const roleFilter =
        typeof req.query.role === 'string' && VALID_ROLES.includes(req.query.role as UserRole)
          ? (req.query.role as UserRole)
          : null;
      const statusFilter =
        typeof req.query.status === 'string' &&
        VALID_EMP_STATUS.includes(req.query.status as (typeof VALID_EMP_STATUS)[number])
          ? req.query.status
          : null;
      const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

      try {
        let query = supabaseAdmin!
          .from('employee_attendance')
          .select('*, profiles!inner(full_name, email, role, nip, jabatan)')
          .gte('tanggal', startDate)
          .lte('tanggal', endDate)
          .order('tanggal', { ascending: false })
          .order('check_in_at', { ascending: false });

        if (statusFilter) {
          query = query.eq('status', statusFilter);
        }
        if (roleFilter) {
          query = query.eq('profiles.role', roleFilter);
        }

        const { data, error } = await query;
        if (error) {
          res.status(500).json({ error: error.message });
          return;
        }

        let rows = data || [];
        if (search) {
          rows = rows.filter((item) => {
            const name = item.profiles?.full_name?.toLowerCase() || '';
            const email = item.profiles?.email?.toLowerCase() || '';
            const nip = item.profiles?.nip?.toLowerCase() || '';
            return name.includes(search) || email.includes(search) || nip.includes(search);
          });
        }

        res.json({ records: rows, startDate, endDate });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Gagal memuat rekap absensi karyawan.',
        });
      }
    }
  );

  // =========================================================================
  // 5. Data Siswa (Admin CRUD, Guru Read-Only)
  // =========================================================================
  app.get(
    '/api/students',
    requireAuth,
    requireRole(['admin', 'guru']),
    async (req: AuthenticatedRequest, res: Response) => {
      const kelas = typeof req.query.kelas === 'string' ? req.query.kelas.trim() : '';
      const jurusan = typeof req.query.jurusan === 'string' ? req.query.jurusan.trim() : '';
      const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

      try {
        let query = supabaseAdmin!
          .from('students')
          .select('*')
          .order('kelas', { ascending: true })
          .order('nama', { ascending: true });

        if (kelas) query = query.eq('kelas', kelas);
        if (jurusan && VALID_JURUSAN.includes(jurusan as (typeof VALID_JURUSAN)[number])) {
          query = query.eq('jurusan', jurusan);
        }

        const { data, error } = await query;
        if (error) {
          res.status(500).json({ error: error.message });
          return;
        }

        let students = data || [];
        if (search) {
          students = students.filter(
            (s) =>
              s.nama.toLowerCase().includes(search) ||
              s.nis.toLowerCase().includes(search) ||
              s.kelas.toLowerCase().includes(search)
          );
        }

        res.json({ students });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Gagal mengambil data siswa.',
        });
      }
    }
  );

  app.post(
    '/api/students',
    requireAuth,
    requireRole(['admin']),
    async (req: AuthenticatedRequest, res: Response) => {
      const { nis, nama, kelas, jurusan } = req.body || {};

      if (typeof nis !== 'string' || nis.trim().length < 3) {
        res.status(400).json({ error: 'NIS siswa minimal 3 karakter.' });
        return;
      }
      if (typeof nama !== 'string' || nama.trim().length < 2) {
        res.status(400).json({ error: 'Nama siswa wajib diisi.' });
        return;
      }
      if (typeof kelas !== 'string' || kelas.trim().length < 2) {
        res.status(400).json({ error: 'Kelas wajib diisi (contoh: X TKJ 1).' });
        return;
      }
      if (!VALID_JURUSAN.includes(jurusan)) {
        res.status(400).json({ error: 'Jurusan harus salah satu dari TKJ, DKV, AK, BC, MPLB, atau BD.' });
        return;
      }

      try {
        const { data: created, error } = await supabaseAdmin!
          .from('students')
          .insert({
            nis: nis.trim(),
            nama: nama.trim(),
            kelas: kelas.trim().toUpperCase(),
            jurusan,
            aktif: true,
          })
          .select('*')
          .single();

        if (error) {
          if (error.code === '23505') {
            res.status(409).json({ error: 'NIS sudah terdaftar pada siswa lain.' });
            return;
          }
          res.status(500).json({ error: error.message });
          return;
        }

        res.status(201).json({ student: created });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Gagal menambahkan data siswa.',
        });
      }
    }
  );

  app.put(
    '/api/students/:id',
    requireAuth,
    requireRole(['admin']),
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      if (!isValidUuid(id)) {
        res.status(400).json({ error: 'ID siswa tidak valid.' });
        return;
      }

      const { nis, nama, kelas, jurusan, aktif } = req.body || {};

      if (typeof nis !== 'string' || nis.trim().length < 3) {
        res.status(400).json({ error: 'NIS siswa minimal 3 karakter.' });
        return;
      }
      if (typeof nama !== 'string' || nama.trim().length < 2) {
        res.status(400).json({ error: 'Nama siswa wajib diisi.' });
        return;
      }
      if (typeof kelas !== 'string' || kelas.trim().length < 2) {
        res.status(400).json({ error: 'Kelas wajib diisi.' });
        return;
      }
      if (!VALID_JURUSAN.includes(jurusan)) {
        res.status(400).json({ error: 'Jurusan tidak valid.' });
        return;
      }

      try {
        const { data: updated, error } = await supabaseAdmin!
          .from('students')
          .update({
            nis: nis.trim(),
            nama: nama.trim(),
            kelas: kelas.trim().toUpperCase(),
            jurusan,
            aktif: typeof aktif === 'boolean' ? aktif : true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select('*')
          .single();

        if (error) {
          if (error.code === '23505') {
            res.status(409).json({ error: 'NIS sudah digunakan siswa lain.' });
            return;
          }
          res.status(500).json({ error: error.message });
          return;
        }

        res.json({ student: updated });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Gagal memperbarui data siswa.',
        });
      }
    }
  );

  app.delete(
    '/api/students/:id',
    requireAuth,
    requireRole(['admin']),
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      if (!isValidUuid(id)) {
        res.status(400).json({ error: 'ID siswa tidak valid.' });
        return;
      }

      try {
        const { error } = await supabaseAdmin!.from('students').delete().eq('id', id);
        if (error) {
          res.status(500).json({ error: error.message });
          return;
        }
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Gagal menghapus data siswa.',
        });
      }
    }
  );

  // =========================================================================
  // 6. Absensi Siswa & Rekap Absensi Siswa (Admin & Guru)
  // =========================================================================
  app.get(
    '/api/attendance/students',
    requireAuth,
    requireRole(['admin', 'guru']),
    async (req: AuthenticatedRequest, res: Response) => {
      const date = isValidDateString(req.query.date)
        ? req.query.date
        : getTodayJakartaDate();
      const kelas = typeof req.query.kelas === 'string' ? req.query.kelas.trim() : '';

      try {
        let studentQuery = supabaseAdmin!
          .from('students')
          .select('*')
          .eq('aktif', true)
          .order('kelas', { ascending: true })
          .order('nama', { ascending: true });

        if (kelas) {
          studentQuery = studentQuery.eq('kelas', kelas);
        }

        const { data: students, error: stuErr } = await studentQuery;
        if (stuErr) {
          res.status(500).json({ error: stuErr.message });
          return;
        }

        const studentIds = (students || []).map((s) => s.id);
        let attendanceMap = new Map<string, { id: string; status: string; catatan: string | null; updated_at: string }>();

        if (studentIds.length > 0) {
          const { data: attRows, error: attErr } = await supabaseAdmin!
            .from('student_attendance')
            .select('id, student_id, status, catatan, updated_at')
            .eq('tanggal', date)
            .in('student_id', studentIds);

          if (attErr) {
            res.status(500).json({ error: attErr.message });
            return;
          }

          for (const row of attRows || []) {
            attendanceMap.set(row.student_id, row);
          }
        }

        const { data: allClassRows } = await supabaseAdmin!
          .from('students')
          .select('kelas')
          .eq('aktif', true);

        const availableClasses = Array.from(
          new Set((allClassRows || []).map((c) => c.kelas).filter(Boolean))
        ).sort();

        const rows = (students || []).map((s) => {
          const att = attendanceMap.get(s.id);
          return {
            student_id: s.id,
            nis: s.nis,
            nama: s.nama,
            kelas: s.kelas,
            jurusan: s.jurusan,
            attendance_id: att?.id || null,
            status: att?.status || null,
            catatan: att?.catatan || '',
            updated_at: att?.updated_at || null,
          };
        });

        res.json({ date, availableClasses, rows });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Gagal memuat daftar absensi siswa.',
        });
      }
    }
  );

  app.post(
    '/api/attendance/students/bulk',
    requireAuth,
    requireRole(['admin', 'guru']),
    async (req: AuthenticatedRequest, res: Response) => {
      const { date, entries } = req.body || {};

      if (!isValidDateString(date)) {
        res.status(400).json({ error: 'Format tanggal tidak valid (YYYY-MM-DD).' });
        return;
      }

      if (!Array.isArray(entries) || entries.length === 0) {
        res.status(400).json({ error: 'Minimal satu data absensi siswa harus dikirim.' });
        return;
      }

      const payload: Array<{
        student_id: string;
        tanggal: string;
        status: string;
        catatan: string | null;
        recorded_by: string;
        updated_at: string;
      }> = [];

      const nowIso = new Date().toISOString();

      for (const entry of entries) {
        if (!entry || !isValidUuid(entry.student_id)) {
          res.status(400).json({ error: 'Terdapat ID siswa yang tidak valid.' });
          return;
        }
        if (!VALID_STU_STATUS.includes(entry.status)) {
          res.status(400).json({
            error: 'Status absensi siswa harus hadir, sakit, izin, atau alpha.',
          });
          return;
        }
        payload.push({
          student_id: entry.student_id,
          tanggal: date,
          status: entry.status,
          catatan:
            typeof entry.catatan === 'string' && entry.catatan.trim()
              ? entry.catatan.trim().slice(0, 250)
              : null,
          recorded_by: req.userProfile!.id,
          updated_at: nowIso,
        });
      }

      try {
        const { error } = await supabaseAdmin!
          .from('student_attendance')
          .upsert(payload, { onConflict: 'student_id,tanggal' });

        if (error) {
          res.status(500).json({ error: error.message });
          return;
        }

        res.json({
          message: `Berhasil menyimpan absensi ${payload.length} siswa untuk tanggal ${date}.`,
          savedCount: payload.length,
        });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Gagal menyimpan absensi siswa.',
        });
      }
    }
  );

  app.get(
    '/api/attendance/students/recap',
    requireAuth,
    requireRole(['admin', 'guru']),
    async (req: AuthenticatedRequest, res: Response) => {
      const today = getTodayJakartaDate();
      const startDate = isValidDateString(req.query.startDate)
        ? req.query.startDate
        : `${today.slice(0, 7)}-01`;
      const endDate = isValidDateString(req.query.endDate) ? req.query.endDate : today;
      const kelas = typeof req.query.kelas === 'string' ? req.query.kelas.trim() : '';
      const statusFilter =
        typeof req.query.status === 'string' &&
        VALID_STU_STATUS.includes(req.query.status as (typeof VALID_STU_STATUS)[number])
          ? req.query.status
          : '';
      const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

      try {
        let query = supabaseAdmin!
          .from('student_attendance')
          .select(
            'id, student_id, tanggal, status, catatan, recorded_by, students!inner(nis, nama, kelas, jurusan), recorder:profiles(full_name)'
          )
          .gte('tanggal', startDate)
          .lte('tanggal', endDate)
          .order('tanggal', { ascending: false });

        if (kelas) {
          query = query.eq('students.kelas', kelas);
        }
        if (statusFilter) {
          query = query.eq('status', statusFilter);
        }

        const { data, error } = await query;
        if (error) {
          res.status(500).json({ error: error.message });
          return;
        }

        let records = data || [];
        if (search) {
          records = records.filter((item: Record<string, unknown>) => {
            const stu = item.students as { nama?: string; nis?: string; kelas?: string } | undefined;
            const nama = stu?.nama?.toLowerCase() || '';
            const nis = stu?.nis?.toLowerCase() || '';
            const kls = stu?.kelas?.toLowerCase() || '';
            return nama.includes(search) || nis.includes(search) || kls.includes(search);
          });
        }

        const { data: classRows } = await supabaseAdmin!
          .from('students')
          .select('kelas')
          .order('kelas', { ascending: true });
        const availableClasses = Array.from(
          new Set((classRows || []).map((r) => r.kelas).filter(Boolean))
        ).sort();

        res.json({ records, startDate, endDate, availableClasses });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Gagal memuat rekap absensi siswa.',
        });
      }
    }
  );

  // =========================================================================
  // 7. User Management (Admin Only — Sinkron Penuh ke Supabase Auth)
  // =========================================================================
  app.get(
    '/api/users',
    requireAuth,
    requireRole(['admin']),
    async (_req: AuthenticatedRequest, res: Response) => {
      try {
        const { data: authList, error: authErr } = await supabaseAdmin!.auth.admin.listUsers({
          page: 1,
          perPage: 500,
        });

        if (authErr) {
          res.status(500).json({ error: authErr.message });
          return;
        }

        const { data: profiles, error: profErr } = await supabaseAdmin!
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: true });

        if (profErr) {
          res.status(500).json({ error: profErr.message });
          return;
        }

        const profileMap = new Map<string, ProfileRow>();
        for (const p of profiles || []) {
          profileMap.set(p.id, p as ProfileRow);
        }

        const users = [];
        for (const authUser of authList?.users || []) {
          let prof = profileMap.get(authUser.id);
          if (!prof) {
            prof = await ensureUserProfile(authUser);
          }
          users.push({
            id: authUser.id,
            email: authUser.email || prof.email,
            full_name: prof.full_name,
            role: prof.role,
            nip: prof.nip,
            jabatan: prof.jabatan,
            created_at: prof.created_at || authUser.created_at,
            email_confirmed_at: authUser.email_confirmed_at || null,
            last_sign_in_at: authUser.last_sign_in_at || null,
          });
        }

        users.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        res.json({ users });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Gagal mengambil daftar pengguna.',
        });
      }
    }
  );

  app.get(
    '/api/users/:id',
    requireAuth,
    requireRole(['admin']),
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      if (!isValidUuid(id)) {
        res.status(400).json({ error: 'ID pengguna tidak valid.' });
        return;
      }

      try {
        const { data: authData, error: authErr } =
          await supabaseAdmin!.auth.admin.getUserById(id);

        if (authErr || !authData.user) {
          res.status(404).json({ error: 'Pengguna tidak ditemukan di Supabase Auth.' });
          return;
        }

        const prof = await ensureUserProfile(authData.user);
        res.json({
          user: {
            id: authData.user.id,
            email: authData.user.email || prof.email,
            full_name: prof.full_name,
            role: prof.role,
            nip: prof.nip,
            jabatan: prof.jabatan,
            created_at: prof.created_at,
            email_confirmed_at: authData.user.email_confirmed_at || null,
            last_sign_in_at: authData.user.last_sign_in_at || null,
          },
        });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Gagal mengambil detail pengguna.',
        });
      }
    }
  );

  app.post(
    '/api/users',
    requireAuth,
    requireRole(['admin']),
    async (req: AuthenticatedRequest, res: Response) => {
      const { email, password, full_name, role, nip, jabatan } = req.body || {};

      if (!isValidEmail(email)) {
        res.status(400).json({ error: 'Format email tidak valid.' });
        return;
      }
      if (typeof password !== 'string' || password.length < 8) {
        res.status(400).json({ error: 'Kata sandi minimal 8 karakter.' });
        return;
      }
      if (typeof full_name !== 'string' || full_name.trim().length < 2) {
        res.status(400).json({ error: 'Nama lengkap wajib diisi.' });
        return;
      }
      if (!VALID_ROLES.includes(role)) {
        res.status(400).json({ error: 'Role harus admin, guru, atau tenaga_kependidikan.' });
        return;
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanName = full_name.trim();
      const cleanNip = typeof nip === 'string' && nip.trim() ? nip.trim() : null;
      const cleanJabatan = typeof jabatan === 'string' && jabatan.trim() ? jabatan.trim() : null;

      try {
        const { data: createdAuth, error: createAuthErr } =
          await supabaseAdmin!.auth.admin.createUser({
            email: cleanEmail,
            password,
            email_confirm: true,
            app_metadata: { role },
            user_metadata: {
              full_name: cleanName,
              role,
              nip: cleanNip,
              jabatan: cleanJabatan,
            },
          });

        if (createAuthErr || !createdAuth.user) {
          res.status(400).json({
            error: createAuthErr?.message || 'Gagal membuat user di Supabase Authentication.',
          });
          return;
        }

        const { data: createdProfile, error: profErr } = await supabaseAdmin!
          .from('profiles')
          .upsert(
            {
              id: createdAuth.user.id,
              email: cleanEmail,
              full_name: cleanName,
              role,
              nip: cleanNip,
              jabatan: cleanJabatan,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          )
          .select('*')
          .single();

        if (profErr) {
          await supabaseAdmin!.auth.admin.deleteUser(createdAuth.user.id, false);
          res.status(500).json({ error: profErr.message });
          return;
        }

        res.status(201).json({
          user: {
            ...createdProfile,
            email_confirmed_at: createdAuth.user.email_confirmed_at || null,
            last_sign_in_at: null,
          },
        });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Gagal menambahkan user baru.',
        });
      }
    }
  );

  app.put(
    '/api/users/:id',
    requireAuth,
    requireRole(['admin']),
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      if (!isValidUuid(id)) {
        res.status(400).json({ error: 'ID pengguna tidak valid.' });
        return;
      }

      const { email, password, full_name, role, nip, jabatan } = req.body || {};

      if (!isValidEmail(email)) {
        res.status(400).json({ error: 'Format email tidak valid.' });
        return;
      }
      if (typeof full_name !== 'string' || full_name.trim().length < 2) {
        res.status(400).json({ error: 'Nama lengkap wajib diisi.' });
        return;
      }
      if (!VALID_ROLES.includes(role)) {
        res.status(400).json({ error: 'Role tidak valid.' });
        return;
      }
      if (password && (typeof password !== 'string' || password.length < 8)) {
        res.status(400).json({ error: 'Kata sandi baru minimal 8 karakter.' });
        return;
      }

      // Cegah admin menurunkan role dirinya sendiri jika ia satu-satunya admin
      if (id === req.userProfile!.id && role !== 'admin') {
        const { count: adminCount } = await supabaseAdmin!
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'admin');
        if ((adminCount || 0) <= 1) {
          res.status(400).json({
            error: 'Tidak dapat mengubah role admin terakhir yang sedang aktif.',
          });
          return;
        }
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanName = full_name.trim();
      const cleanNip = typeof nip === 'string' && nip.trim() ? nip.trim() : null;
      const cleanJabatan = typeof jabatan === 'string' && jabatan.trim() ? jabatan.trim() : null;

      try {
        const authUpdatePayload: {
          email: string;
          email_confirm: boolean;
          password?: string;
          app_metadata: Record<string, string>;
          user_metadata: Record<string, string | null>;
        } = {
          email: cleanEmail,
          email_confirm: true,
          app_metadata: { role },
          user_metadata: {
            full_name: cleanName,
            role,
            nip: cleanNip,
            jabatan: cleanJabatan,
          },
        };

        if (typeof password === 'string' && password.length >= 8) {
          authUpdatePayload.password = password;
        }

        const { data: updatedAuth, error: authErr } =
          await supabaseAdmin!.auth.admin.updateUserById(id, authUpdatePayload);

        if (authErr || !updatedAuth.user) {
          res.status(400).json({
            error: authErr?.message || 'Gagal memperbarui user pada Supabase Auth.',
          });
          return;
        }

        const { data: updatedProfile, error: profErr } = await supabaseAdmin!
          .from('profiles')
          .upsert(
            {
              id,
              email: cleanEmail,
              full_name: cleanName,
              role,
              nip: cleanNip,
              jabatan: cleanJabatan,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          )
          .select('*')
          .single();

        if (profErr) {
          res.status(500).json({ error: profErr.message });
          return;
        }

        res.json({
          user: {
            ...updatedProfile,
            email_confirmed_at: updatedAuth.user.email_confirmed_at || null,
            last_sign_in_at: updatedAuth.user.last_sign_in_at || null,
          },
        });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Gagal memperbarui data pengguna.',
        });
      }
    }
  );

  app.delete(
    '/api/users/:id',
    requireAuth,
    requireRole(['admin']),
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      if (!isValidUuid(id)) {
        res.status(400).json({ error: 'ID pengguna tidak valid.' });
        return;
      }

      if (id === req.userProfile!.id) {
        res.status(400).json({
          error: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang login.',
        });
        return;
      }

      try {
        // Lepaskan relasi recorded_by pada absensi siswa agar riwayat absensi siswa tetap utuh
        await supabaseAdmin!
          .from('student_attendance')
          .update({ recorded_by: null })
          .eq('recorded_by', id);

        // Hapus profil & riwayat absensi karyawan
        await supabaseAdmin!.from('employee_attendance').delete().eq('user_id', id);
        await supabaseAdmin!.from('profiles').delete().eq('id', id);

        // Hard delete sampai ke Supabase Authentication (shouldSoftDelete = false)
        const { error: deleteAuthErr } = await supabaseAdmin!.auth.admin.deleteUser(id, false);
        if (deleteAuthErr) {
          res.status(500).json({
            error: `Gagal menghapus user dari Supabase Authentication: ${deleteAuthErr.message}`,
          });
          return;
        }

        res.json({
          success: true,
          message: 'Pengguna berhasil dihapus permanen hingga ke Supabase Authentication.',
        });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Gagal menghapus pengguna.',
        });
      }
    }
  );

  // =========================================================================
  // 8. Vite Middleware (Dev) atau Static Build + SPA History Fallback (Prod)
  // =========================================================================
  const distDir = path.resolve(import.meta.dirname, 'dist');
  const useProdStatic =
    process.env.NODE_ENV === 'production' && fs.existsSync(path.join(distDir, 'index.html'));

  if (!useProdStatic) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SMK Prima Unggul server berjalan pada http://0.0.0.0:${PORT}`);
  });
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

startServer().catch((err) => {
  console.error('Gagal menjalankan server:', err);
  process.exit(1);
});
