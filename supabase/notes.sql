create table if not exists public.reader_notes(user_id uuid not null references auth.users(id) on delete cascade,work_id text not null check(length(work_id) between 1 and 64),body text not null default '' check(length(body)<=50000),version integer not null default 0,updated_at timestamptz not null default now(),primary key(user_id,work_id));
alter table public.reader_notes enable row level security;
create policy "own notes" on public.reader_notes for all to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.reader_members where user_id=(select auth.uid()))) with check(user_id=(select auth.uid()) and exists(select 1 from public.reader_members where user_id=(select auth.uid())));
grant select,insert,update on public.reader_notes to authenticated;
create or replace function public.reader_save_note(note_work text,note_body text,note_base integer) returns jsonb language plpgsql security invoker set search_path='' as $$
declare n public.reader_notes;
begin
 insert into public.reader_notes(user_id,work_id) values(auth.uid(),note_work) on conflict do nothing;
 select * into n from public.reader_notes where user_id=auth.uid() and work_id=note_work for update;
 if n.body=note_body then return jsonb_build_object('conflict',false,'note',to_jsonb(n)); end if;
 if n.version<>note_base then return jsonb_build_object('conflict',true,'note',to_jsonb(n)); end if;
 update public.reader_notes set body=note_body,version=version+1,updated_at=now() where user_id=auth.uid() and work_id=note_work returning * into n;
 return jsonb_build_object('conflict',false,'note',to_jsonb(n));
end $$;
revoke all on function public.reader_save_note(text,text,integer) from public,anon;
grant execute on function public.reader_save_note(text,text,integer) to authenticated;
