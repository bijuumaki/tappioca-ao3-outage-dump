-- Readers only see tags that something published uses. fic_tags and post_tags are themselves
-- limited to published items, so the subqueries below inherit that rule.
alter policy "read tags" on public.tags
  using (
    exists (select 1 from public.fic_tags ft where ft.tag_id = id)
    or exists (select 1 from public.post_tags pt where pt.tag_id = id)
  );
