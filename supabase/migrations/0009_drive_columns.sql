-- Remember what happened to each uploaded original when it was saved to (or imported from) Google Drive.
alter table public.upload_files
  add column drive_file_id text,
  add column drive_status text check (drive_status in ('saved', 'failed')),
  add column drive_error text;
