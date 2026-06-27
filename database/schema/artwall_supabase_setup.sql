-- ============================================================
-- ARTWALL STUDIO — SUPABASE SETUP
-- ============================================================


-- ============================================================
-- 1. TABLE DEFINITIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS portfolio (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text NOT NULL,
  artist_name    text,
  client         text,
  location       text,
  area           text,
  art_type       text,
  year           int,
  image_url      text,
  display_order  int DEFAULT 0,
  is_featured    boolean DEFAULT false,
  is_hidden      boolean DEFAULT false,
  created_at     timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS artists (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  role           text,
  bio            text,
  quote          text,
  image_url      text,
  stats          text,
  fb_url         text,
  tw_url         text,
  ln_url         text,
  is_available   boolean DEFAULT true,
  display_order  int DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inquiries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text,
  email       text,
  phone       text,
  message     text,
  status      text DEFAULT 'new',
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text,
  company      text,
  location     text,
  review_text  text,
  rating       int,
  avatar_url   text,
  is_approved  boolean DEFAULT false,
  is_pinned    boolean DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS faqs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question       text,
  answer         text,
  display_order  int DEFAULT 0
);

CREATE TABLE IF NOT EXISTS site_config (
  key    text PRIMARY KEY,
  value  text
);

CREATE TABLE IF NOT EXISTS audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action      text,
  module      text,
  details     text,
  created_at  timestamptz DEFAULT now()
);


-- ============================================================
-- 2. ROW LEVEL SECURITY — ENABLE
-- ============================================================

ALTER TABLE portfolio   ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists     ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews     ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log   ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 3. RLS POLICIES
-- ============================================================

-- ------------------------------------------------------------
-- portfolio
-- ------------------------------------------------------------

-- Authenticated: full CRUD
CREATE POLICY "portfolio_auth_select"   ON portfolio FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "portfolio_auth_insert"   ON portfolio FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "portfolio_auth_update"   ON portfolio FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "portfolio_auth_delete"   ON portfolio FOR DELETE USING (auth.role() = 'authenticated');

-- Public: SELECT visible items only
CREATE POLICY "portfolio_public_select" ON portfolio FOR SELECT
  USING (auth.role() = 'anon' AND is_hidden = false);

-- ------------------------------------------------------------
-- artists
-- ------------------------------------------------------------

CREATE POLICY "artists_auth_select"    ON artists FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "artists_auth_insert"    ON artists FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "artists_auth_update"    ON artists FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "artists_auth_delete"    ON artists FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "artists_public_select"  ON artists FOR SELECT USING (auth.role() = 'anon');

-- ------------------------------------------------------------
-- inquiries
-- ------------------------------------------------------------

CREATE POLICY "inquiries_auth_select"  ON inquiries FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "inquiries_auth_insert"  ON inquiries FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "inquiries_auth_update"  ON inquiries FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "inquiries_auth_delete"  ON inquiries FOR DELETE USING (auth.role() = 'authenticated');

-- Public: INSERT only (contact form submissions)
CREATE POLICY "inquiries_public_insert" ON inquiries FOR INSERT WITH CHECK (auth.role() = 'anon');

-- ------------------------------------------------------------
-- reviews
-- ------------------------------------------------------------

CREATE POLICY "reviews_auth_select"    ON reviews FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "reviews_auth_insert"    ON reviews FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "reviews_auth_update"    ON reviews FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "reviews_auth_delete"    ON reviews FOR DELETE USING (auth.role() = 'authenticated');

-- Public: SELECT approved + pinned only, INSERT allowed
CREATE POLICY "reviews_public_select"  ON reviews FOR SELECT
  USING (auth.role() = 'anon' AND is_approved = true AND is_pinned = true);
CREATE POLICY "reviews_public_insert"  ON reviews FOR INSERT WITH CHECK (auth.role() = 'anon');

-- ------------------------------------------------------------
-- faqs
-- ------------------------------------------------------------

CREATE POLICY "faqs_auth_select"    ON faqs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "faqs_auth_insert"    ON faqs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "faqs_auth_update"    ON faqs FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "faqs_auth_delete"    ON faqs FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "faqs_public_select"  ON faqs FOR SELECT USING (auth.role() = 'anon');

-- ------------------------------------------------------------
-- site_config
-- ------------------------------------------------------------

CREATE POLICY "site_config_auth_select"  ON site_config FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "site_config_auth_insert"  ON site_config FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "site_config_auth_update"  ON site_config FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "site_config_auth_delete"  ON site_config FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "site_config_public_select" ON site_config FOR SELECT USING (auth.role() = 'anon');

-- ------------------------------------------------------------
-- audit_log
-- ------------------------------------------------------------

CREATE POLICY "audit_log_auth_select"  ON audit_log FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "audit_log_auth_insert"  ON audit_log FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "audit_log_auth_update"  ON audit_log FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "audit_log_auth_delete"  ON audit_log FOR DELETE USING (auth.role() = 'authenticated');


-- ============================================================
-- 4. DEFAULT site_config SEED DATA
-- ============================================================

INSERT INTO site_config (key, value) VALUES
  ('hero_tagline',       'Transforming Spaces Into Art'),
  ('hero_sub',           'Professional mural and wall art services for homes, offices, and public spaces'),
  ('stat_sqft',          '50,000+'),
  ('stat_projects',      '200+'),
  ('stat_cities',        '15+'),
  ('contact_phone',      '+1 (555) 000-0000'),
  ('contact_email',      'hello@artwallstudio.com'),
  ('contact_whatsapp',   '+15550000000')
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- 5. SUPABASE STORAGE — artwall-media BUCKET
-- ============================================================

-- Run this in the Supabase SQL Editor to create the storage bucket
-- and set public read access via storage policies.

-- Create the bucket (public = true enables public URL access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('artwall-media', 'artwall-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload/update/delete objects
CREATE POLICY "artwall_media_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'artwall-media' AND auth.role() = 'authenticated');

CREATE POLICY "artwall_media_auth_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'artwall-media' AND auth.role() = 'authenticated');

CREATE POLICY "artwall_media_auth_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'artwall-media' AND auth.role() = 'authenticated');

-- Allow anyone (anon + authenticated) to read/download objects
CREATE POLICY "artwall_media_public_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'artwall-media');


-- ============================================================
-- 6. PORTFOLIO SEED DATA
-- ============================================================
INSERT INTO portfolio (title, artist_name, client, location, area, art_type, year, image_url, display_order, is_featured, is_hidden)
SELECT 'Botanical Bloom', 'Priya Natarajan', 'Google India — Chennai Campus', 'Chennai, Tamil Nadu', '2,400 sq. ft.', 'Botanical Mural · Hand-Painted', 2024, 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=600&h=900&q=80', 0, true, false
WHERE NOT EXISTS (SELECT 1 FROM portfolio WHERE title = 'Botanical Bloom');

INSERT INTO portfolio (title, artist_name, client, location, area, art_type, year, image_url, display_order, is_featured, is_hidden)
SELECT 'Urban Grid', 'Arun K.', 'WeWork — Bangalore Hub', 'Bangalore, Karnataka', '850 sq. ft.', 'Geometric Street Art', 2024, 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=600&h=400&q=80', 1, false, false
WHERE NOT EXISTS (SELECT 1 FROM portfolio WHERE title = 'Urban Grid');

INSERT INTO portfolio (title, artist_name, client, location, area, art_type, year, image_url, display_order, is_featured, is_hidden)
SELECT 'Ocean Memory', 'Meera S.', 'Taj Fisherman''s Cove', 'Kovalam, Chennai', '1,200 sq. ft.', 'Abstract Fluid Art', 2023, 'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?auto=format&fit=crop&w=600&h=400&q=80', 2, false, false
WHERE NOT EXISTS (SELECT 1 FROM portfolio WHERE title = 'Ocean Memory');

INSERT INTO portfolio (title, artist_name, client, location, area, art_type, year, image_url, display_order, is_featured, is_hidden)
SELECT 'Golden Axis', 'Ravi S.', 'ITC Grand Chola', 'Guindy, Chennai', '680 sq. ft.', 'Gold Leaf Abstract', 2024, 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=600&h=400&q=80', 3, false, false
WHERE NOT EXISTS (SELECT 1 FROM portfolio WHERE title = 'Golden Axis');

INSERT INTO portfolio (title, artist_name, client, location, area, art_type, year, image_url, display_order, is_featured, is_hidden)
SELECT 'Nebula', 'Divya M.', 'Zoho Corporation', 'Tenkasi, Tamil Nadu', '1,500 sq. ft.', 'Cosmic Mural · Spray Art', 2024, 'https://images.unsplash.com/photo-1533158326339-7f3cf2404354?auto=format&fit=crop&w=600&h=400&q=80', 4, false, false
WHERE NOT EXISTS (SELECT 1 FROM portfolio WHERE title = 'Nebula');


-- ============================================================
-- 7. ARTISTS SEED DATA
-- ============================================================
INSERT INTO artists (name, role, bio, quote, image_url, stats, is_available, display_order)
SELECT 'Vikram', 'Lead Artist, Urban & Abstract', 'Specializing in geometric abstraction and large-scale urban realism, Vikram has spent the last 12 years collaborating with corporate campuses, hospitality interiors, and public districts to transform blank walls into local landmarks.', 'Art should not be confined behind closed doors. Corporate corridors and public walls are the spaces where street realism and daily life truly merge.', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400&h=500', '✦ Featured in Elle Décor,✦ 80+ Projects', true, 0
WHERE NOT EXISTS (SELECT 1 FROM artists WHERE name = 'Vikram');

INSERT INTO artists (name, role, bio, quote, image_url, stats, is_available, display_order)
SELECT 'Ashmija', 'Lead Artist, Muralist', 'Merging intricate botanical illustrations with architectural backdrops, Ashmija''s nature-inspired murals and large-scale floral art pieces bring organic life and a sense of calm to high-end interiors across South Asia.', 'My work bridges the gap between concrete rooms and the wild serenity of nature. I paint to give blank walls a voice and spaces a heartbeat.', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400&h=500', '✦ 120+ Murals,✦ National Art Award', true, 1
WHERE NOT EXISTS (SELECT 1 FROM artists WHERE name = 'Ashmija');

INSERT INTO artists (name, role, bio, quote, image_url, stats, is_available, display_order)
SELECT 'Meera S.', 'Fine Art & Botanical Specialist', 'With a background in classical fine art, Meera translates traditional oil and watercolor textures onto large indoor surfaces. Her work features detailed foliage patterns, soft color palettes, and elegant spatial harmonies.', 'A mural is a dialogue with the room''s geometry. Every stroke is designed to harmonize with the light and air of the space.', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400&h=500', '✦ 90+ Paintings,✦ Gold Medalist in Fine Arts', true, 2
WHERE NOT EXISTS (SELECT 1 FROM artists WHERE name = 'Meera S.');


-- ============================================================
-- 8. REVIEWS SEED DATA
-- ============================================================
INSERT INTO reviews (name, company, location, review_text, rating, avatar_url, is_approved, is_pinned)
SELECT 'Kavitha', 'Director, Google Chennai', 'Chennai', 'ArtWall transformed our empty lobby into an immersive botanical gallery. Our visitors are consistently wowed at first glance. Truly professional management from sketch to paint.', 5, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150', true, true
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE name = 'Kavitha');

INSERT INTO reviews (name, company, location, review_text, rating, avatar_url, is_approved, is_pinned)
SELECT 'Vikram', 'Curator, Taj Group', 'Chennai', 'We wanted our restaurant wall to reflect the rich heritage of South India in a modern way. The geometric murals Priya designed did exactly that. Absolute masterpiece.', 5, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150', true, true
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE name = 'Vikram');

INSERT INTO reviews (name, company, location, review_text, rating, avatar_url, is_approved, is_pinned)
SELECT 'Ananya', 'Architect, Nair Villas', 'Kochi', 'Every detail of the custom installation inside our luxury courtyard was handled flawlessly. The weather-resistant paints are holding up beautifully under direct sun. Highly recommended.', 5, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150', true, true
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE name = 'Ananya');


-- ============================================================
-- 9. FAQS SEED DATA
-- ============================================================
INSERT INTO faqs (question, answer, display_order)
SELECT 'What is your mural design process?', '<p>We start with a detailed site assessment, followed by collaborative mood-board curations and digital sketch overlays on your wall photography. Once approved, our team handles all logistics and execution.</p>', 0
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = 'What is your mural design process?');

INSERT INTO faqs (question, answer, display_order)
SELECT 'How long does a mural project take?', '<p>Typical projects take between 3 to 7 days of on-site painting, depending on scale, height complexity, and level of detail in the artwork.</p>', 1
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = 'How long does a mural project take?');

INSERT INTO faqs (question, answer, display_order)
SELECT 'What paints and materials do you use?', '<p>We use premium, low-VOC, UV-resistant, and weather-certified acrylics and varnishes to ensure the artwork remains vibrant for over 10 years outdoors.</p>', 2
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = 'What paints and materials do you use?');


-- ============================================================
-- 10. CONFIRM ADMIN USER IN AUTH.USERS
-- ============================================================
UPDATE auth.users
SET email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email = 'admin@artwallstudio.com';


-- ============================================================
-- END OF SETUP
-- ============================================================
--
-- STORAGE BUCKET NOTES:
-- 1. The INSERT into storage.buckets above creates the bucket
--    programmatically. Alternatively, create it via:
--    Supabase Dashboard → Storage → New Bucket
--    Name: artwall-media   |   Public bucket: ON
--
-- 2. Public file URLs follow this pattern:
--    https://<project-ref>.supabase.co/storage/v1/object/public/artwall-media/<path>
--
-- 3. To upload files from your app use the Supabase JS client:
--    supabase.storage.from('artwall-media').upload(path, file)
--
-- ============================================================
