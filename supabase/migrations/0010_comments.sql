-- Comments on chapters. Readers can read visible ones; nobody writes through the public key.
-- New comments are added by the server (secret key) after it checks the rules; the admin can reply, hide and delete.
create table public.comments (
  id bigint generated always as identity primary key,
  chapter_id bigint not null references public.chapters (id) on delete cascade,
  parent_id bigint references public.comments (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  body text not null check (char_length(body) between 1 and 5000),
  by_author boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index comments_chapter_idx on public.comments (chapter_id, created_at);
create index comments_parent_idx on public.comments (parent_id);

-- Used only to slow down floods: a salted hash of the sender's address, never readable by readers.
create table public.comment_meta (
  comment_id bigint primary key references public.comments (id) on delete cascade,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index comment_meta_recent_idx on public.comment_meta (ip_hash, created_at);

alter table public.comments enable row level security;
alter table public.comment_meta enable row level security;

-- A reader sees a comment when it isn't hidden and its chapter is one they can see
-- (the subquery runs under the reader's own rules, so drafts and scheduled chapters stay closed).
create policy "read visible comments" on public.comments for select to anon, authenticated
  using (not hidden and exists (select 1 from public.chapters c where c.id = comments.chapter_id));

create policy "admin manages comments" on public.comments for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admin reads comment meta" on public.comment_meta for select to authenticated
  using ((select private.is_admin()));
