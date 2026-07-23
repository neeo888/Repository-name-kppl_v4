-- Run once in Supabase SQL Editor before enabling the Vercel authentication API.
-- This adds the server-auth columns without deleting existing rows.

create extension if not exists pgcrypto;

alter table public.users add column if not exists first_name text;
alter table public.users add column if not exists last_name text;
alter table public.users add column if not exists employee_id text;
alter table public.users add column if not exists branch text;
alter table public.users add column if not exists password_hash text;
alter table public.users add column if not exists role text default 'user';
alter table public.users add column if not exists approved boolean default false;
alter table public.users add column if not exists created_at timestamptz default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'approved'
      and data_type <> 'boolean'
  ) then
    alter table public.users
      alter column approved type boolean
      using lower(approved::text) in ('1', 'true', 't', 'yes');
  end if;
end
$$;

create unique index if not exists users_employee_id_unique
  on public.users (employee_id)
  where employee_id is not null;

alter table public.users enable row level security;

revoke all on table public.users from anon;
revoke all on table public.users from authenticated;

drop policy if exists "public users read" on public.users;
drop policy if exists "public users insert" on public.users;
drop policy if exists "public users update" on public.users;
drop policy if exists "public users delete" on public.users;

comment on table public.users is
  'KPPL accounts. Access only through server-side Vercel Functions using service_role.';
