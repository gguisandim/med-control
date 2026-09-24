-- Execute este arquivo no SQL Editor do Supabase.
-- O frontend nunca recebe a service role key. Todo acesso ao banco ocorre no servidor Next.js.

create extension if not exists pgcrypto;

create table if not exists medications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  dose text not null,
  instructions text,
  route text not null default 'Sonda',
  scheduled_time time,
  schedule_label text,
  shift text not null check (shift in ('day', 'night', 'both')),
  active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scheduled_time is not null or schedule_label is not null)
);

create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  shift_date date not null,
  shift_type text not null check (shift_type in ('day', 'night')),
  caregiver_name text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  unique (shift_date, shift_type)
);

create table if not exists shift_items (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references shifts(id) on delete cascade,
  medication_id uuid references medications(id) on delete set null,
  name text not null,
  dose text not null,
  instructions text,
  route text not null,
  scheduled_time time,
  schedule_label text,
  sort_order integer not null default 100,
  status text not null default 'pending' check (status in ('pending', 'administered', 'not_administered')),
  administered_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shifts_started_at on shifts(started_at desc);
create index if not exists idx_shift_items_shift on shift_items(shift_id);
create index if not exists idx_medications_active_shift on medications(active, shift);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists medications_set_updated_at on medications;
create trigger medications_set_updated_at before update on medications
for each row execute function set_updated_at();

drop trigger if exists shift_items_set_updated_at on shift_items;
create trigger shift_items_set_updated_at before update on shift_items
for each row execute function set_updated_at();

-- Como o app usa somente a chave service_role no servidor, bloqueamos acesso anônimo direto.
alter table medications enable row level security;
alter table shifts enable row level security;
alter table shift_items enable row level security;

-- Dados iniciais informados pela família.
-- Losartana aparece duas vezes porque são duas administrações em horários/turnos diferentes.
do $$
begin
  if not exists (select 1 from medications) then
    insert into medications (name, dose, instructions, route, scheduled_time, schedule_label, shift, sort_order)
    values
      ('Litocit', '1 comprimido', 'Amassar e diluir em água. Administrar após a primeira dieta (após o café).', 'Sonda', null, 'Após a primeira dieta', 'day', 10),
      ('Clorotiazida', '1 comprimido', 'Amassar e diluir em água.', 'Sonda', '08:00', null, 'day', 20),
      ('Losartana', '1 comprimido', 'Amassar e diluir em água.', 'Sonda', '10:00', null, 'day', 30),
      ('Sivastantina', '1 comprimido', 'Amassar e diluir em água.', 'Sonda', '20:00', null, 'night', 40),
      ('Losartana', '1 comprimido', 'Amassar e diluir em água.', 'Sonda', '22:00', null, 'night', 50),
      ('Omeprazol', '1 comprimido', 'Amassar e diluir em água.', 'Sonda', '06:00', null, 'night', 60),
      ('Soro Ringer Lactado', '1 soro', 'Administrar conforme orientação recebida. Manter até suspensão médica.', 'Conforme orientação', null, 'Durante o turno', 'both', 70);
  end if;
end $$;
