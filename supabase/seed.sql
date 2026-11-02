-- Reference copy of the test sample content (the tests add it themselves: tests/support/fixtures.ts). Do not run against the live project.
-- Re-runnable: clears content tables first (categories and pages stay).
delete from public.fic_tags; delete from public.post_tags; delete from public.post_images;
delete from public.chapters; delete from public.fics; delete from public.posts; delete from public.tags;

insert into public.tags (type, name, slug) values
  ('fandom', '(sample fandom)', 'sample-fandom'),
  ('character', '(sample character)', 'sample-character'),
  ('relationship', '(sample relationship)', 'sample-relationship'),
  ('warning', '(sample warning)', 'sample-warning'),
  ('freeform', '(sample tag)', 'sample-tag');

insert into public.fics (slug, title, summary, notes, category_id, rating, status, publish_at) values
  ('sample-fic', '(sample fic)', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.', '(fic notes)',
    (select id from public.categories where slug = 'fic'), 'teen', 'in_progress', now() - interval '10 days'),
  ('sample-oneshot', '(sample oneshot)', 'Sed do eiusmod tempor incididunt.', '',
    (select id from public.categories where slug = 'fic'), 'general', 'complete', now() - interval '5 days'),
  ('sample-draft', '(sample draft)', 'Draft summary.', '',
    (select id from public.categories where slug = 'fic'), 'mature', 'in_progress', null),
  ('sample-empty', '(sample empty)', 'Ut labore et dolore magna aliqua.', '',
    (select id from public.categories where slug = 'fic'), 'not_rated', 'in_progress', now() - interval '3 days');

insert into public.chapters (fic_id, position, title, notes_before, body, notes_after, word_count, publish_at)
select f.id, c.position, c.title, c.notes_before, c.body, c.notes_after, c.word_count, c.publish_at
from (values
  ('sample-fic', 1, '(chapter title)', '(notes before)',
    '<p>Lorem ipsum dolor sit amet.</p><hr><p style="color:#8b3253">Consectetur adipiscing elit sed do.</p>', '(notes after)', 10, now() - interval '10 days'),
  ('sample-fic', 2, null, '(notes before)',
    repeat('<p>Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor.</p>', 60), '', 660, now() - interval '8 days'),
  ('sample-fic', 3, '(scheduled chapter)', '', '<p>Hidden scheduled chapter.</p>', '', 3, now() + interval '1 year'),
  ('sample-fic', 4, null, '', '<p>Ut enim ad minim veniam.</p>', '', 5, now() - interval '1 day'),
  ('sample-oneshot', 1, null, '', '<p>Duis aute irure dolor in reprehenderit.</p>', '', 6, now() - interval '5 days'),
  ('sample-draft', 1, null, '', '<p>Draft text.</p>', '', 2, now() - interval '5 days'),
  ('sample-empty', 1, null, '', '<p>Not yet.</p>', '', 2, null)
) as c(fic_slug, position, title, notes_before, body, notes_after, word_count, publish_at)
join public.fics f on f.slug = c.fic_slug;

insert into public.fic_tags (fic_id, tag_id)
select f.id, t.id from public.fics f cross join public.tags t where f.slug = 'sample-fic';
insert into public.fic_tags (fic_id, tag_id)
select f.id, t.id from public.fics f join public.tags t on t.slug = 'sample-fandom' where f.slug = 'sample-oneshot';

insert into public.posts (slug, title, body, embed_url, category_id, publish_at) values
  ('sample-art', '(sample art)', '<p>Excepteur sint occaecat.</p>', 'https://example.com/(sample embed)',
    (select id from public.categories where slug = 'art'), now() - interval '2 days');

insert into public.post_images (post_id, position, path, caption)
select p.id, i.position, i.path, i.caption
from public.posts p, (values (1, '/sample-art.svg', '(caption one)'), (2, '/sample-art.svg', '(caption two)')) as i(position, path, caption)
where p.slug = 'sample-art';

insert into public.post_tags (post_id, tag_id)
select p.id, t.id from public.posts p join public.tags t on t.slug in ('sample-fandom', 'sample-tag') where p.slug = 'sample-art';

-- A tag only a draft uses: readers must not see it.
insert into public.tags (type, name, slug) values ('relationship', '(draft-only tag)', 'draft-only-tag');
insert into public.fic_tags (fic_id, tag_id)
select f.id, t.id from public.fics f, public.tags t where f.slug = 'sample-draft' and t.slug = 'draft-only-tag';

-- The featured fic on the home page.
update public.fics set featured = true where slug = 'sample-fic';
