-- Readers' highlights and notes, shared anonymously with the author. `reader` is a hash of a random id each browser makes
-- for itself, so Bijuu can tell readers apart (by an assigned name) without knowing who anyone is. Only the server (secret key)
-- writes here; only admins read or remove.
create table public.reader_marks (
  id text primary key,
  reader text not null,
  slug text not null,
  chapter_n integer not null,
  start_at integer not null,
  end_at integer not null,
  quote text not null default '',
  color text not null default 'yellow',
  note text not null default '',
  fic text not null default '',
  ch text not null default '',
  updated bigint not null
);
create index reader_marks_reader_idx on public.reader_marks (reader);
create index reader_marks_updated_idx on public.reader_marks (updated desc);
alter table public.reader_marks enable row level security;
revoke all on public.reader_marks from anon, authenticated;
grant select, delete on public.reader_marks to authenticated;
create policy "admin reads reader marks" on public.reader_marks for select to authenticated using ((select private.is_admin()));
create policy "admin removes reader marks" on public.reader_marks for delete to authenticated using ((select private.is_admin()));
