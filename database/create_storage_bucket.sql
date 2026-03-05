-- Run this in the Supabase SQL Editor to create the public bucket for message attachments

-- 1. Create the bucket
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- 2. allow everyone to read
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'attachments' );

-- 3. allow authenticated users to insert
create policy "Auth Insert"
on storage.objects for insert
with check ( bucket_id = 'attachments' );

-- 4. allow authenticated users to update
create policy "Auth Update"
on storage.objects for update
using ( bucket_id = 'attachments' );

-- 5. allow authenticated users to delete
create policy "Auth Delete"
on storage.objects for delete
using ( bucket_id = 'attachments' );
