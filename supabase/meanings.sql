-- Shared cache of external lookups (우리말샘 dictionary + optional AI context note).
-- Written only by the `meaning` edge function (service role); members read.
create table if not exists public.reader_meanings (
 work text not null check(length(work) between 1 and 64),
 term text not null check(length(term) between 1 and 40),
 matched text,                 -- headword the dictionary actually matched (after stripping endings)
 dictionary jsonb not null default '[]'::jsonb,  -- [{word,pos,definition,origin,link}]
 ai jsonb,                     -- {sense,meaning,context,model,at} or null
 updated_at timestamptz not null default now(),
 primary key(work,term)
);
alter table public.reader_meanings enable row level security;
create policy "member reads meanings" on public.reader_meanings for select to authenticated
 using(exists(select 1 from public.reader_members where user_id=(select auth.uid())));
grant select on public.reader_meanings to authenticated;
