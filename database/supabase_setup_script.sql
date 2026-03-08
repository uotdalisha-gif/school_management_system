-- 1. Students Table
create table if not exists public.students (
  id text primary key,
  name text not null,
  sex text check (sex in ('Male', 'Female')),
  dob date,
  phone text,
  enrollment_date date default current_date,
  status text default 'Active',
  tuition jsonb default '{"total": 0, "paid": 0}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Staff Table
create table if not exists public.staff (
  id text primary key,
  name text not null,
  role text not null,
  subject text,
  contact text,
  hire_date date default current_date,
  password text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Classes Table
create table if not exists public.classes (
  id text primary key,
  name text not null,
  teacher_id text references public.staff(id) on delete set null,
  schedule text,
  level text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Enrollments Table (Many-to-Many)
create table if not exists public.enrollments (
  id text primary key,
  student_id text not null references public.students(id) on delete cascade,
  class_id text not null references public.classes(id) on delete cascade,
  academic_year text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(student_id, class_id, academic_year)
);

-- 5. Grades Table
create table if not exists public.grades (
  id text primary key,
  student_id text not null references public.students(id) on delete cascade,
  subject text not null,
  score numeric(4,2) check (score >= 0 and score <= 10),
  term text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Attendance Table
create table if not exists public.attendance (
  id text primary key,
  student_id text not null references public.students(id) on delete cascade,
  date date not null,
  status text check (status in ('Present', 'Absent', 'Late')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(student_id, date)
);

-- 7. School Events Table
create table if not exists public.school_events (
  id text primary key,
  title text not null,
  date date not null,
  description text,
  type text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Settings Table
create table if not exists public.settings (
  id text primary key default 'global',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Audit Log Table
create table if not exists public.audit_log (
  id uuid primary key default uuid_generate_v4(),
  table_name text not null,
  record_id text not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

create or replace function public.sync_school_data_v2(
  p_students jsonb,
  p_staff jsonb,
  p_staff_permissions jsonb,
  p_daily_logs jsonb,
  p_incident_reports jsonb,
  p_room_statuses jsonb,
  p_classes jsonb,
  p_enrollments jsonb,
  p_grades jsonb,
  p_attendance jsonb,
  p_events jsonb,
  p_config jsonb
) returns void as $$
begin
  -- 1. Sync Students
  delete from public.students;
  insert into public.students (id, name, sex, dob, phone, enrollment_date, status, tuition)
  select 
    (value->>'id'), (value->>'name'), (value->>'sex'), 
    (value->>'dob')::date, (value->>'phone'), 
    (value->>'enrollment_date')::date, (value->>'status'), 
    (value->'tuition')
  from jsonb_array_elements(p_students);

  -- 2. Sync Staff
  delete from public.staff;
  insert into public.staff (id, name, role, subject, contact, hire_date, password)
  select 
    (value->>'id'), (value->>'name'), (value->>'role'), 
    (value->>'subject'), (value->>'contact'), (value->>'hire_date')::date,
    (value->>'password')
  from jsonb_array_elements(p_staff);

  -- 2.5 Sync Staff Permissions
  delete from public.staff_permissions;
  insert into public.staff_permissions (id, staff_id, type, start_date, end_date, reason, created_at)
  select 
    (value->>'id'), (value->>'staff_id'), (value->>'type'), 
    (value->>'start_date')::date, (value->>'end_date')::date, 
    (value->>'reason'), (value->>'created_at')::timestamp with time zone
  from jsonb_array_elements(p_staff_permissions);

  -- 2.6 Sync Daily Logs
  delete from public.daily_logs;
  insert into public.daily_logs (id, staff_id, type, person_name, purpose, timestamp)
  select 
    (value->>'id'), (value->>'staff_id'), (value->>'type'), 
    (value->>'person_name'), (value->>'purpose'), 
    (value->>'timestamp')::timestamp with time zone
  from jsonb_array_elements(p_daily_logs);

  -- 2.7 Sync Incident Reports
  delete from public.incident_reports;
  insert into public.incident_reports (id, staff_id, title, description, severity, timestamp)
  select 
    (value->>'id'), (value->>'staff_id'), (value->>'title'), 
    (value->>'description'), (value->>'severity'), 
    (value->>'timestamp')::timestamp with time zone
  from jsonb_array_elements(p_incident_reports);

  -- 2.8 Sync Room Statuses
  delete from public.room_statuses;
  insert into public.room_statuses (id, room_name, status, last_updated_by, timestamp)
  select 
    (value->>'id'), (value->>'room_name'), (value->>'status'), 
    (value->>'last_updated_by'), (value->>'timestamp')::timestamp with time zone
  from jsonb_array_elements(p_room_statuses);

  -- 3. Sync Classes
  delete from public.classes;
  insert into public.classes (id, name, teacher_id, schedule, level)
  select 
    (value->>'id'), (value->>'name'), (value->>'teacher_id'), 
    (value->>'schedule'), (value->>'level')
  from jsonb_array_elements(p_classes);

  -- 4. Sync Enrollments
  delete from public.enrollments;
  insert into public.enrollments (id, student_id, class_id, academic_year)
  select 
    (value->>'id'), (value->>'student_id'), (value->>'class_id'), (value->>'academic_year')
  from jsonb_array_elements(p_enrollments);

  -- 5. Sync Grades
  delete from public.grades;
  insert into public.grades (id, student_id, subject, score, term)
  select 
    (value->>'id'), (value->>'student_id'), (value->>'subject'), 
    (value->>'score')::numeric, (value->>'term')
  from jsonb_array_elements(p_grades);

  -- 6. Sync Attendance
  delete from public.attendance;
  insert into public.attendance (id, student_id, date, status)
  select 
    (value->>'id'), (value->>'student_id'), (value->>'date')::date, (value->>'status')
  from jsonb_array_elements(p_attendance);

  -- 7. Sync Events
  delete from public.school_events;
  insert into public.school_events (id, title, date, description, type)
  select 
    (value->>'id'), (value->>'title'), (value->>'date')::date, 
    (value->>'description'), (value->>'type')
  from jsonb_array_elements(p_events);

  -- 8. Sync Settings
  delete from public.settings;
  insert into public.settings (id, data)
  select (value->>'key'), (value->'value')
  from jsonb_array_elements(p_config);

end;
$$ language plpgsql security definer;

-- Audit Function
create or replace function public.process_audit_log() returns trigger as $$
begin
  if (tg_op = 'DELETE') then
    insert into public.audit_log (table_name, record_id, action, old_data)
    values (tg_table_name, old.id, 'DELETE', row_to_json(old)::jsonb);
    return old;
  elsif (tg_op = 'UPDATE') then
    insert into public.audit_log (table_name, record_id, action, old_data, new_data)
    values (tg_table_name, new.id, 'UPDATE', row_to_json(old)::jsonb, row_to_json(new)::jsonb);
    return new;
  elsif (tg_op = 'INSERT') then
    insert into public.audit_log (table_name, record_id, action, new_data)
    values (tg_table_name, new.id, 'INSERT', row_to_json(new)::jsonb);
    return new;
  end if;
  return null;
end;
$$ language plpgsql;

-- Enable RLS
alter table public.students enable row level security;
alter table public.staff enable row level security;
alter table public.classes enable row level security;
alter table public.enrollments enable row level security;
alter table public.grades enable row level security;
alter table public.attendance enable row level security;
alter table public.school_events enable row level security;
alter table public.settings enable row level security;
alter table public.audit_log enable row level security;

-- Policies
create policy "Enable all access for authenticated users" on public.students for all to authenticated using (true) with check (true);
create policy "Enable all access for authenticated users" on public.staff for all to authenticated using (true) with check (true);
create policy "Enable all access for authenticated users" on public.classes for all to authenticated using (true) with check (true);
create policy "Enable all access for authenticated users" on public.enrollments for all to authenticated using (true) with check (true);
create policy "Enable all access for authenticated users" on public.grades for all to authenticated using (true) with check (true);
create policy "Enable all access for authenticated users" on public.attendance for all to authenticated using (true) with check (true);
create policy "Enable all access for authenticated users" on public.school_events for all to authenticated using (true) with check (true);
create policy "Enable all access for authenticated users" on public.settings for all to authenticated using (true) with check (true);
create policy "Enable all access for authenticated users" on public.audit_log for all to authenticated using (true) with check (true);

-- 10. Staff Permissions Table
create table if not exists public.staff_permissions (
  id text primary key,
  staff_id text not null references public.staff(id) on delete cascade,
  type text not null check (type in ('Annual Leave', 'Personal Leave', 'Non-Personal Leave')),
  start_date date not null,
  end_date date not null,
  reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.staff_permissions enable row level security;
create policy "Enable all access for authenticated users" on public.staff_permissions for all to authenticated using (true) with check (true);

-- Add Audit Trigger
create trigger on_staff_permissions_change
after insert or update or delete on public.staff_permissions
for each row execute function public.process_audit_log();

-- 11. Daily Logs (Guard)
create table if not exists public.daily_logs (
  id text primary key,
  staff_id text not null references public.staff(id) on delete cascade,
  type text not null check (type in ('Entry', 'Exit')),
  person_name text not null,
  purpose text,
  timestamp timestamp with time zone default now()
);

-- 12. Incident Reports (Guard)
create table if not exists public.incident_reports (
  id text primary key,
  staff_id text not null references public.staff(id) on delete cascade,
  title text not null,
  description text,
  severity text check (severity in ('Low', 'Medium', 'High')),
  timestamp timestamp with time zone default now()
);

-- 13. Room Statuses (Cleaner)
create table if not exists public.room_statuses (
  id text primary key,
  room_name text not null,
  status text check (status in ('Cleaned', 'Needs Attention')),
  last_updated_by text references public.staff(id),
  timestamp timestamp with time zone default now()
);

-- Enable RLS
alter table public.daily_logs enable row level security;
alter table public.incident_reports enable row level security;
alter table public.room_statuses enable row level security;

create policy "Enable all access for authenticated users" on public.daily_logs for all to authenticated using (true) with check (true);
create policy "Enable all access for authenticated users" on public.incident_reports for all to authenticated using (true) with check (true);
create policy "Enable all access for authenticated users" on public.room_statuses for all to authenticated using (true) with check (true);

-- Audit Triggers
create trigger on_daily_logs_change after insert or update or delete on public.daily_logs for each row execute function public.process_audit_log();
create trigger on_incident_reports_change after insert or update or delete on public.incident_reports for each row execute function public.process_audit_log();
create trigger on_room_statuses_change after insert or update or delete on public.room_statuses for each row execute function public.process_audit_log();
