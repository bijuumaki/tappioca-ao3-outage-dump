-- One safe way to add a comment: checks the sender's recent comments and adds the comment and its flood-control row in one step,
-- holding a lock per sender so many parallel posts can't all slip past the limit. Only the server (service role) may call it.
create or replace function public.post_comment(p_chapter_id bigint, p_name text, p_body text, p_ip_hash text, p_max int, p_window_seconds int)
returns bigint language plpgsql security definer set search_path = '' as $$
declare new_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext(p_ip_hash));
  delete from public.comment_meta where created_at < now() - interval '1 day';
  if (select count(*) from public.comment_meta where ip_hash = p_ip_hash and created_at > now() - make_interval(secs => p_window_seconds)) >= p_max then
    return null;
  end if;
  insert into public.comments (chapter_id, name, body) values (p_chapter_id, p_name, p_body) returning id into new_id;
  insert into public.comment_meta (comment_id, ip_hash) values (new_id, p_ip_hash);
  return new_id;
end $$;
revoke all on function public.post_comment(bigint, text, text, text, int, int) from public, anon, authenticated;
grant execute on function public.post_comment(bigint, text, text, text, int, int) to service_role;

-- Defense in depth: readers have no use for these table powers.
revoke truncate, trigger, references on public.comments, public.comment_meta from anon, authenticated;
