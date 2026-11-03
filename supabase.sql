-- Orion Road · database setup (run once in Supabase → SQL Editor)
-- Tables: profiles (name + friend code), progress (each player's tracker), friends (links).
-- Privacy: you can read your own rows and your friends' progress; nobody else's. Emails never leave auth.

create extension if not exists pgcrypto;

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  code text unique not null,
  name text not null default '',
  created_at timestamptz not null default now()
);

-- friend code like ORN-7K3Q (no 0/O/1/I to avoid confusion)
create or replace function public.gen_code() returns text language plpgsql as $$
declare chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; out text := ''; i int;
begin
  for i in 1..4 loop out := out || substr(chars, 1 + floor(random()*length(chars))::int, 1); end loop;
  return 'ORN-' || out;
end $$;

-- make a profile automatically when an account is created
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare c text; n int := 0;
begin
  loop
    c := public.gen_code();
    exit when not exists (select 1 from public.profiles where code = c);
    n := n + 1; if n > 20 then c := c || substr(md5(random()::text),1,2); exit; end if;
  end loop;
  insert into public.profiles (id, code, name) values (new.id, c, 'Operator ' || substr(c, 5));
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- progress ----------
create table if not exists public.progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  summary jsonb not null default '{}'::jsonb,   -- {pct, title, goal, updated}
  updated_at timestamptz not null default now()
);

-- ---------- friends (one row per direction) ----------
create table if not exists public.friends (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
create index if not exists friends_friend_idx on public.friends(friend_id);

-- ---------- row-level security ----------
alter table public.profiles enable row level security;
alter table public.progress enable row level security;
alter table public.friends  enable row level security;

drop policy if exists "profiles: self or friends" on public.profiles;
create policy "profiles: self or friends" on public.profiles for select to authenticated
  using (id = auth.uid() or exists (select 1 from public.friends f where f.user_id = auth.uid() and f.friend_id = profiles.id));
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "progress: self or friends" on public.progress;
create policy "progress: self or friends" on public.progress for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.friends f where f.user_id = auth.uid() and f.friend_id = progress.user_id));
drop policy if exists "progress: write own" on public.progress;
create policy "progress: write own" on public.progress for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "progress: update own" on public.progress;
create policy "progress: update own" on public.progress for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "friends: read own" on public.friends;
create policy "friends: read own" on public.friends for select to authenticated using (user_id = auth.uid());
drop policy if exists "friends: remove own" on public.friends;
create policy "friends: remove own" on public.friends for delete to authenticated using (user_id = auth.uid() or friend_id = auth.uid());

-- ---------- adding a friend by code (links both ways) ----------
create or replace function public.add_friend(p_code text) returns public.profiles language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); other public.profiles;
begin
  if me is null then raise exception 'not signed in'; end if;
  select * into other from public.profiles where upper(code) = upper(trim(p_code));
  if other.id is null then raise exception 'No one has that code'; end if;
  if other.id = me then raise exception 'That is your own code'; end if;
  insert into public.friends (user_id, friend_id) values (me, other.id) on conflict do nothing;
  insert into public.friends (user_id, friend_id) values (other.id, me) on conflict do nothing;
  return other;
end $$;
grant execute on function public.add_friend(text) to authenticated;

create or replace function public.remove_friend(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.friends where (user_id = auth.uid() and friend_id = p_id) or (user_id = p_id and friend_id = auth.uid());
end $$;
grant execute on function public.remove_friend(uuid) to authenticated;

-- ---------- live updates for the squad list ----------
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'progress') then
    alter publication supabase_realtime add table public.progress;
  end if;
end $$;
