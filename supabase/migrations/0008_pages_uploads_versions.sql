-- Plan 2b: upload bin records, chapter versions, secret preview links.

create table public.upload_files (
  id bigint generated always as identity primary key,
  fic_id bigint references public.fics (id) on delete cascade,
  chapter_id bigint references public.chapters (id) on delete set null,
  filename text not null,
  storage_path text not null,
  kind text not null,
  size bigint not null default 0,
  status text not null check (status in ('converted', 'failed')),
  error text,
  created_at timestamptz not null default now()
);
create index upload_files_fic_idx on public.upload_files (fic_id);
create index upload_files_chapter_idx on public.upload_files (chapter_id);

create table public.chapter_versions (
  id bigint generated always as identity primary key,
  chapter_id bigint not null references public.chapters (id) on delete cascade,
  title text,
  notes_before text not null default '',
  body text not null default '',
  notes_after text not null default '',
  word_count int not null default 0,
  reason text not null,
  created_at timestamptz not null default now()
);
create index chapter_versions_chapter_idx on public.chapter_versions (chapter_id, created_at desc);

create table public.preview_links (
  token uuid primary key default gen_random_uuid(),
  chapter_id bigint not null references public.chapters (id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index preview_links_chapter_idx on public.preview_links (chapter_id);

alter table public.upload_files enable row level security;
alter table public.chapter_versions enable row level security;
alter table public.preview_links enable row level security;
create policy "admin manages upload files" on public.upload_files for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admin manages chapter versions" on public.chapter_versions for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admin manages preview links" on public.preview_links for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- Anyone holding a preview link's secret token can read that one chapter (and nothing else).
create or replace function public.preview_chapter(p_token uuid)
returns table (fic_title text, chapter_title text, chapter_position int, notes_before text, body text, notes_after text, word_count int)
language sql stable security definer set search_path = '' as $$
  select f.title, c.title, c.position, c.notes_before, c.body, c.notes_after, c.word_count
  from public.preview_links l
  join public.chapters c on c.id = l.chapter_id
  join public.fics f on f.id = c.fic_id
  where l.token = p_token and l.revoked_at is null;
$$;
revoke all on function public.preview_chapter(uuid) from public;
grant execute on function public.preview_chapter(uuid) to anon, authenticated;

-- Storage: a private bucket for the original uploaded files; the admin can add, read and remove them,
-- and read the public "media" bucket's file list (needed to remove old files).
insert into storage.buckets (id, name, public) values ('uploads', 'uploads', false) on conflict (id) do nothing;
create policy "admin adds upload files" on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (select private.is_admin()));
create policy "admin reads uploads and media" on storage.objects for select to authenticated
  using (bucket_id in ('uploads', 'media') and (select private.is_admin()));
create policy "admin removes upload files" on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and (select private.is_admin()));
