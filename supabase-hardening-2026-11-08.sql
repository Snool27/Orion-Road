-- Orion Road: Supabase security hardening (2026-11-08)
-- Fixes the Security Advisor warnings and adds two database-level checks.
-- Safe to run more than once. Existing rows are not rewritten.

begin;

-- 1) Nobody signed-out ("anon") or "public" may call our SECURITY DEFINER functions.
revoke execute on function public.delete_conversation(uuid) from public, anon;
revoke execute on function public.mark_read(uuid)            from public, anon;
revoke execute on function public.remove_friend(uuid)        from public, anon;
revoke execute on function public.name_available(text)       from public, anon;
revoke execute on function public.purge_messages()           from public, anon;
revoke execute on function public.is_clean(text)             from public, anon;
-- (signed-in users keep is_clean: profiles_guard runs as them and calls it when they rename themselves)
revoke execute on function public.handle_new_user()          from public, anon, authenticated;
revoke execute on function public.messages_guard()           from public, anon, authenticated;

-- The page (signed in) still needs these:
grant execute on function public.delete_conversation(uuid) to authenticated;
grant execute on function public.mark_read(uuid)            to authenticated;
grant execute on function public.remove_friend(uuid)        to authenticated;
grant execute on function public.name_available(text)       to authenticated;
grant execute on function public.purge_messages()           to authenticated;

-- send_request / respond_request: same treatment (argument types looked up automatically)
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('send_request', 'send_request_id', 'respond_request')
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;

-- 2) Lock the search_path of every function in the public schema.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
  loop
    execute format('alter function %s set search_path = public, pg_temp', f.sig);
  end loop;
end $$;

-- 3) Avatars must be a colour (#rgb … #rrggbbaa) or a camo name (cam-…). Checked for new saves.
alter table public.profiles drop constraint if exists profiles_avatar_ok;
alter table public.profiles add constraint profiles_avatar_ok check (
  avatar is null or avatar = '' or avatar ~ '^#[0-9a-fA-F]{3,8}$' or avatar ~ '^cam-[a-z0-9-]{1,60}$'
) not valid;

-- 4) Saved progress can't be bigger than 256 KB (a normal save is a few KB).
alter table public.progress drop constraint if exists progress_state_size;
alter table public.progress add constraint progress_state_size check (
  pg_column_size(state) < 262144 and pg_column_size(summary) < 16384
) not valid;

commit;
