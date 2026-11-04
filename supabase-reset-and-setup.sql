-- ===== Orion Road: RESET friends & chat, then full setup (v3.4) =====
-- Wipes every friendship, request and message. Accounts, names, codes and progress are kept.
truncate table public.friends;
truncate table public.messages;

-- Orion Road · database setup v2 (safe to run again on top of v1)
-- profiles (name + friend code) · friends (requests + links) · messages (friend-to-friend chat)
-- Privacy: you read your own rows, your friends' progress, requests that involve you, and chats you're in. Nothing else.

create extension if not exists pgcrypto;

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  code text unique not null,
  name text not null default '',
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_name_lower_idx on public.profiles (lower(trim(name)));

create or replace function public.gen_code() returns text language plpgsql as $$
declare chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; out text := ''; i int;
begin
  for i in 1..4 loop out := out || substr(chars, 1 + floor(random()*length(chars))::int, 1); end loop;
  return 'ORN-' || out;
end $$;

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

-- ---------- language filter ----------
create table if not exists public.banned_words (word text primary key);
alter table public.banned_words enable row level security;   -- no policies: only security-definer functions can read it
insert into public.banned_words (word) values
 ('fuck'),('shit'),('bitch'),('cunt'),('asshole'),('dick'),('cock'),('pussy'),('whore'),('slut'),('bastard'),('motherfucker'),('fag'),('faggot'),('dyke'),('tranny'),
 ('nigger'),('nigga'),('chink'),('spic'),('kike'),('wetback'),('gook'),('raghead'),('towelhead'),('beaner'),('coon'),('retard'),('retarded'),('rape'),('rapist'),
 ('nazi'),('hitler'),('kkk'),('pedo'),('pedophile'),('cum'),('jizz'),('porn'),('penis'),('vagina'),('boobs'),('tits'),('twat'),('wanker'),('bollocks'),('bugger'),('arsehole'),('douche'),('dildo'),('blowjob'),('handjob'),('jerkoff'),('anal'),('negro'),('paki'),('tard')
on conflict do nothing;

-- normalise: lowercase, leetspeak → letters, strip everything that isn't a letter
create or replace function public.norm_text(t text) returns text language sql immutable as $$
  select regexp_replace(translate(lower(coalesce(t,'')), '013457@$!|', 'oieastasil'), '[^a-z]', '', 'g');
$$;

create or replace function public.is_clean(t text) returns boolean language plpgsql security definer set search_path = public stable as $$
declare n text := public.norm_text(t); w text; spaced text := regexp_replace(lower(coalesce(t,'')), '[^a-z0-9]+', ' ', 'g');
begin
  for w in select word from public.banned_words loop
    -- short words: whole-word match only (so "class" / "scunthorpe" pass); longer ones: anywhere, even hidden inside other letters
    if length(w) <= 4 then
      if (' ' || spaced || ' ') like ('% ' || w || ' %') or (' ' || spaced || ' ') like ('% ' || w || 's %') then return false; end if;
    else
      if position(w in n) > 0 then return false; end if;
    end if;
  end loop;
  return true;
end $$;
grant execute on function public.is_clean(text) to authenticated;

create or replace function public.profiles_guard() returns trigger language plpgsql as $$
begin
  new.name := trim(regexp_replace(coalesce(new.name,''), '\s+', ' ', 'g'));
  if length(new.name) < 2 or length(new.name) > 24 then raise exception 'Name must be 2–24 characters'; end if;
  if not public.is_clean(new.name) then raise exception 'Keep it clean — pick another name'; end if;
  return new;
end $$;
drop trigger if exists profiles_guard_t on public.profiles;
create trigger profiles_guard_t before insert or update of name on public.profiles for each row execute function public.profiles_guard();

create or replace function public.name_available(p_name text) returns text language plpgsql security definer set search_path = public stable as $$
declare n text := trim(regexp_replace(coalesce(p_name,''), '\s+', ' ', 'g'));
begin
  if length(n) < 2 or length(n) > 24 then return 'Name must be 2–24 characters'; end if;
  if not public.is_clean(n) then return 'Keep it clean — pick another name'; end if;
  if exists (select 1 from public.profiles where lower(trim(name)) = lower(n) and id <> auth.uid()) then return 'That name is taken'; end if;
  return 'ok';
end $$;
grant execute on function public.name_available(text) to authenticated;

-- ---------- progress ----------
create table if not exists public.progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  summary jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- friends: one row per direction once accepted; a pending request is a single row requester → target ----------
create table if not exists public.friends (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'accepted',
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id),
  check (status in ('pending','accepted'))
);
alter table public.friends add column if not exists status text not null default 'accepted';
create index if not exists friends_friend_idx on public.friends(friend_id);

-- ---------- messages ----------
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  sender uuid not null references auth.users(id) on delete cascade,
  recipient uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_pair_idx on public.messages (least(sender,recipient), greatest(sender,recipient), created_at);

create or replace function public.messages_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.body := trim(new.body);
  if length(new.body) < 1 or length(new.body) > 300 then raise exception 'Messages are 1–300 characters'; end if;
  if not public.is_clean(new.body) then raise exception 'Keep it clean'; end if;
  if not exists (select 1 from public.friends f where f.user_id = new.sender and f.friend_id = new.recipient and f.status = 'accepted') then raise exception 'You can only message friends'; end if;
  if exists (select 1 from public.messages m where m.sender = new.sender and m.created_at > now() - interval '700 milliseconds') then raise exception 'Slow down a little'; end if;
  return new;
end $$;
drop trigger if exists messages_guard_t on public.messages;
create trigger messages_guard_t before insert on public.messages for each row execute function public.messages_guard();

-- ---------- row-level security ----------
alter table public.profiles enable row level security;
alter table public.progress enable row level security;
alter table public.friends  enable row level security;
alter table public.messages enable row level security;

drop policy if exists "profiles: self or friends" on public.profiles;
create policy "profiles: self or friends" on public.profiles for select to authenticated
  using (id = auth.uid() or exists (select 1 from public.friends f where (f.user_id = auth.uid() and f.friend_id = profiles.id) or (f.friend_id = auth.uid() and f.user_id = profiles.id)));
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "progress: self or friends" on public.progress;
create policy "progress: self or friends" on public.progress for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.friends f where f.user_id = auth.uid() and f.friend_id = progress.user_id and f.status = 'accepted'));
drop policy if exists "progress: write own" on public.progress;
create policy "progress: write own" on public.progress for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "progress: update own" on public.progress;
create policy "progress: update own" on public.progress for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "friends: read own" on public.friends;
create policy "friends: read own" on public.friends for select to authenticated using (user_id = auth.uid() or friend_id = auth.uid());
drop policy if exists "friends: remove own" on public.friends;
create policy "friends: remove own" on public.friends for delete to authenticated using (user_id = auth.uid() or friend_id = auth.uid());

drop policy if exists "messages: mine" on public.messages;
create policy "messages: mine" on public.messages for select to authenticated using (sender = auth.uid() or recipient = auth.uid());
drop policy if exists "messages: send" on public.messages;
create policy "messages: send" on public.messages for insert to authenticated with check (sender = auth.uid());

-- ---------- requests ----------
create or replace function public.send_request(p_code text) returns public.profiles language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); other public.profiles;
begin
  if me is null then raise exception 'not signed in'; end if;
  select * into other from public.profiles where upper(code) = upper(trim(p_code));
  if other.id is null then raise exception 'No one has that code'; end if;
  if other.id = me then raise exception 'That is your own code'; end if;
  if exists (select 1 from public.friends where user_id = me and friend_id = other.id and status = 'accepted') then raise exception 'Already friends'; end if;
  if exists (select 1 from public.friends where user_id = other.id and friend_id = me and status = 'pending') then
    -- they already asked you: accept straight away
    update public.friends set status = 'accepted' where user_id = other.id and friend_id = me;
    insert into public.friends (user_id, friend_id, status) values (me, other.id, 'accepted') on conflict (user_id, friend_id) do update set status = 'accepted';
    return other;
  end if;
  insert into public.friends (user_id, friend_id, status) values (me, other.id, 'pending') on conflict do nothing;
  return other;
end $$;
grant execute on function public.send_request(text) to authenticated;

create or replace function public.respond_request(p_from uuid, p_accept boolean) returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if not exists (select 1 from public.friends where user_id = p_from and friend_id = me and status = 'pending') then raise exception 'No such request'; end if;
  if p_accept then
    update public.friends set status = 'accepted' where user_id = p_from and friend_id = me;
    insert into public.friends (user_id, friend_id, status) values (me, p_from, 'accepted') on conflict (user_id, friend_id) do update set status = 'accepted';
  else
    delete from public.friends where user_id = p_from and friend_id = me;
  end if;
end $$;
grant execute on function public.respond_request(uuid, boolean) to authenticated;

create or replace function public.remove_friend(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.friends where (user_id = auth.uid() and friend_id = p_id) or (user_id = p_id and friend_id = auth.uid());
end $$;
grant execute on function public.remove_friend(uuid) to authenticated;

-- old v1 function, no longer used
drop function if exists public.add_friend(text);

-- ---------- live updates ----------
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'progress') then alter publication supabase_realtime add table public.progress; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'friends') then alter publication supabase_realtime add table public.friends; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages') then alter publication supabase_realtime add table public.messages; end if;
end $$;

-- ================= v3: vanishing messages, read receipts, Activision ID =================
alter table public.profiles add column if not exists receipts boolean not null default true;
alter table public.profiles add column if not exists activision text not null default '';
alter table public.messages add column if not exists read_at timestamptz;   -- used for deletion, always set
alter table public.messages add column if not exists seen_at timestamptz;   -- shown to the sender only if the reader allows receipts

create or replace function public.profiles_guard() returns trigger language plpgsql as $$
begin
  new.name := trim(regexp_replace(coalesce(new.name,''), '\s+', ' ', 'g'));
  if length(new.name) < 2 or length(new.name) > 24 then raise exception 'Name must be 2–24 characters'; end if;
  if not public.is_clean(new.name) then raise exception 'Keep it clean — pick another name'; end if;
  new.activision := trim(coalesce(new.activision,''));
  if length(new.activision) > 32 then raise exception 'Activision ID is too long'; end if;
  if new.activision <> '' and new.activision !~ '^[A-Za-z0-9 _.\-]{2,24}#[0-9]{4,10}$' then raise exception 'Activision ID looks like Name#1234567'; end if;
  if not public.is_clean(new.activision) then raise exception 'Keep it clean'; end if;
  return new;
end $$;
drop trigger if exists profiles_guard_t on public.profiles;
create trigger profiles_guard_t before insert or update of name, activision on public.profiles for each row execute function public.profiles_guard();

-- mark everything from one friend as read; receipts only if I allow them
create or replace function public.mark_read(p_from uuid) returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); allow boolean;
begin
  if me is null then return; end if;
  select receipts into allow from public.profiles where id = me;
  update public.messages set read_at = now(), seen_at = case when allow then now() else null end
   where recipient = me and sender = p_from and read_at is null;
end $$;
grant execute on function public.mark_read(uuid) to authenticated;

-- messages vanish 24 h after being read (and after 30 days regardless)
create or replace function public.purge_messages() returns void language sql security definer set search_path = public as $$
  delete from public.messages where (read_at is not null and read_at < now() - interval '24 hours') or created_at < now() - interval '30 days';
$$;
grant execute on function public.purge_messages() to authenticated;
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('orion-purge-messages', '*/30 * * * *', 'select public.purge_messages()');
  end if;
exception when others then null; end $$;

-- ================= v3.1: make removals and vanished messages reach the other side instantly =================
alter table public.friends  replica identity full;
alter table public.messages replica identity full;

-- ================= v3.2: stricter language filter (leetspeak / spaced letters), avatar choice =================
alter table public.profiles add column if not exists avatar text not null default '';

create or replace function public.norm_text(t text) returns text language sql immutable as $$
  select regexp_replace(translate(lower(coalesce(t,'')), '013457@$!|()[]{}<>', 'oieastasil        '), '[^a-z]', '', 'g');
$$;

create or replace function public.is_clean(t text) returns boolean language plpgsql security definer set search_path = public stable as $$
declare
  n text := public.norm_text(t);                                                                     -- letters only, leetspeak fixed
  sp text := regexp_replace(regexp_replace(translate(lower(coalesce(t,'')), '013457@$!|', 'oieastasil'), '[^a-z]+', ' ', 'g'), '^ | $', '', 'g'); -- words, leetspeak fixed
  w text;
begin
  for w in select word from public.banned_words loop
    if length(w) <= 4 then
      -- short words: whole word (so "class" and "assassin" pass), or the whole thing spelled out with separators
      if (' ' || sp || ' ') like ('% ' || w || ' %') or (' ' || sp || ' ') like ('% ' || w || 's %') or n = w or n = w || 's' then return false; end if;
    else
      if position(w in n) > 0 then return false; end if;
    end if;
  end loop;
  return true;
end $$;
grant execute on function public.is_clean(text) to authenticated;

-- tell the API layer about new functions/columns right away

-- ================= v3.3: conversations outlive friendships =================
-- You can always read the name/avatar of anyone you've exchanged messages with, so old threads never turn into "unknown".
drop policy if exists "profiles: chatted" on public.profiles;
create policy "profiles: chatted" on public.profiles for select to authenticated
  using (exists (select 1 from public.messages m where (m.sender = auth.uid() and m.recipient = profiles.id) or (m.recipient = auth.uid() and m.sender = profiles.id)));
-- Either participant may delete a conversation.
drop policy if exists "messages: delete mine" on public.messages;
create policy "messages: delete mine" on public.messages for delete to authenticated using (sender = auth.uid() or recipient = auth.uid());
create or replace function public.delete_conversation(p_other uuid) returns void language sql security definer set search_path = public as $$
  delete from public.messages where (sender = auth.uid() and recipient = p_other) or (sender = p_other and recipient = auth.uid());
$$;
grant execute on function public.delete_conversation(uuid) to authenticated;
-- Send a request straight from a thread (by id, no code needed).
create or replace function public.send_request_id(p_id uuid) returns public.profiles language plpgsql security definer set search_path = public as $$
declare c text;
begin
  select code into c from public.profiles where id = p_id;
  if c is null then raise exception 'That player no longer exists'; end if;
  return public.send_request(c);
end $$;
grant execute on function public.send_request_id(uuid) to authenticated;

-- ================= v3.4: unfriending hides the thread for the person who unfriended; re-friending brings it back =================
create table if not exists public.hidden_threads (
  user_id uuid not null references auth.users(id) on delete cascade,
  other_id uuid not null references auth.users(id) on delete cascade,
  primary key (user_id, other_id)
);
alter table public.hidden_threads enable row level security;
drop policy if exists "hidden: own" on public.hidden_threads;
create policy "hidden: own" on public.hidden_threads for select to authenticated using (user_id = auth.uid());

create or replace function public.remove_friend(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.friends where (user_id = auth.uid() and friend_id = p_id) or (user_id = p_id and friend_id = auth.uid());
  insert into public.hidden_threads (user_id, other_id) values (auth.uid(), p_id) on conflict do nothing;
end $$;
grant execute on function public.remove_friend(uuid) to authenticated;

create or replace function public.send_request(p_code text) returns public.profiles language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); other public.profiles;
begin
  if me is null then raise exception 'not signed in'; end if;
  select * into other from public.profiles where upper(code) = upper(trim(p_code));
  if other.id is null then raise exception 'No one has that code'; end if;
  if other.id = me then raise exception 'That is your own code'; end if;
  delete from public.hidden_threads where (user_id = me and other_id = other.id) or (user_id = other.id and other_id = me);
  if exists (select 1 from public.friends where user_id = me and friend_id = other.id and status = 'accepted') then raise exception 'Already friends'; end if;
  if exists (select 1 from public.friends where user_id = other.id and friend_id = me and status = 'pending') then
    update public.friends set status = 'accepted' where user_id = other.id and friend_id = me;
    insert into public.friends (user_id, friend_id, status) values (me, other.id, 'accepted') on conflict (user_id, friend_id) do update set status = 'accepted';
    return other;
  end if;
  insert into public.friends (user_id, friend_id, status) values (me, other.id, 'pending') on conflict do nothing;
  return other;
end $$;
grant execute on function public.send_request(text) to authenticated;

create or replace function public.respond_request(p_from uuid, p_accept boolean) returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if not exists (select 1 from public.friends where user_id = p_from and friend_id = me and status = 'pending') then raise exception 'No such request'; end if;
  if p_accept then
    update public.friends set status = 'accepted' where user_id = p_from and friend_id = me;
    insert into public.friends (user_id, friend_id, status) values (me, p_from, 'accepted') on conflict (user_id, friend_id) do update set status = 'accepted';
    delete from public.hidden_threads where (user_id = me and other_id = p_from) or (user_id = p_from and other_id = me);
  else
    delete from public.friends where user_id = p_from and friend_id = me;
  end if;
end $$;
grant execute on function public.respond_request(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
