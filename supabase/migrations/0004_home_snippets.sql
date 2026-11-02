-- Two short texts on the home page, edited like pages but not shown as pages of their own.
insert into public.pages (slug, title) values ('howdy', 'Howdy'), ('archive', 'The Archive') on conflict do nothing;
