/**
 * ashmija_in_color - Backend API Server (MySQL Version)
 * 
 * Run: node server.js
 * Default port: 4000
 * 
 * This server replaces Supabase with a MySQL backend.
 * All frontend files should use the API client (frontend/js/shared/api-client.js)
 * instead of window.supabase.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/database');

const app = express();
const PORT = process.env.API_PORT || 4000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded images (stored as base64 in DB or URLs)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================================
// ROOT API ROUTES
// ============================================================

// GET /api - List all available endpoints
app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    message: 'ashmija_in_color API is running (MySQL)',
    endpoints: {
      portfolio: ['GET /api/portfolio', 'GET /api/portfolio/public', 'POST /api/portfolio', 'PUT /api/portfolio/:id', 'DELETE /api/portfolio/:id', 'PUT /api/portfolio/reorder'],
      artists: ['GET /api/artists', 'GET /api/artists/public', 'POST /api/artists', 'PUT /api/artists/:id', 'DELETE /api/artists/:id', 'PUT /api/artists/reorder'],
      reviews: ['GET /api/reviews', 'GET /api/reviews/public', 'POST /api/reviews', 'PATCH /api/reviews/:id', 'DELETE /api/reviews/:id'],
      faqs: ['GET /api/faqs', 'GET /api/faqs/public', 'POST /api/faqs', 'PUT /api/faqs/:id', 'DELETE /api/faqs/:id'],
      config: ['GET /api/config', 'PUT /api/config'],
      inquiries: ['POST /api/inquiries'],
      health: 'GET /api/health'
    }
  });
});

// GET /api/health - Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ashmija_in_color API is running (MySQL)' });
});

// ============================================================
// PORTFOLIO API
// ============================================================

// GET /api/portfolio - List all portfolio items (for admin)
app.get('/api/portfolio', async (req, res) => {
  try {
    const items = await db.query(
      'SELECT * FROM portfolio ORDER BY display_order ASC, created_at ASC'
    );
    res.json(items);
  } catch (err) {
    console.error('[API] portfolio list error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/portfolio/public - Public portfolio items (only visible, non-hidden)
app.get('/api/portfolio/public', async (req, res) => {
  try {
    const items = await db.query(
      'SELECT * FROM portfolio WHERE is_hidden = 0 ORDER BY display_order ASC, created_at ASC'
    );
    res.json(items);
  } catch (err) {
    console.error('[API] portfolio public error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/portfolio/:id - Get single portfolio item
app.get('/api/portfolio/:id', async (req, res) => {
  try {
    const item = await db.queryOne('SELECT * FROM portfolio WHERE id = ?', [req.params.id]);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/portfolio - Create portfolio item
app.post('/api/portfolio', async (req, res) => {
  try {
    const { title, artist_name, year, client, art_type, location, area, image_url, is_featured, is_hidden } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const maxOrder = await db.queryOne('SELECT MAX(display_order) as max_order FROM portfolio');
    const displayOrder = (maxOrder?.max_order ?? -1) + 1;

    const id = await db.insert('portfolio', {
      title,
      artist_name: artist_name || null,
      year: year || null,
      client: client || null,
      art_type: art_type || null,
      location: location || null,
      area: area || null,
      image_url: image_url || null,
      is_featured: is_featured ? 1 : 0,
      is_hidden: is_hidden ? 1 : 0,
      display_order: displayOrder
    });
    res.status(201).json({ id, message: 'Created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/portfolio/:id - Update portfolio item
app.put('/api/portfolio/:id', async (req, res) => {
  try {
    const { title, artist_name, year, client, art_type, location, area, image_url, is_featured, is_hidden } = req.body;
    const payload = {};
    if (title !== undefined) payload.title = title;
    if (artist_name !== undefined) payload.artist_name = artist_name;
    if (year !== undefined) payload.year = year;
    if (client !== undefined) payload.client = client;
    if (art_type !== undefined) payload.art_type = art_type;
    if (location !== undefined) payload.location = location;
    if (area !== undefined) payload.area = area;
    if (image_url !== undefined) payload.image_url = image_url;
    if (is_featured !== undefined) payload.is_featured = is_featured ? 1 : 0;
    if (is_hidden !== undefined) payload.is_hidden = is_hidden ? 1 : 0;

    await db.update('portfolio', payload, 'id = ?', [req.params.id]);
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/portfolio/:id - Partial update
app.patch('/api/portfolio/:id', async (req, res) => {
  try {
    const payload = {};
    const fields = ['title', 'artist_name', 'year', 'client', 'art_type', 'location', 'area', 'image_url', 'is_featured', 'is_hidden', 'display_order'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        payload[f] = f.startsWith('is_') ? (req.body[f] ? 1 : 0) : req.body[f];
      }
    });
    if (Object.keys(payload).length === 0) return res.status(400).json({ error: 'No fields to update' });
    await db.update('portfolio', payload, 'id = ?', [req.params.id]);
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/portfolio/:id - Delete portfolio item
app.delete('/api/portfolio/:id', async (req, res) => {
  try {
    await db.remove('portfolio', 'id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/portfolio/reorder - Reorder portfolio items
app.put('/api/portfolio/reorder', async (req, res) => {
  try {
    const { items } = req.body; // [{id, display_order}, ...]
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items array required' });
    for (const item of items) {
      await db.update('portfolio', { display_order: item.display_order }, 'id = ?', [item.id]);
    }
    res.json({ message: 'Reordered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ARTISTS API
// ============================================================

app.get('/api/artists', async (req, res) => {
  try {
    const items = await db.query('SELECT * FROM artists ORDER BY display_order ASC, created_at ASC');
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/artists/public', async (req, res) => {
  try {
    const items = await db.query('SELECT * FROM artists ORDER BY display_order ASC, created_at ASC');
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/artists', async (req, res) => {
  try {
    const { name, role, bio, quote, stats, image_url, fb_url, tw_url, ln_url, is_available } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const maxOrder = await db.queryOne('SELECT MAX(display_order) as max_order FROM artists');
    const id = await db.insert('artists', {
      name, role: role || null, bio: bio || null, quote: quote || null,
      stats: stats || null, image_url: image_url || null,
      fb_url: fb_url || null, tw_url: tw_url || null, ln_url: ln_url || null,
      is_available: is_available !== false ? 1 : 0,
      display_order: (maxOrder?.max_order ?? -1) + 1
    });
    res.status(201).json({ id, message: 'Created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/artists/:id', async (req, res) => {
  try {
    const payload = {};
    const fields = ['name', 'role', 'bio', 'quote', 'stats', 'image_url', 'fb_url', 'tw_url', 'ln_url', 'is_available', 'display_order'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        payload[f] = f === 'is_available' ? (req.body[f] ? 1 : 0) : req.body[f];
      }
    });
    await db.update('artists', payload, 'id = ?', [req.params.id]);
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/artists/:id', async (req, res) => {
  try {
    await db.remove('artists', 'id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/artists/reorder', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items array required' });
    for (const item of items) {
      await db.update('artists', { display_order: item.display_order }, 'id = ?', [item.id]);
    }
    res.json({ message: 'Reordered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// REVIEWS API
// ============================================================

app.get('/api/reviews', async (req, res) => {
  try {
    const items = await db.query('SELECT * FROM reviews ORDER BY created_at DESC');
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reviews/public', async (req, res) => {
  try {
    const items = await db.query(
      "SELECT id, name, company, avatar_url, review_text, rating, created_at FROM reviews WHERE is_approved = 1 AND is_pinned = 1 ORDER BY created_at DESC LIMIT 3"
    );
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reviews/all-approved', async (req, res) => {
  try {
    const items = await db.query(
      "SELECT id, name, company, avatar_url, review_text, rating, created_at FROM reviews WHERE is_approved = 1 ORDER BY created_at DESC"
    );
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reviews', async (req, res) => {
  try {
    const { name, company, avatar_url, rating, review_text, is_approved, is_pinned } = req.body;
    if (!name || !review_text) return res.status(400).json({ error: 'Name and review_text are required' });
    const id = await db.insert('reviews', {
      name, company: company || null, avatar_url: avatar_url || null,
      rating: rating || 5, review_text,
      is_approved: is_approved ? 1 : 0, is_pinned: is_pinned ? 1 : 0
    });
    res.status(201).json({ id, message: 'Created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/reviews/:id', async (req, res) => {
  try {
    const payload = {};
    const fields = ['name', 'company', 'avatar_url', 'rating', 'review_text', 'is_approved', 'is_pinned'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        payload[f] = f.startsWith('is_') ? (req.body[f] ? 1 : 0) : req.body[f];
      }
    });
    await db.update('reviews', payload, 'id = ?', [req.params.id]);
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/reviews/:id', async (req, res) => {
  try {
    await db.remove('reviews', 'id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// FAQS API
// ============================================================

app.get('/api/faqs', async (req, res) => {
  try {
    const items = await db.query('SELECT * FROM faqs ORDER BY display_order ASC');
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/faqs/public', async (req, res) => {
  try {
    const items = await db.query(
      "SELECT id, question, answer FROM faqs WHERE is_visible = 1 ORDER BY display_order ASC"
    );
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/faqs', async (req, res) => {
  try {
    const { question, answer, category } = req.body;
    if (!question || !answer) return res.status(400).json({ error: 'Question and answer are required' });
    const maxOrder = await db.queryOne('SELECT MAX(display_order) as max_order FROM faqs');
    const id = await db.insert('faqs', {
      question, answer,
      category: category || 'General',
      display_order: (maxOrder?.max_order ?? -1) + 1
    });
    res.status(201).json({ id, message: 'Created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/faqs/:id', async (req, res) => {
  try {
    const payload = {};
    const fields = ['question', 'answer', 'category', 'is_visible', 'display_order'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        payload[f] = f === 'is_visible' ? (req.body[f] ? 1 : 0) : req.body[f];
      }
    });
    await db.update('faqs', payload, 'id = ?', [req.params.id]);
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/faqs/:id', async (req, res) => {
  try {
    await db.remove('faqs', 'id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/faqs/reorder', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items array required' });
    for (const item of items) {
      await db.update('faqs', { display_order: item.display_order }, 'id = ?', [item.id]);
    }
    res.json({ message: 'Reordered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// SITE CONFIG API
// ============================================================

app.get('/api/config', async (req, res) => {
  try {
    const rows = await db.query('SELECT config_key, config_value FROM site_config');
    const config = {};
    rows.forEach(row => { config[row.config_key] = row.config_value; });
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/config', async (req, res) => {
  try {
    const configs = req.body; // { key: value, ... }
    for (const [key, value] of Object.entries(configs)) {
      await db.query(
        'INSERT INTO site_config (config_key, config_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_value = ?',
        [key, value, value]
      );
    }
    res.json({ message: 'Config updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// INQUIRIES API (Contact Form)
// ============================================================

app.post('/api/inquiries', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });
    const id = await db.insert('inquiries', {
      name, email: email || null, phone: phone || null,
      message: message || null, status: 'new'
    });
    res.status(201).json({ id, message: 'Thank you! We will get back to you soon.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// AUDIT LOG API
// ============================================================

app.post('/api/audit', async (req, res) => {
  try {
    const { module, action, details, user_id } = req.body;
    await db.insert('audit_log', {
      module: module || 'unknown',
      action: action || 'unknown',
      details: details ? JSON.stringify(details) : null,
      user_id: user_id || null
    });
    res.status(201).json({ message: 'Logged' });
  } catch (err) {
    // Audit failures are non-blocking
    console.warn('[API] audit log error:', err.message);
    res.status(201).json({ message: 'Logged (with warnings)' });
  }
});

// ============================================================
// START SERVER
// ============================================================

async function start() {
  try {
    await db.initDatabase();
    console.log('[Server] MySQL connected successfully');

    app.listen(PORT, () => {
      console.log(`[Server] ashmija_in_color API running on http://localhost:${PORT}`);
      console.log(`[Server] API Base URL: http://localhost:${PORT}/api`);
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

start();