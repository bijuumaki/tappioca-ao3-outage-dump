-- New reader comments wait for the author's approval (hidden = true means "waiting"). Comments already on the site stay as they are.
-- The author's own replies are stored by the server as shown, so they are not affected.
create or replace function public.post_comment(p_chapter_id bigint, p_name text, p_body text, p_ip_hash text, p_max int, p_window_seconds int)
returns bigint language plpgsql security definer set search_path = '' as $$
declare new_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext(p_ip_hash));
  delete from public.comment_meta where created_at < now() - interval '1 day';
  if (select count(*) from public.comment_meta where ip_hash = p_ip_hash and created_at > now() - make_interval(secs => p_window_seconds)) >= p_max then
    return null;
  end if;
  insert into public.comments (chapter_id, name, body, hidden) values (p_chapter_id, p_name, p_body, true) returning id into new_id;
  insert into public.comment_meta (comment_id, ip_hash) values (new_id, p_ip_hash);
  return new_id;
end $$;
