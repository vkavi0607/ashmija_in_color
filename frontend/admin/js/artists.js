'use strict';

/**
 * artists.js — ArtWall Studio Admin
 * Full CRUD management for the Artists section of the admin dashboard.
 *
 * Exposes:
 *   window.initArtists()              — called by dashboard.js when navigating to #section-artists
 *   window.renderArtistsToMainSite()  — fetches and injects exact creator-card HTML into index.html
 *
 * Depends on:
 *   • window.supabase   — Supabase client  (supabase.js)
 *   • window.showToast  — toast helper     (toast.js)
 *   • window.logAudit   — audit helper     (supabase.js)
 *   • window.openModal  — modal helper     (dashboard.js inline script)
 *   • window.closeModal — modal helper     (dashboard.js inline script)
 *   • window.Sortable   — SortableJS CDN
 *   • window.Quill      — Quill.js CDN
 *
 * Load order in admin/index.html:
 *   1. supabase CDN
 *   2. SortableJS CDN
 *   3. Quill.js CDN
 *   4. js/supabase.js
 *   5. js/toast.js
 *   6. js/dashboard.js
 *   7. js/artists.js   ← this file
 */

(function () {

  /* ================================================================
     CONSTANTS & STATE
     ================================================================ */

  const BUCKET      = 'artwall-media';
  const STORAGE_DIR = 'artists/';
  const TABLE       = 'artists';

  /** Module-level state — reset each time initArtists() is called. */
  let _items       = [];     // current fetched artist rows
  let _sortable    = null;   // SortableJS instance on the grid
  let _searchTimer = null;   // debounce handle for the search input
  let _editingId   = null;   // UUID of artist being edited (null = new)
  let _modalFile   = null;   // File object selected in the add/edit modal
  let _quill       = null;   // Quill editor instance inside the modal


  /* ================================================================
     INJECT MODULE STYLES  (once per page load)
     ================================================================ */

  (function injectStyles() {
    if (document.getElementById('aw-artists-styles')) return;

    const style = document.createElement('style');
    style.id = 'aw-artists-styles';
    style.textContent = `

      /* ── Artists card grid ── */
      #artists-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 18px;
        padding: 20px 0 8px;
      }

      .ar-card {
        background: var(--surface);
        border: 1px solid var(--beige3);
        border-radius: var(--radius-md);
        overflow: hidden;
        position: relative;
        transition: box-shadow 0.22s ease, border-color 0.22s ease;
        user-select: none;
      }
      .ar-card:hover { box-shadow: var(--shadow-md); }
      .ar-card.sortable-chosen { box-shadow: var(--shadow-lg); opacity: 0.95; }
      .ar-card.sortable-ghost  { opacity: 0.28; }

      /* Drag handle */
      .ar-card-drag {
        position: absolute;
        top: 8px; right: 8px;
        z-index: 3;
        color: #fff;
        background: rgba(0,0,0,0.40);
        border-radius: 4px;
        width: 26px; height: 26px;
        display: flex; align-items: center; justify-content: center;
        cursor: grab;
        opacity: 0;
        transition: opacity 0.18s ease;
        font-size: 0.85rem;
      }
      .ar-card:hover .ar-card-drag { opacity: 1; }
      .ar-card-drag:active { cursor: grabbing; }

      /* Availability badge */
      .ar-avail-badge {
        position: absolute;
        top: 8px; left: 8px;
        z-index: 3;
        padding: 3px 8px;
        border-radius: 20px;
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        cursor: pointer;
        transition: filter 0.15s ease;
      }
      .ar-avail-badge:hover { filter: brightness(1.12); }
      .ar-avail-badge.available {
        background: rgba(34, 197, 94, 0.18);
        color: #16a34a;
        border: 1px solid rgba(34, 197, 94, 0.38);
      }
      .ar-avail-badge.unavailable {
        background: rgba(239, 68, 68, 0.14);
        color: #dc2626;
        border: 1px solid rgba(239, 68, 68, 0.30);
      }

      /* Photo */
      .ar-card-photo {
        width: 100%;
        height: 160px;
        object-fit: cover;
        display: block;
        background: var(--beige2);
      }
      .ar-card-photo-placeholder {
        width: 100%;
        height: 160px;
        background: var(--beige2);
        display: flex; align-items: center; justify-content: center;
        color: var(--muted);
        font-size: 2.6rem;
      }

      /* Body */
      .ar-card-body {
        padding: 10px 12px 12px;
      }
      .ar-card-name {
        font-size: 0.88rem;
        font-weight: 700;
        color: var(--ink1);
        margin: 0 0 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ar-card-role {
        font-size: 0.75rem;
        color: var(--gold);
        margin-bottom: 10px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 500;
      }
      .ar-card-actions {
        display: flex;
        gap: 6px;
        justify-content: flex-end;
      }

      /* Loading overlay */
      #artists-loading {
        display: none;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 56px 0;
        color: var(--muted);
        font-size: 0.85rem;
      }
      #artists-loading.visible { display: flex; }

      /* Empty state */
      #artists-grid-empty {
        display: none;
        text-align: center;
        padding: 64px 0;
        color: var(--muted);
        grid-column: 1 / -1;
      }
      #artists-grid-empty.visible { display: block; }
      #artists-grid-empty i { font-size: 3rem; display: block; margin-bottom: 14px; opacity: 0.38; }
      #artists-grid-empty p { font-size: 0.85rem; }

      /* ── Modal styles ── */

      /* Upload zone */
      .ar-upload-zone {
        border: 2px dashed var(--beige3);
        border-radius: var(--radius-sm);
        padding: 24px 16px;
        text-align: center;
        cursor: pointer;
        transition: border-color 0.2s ease, background 0.2s ease;
        color: var(--muted);
        font-size: 0.84rem;
        margin-bottom: 0;
      }
      .ar-upload-zone:hover,
      .ar-upload-zone.drag-over {
        border-color: var(--gold);
        background: var(--gold-dim, rgba(184,147,58,0.06));
        color: var(--ink2);
      }
      .ar-upload-zone i {
        font-size: 2rem;
        display: block;
        margin-bottom: 8px;
        color: var(--gold);
        opacity: 0.7;
      }

      /* Photo preview */
      .ar-img-preview {
        width: 100%;
        height: 180px;
        object-fit: cover;
        border-radius: var(--radius-sm);
        display: block;
        margin-bottom: 0;
        border: 1px solid var(--beige3);
        cursor: pointer;
        transition: opacity 0.2s ease;
      }
      .ar-img-preview:hover { opacity: 0.88; }
      .ar-img-preview.hidden { display: none; }

      /* Modal 2-col grid */
      .ar-form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0 16px;
      }
      .ar-form-grid .form-group.full { grid-column: 1 / -1; }

      /* Quill editor inside modal */
      .ar-quill-wrap {
        border: 1px solid var(--beige3);
        border-radius: var(--radius-sm);
        overflow: hidden;
        background: var(--bg, #fff);
      }
      .ar-quill-wrap .ql-toolbar {
        border: none;
        border-bottom: 1px solid var(--beige3);
        background: var(--beige1, #f9f5f0);
        padding: 6px 8px;
      }
      .ar-quill-wrap .ql-container {
        border: none;
        font-size: 0.85rem;
        min-height: 96px;
        max-height: 180px;
        overflow-y: auto;
      }
      .ar-quill-wrap .ql-editor { padding: 10px 12px; }
      .ar-quill-wrap .ql-editor.ql-blank::before {
        color: var(--muted);
        font-style: normal;
        font-size: 0.83rem;
      }

      /* Stats helper text */
      .ar-stats-helper {
        font-size: 0.72rem;
        color: var(--muted);
        margin-top: 4px;
        line-height: 1.4;
      }

      /* Availability toggle row */
      .ar-toggle-row {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.83rem;
        color: var(--ink2);
        padding: 4px 0;
      }
      .ar-toggle {
        position: relative;
        width: 36px; height: 20px;
        flex-shrink: 0;
      }
      .ar-toggle input { opacity: 0; width: 0; height: 0; }
      .ar-toggle-slider {
        position: absolute; inset: 0;
        background: var(--beige3);
        border-radius: 20px;
        cursor: pointer;
        transition: background 0.2s ease;
      }
      .ar-toggle-slider::before {
        content: '';
        position: absolute;
        left: 2px; top: 2px;
        width: 16px; height: 16px;
        background: #fff;
        border-radius: 50%;
        transition: transform 0.2s ease;
        box-shadow: 0 1px 3px rgba(0,0,0,0.18);
      }
      .ar-toggle input:checked + .ar-toggle-slider { background: #22c55e; }
      .ar-toggle input:checked + .ar-toggle-slider::before { transform: translateX(16px); }

      /* Social url inputs group */
      .ar-social-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .ar-social-row i {
        font-size: 1.1rem;
        width: 22px;
        text-align: center;
        flex-shrink: 0;
        color: var(--muted);
      }
      .ar-social-row i.ti-brand-facebook { color: #1877f2; }
      .ar-social-row i.ti-brand-twitter  { color: #1da1f2; }
      .ar-social-row i.ti-brand-linkedin { color: #0a66c2; }

      /* Saving spinner in modal button */
      .ar-saving { display: inline-flex; align-items: center; gap: 6px; }
    `;

    document.head.appendChild(style);
  })();


  /* ================================================================
     SECTION SHELL BUILDER
     Replaces the static placeholder table with our card grid.
     ================================================================ */

  function buildSectionShell() {
    const section = document.getElementById('section-artists');
    if (!section) return;

    // Remove old table-based card
    const oldCard = section.querySelector('.card');
    if (oldCard) oldCard.remove();

    // Loading indicator
    if (!document.getElementById('artists-loading')) {
      const loader = document.createElement('div');
      loader.id = 'artists-loading';
      loader.innerHTML = `<span class="spinner"></span> Loading artists…`;
      section.appendChild(loader);
    }

    // Card grid
    if (!document.getElementById('artists-grid')) {
      const grid = document.createElement('div');
      grid.id = 'artists-grid';
      grid.innerHTML = `
        <div id="artists-grid-empty" class="visible">
          <i class="ti ti-user-circle"></i>
          <p>No artists yet.<br>Click <strong>Add Artist</strong> to get started.</p>
        </div>`;
      section.appendChild(grid);
    }
  }


  /* ================================================================
     PUBLIC INIT  (called by dashboard.js router)
     ================================================================ */

  window.initArtists = async function initArtists() {
    buildSectionShell();

    // Add Artist button
    const addBtn = document.getElementById('btn-add-artist');
    if (addBtn) {
      // Remove any stale listener by replacing the node
      const freshAdd = addBtn.cloneNode(true);
      addBtn.parentNode.replaceChild(freshAdd, addBtn);
      freshAdd.addEventListener('click', () => openArtistModal(null));
    }

    // Search
    const searchInput = document.getElementById('artists-search');
    if (searchInput) {
      const freshSearch = searchInput.cloneNode(true);
      searchInput.parentNode.replaceChild(freshSearch, searchInput);
      freshSearch.addEventListener('input', () => {
        clearTimeout(_searchTimer);
        _searchTimer = setTimeout(
          () => renderGrid(_items, freshSearch.value.trim()),
          220
        );
      });
    }

    await fetchAndRender();
  };


  /* ================================================================
     DATA FETCH
     ================================================================ */

  async function fetchArtists() {
    try {
      const { data, error } = await window.supabase
        .from(TABLE)
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at',    { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[artists] fetch error:', err);
      window.showToast('Failed to load artists: ' + (err.message || 'Unknown error'), 'error');
      return [];
    }
  }

  async function fetchAndRender() {
    setLoading(true);
    _items = await fetchArtists();
    setLoading(false);

    const q = document.getElementById('artists-search')?.value.trim() || '';
    renderGrid(_items, q);
    initSortable();
  }


  /* ================================================================
     GRID RENDER
     ================================================================ */

  function renderGrid(items, query = '') {
    const grid = document.getElementById('artists-grid');
    if (!grid) return;

    // Remove existing cards, preserve empty-state placeholder
    grid.querySelectorAll('.ar-card').forEach(c => c.remove());

    const q = query.toLowerCase();
    const visible = q
      ? items.filter(it =>
          (it.name || '').toLowerCase().includes(q) ||
          (it.role || '').toLowerCase().includes(q)
        )
      : items;

    const emptyEl = document.getElementById('artists-grid-empty');

    if (visible.length === 0) {
      if (emptyEl) emptyEl.classList.add('visible');
      return;
    }
    if (emptyEl) emptyEl.classList.remove('visible');

    visible.forEach(artist => {
      const card = buildAdminCard(artist);
      grid.appendChild(card);
    });
  }

  function buildAdminCard(artist) {
    const card = document.createElement('div');
    card.className = 'ar-card';
    card.dataset.id = artist.id;

    // Photo
    const photoHTML = artist.image_url
      ? `<img class="ar-card-photo" src="${escHtml(artist.image_url)}" alt="${escHtml(artist.name || '')}" loading="lazy">`
      : `<div class="ar-card-photo-placeholder"><i class="ti ti-user-circle"></i></div>`;

    // Availability badge
    const isAvail   = artist.is_available !== false;
    const badgeText = isAvail ? '● Available' : '● Unavailable';
    const badgeCls  = isAvail ? 'available' : 'unavailable';

    card.innerHTML = `
      <span class="ar-avail-badge ${badgeCls}" data-id="${artist.id}" title="Click to toggle availability">
        ${badgeText}
      </span>
      <div class="ar-card-drag" title="Drag to reorder">
        <i class="ti ti-grip-vertical"></i>
      </div>
      ${photoHTML}
      <div class="ar-card-body">
        <div class="ar-card-name" title="${escHtml(artist.name || '')}">${escHtml(artist.name || '(No name)')}</div>
        <div class="ar-card-role">${escHtml(artist.role || '—')}</div>
        <div class="ar-card-actions">
          <button class="btn-icon btn-sm ar-btn-edit"   data-id="${artist.id}" title="Edit artist">
            <i class="ti ti-pencil"></i>
          </button>
          <button class="btn-icon btn-sm danger ar-btn-delete" data-id="${artist.id}" title="Delete artist">
            <i class="ti ti-trash"></i>
          </button>
        </div>
      </div>
    `;

    // Availability badge click — direct toggle on card
    card.querySelector('.ar-avail-badge').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleAvailability(artist.id);
    });

    card.querySelector('.ar-btn-edit').addEventListener('click', () => openArtistModal(artist.id));
    card.querySelector('.ar-btn-delete').addEventListener('click', () => confirmDelete(artist.id));

    return card;
  }


  /* ================================================================
     SORTABLE (drag & drop reorder)
     ================================================================ */

  function initSortable() {
    const grid = document.getElementById('artists-grid');
    if (!grid || !window.Sortable) return;

    if (_sortable) {
      _sortable.destroy();
      _sortable = null;
    }

    _sortable = window.Sortable.create(grid, {
      animation   : 180,
      handle      : '.ar-card-drag',
      ghostClass  : 'sortable-ghost',
      chosenClass : 'sortable-chosen',
      onEnd       : onSortEnd,
    });
  }

  async function onSortEnd() {
    const grid = document.getElementById('artists-grid');
    if (!grid) return;

    const cards   = [...grid.querySelectorAll('.ar-card')];
    const updates = cards.map((card, index) => ({
      id            : card.dataset.id,
      display_order : index,
    }));

    // Optimistically update local state
    updates.forEach(({ id, display_order }) => {
      const item = _items.find(i => i.id === id);
      if (item) item.display_order = display_order;
    });

    try {
      const promises = updates.map(({ id, display_order }) =>
        window.supabase.from(TABLE).update({ display_order }).eq('id', id)
      );
      const results = await Promise.all(promises);
      const failed  = results.find(r => r.error);
      if (failed) throw failed.error;

      await window.logAudit('artists', 'reorder', { count: updates.length });
      window.showToast(`Display order saved for ${updates.length} artist(s).`, 'success');
    } catch (err) {
      console.error('[artists] reorder error:', err);
      window.showToast('Could not save order: ' + (err.message || 'Unknown error'), 'error');
    }
  }


  /* ================================================================
     AVAILABILITY TOGGLE (card badge click)
     ================================================================ */

  async function toggleAvailability(id) {
    const artist = _items.find(i => i.id === id);
    if (!artist) return;

    const newVal = !(artist.is_available !== false);

    try {
      const { error } = await window.supabase
        .from(TABLE)
        .update({ is_available: newVal })
        .eq('id', id);

      if (error) throw error;

      artist.is_available = newVal;
      await window.logAudit('artists', 'toggle_availability', { id, is_available: newVal });

      const label = newVal ? 'Available' : 'Unavailable';
      window.showToast(`"${artist.name}" marked as ${label}.`, 'success');

      // Patch the badge in-place without a full re-render
      const badge = document.querySelector(`.ar-avail-badge[data-id="${id}"]`);
      if (badge) {
        badge.textContent = newVal ? '● Available' : '● Unavailable';
        badge.className   = `ar-avail-badge ${newVal ? 'available' : 'unavailable'}`;
      }
    } catch (err) {
      console.error('[artists] toggle availability error:', err);
      window.showToast('Could not update availability: ' + (err.message || 'Unknown error'), 'error');
    }
  }


  /* ================================================================
     DELETE
     ================================================================ */

  async function confirmDelete(id) {
    const artist = _items.find(i => i.id === id);
    if (!artist) return;

    openModal({
      title       : 'Delete Artist?',
      bodyHTML    : `
        <p style="color:var(--ink2);font-size:0.88rem;line-height:1.6;">
          Are you sure you want to permanently delete
          <strong>${escHtml(artist.name || 'this artist')}</strong>?
          Their photo will also be removed from storage.
          <br><span style="color:#c06;font-weight:600;">This cannot be undone.</span>
        </p>`,
      confirmLabel: 'Delete',
      onConfirm   : async () => {
        closeModal();
        setLoading(true);
        try {
          // Remove photo from storage
          if (artist.image_url) {
            const path = storagePathFromUrl(artist.image_url);
            if (path) {
              const { error: storErr } = await window.supabase.storage
                .from(BUCKET).remove([path]);
              if (storErr) console.warn('[artists] storage delete warning:', storErr.message);
            }
          }

          const { error } = await window.supabase
            .from(TABLE).delete().eq('id', id);
          if (error) throw error;

          await window.logAudit('artists', 'delete', { id, name: artist.name });
          window.showToast(`"${artist.name}" deleted successfully.`, 'success');

          _items = _items.filter(i => i.id !== id);
          const q = document.getElementById('artists-search')?.value.trim() || '';
          renderGrid(_items, q);
        } catch (err) {
          console.error('[artists] delete error:', err);
          window.showToast('Delete failed: ' + (err.message || 'Unknown error'), 'error');
        } finally {
          setLoading(false);
        }
      },
    });
  }


  /* ================================================================
     ADD / EDIT MODAL
     ================================================================ */

  function openArtistModal(id) {
    _editingId = id || null;
    _modalFile = null;
    _quill     = null;

    const artist = id ? _items.find(i => i.id === id) : null;
    const isEdit = !!artist;

    openModal({
      title        : isEdit ? 'Edit Artist' : 'Add Artist',
      bodyHTML     : buildModalBody(artist),
      size         : 'lg',
      confirmLabel : isEdit ? 'Save Changes' : 'Add Artist',
      onConfirm    : handleModalSave,
    });

    // Wire up image upload and Quill after the modal renders
    requestAnimationFrame(() => {
      initModalImageUpload(artist);
      initQuill(artist);
    });
  }

  function buildModalBody(artist) {
    const v = (field) => artist ? escHtml(artist[field] || '') : '';

    return `
      <!-- Photo upload -->
      <div id="ar-upload-zone" class="ar-upload-zone" role="button" tabindex="0"
           aria-label="Upload artist photo">
        <i class="ti ti-cloud-upload"></i>
        <p><strong>Click to browse</strong> or drag &amp; drop a photo</p>
        <p style="font-size:0.73rem;margin-top:4px;opacity:0.75;">JPG, PNG, WEBP — max 8 MB</p>
      </div>
      <img id="ar-img-preview" class="ar-img-preview hidden" alt="Preview">
      <input type="file" id="ar-file-input" accept="image/*" style="display:none;" aria-hidden="true">

      <!-- Fields -->
      <div class="ar-form-grid" style="margin-top:18px;">

        <div class="form-group">
          <label class="form-label" for="ar-name">Name <span style="color:#c06;">*</span></label>
          <input type="text" id="ar-name" class="form-input"
                 placeholder="e.g. Aarav Menon" value="${v('name')}">
        </div>

        <div class="form-group">
          <label class="form-label" for="ar-role">Role / Speciality</label>
          <input type="text" id="ar-role" class="form-input"
                 placeholder="e.g. Muralist & Illustrator" value="${v('role')}">
        </div>

        <div class="form-group full">
          <label class="form-label" for="ar-bio-wrap">Bio</label>
          <div id="ar-bio-wrap" class="ar-quill-wrap">
            <!-- Quill mounts here -->
          </div>
          <!-- Hidden textarea keeps the raw HTML for saving -->
          <textarea id="ar-bio-hidden" style="display:none;">${v('bio')}</textarea>
        </div>

        <div class="form-group full">
          <label class="form-label" for="ar-quote">Quote</label>
          <input type="text" id="ar-quote" class="form-input"
                 placeholder="Short inspiring quote by the artist" value="${v('quote')}">
        </div>

        <div class="form-group full">
          <label class="form-label" for="ar-stats">Stats
            <span style="font-weight:400;color:var(--muted);font-size:0.75rem;">(comma-separated)</span>
          </label>
          <input type="text" id="ar-stats" class="form-input"
                 placeholder="e.g. 120+ Murals, 15 Years Experience, 30+ Cities"
                 value="${v('stats')}">
          <p class="ar-stats-helper">
            Enter each stat label separated by a comma.
            They appear as badges on the artist's profile card on the main site.<br>
            Example: <em>120+ Murals, 15 Years Experience, 30+ Cities</em>
          </p>
        </div>

        <!-- Social links -->
        <div class="form-group">
          <label class="form-label" for="ar-fb">Facebook URL</label>
          <div class="ar-social-row">
            <i class="ti ti-brand-facebook"></i>
            <input type="url" id="ar-fb" class="form-input"
                   placeholder="https://facebook.com/…" value="${v('fb_url')}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="ar-tw">Twitter / X URL</label>
          <div class="ar-social-row">
            <i class="ti ti-brand-twitter"></i>
            <input type="url" id="ar-tw" class="form-input"
                   placeholder="https://twitter.com/…" value="${v('tw_url')}">
          </div>
        </div>

        <div class="form-group full">
          <label class="form-label" for="ar-ln">LinkedIn URL</label>
          <div class="ar-social-row">
            <i class="ti ti-brand-linkedin"></i>
            <input type="url" id="ar-ln" class="form-input"
                   placeholder="https://linkedin.com/in/…" value="${v('ln_url')}">
          </div>
        </div>

        <!-- Availability toggle -->
        <div class="form-group full">
          <label class="ar-toggle-row" style="cursor:pointer;">
            <span class="ar-toggle">
              <input type="checkbox" id="ar-available"
                     ${(!artist || artist.is_available !== false) ? 'checked' : ''}>
              <span class="ar-toggle-slider"></span>
            </span>
            <span>
              <strong>Available for Projects</strong>
              <span style="font-size:0.76rem;color:var(--muted);margin-left:6px;">
                Shows green badge on the admin grid
              </span>
            </span>
          </label>
        </div>

      </div>
    `;
  }

  /* Initialise Quill.js rich-text editor for the bio field */
  function initQuill(artist) {
    const wrap = document.getElementById('ar-bio-wrap');
    if (!wrap || !window.Quill) return;

    try {
      _quill = new window.Quill(wrap, {
        theme  : 'snow',
        placeholder: 'Write a short biography…',
        modules: {
          toolbar: [
            ['bold', 'italic', 'underline'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['link'],
            ['clean'],
          ],
        },
      });

      // Pre-fill bio if editing
      if (artist?.bio) {
        // Quill accepts HTML via clipboard.dangerouslyPasteHTML
        _quill.clipboard.dangerouslyPasteHTML(0, artist.bio);
      }
    } catch (err) {
      console.warn('[artists] Quill init error:', err);
    }
  }

  /* Wire image upload zone inside modal */
  function initModalImageUpload(artist) {
    const zone      = document.getElementById('ar-upload-zone');
    const fileInput = document.getElementById('ar-file-input');
    const preview   = document.getElementById('ar-img-preview');
    if (!zone || !fileInput || !preview) return;

    // Show existing image when editing
    if (artist?.image_url) {
      preview.src = artist.image_url;
      preview.classList.remove('hidden');
      zone.style.display = 'none';
    }

    zone.addEventListener('click', () => fileInput.click());
    zone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') fileInput.click();
    });

    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (file) setModalFile(file);
    });

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('image/')) setModalFile(file);
    });

    // Click preview image to re-pick
    preview.addEventListener('click', () => fileInput.click());
    preview.title = 'Click to change photo';
  }

  function setModalFile(file) {
    _modalFile = file;
    const preview = document.getElementById('ar-img-preview');
    const zone    = document.getElementById('ar-upload-zone');

    const reader  = new FileReader();
    reader.onload = (e) => {
      if (preview) {
        preview.src = e.target.result;
        preview.classList.remove('hidden');
      }
      if (zone) zone.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }


  /* ================================================================
     MODAL SAVE  (INSERT or UPDATE)
     ================================================================ */

  async function handleModalSave() {
    const name      = document.getElementById('ar-name')?.value.trim();
    const role      = document.getElementById('ar-role')?.value.trim();
    const quote     = document.getElementById('ar-quote')?.value.trim();
    const stats     = document.getElementById('ar-stats')?.value.trim();
    const fbUrl     = document.getElementById('ar-fb')?.value.trim();
    const twUrl     = document.getElementById('ar-tw')?.value.trim();
    const lnUrl     = document.getElementById('ar-ln')?.value.trim();
    const isAvail   = document.getElementById('ar-available')?.checked ?? true;

    // Get bio HTML from Quill or fall back to hidden textarea
    let bio = '';
    try {
      bio = _quill ? _quill.root.innerHTML : (document.getElementById('ar-bio-hidden')?.value || '');
      // Treat Quill empty state as empty string
      if (bio === '<p><br></p>') bio = '';
    } catch (_) {
      bio = '';
    }

    if (!name) {
      window.showToast('Please enter the artist\'s name.', 'warning');
      document.getElementById('ar-name')?.focus();
      return;
    }

    // Disable confirm button while saving
    const confirmBtn = document.getElementById('modal-confirm-btn');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="ar-saving"><span class="spinner"></span> Saving…</span>';
    }

    try {
      // Determine existing image URL (for edit case)
      let imageUrl = _editingId
        ? (_items.find(i => i.id === _editingId)?.image_url || null)
        : null;

      /* Upload new photo if selected */
      if (_modalFile) {
        const ext      = (_modalFile.name.split('.').pop() || 'jpg').toLowerCase();
        const filename = `${STORAGE_DIR}${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadErr } = await window.supabase.storage
          .from(BUCKET)
          .upload(filename, _modalFile, { cacheControl: '3600', upsert: false });

        if (uploadErr) throw uploadErr;

        const { data: { publicUrl } } = window.supabase.storage
          .from(BUCKET).getPublicUrl(filename);

        // Remove old photo if replacing during an edit
        if (imageUrl && _editingId) {
          const oldPath = storagePathFromUrl(imageUrl);
          if (oldPath) {
            await window.supabase.storage.from(BUCKET).remove([oldPath]);
          }
        }

        imageUrl = publicUrl;
      }

      const payload = {
        name,
        role         : role     || null,
        bio          : bio      || null,
        quote        : quote    || null,
        stats        : stats    || null,
        fb_url       : fbUrl    || null,
        tw_url       : twUrl    || null,
        ln_url       : lnUrl    || null,
        is_available : isAvail,
        image_url    : imageUrl,
      };

      if (_editingId) {
        /* ── UPDATE ── */
        const { error } = await window.supabase
          .from(TABLE).update(payload).eq('id', _editingId);
        if (error) throw error;

        await window.logAudit('artists', 'update', { id: _editingId, name });
        window.showToast(`"${name}" updated successfully.`, 'success');
      } else {
        /* ── INSERT ── */
        const maxOrder = _items.length > 0
          ? Math.max(..._items.map(i => i.display_order || 0))
          : -1;

        payload.display_order = maxOrder + 1;

        const { error } = await window.supabase.from(TABLE).insert(payload);
        if (error) throw error;

        await window.logAudit('artists', 'create', { name });
        window.showToast(`"${name}" added to the artists roster.`, 'success');
      }

      closeModal();
      await fetchAndRender();

    } catch (err) {
      console.error('[artists] save error:', err);
      window.showToast('Save failed: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = _editingId ? 'Save Changes' : 'Add Artist';
      }
    }
  }


  /* ================================================================
     MAIN SITE RENDERER
     Generates EXACT creator-card HTML and injects into .creators-grid-new
     ================================================================ */

  /**
   * window.renderArtistsToMainSite()
   *
   * Fetches all artists from Supabase ordered by display_order, builds
   * the exact .creator-card HTML structure required by the main site's
   * CSS and script.js, injects it into .creators-grid-new, re-attaches
   * the click-to-open-profile-modal handlers, and re-observes the new
   * cards with revealObserver so the CSS entrance animation fires.
   *
   * Safe to call multiple times — fully idempotent.
   *
   * @returns {Promise<void>}
   */
  window.renderArtistsToMainSite = async function renderArtistsToMainSite() {
    const creatorsGrid = document.querySelector('.creators-grid-new');
    if (!creatorsGrid) {
      console.warn('[artists] .creators-grid-new not found on this page.');
      return;
    }

    const originalHtml = creatorsGrid.innerHTML;

    // Show lightweight loading state inside the grid
    creatorsGrid.innerHTML = `
      <div style="grid-column:1/-1;display:flex;align-items:center;justify-content:center;
                  padding:60px 0;gap:12px;color:var(--muted,#7a7268);font-size:0.85rem;">
        <span style="display:inline-block;width:20px;height:20px;border:2px solid #e0d9ce;
                     border-top-color:#b8933a;border-radius:50%;
                     animation:spin 0.7s linear infinite;"></span>
        Loading artists…
      </div>`;

    try {
      const { data, error } = await window.supabase
        .from(TABLE)
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at',    { ascending: true });

      if (error) throw error;

      const artists = data || [];

      if (artists.length === 0) {
        creatorsGrid.innerHTML = `
          <div style="grid-column:1/-1;text-align:center;padding:80px 0;
                      color:var(--muted,#7a7268);">
            <p style="font-size:1rem;">No artists to display yet.</p>
          </div>`;
        return;
      }

      /* ── Build exact creator-card HTML structure ── */
      const html = artists.map((artist, index) => {
        const name    = artist.name    || '';
        const role    = artist.role    || '';
        const bio     = artist.bio     || '';
        const quote   = artist.quote   || '';
        const imgUrl  = artist.image_url || '';
        const stats   = artist.stats   || '';
        const fbUrl   = artist.fb_url  || '#';
        const twUrl   = artist.tw_url  || '#';
        const lnUrl   = artist.ln_url  || '#';

        return `<div class="creator-card glass-card reveal"
     style="transition-delay: ${index * 0.12}s"
     data-name="${escHtml(name)}"
     data-role="${escHtml(role)}"
     data-bio="${escHtml(bio)}"
     data-quote="${escHtml(quote)}"
     data-image="${escHtml(imgUrl)}"
     data-stats="${escHtml(stats)}">
  <div class="creator-card-img">
    <img src="${escHtml(imgUrl)}" alt="${escHtml(name)}">
    <div class="creator-card-hover-overlay">
      <span class="view-bio-txt">
        <i class="ti ti-eye"></i> View Profile
      </span>
    </div>
  </div>
  <div class="creator-card-info">
    <h4 class="creator-card-name">${escHtml(name.toUpperCase())}</h4>
    <span class="creator-card-role">${escHtml(role)}</span>
    <div class="creator-card-social">
      <a href="${escHtml(fbUrl)}" class="social-icon fb" onclick="event.stopPropagation();">
        <i class="ti ti-brand-facebook"></i>
      </a>
      <a href="${escHtml(twUrl)}" class="social-icon tw" onclick="event.stopPropagation();">
        <i class="ti ti-brand-twitter"></i>
      </a>
      <a href="${escHtml(lnUrl)}" class="social-icon ln" onclick="event.stopPropagation();">
        <i class="ti ti-brand-linkedin"></i>
      </a>
    </div>
  </div>
</div>`;
      }).join('\n');

      creatorsGrid.innerHTML = html;

      /* ── Re-attach creator-card click handlers (mirrors script.js) ── */
      creatorsGrid.querySelectorAll('.creator-card').forEach(card => {
        card.addEventListener('click', () => {
          const name   = card.getAttribute('data-name');
          const role   = card.getAttribute('data-role');
          const bio    = card.getAttribute('data-bio');
          const quote  = card.getAttribute('data-quote');
          const image  = card.getAttribute('data-image');
          const statsAttr = card.getAttribute('data-stats') || '';

          const modalImg   = document.getElementById('modal-img');
          const modalName  = document.getElementById('modal-name');
          const modalRole  = document.getElementById('modal-role');
          const modalBio   = document.getElementById('modal-bio');
          const modalQuote = document.getElementById('modal-quote');
          const modalStats = document.getElementById('modal-stats');

          if (modalImg)  { modalImg.src = image; modalImg.alt = name; }
          if (modalName) modalName.textContent = name;
          if (modalRole) modalRole.textContent = role;
          if (modalBio)  modalBio.textContent  = bio;

          if (modalQuote) {
            if (quote) {
              modalQuote.textContent   = `"${quote}"`;
              modalQuote.style.display = 'block';
            } else {
              modalQuote.style.display = 'none';
            }
          }

          if (modalStats) {
            modalStats.innerHTML = '';
            if (statsAttr) {
              statsAttr.split(',').forEach(stat => {
                const badge = document.createElement('span');
                badge.className   = 'creator-stat-badge';
                badge.textContent = stat.trim();
                modalStats.appendChild(badge);
              });
            }
          }

          // Open the main site's creator profile modal
          const creatorModal  = document.getElementById('creator-modal');
          const modalBackdrop = document.getElementById('modal-backdrop');
          if (creatorModal && modalBackdrop) {
            creatorModal.classList.add('active');
            modalBackdrop.classList.add('active');
            document.body.style.overflow = 'hidden';
          }
        });
      });

      /* ── Re-observe new cards with revealObserver for entrance animation ── */
      if (typeof window.revealObserver !== 'undefined' && window.revealObserver) {
        creatorsGrid.querySelectorAll('.reveal').forEach(el => {
          el.classList.remove('in'); // reset so it can re-trigger
          window.revealObserver.observe(el);
        });
      } else {
        // Fallback: use our own IntersectionObserver if revealObserver isn't exposed
        const fallbackObserver = new IntersectionObserver((entries, obs) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('in');
              obs.unobserve(entry.target);
            }
          });
        }, { threshold: 0.12 });

        creatorsGrid.querySelectorAll('.reveal').forEach(el => {
          el.classList.remove('in');
          fallbackObserver.observe(el);
        });
      }

    } catch (err) {
      console.error('[artists] renderArtistsToMainSite error:', err);
      creatorsGrid.innerHTML = originalHtml;
    }
  };


  /* ================================================================
     UTILITIES
     ================================================================ */

  /** Show / hide the section-level loading overlay. */
  function setLoading(on) {
    const loader = document.getElementById('artists-loading');
    const grid   = document.getElementById('artists-grid');
    if (!loader) return;
    if (on) {
      loader.classList.add('visible');
      if (grid) grid.style.opacity = '0.4';
    } else {
      loader.classList.remove('visible');
      if (grid) grid.style.opacity = '';
    }
  }

  /**
   * Extract the storage object path from a Supabase public URL.
   * e.g. https://xxx.supabase.co/storage/v1/object/public/artwall-media/artists/abc.jpg
   *   → artists/abc.jpg
   */
  function storagePathFromUrl(url) {
    if (!url) return null;
    try {
      const marker = `/object/public/${BUCKET}/`;
      const idx    = url.indexOf(marker);
      if (idx === -1) return null;
      return url.slice(idx + marker.length);
    } catch (_) {
      return null;
    }
  }

  /** Minimal HTML escaping to prevent XSS in dynamically built innerHTML. */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Thin wrappers so internal calls read cleanly. */
  function openModal(opts)  { if (window.openModal)  window.openModal(opts);  }
  function closeModal()     { if (window.closeModal) window.closeModal();      }

})();
