-- Admin access. Only users listed in public.admins can write content or read drafts.
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security;
-- No policies on admins: nobody reads or writes it through the API; is_admin() reads it as its owner.

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create policy "admin manages fics" on public.fics for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin manages chapters" on public.chapters for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin manages posts" on public.posts for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin manages post images" on public.post_images for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin manages tags" on public.tags for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin manages fic tags" on public.fic_tags for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin manages post tags" on public.post_tags for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin manages categories" on public.categories for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin manages pages" on public.pages for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Images: anyone can view files in "media"; only the admin can add, change or remove them.
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict (id) do nothing;
create policy "admin uploads media" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (select public.is_admin()));
create policy "admin changes media" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));
create policy "admin removes media" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));
