'use strict';

/**
 * portfolio.js — ArtWall Studio Admin
 * Full CRUD portfolio management for the admin dashboard.
 *
 * Exposes:
 *   window.initPortfolio()              — called by dashboard.js when navigating to #portfolio
 *   window.renderPortfolioToMainSite()  — fetches and injects gallery HTML into index.html
 *
 * Depends on:
 *   • window.supabase   — Supabase client  (supabase.js)
 *   • window.showToast  — toast helper     (toast.js)
 *   • window.logAudit   — audit helper     (supabase.js)
 *   • window.openModal  — modal helper     (inline bootstrap script)
 *   • window.closeModal — modal helper     (inline bootstrap script)
 *   • window.Sortable   — SortableJS CDN
 *
 * Load order in admin/index.html:
 *   1. supabase CDN
 *   2. SortableJS CDN
 *   3. js/supabase.js
 *   4. js/toast.js
 *   5. js/dashboard.js
 *   6. js/portfolio.js   ← this file
 */

(function () {

  /* ================================================================
     CONSTANTS & STATE
     ================================================================ */

  const BUCKET      = 'artwall-media';
  const STORAGE_DIR = 'portfolio/';
  const TABLE       = 'portfolio';

  /** Module-level state — reset each time initPortfolio() is called. */
  let _items        = [];       // current fetched portfolio rows
  let _sortable     = null;     // SortableJS instance on the tbody
  let _searchTimer  = null;     // debounce handle for search input
  let _editingId    = null;     // UUID of item being edited (null = new)
  let _modalFile    = null;     // File object selected in modal
  let _bulkSelected = new Set();// UUIDs checked for bulk ops

  /* ================================================================
     INJECT MODULE STYLES  (once per page load)
     ================================================================ */

  (function injectStyles () {
    if (document.getElementById('aw-portfolio-styles')) return;

    const style = document.createElement('style');
    style.id = 'aw-portfolio-styles';
    style.textContent = `

      /* ── Portfolio grid (admin card view) ── */
      #portfolio-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 16px;
        padding: 20px 0 8px;
      }

      .pf-card {
        background: var(--surface);
        border: 1px solid var(--beige3);
        border-radius: var(--radius-md);
        overflow: hidden;
        position: relative;
        transition: box-shadow 0.22s ease, border-color 0.22s ease;
        cursor: default;
        user-select: none;
      }
      .pf-card:hover { box-shadow: var(--shadow-md); border-color: var(--beige3); }
      .pf-card.sortable-chosen { box-shadow: var(--shadow-lg); opacity: 0.95; }
      .pf-card.sortable-ghost  { opacity: 0.3; }

      /* Checkbox overlay */
      .pf-card-check {
        position: absolute;
        top: 8px; left: 8px;
        z-index: 3;
        width: 20px; height: 20px;
        accent-color: var(--gold);
        cursor: pointer;
        display: none;
      }
      .bulk-active .pf-card-check { display: block; }

      /* Drag handle */
      .pf-card-drag {
        position: absolute;
        top: 8px; right: 8px;
        z-index: 3;
        color: #fff;
        background: rgba(0,0,0,0.38);
        border-radius: 4px;
        width: 26px; height: 26px;
        display: flex; align-items: center; justify-content: center;
        cursor: grab;
        opacity: 0;
        transition: opacity 0.18s ease;
        font-size: 0.85rem;
      }
      .pf-card:hover .pf-card-drag { opacity: 1; }
      .pf-card-drag:active { cursor: grabbing; }

      /* Thumbnail */
      .pf-card-thumb {
        width: 100%;
        height: 148px;
        object-fit: cover;
        display: block;
        background: var(--beige2);
      }
      .pf-card-thumb-placeholder {
        width: 100%;
        height: 148px;
        background: var(--beige2);
        display: flex; align-items: center; justify-content: center;
        color: var(--muted);
        font-size: 2rem;
      }

      /* Body */
      .pf-card-body {
        padding: 10px 12px 12px;
      }
      .pf-card-title {
        font-size: 0.88rem;
        font-weight: 600;
        color: var(--ink1);
        margin: 0 0 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .pf-card-meta {
        font-size: 0.74rem;
        color: var(--muted);
        margin-bottom: 8px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .pf-card-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-bottom: 10px;
        min-height: 22px;
      }

      /* Action row */
      .pf-card-actions {
        display: flex;
        gap: 6px;
        justify-content: flex-end;
      }

      /* Inline section loading overlay */
      #portfolio-loading {
        display: none;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 48px 0;
        color: var(--muted);
        font-size: 0.85rem;
      }
      #portfolio-loading.visible { display: flex; }

      /* Bulk actions bar */
      #portfolio-bulk-bar {
        display: none;
        align-items: center;
        gap: 10px;
        padding: 10px 16px;
        background: var(--gold-dim);
        border: 1px solid rgba(184,147,58,0.3);
        border-radius: var(--radius-sm);
        margin-bottom: 12px;
        font-size: 0.83rem;
        color: var(--ink2);
      }
      #portfolio-bulk-bar.visible { display: flex; }
      #portfolio-bulk-bar .bulk-count { font-weight: 600; color: var(--gold); margin-right: 4px; }

      /* Modal image preview */
      .pf-img-preview {
        width: 100%;
        height: 180px;
        object-fit: cover;
        border-radius: var(--radius-sm);
        display: block;
        margin-bottom: 12px;
        border: 1px solid var(--beige3);
      }
      .pf-img-preview.hidden { display: none; }

      /* Toggle switch */
      .aw-toggle-row {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.83rem;
        color: var(--ink2);
        padding: 6px 0;
      }
      .aw-toggle {
        position: relative;
        width: 36px; height: 20px;
        flex-shrink: 0;
      }
      .aw-toggle input { opacity: 0; width: 0; height: 0; }
      .aw-toggle-slider {
        position: absolute; inset: 0;
        background: var(--beige3);
        border-radius: 20px;
        cursor: pointer;
        transition: background 0.2s ease;
      }
      .aw-toggle-slider::before {
        content: '';
        position: absolute;
        left: 2px; top: 2px;
        width: 16px; height: 16px;
        background: #fff;
        border-radius: 50%;
        transition: transform 0.2s ease;
        box-shadow: 0 1px 3px rgba(0,0,0,0.18);
      }
      .aw-toggle input:checked + .aw-toggle-slider { background: var(--gold); }
      .aw-toggle input:checked + .aw-toggle-slider::before { transform: translateX(16px); }

      /* Form 2-col grid */
      .pf-form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0 16px;
      }
      .pf-form-grid .form-group.full { grid-column: 1 / -1; }

      /* Empty state within grid */
      #portfolio-grid-empty {
        display: none;
        text-align: center;
        padding: 56px 0;
        color: var(--muted);
        grid-column: 1 / -1;
      }
      #portfolio-grid-empty.visible { display: block; }
      #portfolio-grid-empty i { font-size: 2.8rem; display: block; margin-bottom: 12px; opacity: 0.4; }
      #portfolio-grid-empty p { font-size: 0.85rem; }
    `;

    document.head.appendChild(style);
  })();


  /* ================================================================
     SECTION REBUILD
     Replaces the existing table-based placeholder with a card grid.
     ================================================================ */

  function buildSectionShell () {
    const section = document.getElementById('section-portfolio');
    if (!section) return;

    // Remove old table-based card
    const oldCard = section.querySelector('.card');
    if (oldCard) oldCard.remove();

    // Bulk bar
    if (!document.getElementById('portfolio-bulk-bar')) {
      const bar = document.createElement('div');
      bar.id = 'portfolio-bulk-bar';
      bar.innerHTML = `
        <span><span class="bulk-count" id="bulk-count">0</span> selected</span>
        <button class="btn btn-ghost btn-sm" id="btn-bulk-hide">
          <i class="ti ti-eye-off"></i> Hide Selected
        </button>
        <button class="btn btn-danger btn-sm" id="btn-bulk-delete">
          <i class="ti ti-trash"></i> Delete Selected
        </button>
        <button class="btn btn-ghost btn-sm" id="btn-bulk-cancel" style="margin-left:auto;">
          Cancel
        </button>
      `;
      section.appendChild(bar);
    }

    // Loading indicator
    if (!document.getElementById('portfolio-loading')) {
      const loader = document.createElement('div');
      loader.id = 'portfolio-loading';
      loader.innerHTML = `<span class="spinner"></span> Loading portfolio…`;
      section.appendChild(loader);
    }

    // Grid container
    if (!document.getElementById('portfolio-grid')) {
      const grid = document.createElement('div');
      grid.id = 'portfolio-grid';
      grid.innerHTML = `<div id="portfolio-grid-empty" class="visible">
        <i class="ti ti-photo"></i>
        <p>No portfolio items yet.<br>Click <strong>Add Project</strong> to get started.</p>
      </div>`;
      section.appendChild(grid);
    }
  }


  /* ================================================================
     INIT — public entry point
     ================================================================ */

  window.initPortfolio = async function initPortfolio () {
    // Rebuild section shell if needed
    buildSectionShell();

    // Wire header buttons (Add + Search)
    const addBtn = document.getElementById('btn-add-portfolio');
    if (addBtn) {
      addBtn.onclick = () => openPortfolioModal(null);
    }

    const searchInput = document.getElementById('portfolio-search');
    if (searchInput) {
      searchInput.oninput = () => {
        clearTimeout(_searchTimer);
        _searchTimer = setTimeout(() => renderGrid(_items, searchInput.value.trim()), 220);
      };
    }

    // Bulk bar buttons
    const bulkHide = document.getElementById('btn-bulk-hide');
    if (bulkHide) bulkHide.onclick = handleBulkHide;

    const bulkDelete = document.getElementById('btn-bulk-delete');
    if (bulkDelete) bulkDelete.onclick = handleBulkDelete;

    const bulkCancel = document.getElementById('btn-bulk-cancel');
    if (bulkCancel) {
      bulkCancel.onclick = () => {
        _bulkSelected.clear();
        refreshBulkBar();
        document.getElementById('portfolio-grid')?.classList.remove('bulk-active');
        document.querySelectorAll('.pf-card-check').forEach(cb => { cb.checked = false; });
      };
    }

    await fetchAndRender();
  };


  /* ================================================================
     DATA FETCH
     ================================================================ */

  async function fetchPortfolio () {
    try {
      const { data, error } = await window.supabase
        .from(TABLE)
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at',    { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[portfolio] fetch error:', err);
      showToast('error', 'Load failed', err.message || 'Could not load portfolio.');
      return [];
    }
  }

  async function fetchAndRender () {
    setLoading(true);
    _items = await fetchPortfolio();
    setLoading(false);

    const searchInput = document.getElementById('portfolio-search');
    renderGrid(_items, searchInput?.value.trim() || '');
    initSortable();
  }


  /* ================================================================
     GRID RENDER
     ================================================================ */

  function renderGrid (items, query = '') {
    const grid = document.getElementById('portfolio-grid');
    if (!grid) return;

    // Remove all existing cards (leave the empty-state div)
    grid.querySelectorAll('.pf-card').forEach(c => c.remove());

    // Filter
    const q = query.toLowerCase();
    const visible = q
      ? items.filter(it =>
          (it.title       || '').toLowerCase().includes(q) ||
          (it.artist_name || '').toLowerCase().includes(q) ||
          (it.art_type    || '').toLowerCase().includes(q) ||
          (it.location    || '').toLowerCase().includes(q)
        )
      : items;

    const emptyEl = document.getElementById('portfolio-grid-empty');

    if (visible.length === 0) {
      if (emptyEl) emptyEl.classList.add('visible');
      return;
    }
    if (emptyEl) emptyEl.classList.remove('visible');

    visible.forEach(item => {
      const card = buildCard(item);
      grid.appendChild(card);
    });

    // Restore bulk-active class if there are selections
    if (_bulkSelected.size > 0) {
      grid.classList.add('bulk-active');
      grid.querySelectorAll('.pf-card-check').forEach(cb => {
        cb.checked = _bulkSelected.has(cb.dataset.id);
      });
    }
  }

  function buildCard (item) {
    const card = document.createElement('div');
    card.className = 'pf-card';
    card.dataset.id = item.id;

    /* Thumb */
    let thumbHTML;
    if (item.image_url) {
      thumbHTML = `<img class="pf-card-thumb" src="${escHtml(item.image_url)}" alt="${escHtml(item.title || '')}" loading="lazy">`;
    } else {
      thumbHTML = `<div class="pf-card-thumb-placeholder"><i class="ti ti-photo"></i></div>`;
    }

    /* Badges */
    const badges = [];
    if (item.is_featured) {
      badges.push(`<span class="badge badge-warning" title="Featured"><i class="ti ti-star-filled"></i> Featured</span>`);
    }
    if (item.is_hidden) {
      badges.push(`<span class="badge badge-neutral" title="Hidden"><i class="ti ti-eye-off"></i> Hidden</span>`);
    }
    if (item.art_type) {
      badges.push(`<span class="badge badge-info">${escHtml(item.art_type)}</span>`);
    }

    card.innerHTML = `
      <input type="checkbox" class="pf-card-check" data-id="${item.id}" aria-label="Select ${escHtml(item.title || '')}">
      <div class="pf-card-drag" title="Drag to reorder"><i class="ti ti-grip-vertical"></i></div>
      ${thumbHTML}
      <div class="pf-card-body">
        <div class="pf-card-title" title="${escHtml(item.title || '')}">${escHtml(item.title || '(Untitled)')}</div>
        <div class="pf-card-meta">${escHtml(item.artist_name || '')}${item.year ? ' · ' + item.year : ''}</div>
        <div class="pf-card-badges">${badges.join('')}</div>
        <div class="pf-card-actions">
          <button class="btn-icon btn-sm pf-btn-featured" data-id="${item.id}" title="${item.is_featured ? 'Unfeature' : 'Feature'}">
            <i class="ti ${item.is_featured ? 'ti-star-filled' : 'ti-star'}"></i>
          </button>
          <button class="btn-icon btn-sm pf-btn-hide" data-id="${item.id}" title="${item.is_hidden ? 'Show' : 'Hide'}">
            <i class="ti ${item.is_hidden ? 'ti-eye' : 'ti-eye-off'}"></i>
          </button>
          <button class="btn-icon btn-sm pf-btn-edit" data-id="${item.id}" title="Edit">
            <i class="ti ti-pencil"></i>
          </button>
          <button class="btn-icon btn-sm danger pf-btn-delete" data-id="${item.id}" title="Delete">
            <i class="ti ti-trash"></i>
          </button>
        </div>
      </div>
    `;

    /* Event delegation on the card */
    card.querySelector('.pf-card-check').addEventListener('change', onCheckChange);
    card.querySelector('.pf-btn-featured').addEventListener('click', e => toggleFeatured(item.id));
    card.querySelector('.pf-btn-hide').addEventListener('click', e => toggleHidden(item.id));
    card.querySelector('.pf-btn-edit').addEventListener('click', e => openPortfolioModal(item.id));
    card.querySelector('.pf-btn-delete').addEventListener('click', e => confirmDelete(item.id));

    return card;
  }


  /* ================================================================
     SORTABLE (drag & drop reorder)
     ================================================================ */

  function initSortable () {
    const grid = document.getElementById('portfolio-grid');
    if (!grid || !window.Sortable) return;

    if (_sortable) {
      _sortable.destroy();
      _sortable = null;
    }

    _sortable = window.Sortable.create(grid, {
      animation    : 180,
      handle       : '.pf-card-drag',
      ghostClass   : 'sortable-ghost',
      chosenClass  : 'sortable-chosen',
      filter       : '.pf-card-check',     // don't drag when clicking checkbox
      onEnd        : onSortEnd,
    });
  }

  async function onSortEnd () {
    const grid = document.getElementById('portfolio-grid');
    if (!grid) return;

    const cards = [...grid.querySelectorAll('.pf-card')];
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
      // Supabase doesn't support bulk upsert of different rows in one call
      // so we fire individual updates concurrently
      const promises = updates.map(({ id, display_order }) =>
        window.supabase.from(TABLE).update({ display_order }).eq('id', id)
      );
      const results = await Promise.all(promises);

      const failed = results.find(r => r.error);
      if (failed) throw failed.error;

      await window.logAudit('portfolio', 'reorder', { count: updates.length });
      showToast('success', 'Order saved', `Reordered ${updates.length} items.`);
    } catch (err) {
      console.error('[portfolio] reorder error:', err);
      showToast('error', 'Reorder failed', err.message || 'Could not save order.');
    }
  }


  /* ================================================================
     BULK SELECTION
     ================================================================ */

  function onCheckChange (e) {
    const id = e.target.dataset.id;
    if (e.target.checked) {
      _bulkSelected.add(id);
    } else {
      _bulkSelected.delete(id);
    }
    refreshBulkBar();
  }

  function refreshBulkBar () {
    const bar      = document.getElementById('portfolio-bulk-bar');
    const countEl  = document.getElementById('bulk-count');
    const grid     = document.getElementById('portfolio-grid');
    if (!bar) return;

    const n = _bulkSelected.size;
    if (n > 0) {
      bar.classList.add('visible');
      if (countEl) countEl.textContent = n;
      grid?.classList.add('bulk-active');
    } else {
      bar.classList.remove('visible');
      grid?.classList.remove('bulk-active');
    }
  }

  async function handleBulkHide () {
    if (_bulkSelected.size === 0) return;
    const ids = [..._bulkSelected];
    setLoading(true);
    try {
      const { error } = await window.supabase
        .from(TABLE)
        .update({ is_hidden: true })
        .in('id', ids);
      if (error) throw error;

      await window.logAudit('portfolio', 'bulk_hide', { ids });
      showToast('success', 'Hidden', `${ids.length} item(s) are now hidden.`);
      _bulkSelected.clear();
      refreshBulkBar();
      await fetchAndRender();
    } catch (err) {
      console.error('[portfolio] bulk hide error:', err);
      showToast('error', 'Failed', err.message || 'Could not hide items.');
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkDelete () {
    if (_bulkSelected.size === 0) return;
    const ids = [..._bulkSelected];
    const n   = ids.length;

    openModal({
      title       : `Delete ${n} item${n > 1 ? 's' : ''}?`,
      bodyHTML    : `<p style="color:var(--ink2);font-size:0.88rem;">
                      This will permanently delete <strong>${n}</strong> portfolio item${n > 1 ? 's' : ''}
                      and their images. This cannot be undone.
                    </p>`,
      confirmLabel: 'Delete All',
      onConfirm   : async () => {
        closeModal();
        setLoading(true);
        try {
          // Delete storage files
          const paths = ids
            .map(id => _items.find(it => it.id === id)?.image_url)
            .filter(Boolean)
            .map(url => storagePathFromUrl(url))
            .filter(Boolean);

          if (paths.length > 0) {
            await window.supabase.storage.from(BUCKET).remove(paths);
          }

          const { error } = await window.supabase.from(TABLE).delete().in('id', ids);
          if (error) throw error;

          await window.logAudit('portfolio', 'bulk_delete', { ids });
          showToast('success', 'Deleted', `${n} item${n > 1 ? 's' : ''} deleted.`);
          _bulkSelected.clear();
          refreshBulkBar();
          await fetchAndRender();
        } catch (err) {
          console.error('[portfolio] bulk delete error:', err);
          showToast('error', 'Delete failed', err.message || 'Could not delete items.');
        } finally {
          setLoading(false);
        }
      },
    });
  }


  /* ================================================================
     TOGGLE FEATURED / HIDDEN (single item)
     ================================================================ */

  async function toggleFeatured (id) {
    const item = _items.find(i => i.id === id);
    if (!item) return;
    const newVal = !item.is_featured;
    try {
      const { error } = await window.supabase
        .from(TABLE).update({ is_featured: newVal }).eq('id', id);
      if (error) throw error;
      item.is_featured = newVal;
      await window.logAudit('portfolio', 'toggle_featured', { id, is_featured: newVal });
      showToast('success', newVal ? 'Featured' : 'Unfeatured', `"${item.title}" updated.`);
      renderGrid(_items, document.getElementById('portfolio-search')?.value.trim() || '');
    } catch (err) {
      console.error('[portfolio] toggle featured error:', err);
      showToast('error', 'Failed', err.message || 'Could not update item.');
    }
  }

  async function toggleHidden (id) {
    const item = _items.find(i => i.id === id);
    if (!item) return;
    const newVal = !item.is_hidden;
    try {
      const { error } = await window.supabase
        .from(TABLE).update({ is_hidden: newVal }).eq('id', id);
      if (error) throw error;
      item.is_hidden = newVal;
      await window.logAudit('portfolio', 'toggle_hidden', { id, is_hidden: newVal });
      showToast('success', newVal ? 'Hidden' : 'Visible', `"${item.title}" updated.`);
      renderGrid(_items, document.getElementById('portfolio-search')?.value.trim() || '');
    } catch (err) {
      console.error('[portfolio] toggle hidden error:', err);
      showToast('error', 'Failed', err.message || 'Could not update item.');
    }
  }


  /* ================================================================
     DELETE (single item)
     ================================================================ */

  async function confirmDelete (id) {
    const item = _items.find(i => i.id === id);
    if (!item) return;

    openModal({
      title       : 'Delete project?',
      bodyHTML    : `<p style="color:var(--ink2);font-size:0.88rem;">
                      Are you sure you want to permanently delete
                      <strong>${escHtml(item.title || 'this project')}</strong>?
                      The image will also be removed. This cannot be undone.
                    </p>`,
      confirmLabel: 'Delete',
      onConfirm   : async () => {
        closeModal();
        setLoading(true);
        try {
          // Remove storage file
          if (item.image_url) {
            const path = storagePathFromUrl(item.image_url);
            if (path) {
              const { error: storErr } = await window.supabase.storage
                .from(BUCKET).remove([path]);
              if (storErr) console.warn('[portfolio] storage delete warning:', storErr.message);
            }
          }

          const { error } = await window.supabase.from(TABLE).delete().eq('id', id);
          if (error) throw error;

          await window.logAudit('portfolio', 'delete', { id, title: item.title });
          showToast('success', 'Deleted', `"${item.title}" removed.`);
          _items = _items.filter(i => i.id !== id);
          renderGrid(_items, document.getElementById('portfolio-search')?.value.trim() || '');
        } catch (err) {
          console.error('[portfolio] delete error:', err);
          showToast('error', 'Delete failed', err.message || 'Could not delete item.');
        } finally {
          setLoading(false);
        }
      },
    });
  }


  /* ================================================================
     ADD / EDIT MODAL
     ================================================================ */

  function openPortfolioModal (id) {
    _editingId = id || null;
    _modalFile = null;

    const item = id ? _items.find(i => i.id === id) : null;
    const isEdit = !!item;

    const bodyHTML = buildModalBody(item);

    openModal({
      title        : isEdit ? 'Edit Project' : 'Add Project',
      bodyHTML,
      size         : 'lg',
      confirmLabel : isEdit ? 'Save Changes' : 'Add Project',
      onConfirm    : handleModalSave,
    });

    // After modal renders, wire the image upload zone
    requestAnimationFrame(() => initModalImageUpload(item));
  }

  function buildModalBody (item) {
    const v = val => item ? escHtml(item[val] || '') : '';

    return `
      <!-- Image upload zone -->
      <div id="modal-upload-zone" class="upload-zone" role="button" tabindex="0" aria-label="Upload project image">
        <i class="ti ti-cloud-upload"></i>
        <p><strong>Click to browse</strong> or drag & drop an image</p>
        <p style="font-size:0.74rem;margin-top:4px;">JPG, PNG, WEBP — max 10 MB</p>
      </div>
      <img id="modal-img-preview" class="pf-img-preview hidden" alt="Preview">
      <input type="file" id="modal-file-input" accept="image/*" style="display:none;" aria-hidden="true">

      <!-- Fields -->
      <div class="pf-form-grid" style="margin-top:16px;">

        <div class="form-group full">
          <label class="form-label" for="pf-title">Title <span style="color:#c06;">*</span></label>
          <input type="text" id="pf-title" class="form-input" placeholder="Mural project title" value="${v('title')}" required>
        </div>

        <div class="form-group">
          <label class="form-label" for="pf-artist">Artist Name</label>
          <input type="text" id="pf-artist" class="form-input" placeholder="e.g. Aarav Menon" value="${v('artist_name')}">
        </div>

        <div class="form-group">
          <label class="form-label" for="pf-year">Year</label>
          <input type="number" id="pf-year" class="form-input" placeholder="${new Date().getFullYear()}" min="1900" max="2100" value="${item?.year || ''}">
        </div>

        <div class="form-group">
          <label class="form-label" for="pf-client">Client</label>
          <input type="text" id="pf-client" class="form-input" placeholder="Client / company name" value="${v('client')}">
        </div>

        <div class="form-group">
          <label class="form-label" for="pf-art-type">Art Type</label>
          <input type="text" id="pf-art-type" class="form-input" placeholder="e.g. Mural, Digital, Mosaic" value="${v('art_type')}">
        </div>

        <div class="form-group">
          <label class="form-label" for="pf-location">Location</label>
          <input type="text" id="pf-location" class="form-input" placeholder="City or venue" value="${v('location')}">
        </div>

        <div class="form-group">
          <label class="form-label" for="pf-area">Area</label>
          <input type="text" id="pf-area" class="form-input" placeholder="e.g. 1,200 sq ft" value="${v('area')}">
        </div>

        <!-- Toggles -->
        <div class="form-group" style="display:flex;flex-direction:column;gap:10px;justify-content:flex-end;">
          <label class="aw-toggle-row">
            <span class="aw-toggle">
              <input type="checkbox" id="pf-featured" ${item?.is_featured ? 'checked' : ''}>
              <span class="aw-toggle-slider"></span>
            </span>
            <span><i class="ti ti-star" style="color:var(--gold);margin-right:4px;"></i>Featured</span>
          </label>
          <label class="aw-toggle-row">
            <span class="aw-toggle">
              <input type="checkbox" id="pf-hidden" ${item?.is_hidden ? 'checked' : ''}>
              <span class="aw-toggle-slider"></span>
            </span>
            <span><i class="ti ti-eye-off" style="color:var(--muted);margin-right:4px;"></i>Hidden from site</span>
          </label>
        </div>

      </div>
    `;
  }

  function initModalImageUpload (item) {
    const zone     = document.getElementById('modal-upload-zone');
    const fileInput = document.getElementById('modal-file-input');
    const preview  = document.getElementById('modal-img-preview');

    if (!zone || !fileInput || !preview) return;

    // Show existing image if editing
    if (item?.image_url) {
      preview.src = item.image_url;
      preview.classList.remove('hidden');
      zone.style.display = 'none';
    }

    // Click to browse
    zone.addEventListener('click', () => fileInput.click());
    zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });

    // File selected via input
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (file) setModalFile(file);
    });

    // Drag & drop
    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('image/')) setModalFile(file);
    });

    // Click preview to re-pick
    preview.addEventListener('click', () => fileInput.click());
    preview.style.cursor = 'pointer';
    preview.title = 'Click to change image';
  }

  function setModalFile (file) {
    _modalFile = file;
    const preview  = document.getElementById('modal-img-preview');
    const zone     = document.getElementById('modal-upload-zone');

    const reader = new FileReader();
    reader.onload = e => {
      preview.src = e.target.result;
      preview.classList.remove('hidden');
      if (zone) zone.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  async function handleModalSave () {
    const title     = document.getElementById('pf-title')?.value.trim();
    const artistName = document.getElementById('pf-artist')?.value.trim();
    const year      = parseInt(document.getElementById('pf-year')?.value) || null;
    const client    = document.getElementById('pf-client')?.value.trim();
    const artType   = document.getElementById('pf-art-type')?.value.trim();
    const location  = document.getElementById('pf-location')?.value.trim();
    const area      = document.getElementById('pf-area')?.value.trim();
    const isFeatured = document.getElementById('pf-featured')?.checked || false;
    const isHidden  = document.getElementById('pf-hidden')?.checked || false;

    if (!title) {
      showToast('warning', 'Title required', 'Please enter a project title.');
      document.getElementById('pf-title')?.focus();
      return;
    }

    // Disable confirm button during save
    const confirmBtn = document.getElementById('modal-confirm-btn');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="spinner"></span> Saving…';
    }

    try {
      let imageUrl = _editingId
        ? (_items.find(i => i.id === _editingId)?.image_url || null)
        : null;

      /* Upload new image if one was picked */
      if (_modalFile) {
        const ext      = _modalFile.name.split('.').pop().toLowerCase();
        const filename = `${STORAGE_DIR}${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        const { data: uploadData, error: uploadErr } = await window.supabase.storage
          .from(BUCKET)
          .upload(filename, _modalFile, { cacheControl: '3600', upsert: false });

        if (uploadErr) throw uploadErr;

        const { data: { publicUrl } } = window.supabase.storage
          .from(BUCKET)
          .getPublicUrl(filename);

        // Remove old image if replacing
        if (imageUrl && _editingId) {
          const oldPath = storagePathFromUrl(imageUrl);
          if (oldPath) {
            await window.supabase.storage.from(BUCKET).remove([oldPath]);
          }
        }

        imageUrl = publicUrl;
      }

      const payload = {
        title,
        artist_name  : artistName || null,
        year,
        client       : client    || null,
        art_type     : artType   || null,
        location     : location  || null,
        area         : area      || null,
        is_featured  : isFeatured,
        is_hidden    : isHidden,
        image_url    : imageUrl,
      };

      if (_editingId) {
        /* UPDATE */
        const { error } = await window.supabase
          .from(TABLE).update(payload).eq('id', _editingId);
        if (error) throw error;

        await window.logAudit('portfolio', 'update', { id: _editingId, title });
        showToast('success', 'Saved', `"${title}" updated successfully.`);
      } else {
        /* INSERT — append after existing items */
        const maxOrder = _items.length > 0
          ? Math.max(..._items.map(i => i.display_order || 0))
          : -1;

        payload.display_order = maxOrder + 1;

        const { error } = await window.supabase.from(TABLE).insert(payload);
        if (error) throw error;

        await window.logAudit('portfolio', 'create', { title });
        showToast('success', 'Added', `"${title}" added to portfolio.`);
      }

      closeModal();
      await fetchAndRender();

    } catch (err) {
      console.error('[portfolio] save error:', err);
      showToast('error', 'Save failed', err.message || 'Could not save project.');
    } finally {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = _editingId ? 'Save Changes' : 'Add Project';
      }
    }
  }


  /* ================================================================
     MAIN SITE RENDERER
     Generates exact gallery HTML structure and injects into index.html
     ================================================================ */

  /**
   * window.renderPortfolioToMainSite()
   *
   * Fetches visible portfolio items (is_hidden=false, ordered by
   * display_order), generates the exact gallery HTML expected by
   * the main site's CSS and script.js, injects into .gallery-grid,
   * then re-attaches the 3D tilt event handlers and IntersectionObserver
   * animation from script.js.
   *
   * Safe to call multiple times — re-renders idempotently.
   *
   * @returns {Promise<void>}
   */
  window.renderPortfolioToMainSite = async function renderPortfolioToMainSite () {
    const galleryGrid = document.querySelector('.gallery-grid');
    if (!galleryGrid) {
      console.warn('[portfolio] .gallery-grid not found on this page.');
      return;
    }

    const originalHtml = galleryGrid.innerHTML;

    // Show a lightweight loading indicator inside the grid
    galleryGrid.innerHTML = `
      <div style="grid-column:1/-1;display:flex;align-items:center;justify-content:center;padding:60px 0;gap:12px;color:var(--muted,#7a7268);font-size:0.85rem;">
        <span style="display:inline-block;width:20px;height:20px;border:2px solid #e0d9ce;border-top-color:#b8933a;border-radius:50%;animation:spin 0.7s linear infinite;"></span>
        Loading gallery…
      </div>`;

    try {
      const { data, error } = await window.supabase
        .from(TABLE)
        .select('*')
        .eq('is_hidden', false)
        .order('display_order', { ascending: true })
        .order('created_at',    { ascending: true });

      if (error) throw error;

      const items = data || [];

      if (items.length === 0) {
        galleryGrid.innerHTML = `
          <div style="grid-column:1/-1;text-align:center;padding:80px 0;color:var(--muted,#7a7268);">
            <p style="font-size:1rem;">No portfolio items to display yet.</p>
          </div>`;
        return;
      }

      /* Build HTML — first item is 'tall' (440px), rest are 215px */
      const html = items.map((item, index) => {
        const isTall   = index === 0;
        const height   = isTall ? '440px' : '215px';
        const tallClass = isTall ? ' tall' : '';

        const imgTag = item.image_url
          ? `<img src="${escHtml(item.image_url)}" alt="${escHtml(item.title || '')}"
               loading="lazy"
               style="width:100%;height:100%;object-fit:cover;display:block">`
          : `<div style="width:100%;height:100%;background:var(--beige2,#e8e0d4);display:flex;align-items:center;justify-content:center;color:var(--muted,#7a7268);font-size:2rem;">
               <i class="ti ti-photo"></i>
             </div>`;

        return `
<div class="gallery-item${tallClass}">
  <div class="gal-inner" style="height:${height}">
    ${imgTag}
  </div>
  <div class="gal-overlay"></div>
  <div class="gal-info">
    <h4>${escHtml(item.title || '')}</h4>
    <span>${escHtml(item.artist_name || '')}${item.year ? ' · ' + item.year : ''}</span>
  </div>
  <div class="gal-details">
    <div class="gal-detail-row">
      <i class="ti ti-user"></i>
      <div>
        <span class="gal-detail-label">Client</span>
        <span class="gal-detail-value">${escHtml(item.client || '—')}</span>
      </div>
    </div>
    <div class="gal-detail-row">
      <i class="ti ti-palette"></i>
      <div>
        <span class="gal-detail-label">Art Type</span>
        <span class="gal-detail-value">${escHtml(item.art_type || '—')}</span>
      </div>
    </div>
    <div class="gal-detail-row">
      <i class="ti ti-map-pin"></i>
      <div>
        <span class="gal-detail-label">Location</span>
        <span class="gal-detail-value">${escHtml(item.location || '—')}</span>
      </div>
    </div>
    <div class="gal-detail-row">
      <i class="ti ti-dimensions"></i>
      <div>
        <span class="gal-detail-label">Area</span>
        <span class="gal-detail-value">${escHtml(item.area || '—')}</span>
      </div>
    </div>
  </div>
</div>`;
      }).join('\n');

      galleryGrid.innerHTML = html;

      // Trigger dynamic masonry calculation immediately on render
      if (typeof window.layoutMasonry === 'function') {
        window.layoutMasonry();
      }

      /* Re-attach 3D tilt handlers (mirrors script.js behaviour) */
      galleryGrid.querySelectorAll('.gallery-item').forEach(card => {
        // Remove any old listeners by cloning — avoids stacking duplicates
        const fresh = card.cloneNode(true);
        card.parentNode.replaceChild(fresh, card);

        fresh.addEventListener('mousemove', e => {
          const rect    = fresh.getBoundingClientRect();
          const x       = e.clientX - rect.left;
          const y       = e.clientY - rect.top;
          const centerX = rect.width  / 2;
          const centerY = rect.height / 2;
          const rotateY = ((x - centerX) / centerX) * 6;
          const rotateX = ((centerY - y)  / centerY) * 6;
          
          // Compose with parallax offset if masonry active (does not overwrite absolute coords)
          fresh.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
          fresh.style.transition = 'transform 0.1s ease, box-shadow 0.3s ease';
        });

        fresh.addEventListener('mouseleave', () => {
          fresh.style.transform  = '';
          fresh.style.transition = 'opacity 0.8s cubic-bezier(0.23, 1, 0.32, 1), transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.5s ease';
        });
      });

      /* Re-observe with IntersectionObserver for stagger animation */
      // Reset the animated class so it can re-trigger
      galleryGrid.classList.remove('animated');

      const galleryObserver = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          galleryGrid.classList.add('animated');
          galleryObserver.disconnect();
        }
      }, { threshold: 0.15 });

      galleryObserver.observe(galleryGrid);

    } catch (err) {
      console.error('[portfolio] renderPortfolioToMainSite error:', err);
      galleryGrid.innerHTML = originalHtml;
    }
  };


  /* ================================================================
     UTILITIES
     ================================================================ */

  /** Show / hide the section-level loading indicator. */
  function setLoading (on) {
    const el = document.getElementById('portfolio-loading');
    const grid = document.getElementById('portfolio-grid');
    if (!el) return;
    if (on) {
      el.classList.add('visible');
      if (grid) grid.style.opacity = '0.4';
    } else {
      el.classList.remove('visible');
      if (grid) grid.style.opacity = '';
    }
  }

  /**
   * Extract the storage object path from a Supabase public URL.
   * e.g. https://xxx.supabase.co/storage/v1/object/public/artwall-media/portfolio/abc.jpg
   * → portfolio/abc.jpg
   */
  function storagePathFromUrl (url) {
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

  /** Minimal HTML escaping to prevent XSS in dynamically built HTML. */
  function escHtml (str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Thin wrappers so calls read cleanly even when window.* prefix would be noisy. */
  function openModal  (opts)  { if (window.openModal)  window.openModal(opts);  }
  function closeModal ()      { if (window.closeModal) window.closeModal();      }
  function showToast  (t, ti, m) { if (window.showToast) window.showToast(t, ti, m); }

})();
