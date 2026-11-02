-- Content for Tappioca's reader.
-- Visibility rule: publish_at null = draft, future = scheduled, past = published.

create type public.rating as enum ('general', 'teen', 'mature', 'explicit', 'not_rated');
create type public.fic_status as enum ('in_progress', 'complete');
create type public.tag_type as enum ('fandom', 'character', 'relationship', 'warning', 'freeform');

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create table public.categories (
  id bigint generated always as identity primary key,
  name text not null,
  slug text not null unique
);
insert into public.categories (name, slug) values ('Fic', 'fic'), ('Art', 'art');

create table public.tags (
  id bigint generated always as identity primary key,
  type public.tag_type not null,
  name text not null,
  slug text not null,
  unique (type, slug)
);

create table public.fics (
  id bigint generated always as identity primary key,
  slug text not null unique,
  title text not null,
  summary text not null default '',
  notes text not null default '',
  cover_path text,
  category_id bigint not null references public.categories (id),
  rating public.rating not null default 'not_rated',
  status public.fic_status not null default 'in_progress',
  publish_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index fics_category_idx on public.fics (category_id);
create index fics_publish_at_idx on public.fics (publish_at);

create table public.chapters (
  id bigint generated always as identity primary key,
  fic_id bigint not null references public.fics (id) on delete cascade,
  position int not null,
  title text,
  notes_before text not null default '',
  body text not null default '',
  notes_after text not null default '',
  word_count int not null default 0,
  publish_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fic_id, position)
);

create table public.posts (
  id bigint generated always as identity primary key,
  slug text not null unique,
  title text not null,
  body text not null default '',
  embed_url text,
  category_id bigint not null references public.categories (id),
  publish_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_category_idx on public.posts (category_id);
create index posts_publish_at_idx on public.posts (publish_at);

create table public.post_images (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts (id) on delete cascade,
  position int not null,
  path text not null,
  caption text not null default '',
  unique (post_id, position)
);

create table public.fic_tags (
  fic_id bigint not null references public.fics (id) on delete cascade,
  tag_id bigint not null references public.tags (id) on delete cascade,
  primary key (fic_id, tag_id)
);
create index fic_tags_tag_idx on public.fic_tags (tag_id);

create table public.post_tags (
  post_id bigint not null references public.posts (id) on delete cascade,
  tag_id bigint not null references public.tags (id) on delete cascade,
  primary key (post_id, tag_id)
);
create index post_tags_tag_idx on public.post_tags (tag_id);

create table public.pages (
  slug text primary key,
  title text not null,
  body text not null default '',
  updated_at timestamptz not null default now()
);
insert into public.pages (slug, title) values
  ('about', 'About'), ('disclaimer', 'Disclaimer'), ('links', 'Links'), ('comms', 'Comms');

create trigger fics_touch before update on public.fics for each row execute function public.touch_updated_at();
create trigger chapters_touch before update on public.chapters for each row execute function public.touch_updated_at();
create trigger posts_touch before update on public.posts for each row execute function public.touch_updated_at();
create trigger pages_touch before update on public.pages for each row execute function public.touch_updated_at();

-- Row-level security: readers may only read what is visible. No public writes at all.
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.fics enable row level security;
alter table public.chapters enable row level security;
alter table public.posts enable row level security;
alter table public.post_images enable row level security;
alter table public.fic_tags enable row level security;
alter table public.post_tags enable row level security;
alter table public.pages enable row level security;

create policy "read categories" on public.categories for select to anon, authenticated using (true);
create policy "read tags" on public.tags for select to anon, authenticated using (true);
create policy "read pages" on public.pages for select to anon, authenticated using (true);

create policy "read published fics" on public.fics for select to anon, authenticated
  using (publish_at is not null and publish_at <= now());

create policy "read published chapters of published fics" on public.chapters for select to anon, authenticated
  using (
    publish_at is not null and publish_at <= now()
    and exists (select 1 from public.fics f where f.id = fic_id and f.publish_at is not null and f.publish_at <= now())
  );

create policy "read published posts" on public.posts for select to anon, authenticated
  using (publish_at is not null and publish_at <= now());

create policy "read images of published posts" on public.post_images for select to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and p.publish_at is not null and p.publish_at <= now()));

create policy "read tags of published fics" on public.fic_tags for select to anon, authenticated
  using (exists (select 1 from public.fics f where f.id = fic_id and f.publish_at is not null and f.publish_at <= now()));

create policy "read tags of published posts" on public.post_tags for select to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and p.publish_at is not null and p.publish_at <= now()));
