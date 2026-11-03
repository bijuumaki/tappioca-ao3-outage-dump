-- Highlights and notes synced across a reader's devices. There are no accounts: a reader holds a private code and only a
-- hash of it is stored here, next to that reader's highlights. Only the server (secret key) reads or writes this table.
create table public.reader_sync (
  code_hash text primary key,
  data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.reader_sync enable row level security;
-- No policies on purpose: the public key can neither read nor write it.
revoke all on public.reader_sync from anon, authenticated;
