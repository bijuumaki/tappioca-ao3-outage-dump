-- How many chapters a story will have when finished, like AO3's "3/10". Null means not decided ("3/?").
alter table public.fics add column if not exists planned_chapters integer check (planned_chapters between 1 and 999);
