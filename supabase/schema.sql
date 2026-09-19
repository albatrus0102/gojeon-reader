create table if not exists public.reader_members (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.reader_members enable row level security;
create policy "member can see own membership" on public.reader_members for select to authenticated using(user_id=(select auth.uid()));
grant select on public.reader_members to authenticated;
create table if not exists public.reader_highlights (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text not null check(length(id) between 1 and 128),
 payload jsonb not null, deleted boolean not null default false,
 updated_at timestamptz not null default now(), primary key(user_id,id)
);
alter table public.reader_highlights enable row level security;
create policy "owner read" on public.reader_highlights for select to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.reader_members where user_id=(select auth.uid())));
create policy "owner insert" on public.reader_highlights for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.reader_members where user_id=(select auth.uid())));
create policy "owner update" on public.reader_highlights for update to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.reader_members where user_id=(select auth.uid()))) with check(user_id=(select auth.uid()));
grant select,insert,update on public.reader_highlights to authenticated;
create or replace function public.reader_apply(operations jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare op jsonb;
begin
 if jsonb_typeof(operations)<>'array' or jsonb_array_length(operations)>1000 then raise exception 'invalid batch'; end if;
 for op in select value from jsonb_array_elements(operations) loop
  if jsonb_typeof(op->'payload')<>'object' or length(op->'payload'->>'text')>100000 or op->>'id' is distinct from op->'payload'->>'id' then raise exception 'invalid highlight'; end if;
  insert into public.reader_highlights(user_id,id,payload,deleted) values(auth.uid(),op->>'id',op->'payload',coalesce((op->>'deleted')::boolean,false))
  on conflict(user_id,id) do update set payload=case when reader_highlights.deleted then reader_highlights.payload else excluded.payload end, deleted=reader_highlights.deleted or excluded.deleted, updated_at=now();
 end loop;
end $$;
revoke all on function public.reader_apply(jsonb) from public,anon;
grant execute on function public.reader_apply(jsonb) to authenticated;
insert into storage.buckets(id,name,public) values('reader-private','reader-private',false) on conflict(id) do nothing;
create policy "member reads reader content" on storage.objects for select to authenticated using(bucket_id='reader-private' and exists(select 1 from public.reader_members where user_id=(select auth.uid())));
