create table if not exists public.reader_allowed_emails(email text primary key);
alter table public.reader_allowed_emails enable row level security;
revoke all on public.reader_allowed_emails from anon,authenticated;
create or replace function public.reader_join() returns void language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from auth.users u join public.reader_allowed_emails a on lower(u.email)=lower(a.email) where u.id=auth.uid() and u.email_confirmed_at is not null) then
  insert into public.reader_members(user_id) values(auth.uid()) on conflict do nothing;
 end if;
end $$;
revoke all on function public.reader_join() from public,anon;
grant execute on function public.reader_join() to authenticated;
-- Add the owner's email privately in the SQL Editor; never commit it here.
