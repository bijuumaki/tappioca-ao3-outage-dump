-- Hearts, per story. The count is shared and lives here; whether one browser has hearted lives in that browser.
alter table public.fics add column hearts integer not null default 0 check (hearts >= 0);

-- The only way a heart changes: +1 or -1 on a story readers can see, never below 0. Only the server may call it.
create or replace function public.heart_fic(p_slug text, p_delta int)
returns integer language plpgsql security definer set search_path = '' as $$
declare total integer;
begin
  if p_delta not in (-1, 1) then return null; end if;
  update public.fics set hearts = greatest(hearts + p_delta, 0)
    where slug = p_slug and publish_at is not null and publish_at <= now()
    returning hearts into total;
  return total;
end $$;
revoke all on function public.heart_fic(text, int) from public, anon, authenticated;
grant execute on function public.heart_fic(text, int) to service_role;
