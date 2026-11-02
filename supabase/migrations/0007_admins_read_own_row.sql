-- A signed-in account can see only its own row in admins, so the site can tell whether it is the admin.
create policy "see own admin row" on public.admins for select to authenticated using (user_id = (select auth.uid()));
