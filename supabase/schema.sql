-- =====================================================================
-- SMK Prima Unggul — Skema Database Relasional Supabase (PostgreSQL)
-- Terhubung langsung ke auth.users (Supabase Authentication)
-- =====================================================================

-- 1. Tabel Master Jurusan / Kompetensi Keahlian
create table if not exists public.majors (
  code text primary key check (code in ('TKJ', 'DKV', 'AK', 'BC', 'MPLB', 'BD')),
  name text not null,
  cluster text not null,
  created_at timestamptz not null default now()
);

insert into public.majors (code, name, cluster) values
  ('TKJ', 'Teknik Komputer & Jaringan', 'Teknologi Informasi & Komunikasi'),
  ('DKV', 'Desain Komunikasi Visual', 'Teknologi Informasi & Komunikasi'),
  ('BC', 'Broadcasting & Perfilman', 'Media Kreatif & Penyiaran'),
  ('BD', 'Bisnis Digital', 'Media Kreatif & Penyiaran'),
  ('MPLB', 'Manajemen Perkantoran & Layanan Bisnis', 'Manajemen & Keuangan Bisnis'),
  ('AK', 'Akuntansi', 'Manajemen & Keuangan Bisnis')
on conflict (code) do update set
  name = excluded.name,
  cluster = excluded.cluster;

-- 2. Tabel Master Kelas (Berelasi ke Jurusan)
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  major_code text not null references public.majors(code) on update cascade on delete restrict,
  created_at timestamptz not null default now()
);

-- 3. Tabel Profil Karyawan / Pengguna (Berelasi 1:1 ke auth.users Supabase Auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null check (role in ('admin', 'guru', 'tenaga_kependidikan')),
  nip text,
  jabatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Tabel Data Siswa (Berelasi ke Jurusan dan Kelas)
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  nis text not null unique,
  nama text not null,
  kelas text not null,
  jurusan text not null references public.majors(code) on update cascade on delete restrict,
  class_id uuid references public.classes(id) on update cascade on delete set null,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Tabel Absensi Karyawan (Berelasi ke public.profiles)
create table if not exists public.employee_attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tanggal date not null,
  status text not null check (status in ('hadir', 'izin', 'sakit')),
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  catatan text,
  created_at timestamptz not null default now(),
  unique (user_id, tanggal)
);

-- 6. Tabel Absensi Siswa (Berelasi ke public.students & public.profiles pencatat)
create table if not exists public.student_attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  tanggal date not null,
  status text not null check (status in ('hadir', 'sakit', 'izin', 'alpha')),
  catatan text,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, tanggal)
);

-- 7. Indeks Kinerja Query & Rekap
create index if not exists idx_employee_attendance_tanggal on public.employee_attendance(tanggal desc);
create index if not exists idx_employee_attendance_user_id on public.employee_attendance(user_id);
create index if not exists idx_student_attendance_tanggal on public.student_attendance(tanggal desc);
create index if not exists idx_student_attendance_student_id on public.student_attendance(student_id);
create index if not exists idx_students_kelas on public.students(kelas);
create index if not exists idx_students_jurusan on public.students(jurusan);

-- 8. Trigger Relasi Otomatis Siswa -> Tabel Kelas
create or replace function public.sync_student_class_relation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  matched_class_id uuid;
begin
  new.kelas := upper(trim(new.kelas));

  insert into public.classes (name, major_code)
  values (new.kelas, new.jurusan)
  on conflict (name) do update set major_code = excluded.major_code
  returning id into matched_class_id;

  new.class_id := matched_class_id;
  return new;
end;
$$;

drop trigger if exists trg_sync_student_class_relation on public.students;
create trigger trg_sync_student_class_relation
  before insert or update of kelas, jurusan on public.students
  for each row execute procedure public.sync_student_class_relation();

-- 9. Trigger Sinkronisasi Otomatis auth.users -> public.profiles
-- User pertama yang dibuat di Supabase Authentication otomatis mendapat role 'admin'
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  existing_count integer;
  assigned_role text;
begin
  select count(*) into existing_count from public.profiles;

  if existing_count = 0 then
    assigned_role := 'admin';
  else
    assigned_role := coalesce(
      nullif(new.raw_user_meta_data ->> 'role', ''),
      'tenaga_kependidikan'
    );
  end if;

  if assigned_role not in ('admin', 'guru', 'tenaga_kependidikan') then
    assigned_role := 'tenaga_kependidikan';
  end if;

  insert into public.profiles (id, email, full_name, role, nip, jabatan)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(new.email, 'User'), '@', 1)),
    assigned_role,
    new.raw_user_meta_data ->> 'nip',
    new.raw_user_meta_data ->> 'jabatan'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- Sinkronisasi perubahan email/metadata dari auth.users ke public.profiles
create or replace function public.handle_updated_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  next_role text;
begin
  next_role := nullif(new.raw_user_meta_data ->> 'role', '');
  if next_role is not null and next_role not in ('admin', 'guru', 'tenaga_kependidikan') then
    next_role := null;
  end if;

  update public.profiles
  set
    email = coalesce(new.email, email),
    full_name = coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), full_name),
    role = coalesce(next_role, role),
    nip = coalesce(new.raw_user_meta_data ->> 'nip', nip),
    jabatan = coalesce(new.raw_user_meta_data ->> 'jabatan', jabatan),
    updated_at = now()
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email, raw_user_meta_data on auth.users
  for each row execute procedure public.handle_updated_auth_user();

-- 10. View Relasional Siap Pakai untuk Laporan
create or replace view public.v_employee_attendance_detail as
select
  ea.id,
  ea.user_id,
  p.full_name,
  p.email,
  p.role,
  p.nip,
  p.jabatan,
  ea.tanggal,
  ea.status,
  ea.check_in_at,
  ea.check_out_at,
  ea.catatan
from public.employee_attendance ea
join public.profiles p on p.id = ea.user_id;

create or replace view public.v_student_attendance_detail as
select
  sa.id,
  sa.student_id,
  s.nis,
  s.nama as student_name,
  s.kelas,
  s.jurusan,
  m.name as major_name,
  sa.tanggal,
  sa.status,
  sa.catatan,
  sa.recorded_by,
  rec.full_name as recorded_by_name
from public.student_attendance sa
join public.students s on s.id = sa.student_id
join public.majors m on m.code = s.jurusan
left join public.profiles rec on rec.id = sa.recorded_by;

-- 11. Row Level Security (RLS)
alter table public.majors enable row level security;
alter table public.classes enable row level security;
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.employee_attendance enable row level security;
alter table public.student_attendance enable row level security;

drop policy if exists "Majors readable by authenticated users" on public.majors;
create policy "Majors readable by authenticated users"
  on public.majors for select
  to authenticated
  using (true);

drop policy if exists "Classes readable by authenticated users" on public.classes;
create policy "Classes readable by authenticated users"
  on public.classes for select
  to authenticated
  using (true);

drop policy if exists "Profiles readable by authenticated users" on public.profiles;
create policy "Profiles readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Students readable by authenticated users" on public.students;
create policy "Students readable by authenticated users"
  on public.students for select
  to authenticated
  using (true);

drop policy if exists "Employee attendance readable by owner" on public.employee_attendance;
create policy "Employee attendance readable by owner"
  on public.employee_attendance for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Student attendance readable by authenticated users" on public.student_attendance;
create policy "Student attendance readable by authenticated users"
  on public.student_attendance for select
  to authenticated
  using (true);
