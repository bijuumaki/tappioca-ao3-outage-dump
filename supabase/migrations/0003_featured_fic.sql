-- The home page features one fic. Bijuu marks it in the admin (Plan 2a); the newest-marked one wins.
alter table public.fics add column featured boolean not null default false;
