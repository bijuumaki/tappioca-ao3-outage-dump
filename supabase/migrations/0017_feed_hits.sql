-- Who reads the RSS feeds, without knowing who anyone is. One row per feed reader per feed per day (a repeat visit the same day
-- is ignored). `visitor` is a salted hash of the address + app, never the address itself. Only the server (secret key) writes;
-- only admins read.
create table public.feed_hits (
  day date not null,
  feed text not null,
  visitor text not null,
  app text not null default 'Other',
  subs integer not null default 0,
  primary key (day, feed, visitor)
);
create index feed_hits_day_idx on public.feed_hits (day desc);
alter table public.feed_hits enable row level security;
revoke all on public.feed_hits from anon, authenticated;
grant select on public.feed_hits to authenticated;
create policy "admin reads feed hits" on public.feed_hits for select to authenticated using ((select private.is_admin()));
