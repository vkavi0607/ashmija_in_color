-- ArtWall Studio - initial Supabase migration
-- Idempotent setup for local development and clean applies.

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------

create table if not exists public.portfolio (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  artist_name   text,
  client        text,
  location      text,
  area          text,
  art_type      text,
  year          int,
  image_url     text,
  display_order int default 0,
  is_featured   boolean default false,
  is_hidden     boolean default false,
  created_at    timestamptz default now()
);

create table if not exists public.artists (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  role          text,
  bio           text,
  quote         text,
  image_url     text,
  stats         text,
  fb_url        text,
  tw_url        text,
  ln_url        text,
  is_available  boolean default true,
  display_order int default 0,
  created_at    timestamptz default now()
);

create table if not exists public.inquiries (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  email      text,
  phone      text,
  message    text,
  status     text default 'new',
  created_at timestamptz default now()
);

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  company     text,
  location    text,
  review_text text,
  rating      int,
  avatar_url  text,
  is_approved boolean default false,
  is_pinned   boolean default false,
  created_at  timestamptz default now()
);

create table if not exists public.faqs (
  id            uuid primary key default gen_random_uuid(),
  question      text,
  answer        text,
  display_order int default 0
);

create table if not exists public.site_config (
  key   text primary key,
  value text
);

create table if not exists public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  action     text,
  module     text,
  details    text,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------

alter table public.portfolio   enable row level security;
alter table public.artists     enable row level security;
alter table public.inquiries   enable row level security;
alter table public.reviews     enable row level security;
alter table public.faqs        enable row level security;
alter table public.site_config enable row level security;
alter table public.audit_log   enable row level security;

-- ------------------------------------------------------------
-- Policies
-- ------------------------------------------------------------

drop policy if exists portfolio_auth_select on public.portfolio;
drop policy if exists portfolio_auth_insert on public.portfolio;
drop policy if exists portfolio_auth_update on public.portfolio;
drop policy if exists portfolio_auth_delete on public.portfolio;
drop policy if exists portfolio_public_select on public.portfolio;

create policy portfolio_auth_select on public.portfolio
  for select using (auth.role() = 'authenticated');
create policy portfolio_auth_insert on public.portfolio
  for insert with check (auth.role() = 'authenticated');
create policy portfolio_auth_update on public.portfolio
  for update using (auth.role() = 'authenticated');
create policy portfolio_auth_delete on public.portfolio
  for delete using (auth.role() = 'authenticated');
create policy portfolio_public_select on public.portfolio
  for select using (auth.role() = 'anon' and is_hidden = false);

drop policy if exists artists_auth_select on public.artists;
drop policy if exists artists_auth_insert on public.artists;
drop policy if exists artists_auth_update on public.artists;
drop policy if exists artists_auth_delete on public.artists;
drop policy if exists artists_public_select on public.artists;

create policy artists_auth_select on public.artists
  for select using (auth.role() = 'authenticated');
create policy artists_auth_insert on public.artists
  for insert with check (auth.role() = 'authenticated');
create policy artists_auth_update on public.artists
  for update using (auth.role() = 'authenticated');
create policy artists_auth_delete on public.artists
  for delete using (auth.role() = 'authenticated');
create policy artists_public_select on public.artists
  for select using (auth.role() = 'anon');

drop policy if exists inquiries_auth_select on public.inquiries;
drop policy if exists inquiries_auth_insert on public.inquiries;
drop policy if exists inquiries_auth_update on public.inquiries;
drop policy if exists inquiries_auth_delete on public.inquiries;
drop policy if exists inquiries_public_insert on public.inquiries;

create policy inquiries_auth_select on public.inquiries
  for select using (auth.role() = 'authenticated');
create policy inquiries_auth_insert on public.inquiries
  for insert with check (auth.role() = 'authenticated');
create policy inquiries_auth_update on public.inquiries
  for update using (auth.role() = 'authenticated');
create policy inquiries_auth_delete on public.inquiries
  for delete using (auth.role() = 'authenticated');
create policy inquiries_public_insert on public.inquiries
  for insert with check (auth.role() = 'anon');

drop policy if exists reviews_auth_select on public.reviews;
drop policy if exists reviews_auth_insert on public.reviews;
drop policy if exists reviews_auth_update on public.reviews;
drop policy if exists reviews_auth_delete on public.reviews;
drop policy if exists reviews_public_select on public.reviews;
drop policy if exists reviews_public_insert on public.reviews;

create policy reviews_auth_select on public.reviews
  for select using (auth.role() = 'authenticated');
create policy reviews_auth_insert on public.reviews
  for insert with check (auth.role() = 'authenticated');
create policy reviews_auth_update on public.reviews
  for update using (auth.role() = 'authenticated');
create policy reviews_auth_delete on public.reviews
  for delete using (auth.role() = 'authenticated');
create policy reviews_public_select on public.reviews
  for select using (auth.role() = 'anon' and is_approved = true and is_pinned = true);
create policy reviews_public_insert on public.reviews
  for insert with check (auth.role() = 'anon');

drop policy if exists faqs_auth_select on public.faqs;
drop policy if exists faqs_auth_insert on public.faqs;
drop policy if exists faqs_auth_update on public.faqs;
drop policy if exists faqs_auth_delete on public.faqs;
drop policy if exists faqs_public_select on public.faqs;

create policy faqs_auth_select on public.faqs
  for select using (auth.role() = 'authenticated');
create policy faqs_auth_insert on public.faqs
  for insert with check (auth.role() = 'authenticated');
create policy faqs_auth_update on public.faqs
  for update using (auth.role() = 'authenticated');
create policy faqs_auth_delete on public.faqs
  for delete using (auth.role() = 'authenticated');
create policy faqs_public_select on public.faqs
  for select using (auth.role() = 'anon');

drop policy if exists site_config_auth_select on public.site_config;
drop policy if exists site_config_auth_insert on public.site_config;
drop policy if exists site_config_auth_update on public.site_config;
drop policy if exists site_config_auth_delete on public.site_config;
drop policy if exists site_config_public_select on public.site_config;

create policy site_config_auth_select on public.site_config
  for select using (auth.role() = 'authenticated');
create policy site_config_auth_insert on public.site_config
  for insert with check (auth.role() = 'authenticated');
create policy site_config_auth_update on public.site_config
  for update using (auth.role() = 'authenticated');
create policy site_config_auth_delete on public.site_config
  for delete using (auth.role() = 'authenticated');
create policy site_config_public_select on public.site_config
  for select using (auth.role() = 'anon');

drop policy if exists audit_log_auth_select on public.audit_log;
drop policy if exists audit_log_auth_insert on public.audit_log;
drop policy if exists audit_log_auth_update on public.audit_log;
drop policy if exists audit_log_auth_delete on public.audit_log;

create policy audit_log_auth_select on public.audit_log
  for select using (auth.role() = 'authenticated');
create policy audit_log_auth_insert on public.audit_log
  for insert with check (auth.role() = 'authenticated');
create policy audit_log_auth_update on public.audit_log
  for update using (auth.role() = 'authenticated');
create policy audit_log_auth_delete on public.audit_log
  for delete using (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- Storage
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('artwall-media', 'artwall-media', true)
on conflict (id) do nothing;

drop policy if exists artwall_media_auth_insert on storage.objects;
drop policy if exists artwall_media_auth_update on storage.objects;
drop policy if exists artwall_media_auth_delete on storage.objects;
drop policy if exists artwall_media_public_select on storage.objects;

create policy artwall_media_auth_insert
  on storage.objects for insert
  with check (bucket_id = 'artwall-media' and auth.role() = 'authenticated');

create policy artwall_media_auth_update
  on storage.objects for update
  using (bucket_id = 'artwall-media' and auth.role() = 'authenticated');

create policy artwall_media_auth_delete
  on storage.objects for delete
  using (bucket_id = 'artwall-media' and auth.role() = 'authenticated');

create policy artwall_media_public_select
  on storage.objects for select
  using (bucket_id = 'artwall-media');

-- ------------------------------------------------------------
-- Seed data
-- ------------------------------------------------------------

insert into public.site_config (key, value) values
  ('hero_tagline', 'Transforming Spaces Into Art'),
  ('hero_sub', 'Professional mural and wall art services for homes, offices, and public spaces'),
  ('stat_sqft', '50,000+'),
  ('stat_projects', '200+'),
  ('stat_cities', '15+'),
  ('contact_phone', '+1 (555) 000-0000'),
  ('contact_email', 'hello@artwallstudio.com'),
  ('contact_whatsapp', '+15550000000')
on conflict (key) do nothing;

insert into public.portfolio (title, artist_name, client, location, area, art_type, year, image_url, display_order, is_featured, is_hidden)
select 'Botanical Bloom', 'Priya Natarajan', 'Google India - Chennai Campus', 'Chennai, Tamil Nadu', '2,400 sq. ft.', 'Botanical Mural · Hand-Painted', 2024, 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=600&h=900&q=80', 0, true, false
where not exists (select 1 from public.portfolio where title = 'Botanical Bloom');

insert into public.portfolio (title, artist_name, client, location, area, art_type, year, image_url, display_order, is_featured, is_hidden)
select 'Urban Grid', 'Arun K.', 'WeWork - Bangalore Hub', 'Bangalore, Karnataka', '850 sq. ft.', 'Geometric Street Art', 2024, 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=600&h=400&q=80', 1, false, false
where not exists (select 1 from public.portfolio where title = 'Urban Grid');


insert into public.portfolio (title, artist_name, client, location, area, art_type, year, image_url, display_order, is_featured, is_hidden)
select 'Golden Axis', 'Ravi S.', 'ITC Grand Chola', 'Guindy, Chennai', '680 sq. ft.', 'Gold Leaf Abstract', 2024, 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=600&h=400&q=80', 2, false, false
where not exists (select 1 from public.portfolio where title = 'Golden Axis');

insert into public.portfolio (title, artist_name, client, location, area, art_type, year, image_url, display_order, is_featured, is_hidden)
select 'Nebula', 'Divya M.', 'Zoho Corporation', 'Tenkasi, Tamil Nadu', '1,500 sq. ft.', 'Cosmic Mural · Spray Art', 2024, 'https://images.unsplash.com/photo-1533158326339-7f3cf2404354?auto=format&fit=crop&w=600&h=400&q=80', 3, false, false
where not exists (select 1 from public.portfolio where title = 'Nebula');

insert into public.artists (name, role, bio, quote, image_url, stats, is_available, display_order)
select 'Vikram', 'Lead Artist, Urban & Abstract', 'Specializing in geometric abstraction and large-scale urban realism, Vikram has spent the last 12 years collaborating with corporate campuses, hospitality interiors, and public districts to transform blank walls into local landmarks.', 'Art should not be confined behind closed doors. Corporate corridors and public walls are the spaces where street realism and daily life truly merge.', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400&h=500', 'Featured in Elle Decor,80+ Projects', true, 0
where not exists (select 1 from public.artists where name = 'Vikram');

insert into public.artists (name, role, bio, quote, image_url, stats, is_available, display_order)
select 'Ashmija', 'Lead Artist, Muralist', 'Merging intricate botanical illustrations with architectural backdrops, Ashmija''s nature-inspired murals and large-scale floral art pieces bring organic life and a sense of calm to high-end interiors across South Asia.', 'My work bridges the gap between concrete rooms and the wild serenity of nature. I paint to give blank walls a voice and spaces a heartbeat.', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400&h=500', '120+ Murals,National Art Award', true, 1
where not exists (select 1 from public.artists where name = 'Ashmija');

	insert into public.reviews (name, company, location, review_text, rating, avatar_url, is_approved, is_pinned)
select 'Kavitha', 'Director, Google Chennai', 'Chennai', 'ArtWall transformed our empty lobby into an immersive botanical gallery. Our visitors are consistently wowed at first glance. Truly professional management from sketch to paint.', 5, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150', true, true
where not exists (select 1 from public.reviews where name = 'Kavitha');

insert into public.reviews (name, company, location, review_text, rating, avatar_url, is_approved, is_pinned)
select 'Vikram', 'Curator, Taj Group', 'Chennai', 'We wanted our restaurant wall to reflect the rich heritage of South India in a modern way. The geometric murals Priya designed did exactly that. Absolute masterpiece.', 5, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150', true, true
where not exists (select 1 from public.reviews where name = 'Vikram');

insert into public.reviews (name, company, location, review_text, rating, avatar_url, is_approved, is_pinned)
select 'Ananya', 'Architect, Nair Villas', 'Kochi', 'Every detail of the custom installation inside our luxury courtyard was handled flawlessly. The weather-resistant paints are holding up beautifully under direct sun. Highly recommended.', 5, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150', true, true
where not exists (select 1 from public.reviews where name = 'Ananya');

insert into public.faqs (question, answer, display_order)
select 'What is your mural design process?', '<p>We start with a detailed site assessment, followed by collaborative mood-board curations and digital sketch overlays on your wall photography. Once approved, our team handles all logistics and execution.</p>', 0
where not exists (select 1 from public.faqs where question = 'What is your mural design process?');

insert into public.faqs (question, answer, display_order)
select 'How long does a mural project take?', '<p>Typical projects take between 3 to 7 days of on-site painting, depending on scale, height complexity, and level of detail in the artwork.</p>', 1
where not exists (select 1 from public.faqs where question = 'How long does a mural project take?');

insert into public.faqs (question, answer, display_order)
select 'What paints and materials do you use?', '<p>We use premium, low-VOC, UV-resistant, and weather-certified acrylics and varnishes to ensure the artwork remains vibrant for over 10 years outdoors.</p>', 2
where not exists (select 1 from public.faqs where question = 'What paints and materials do you use?');

-- Confirm the new admin account in auth.users if it exists.
update auth.users
set email_confirmed_at = now(),
    confirmed_at = now(),
    email = 'admin@ashmijaincolor.com'
where email = 'admin@ashmijaincolor.com';
