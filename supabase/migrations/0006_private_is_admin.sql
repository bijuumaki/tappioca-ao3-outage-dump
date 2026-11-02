-- Move the admin check out of the public API (Supabase advisor: security definer function callable via /rpc).
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

alter policy "admin manages fics" on public.fics using ((select private.is_admin())) with check ((select private.is_admin()));
alter policy "admin manages chapters" on public.chapters using ((select private.is_admin())) with check ((select private.is_admin()));
alter policy "admin manages posts" on public.posts using ((select private.is_admin())) with check ((select private.is_admin()));
alter policy "admin manages post images" on public.post_images using ((select private.is_admin())) with check ((select private.is_admin()));
alter policy "admin manages tags" on public.tags using ((select private.is_admin())) with check ((select private.is_admin()));
alter policy "admin manages fic tags" on public.fic_tags using ((select private.is_admin())) with check ((select private.is_admin()));
alter policy "admin manages post tags" on public.post_tags using ((select private.is_admin())) with check ((select private.is_admin()));
alter policy "admin manages categories" on public.categories using ((select private.is_admin())) with check ((select private.is_admin()));
alter policy "admin manages pages" on public.pages using ((select private.is_admin())) with check ((select private.is_admin()));
alter policy "admin uploads media" on storage.objects with check (bucket_id = 'media' and (select private.is_admin()));
alter policy "admin changes media" on storage.objects using (bucket_id = 'media' and (select private.is_admin()));
alter policy "admin removes media" on storage.objects using (bucket_id = 'media' and (select private.is_admin()));

revoke execute on function public.is_admin() from anon, authenticated, public;
