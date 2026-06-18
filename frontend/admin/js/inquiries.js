'use strict';

/**
 * inquiries.js — ArtWall Studio Admin
 * Full inquiry management: filtered table, slide-in detail panel,
 * status updates, CSV export, sidebar unread badge, and the main-site
 * contact-form submission handler.
 *
 * Exposes:
 *   window.initInquiries()     — called by dashboard.js router
 *   window.refreshInquiryBadge() — call from anywhere to sync sidebar count
 *
 * Depends on:
 *   • window.supabase   — Supabase client  (supabase.js)
 *   • window.showToast  — toast helper     (toast.js)
 *   • window.logAudit   — audit helper     (supabase.js)
 *
 * Load order in admin/index.html:
 *   1. supabase CDN  2. supabase.js  3. toast.js  4. dashboard.js
 *   5. inquiries.js  ← this file
 *
 * Also handles the main-site contact form (index.html) when included
 * there — safe to include in both pages; each page only uses its own
 * relevant DOM hooks.
 */

(function () {

  /* ================================================================
     CONSTANTS & STATE
     ================================================================ */

  const TABLE = 'inquiries';

  const STATUS_CONFIG = {
    new           : { label: 'New',           cls: 'iq-badge-new'         },
    seen          : { label: 'Seen',          cls: 'iq-badge-seen'        },
    in_discussion : { label: 'In Discussion', cls: 'iq-badge-discussion'  },
    closed        : { label: 'Closed',        cls: 'iq-badge-closed'      },
  };

  const TAB_ORDER = ['all', 'new', 'seen', 'in_discussion', 'closed'];

  /** Module state — reset each time initInquiries() is called. */
  let _allItems     = [];     // all fetched inquiry rows
  let _activeTab    = 'all'; // currently selected status tab
  let _searchQuery  = '';    // live search string
  let _searchTimer  = null;  // debounce handle
  let _panelId      = null;  // UUID open in the detail panel (or null)


  /* ================================================================
     INJECT MODULE STYLES
     ================================================================ */

  (function injectStyles() {
    if (document.getElementById('aw-inquiries-styles')) return;

    const style = document.createElement('style');
    style.id = 'aw-inquiries-styles';
    style.textContent = `

      /* ── Status tabs ── */
      #iq-tab-bar {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 14px;
      }
      .iq-tab {
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 0.76rem;
        font-weight: 600;
        cursor: pointer;
        border: 1.5px solid var(--beige3);
        background: var(--surface);
        color: var(--ink2);
        transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
        white-space: nowrap;
        user-select: none;
      }
      .iq-tab:hover { border-color: var(--gold); color: var(--ink1); }
      .iq-tab.active {
        background: var(--gold);
        border-color: var(--gold);
        color: #fff;
      }

      /* ── Status badges (table + panel) ── */
      .iq-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 3px 9px;
        border-radius: 20px;
        font-size: 0.70rem;
        font-weight: 700;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .iq-badge::before {
        content: '';
        display: inline-block;
        width: 6px; height: 6px;
        border-radius: 50%;
        background: currentColor;
        flex-shrink: 0;
      }
      .iq-badge-new          { background: rgba(220,38,38,0.12);  color: #dc2626; border: 1px solid rgba(220,38,38,0.28); }
      .iq-badge-seen         { background: rgba(217,119,6,0.12);  color: #d97706; border: 1px solid rgba(217,119,6,0.28); }
      .iq-badge-discussion   { background: rgba(37,99,235,0.11);  color: #2563eb; border: 1px solid rgba(37,99,235,0.26); }
      .iq-badge-closed       { background: rgba(107,114,128,0.11);color: #6b7280; border: 1px solid rgba(107,114,128,0.22); }

      /* ── Table row interactivity ── */
      #iq-tbody tr.iq-row {
        cursor: pointer;
        transition: background 0.15s ease;
      }
      #iq-tbody tr.iq-row:hover { background: var(--beige1, #f9f5f0); }
      #iq-tbody tr.iq-row.iq-row-active { background: var(--gold-dim, rgba(184,147,58,0.08)); }
      #iq-tbody tr.iq-row td { vertical-align: middle; }

      /* ── Loading / empty states ── */
      #iq-loading {
        display: none;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 52px 0;
        color: var(--muted);
        font-size: 0.85rem;
      }
      #iq-loading.visible { display: flex; }

      .iq-empty-state {
        text-align: center;
        padding: 60px 0;
        color: var(--muted);
      }
      .iq-empty-state i {
        font-size: 3rem;
        display: block;
        margin-bottom: 12px;
        opacity: 0.35;
      }
      .iq-empty-state p { font-size: 0.84rem; line-height: 1.6; }

      /* ── Slide-in detail panel ── */
      #iq-panel {
        position: fixed;
        top: 0; right: 0;
        width: 340px;
        height: 100dvh;
        background: var(--surface, #fff);
        border-left: 1px solid var(--beige3);
        box-shadow: -6px 0 32px rgba(0,0,0,0.11);
        z-index: 900;
        transform: translateX(100%);
        transition: transform 0.30s cubic-bezier(0.32, 0, 0.67, 0);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      #iq-panel.open {
        transform: translateX(0);
        transition: transform 0.30s cubic-bezier(0.33, 1, 0.68, 1);
      }

      /* Panel header */
      #iq-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px 14px;
        border-bottom: 1px solid var(--beige3);
        flex-shrink: 0;
      }
      #iq-panel-title {
        font-size: 0.92rem;
        font-weight: 700;
        color: var(--ink1);
        margin: 0;
      }
      #iq-panel-close {
        background: none;
        border: none;
        cursor: pointer;
        color: var(--muted);
        font-size: 1.1rem;
        padding: 4px 6px;
        border-radius: 6px;
        transition: background 0.15s ease, color 0.15s ease;
        line-height: 1;
      }
      #iq-panel-close:hover { background: var(--beige2); color: var(--ink1); }

      /* Panel body */
      #iq-panel-body {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 18px;
      }

      /* Panel field groups */
      .iq-panel-field {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .iq-panel-label {
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.07em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .iq-panel-value {
        font-size: 0.86rem;
        color: var(--ink1);
        line-height: 1.55;
        word-break: break-word;
      }
      .iq-panel-value a {
        color: var(--gold);
        text-decoration: none;
      }
      .iq-panel-value a:hover { text-decoration: underline; }

      .iq-panel-message {
        font-size: 0.84rem;
        color: var(--ink2);
        line-height: 1.7;
        background: var(--beige1, #f9f5f0);
        border-radius: var(--radius-sm, 6px);
        padding: 12px 14px;
        border: 1px solid var(--beige3);
        white-space: pre-wrap;
        word-break: break-word;
        max-height: 220px;
        overflow-y: auto;
      }

      .iq-panel-divider {
        height: 1px;
        background: var(--beige3);
        flex-shrink: 0;
      }

      /* Panel status update */
      #iq-panel-footer {
        padding: 16px 20px;
        border-top: 1px solid var(--beige3);
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      #iq-status-select {
        width: 100%;
        padding: 8px 12px;
        border: 1.5px solid var(--beige3);
        border-radius: var(--radius-sm, 6px);
        font-size: 0.82rem;
        color: var(--ink1);
        background: var(--surface);
        cursor: pointer;
        outline: none;
        transition: border-color 0.18s ease;
      }
      #iq-status-select:focus { border-color: var(--gold); }

      /* Overlay backdrop for panel on mobile */
      #iq-panel-backdrop {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.28);
        z-index: 899;
      }
      #iq-panel-backdrop.visible { display: block; }

      /* ── Export button area ── */
      #iq-toolbar {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 6px;
      }

      /* ── Responsive: narrow panels on very small screens ── */
      @media (max-width: 480px) {
        #iq-panel { width: 100%; border-left: none; }
      }
    `;

    document.head.appendChild(style);
  })();


  /* ================================================================
     SECTION SHELL BUILDER
     ================================================================ */

  function buildSectionShell() {
    const section = document.getElementById('section-inquiries');
    if (!section) return;

    // Remove the existing static card/table
    section.querySelectorAll('.card').forEach(c => c.remove());
    const oldFilter = document.getElementById('inquiries-filter');
    if (oldFilter) oldFilter.closest('.section-actions')
      ?.querySelector('select')?.remove();

    // ── Toolbar (Export CSV) ──
    if (!document.getElementById('iq-toolbar')) {
      const toolbar = document.createElement('div');
      toolbar.id = 'iq-toolbar';
      toolbar.innerHTML = `
        <button class="btn btn-ghost btn-sm" id="btn-export-csv">
          <i class="ti ti-file-download"></i> Export CSV
        </button>
      `;
      section.appendChild(toolbar);
    }

    // ── Status tab bar ──
    if (!document.getElementById('iq-tab-bar')) {
      const bar = document.createElement('div');
      bar.id = 'iq-tab-bar';
      // Tabs rendered after first data fetch so counts are accurate
      section.appendChild(bar);
    }

    // ── Loading indicator ──
    if (!document.getElementById('iq-loading')) {
      const loader = document.createElement('div');
      loader.id = 'iq-loading';
      loader.innerHTML = `<span class="spinner"></span> Loading inquiries…`;
      section.appendChild(loader);
    }

    // ── Table card ──
    if (!document.getElementById('iq-table-card')) {
      const card = document.createElement('div');
      card.id = 'iq-table-card';
      card.className = 'card';
      card.innerHTML = `
        <div class="table-wrap">
          <table id="iq-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Message</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody id="iq-tbody"></tbody>
          </table>
        </div>
      `;
      section.appendChild(card);
    }

    // ── Slide-in panel (appended to body so it's not clipped by section) ──
    if (!document.getElementById('iq-panel')) {
      const backdrop = document.createElement('div');
      backdrop.id = 'iq-panel-backdrop';
      document.body.appendChild(backdrop);

      const panel = document.createElement('div');
      panel.id    = 'iq-panel';
      panel.setAttribute('role', 'complementary');
      panel.setAttribute('aria-label', 'Inquiry detail');
      panel.innerHTML = `
        <div id="iq-panel-header">
          <h2 id="iq-panel-title">Inquiry Detail</h2>
          <button id="iq-panel-close" aria-label="Close detail panel">
            <i class="ti ti-x"></i>
          </button>
        </div>
        <div id="iq-panel-body">
          <!-- filled dynamically -->
        </div>
        <div id="iq-panel-footer">
          <label style="font-size:0.74rem;font-weight:700;letter-spacing:0.06em;
                        text-transform:uppercase;color:var(--muted);">
            Update Status
          </label>
          <select id="iq-status-select" aria-label="Change status">
            <option value="new">New</option>
            <option value="seen">Seen</option>
            <option value="in_discussion">In Discussion</option>
            <option value="closed">Closed</option>
          </select>
          <button class="btn btn-primary btn-sm" id="btn-update-status">
            <i class="ti ti-check"></i> Update Status
          </button>
        </div>
      `;
      document.body.appendChild(panel);
    }
  }


  /* ================================================================
     PUBLIC INIT
     ================================================================ */

  window.initInquiries = async function initInquiries() {
    buildSectionShell();
    wireStaticEvents();
    await fetchAndRender();
  };


  /* ================================================================
     STATIC EVENT WIRING  (called once per initInquiries)
     ================================================================ */

  function wireStaticEvents() {

    // Search (re-wire by replacing node to prevent stacking)
    const searchEl = document.getElementById('inquiries-search');
    if (searchEl) {
      const fresh = searchEl.cloneNode(true);
      searchEl.parentNode.replaceChild(fresh, searchEl);
      fresh.addEventListener('input', () => {
        clearTimeout(_searchTimer);
        _searchTimer = setTimeout(() => {
          _searchQuery = fresh.value.trim().toLowerCase();
          renderTable();
        }, 200);
      });
    }

    // Export CSV
    const exportBtn = document.getElementById('btn-export-csv');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportCSV);
    }

    // Panel close
    const closeBtn = document.getElementById('iq-panel-close');
    if (closeBtn) closeBtn.addEventListener('click', closePanel);

    // Panel backdrop click
    const backdrop = document.getElementById('iq-panel-backdrop');
    if (backdrop) backdrop.addEventListener('click', closePanel);

    // Update status button
    const updateBtn = document.getElementById('btn-update-status');
    if (updateBtn) updateBtn.addEventListener('click', handlePanelStatusUpdate);

    // Keyboard: Escape closes panel
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && _panelId) closePanel();
    });
  }


  /* ================================================================
     DATA FETCH
     ================================================================ */

  async function fetchInquiries() {
    try {
      const { data, error } = await window.supabase
        .from(TABLE)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[inquiries] fetch error:', err);
      window.showToast('Failed to load inquiries: ' + (err.message || 'Unknown error'), 'error');
      return [];
    }
  }

  async function fetchAndRender() {
    setLoading(true);
    _allItems = await fetchInquiries();
    setLoading(false);
    renderTabs();
    renderTable();
    refreshInquiryBadge();
  }


  /* ================================================================
     TAB BAR
     ================================================================ */

  function renderTabs() {
    const bar = document.getElementById('iq-tab-bar');
    if (!bar) return;

    // Counts per status
    const counts = { all: _allItems.length };
    TAB_ORDER.slice(1).forEach(s => {
      counts[s] = _allItems.filter(i => i.status === s).length;
    });

    bar.innerHTML = '';
    TAB_ORDER.forEach(tab => {
      const btn  = document.createElement('button');
      btn.className = 'iq-tab' + (tab === _activeTab ? ' active' : '');
      const label = tab === 'all'           ? 'All'
                  : tab === 'in_discussion' ? 'In Discussion'
                  : tab.charAt(0).toUpperCase() + tab.slice(1);
      btn.textContent = `${label} (${counts[tab] ?? 0})`;
      btn.dataset.tab = tab;
      btn.addEventListener('click', () => {
        _activeTab = tab;
        renderTabs();
        renderTable();
      });
      bar.appendChild(btn);
    });
  }


  /* ================================================================
     TABLE RENDER
     ================================================================ */

  function renderTable() {
    const tbody = document.getElementById('iq-tbody');
    if (!tbody) return;

    // Filter by tab
    const tabFiltered = _activeTab === 'all'
      ? _allItems
      : _allItems.filter(i => i.status === _activeTab);

    // Filter by search
    const items = _searchQuery
      ? tabFiltered.filter(i =>
          (i.name    || '').toLowerCase().includes(_searchQuery) ||
          (i.email   || '').toLowerCase().includes(_searchQuery) ||
          (i.message || '').toLowerCase().includes(_searchQuery)
        )
      : tabFiltered;

    tbody.innerHTML = '';

    if (items.length === 0) {
      const emptyLabel = _activeTab === 'all' ? 'No inquiries found.'
        : `No ${STATUS_CONFIG[_activeTab]?.label ?? _activeTab} inquiries.`;
      tbody.innerHTML = `
        <tr>
          <td colspan="5">
            <div class="iq-empty-state">
              <i class="ti ti-message-2"></i>
              <p>${escHtml(emptyLabel)}<br>
                <span style="opacity:0.65;">
                  ${_activeTab === 'all'
                    ? 'Submissions from the contact form will appear here.'
                    : 'Try switching to a different tab or clearing the search.'}
                </span>
              </p>
            </div>
          </td>
        </tr>`;
      return;
    }

    items.forEach(item => {
      const tr = document.createElement('tr');
      tr.className = 'iq-row' + (item.id === _panelId ? ' iq-row-active' : '');
      tr.dataset.id = item.id;

      const preview = item.message
        ? (item.message.length > 60
           ? escHtml(item.message.slice(0, 60)) + '…'
           : escHtml(item.message))
        : '<span style="opacity:0.45;">—</span>';

      const cfg      = STATUS_CONFIG[item.status] || STATUS_CONFIG.seen;
      const badgeHTML= `<span class="iq-badge ${cfg.cls}">${cfg.label}</span>`;
      const dateStr  = formatDate(item.created_at);

      tr.innerHTML = `
        <td style="font-weight:600;color:var(--ink1);white-space:nowrap;">
          ${escHtml(item.name || '—')}
        </td>
        <td style="white-space:nowrap;">
          <a href="mailto:${escHtml(item.email || '')}"
             onclick="event.stopPropagation();"
             style="color:var(--gold);text-decoration:none;">
            ${escHtml(item.email || '—')}
          </a>
        </td>
        <td style="color:var(--ink2);font-size:0.83rem;max-width:280px;">${preview}</td>
        <td>${badgeHTML}</td>
        <td style="white-space:nowrap;color:var(--muted);font-size:0.80rem;">${dateStr}</td>
      `;

      tr.addEventListener('click', () => openPanel(item.id));
      tbody.appendChild(tr);
    });
  }


  /* ================================================================
     DETAIL PANEL
     ================================================================ */

  function openPanel(id) {
    const item = _allItems.find(i => i.id === id);
    if (!item) return;

    _panelId = id;

    // Highlight active row
    document.querySelectorAll('#iq-tbody .iq-row').forEach(r => {
      r.classList.toggle('iq-row-active', r.dataset.id === id);
    });

    // Fill panel body
    const body = document.getElementById('iq-panel-body');
    if (body) {
      const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.seen;

      body.innerHTML = `
        <div class="iq-panel-field">
          <span class="iq-panel-label">Name</span>
          <span class="iq-panel-value">${escHtml(item.name || '—')}</span>
        </div>
        <div class="iq-panel-field">
          <span class="iq-panel-label">Email</span>
          <span class="iq-panel-value">
            <a href="mailto:${escHtml(item.email || '')}">
              ${escHtml(item.email || '—')}
            </a>
          </span>
        </div>
        <div class="iq-panel-field">
          <span class="iq-panel-label">Phone</span>
          <span class="iq-panel-value">
            ${item.phone
              ? `<a href="tel:${escHtml(item.phone)}">${escHtml(item.phone)}</a>`
              : '—'}
          </span>
        </div>
        <div class="iq-panel-divider"></div>
        <div class="iq-panel-field">
          <span class="iq-panel-label">Message</span>
          <div class="iq-panel-message">${escHtml(item.message || '(No message)')}</div>
        </div>
        <div class="iq-panel-divider"></div>
        <div class="iq-panel-field">
          <span class="iq-panel-label">Current Status</span>
          <span class="iq-badge ${cfg.cls}">${cfg.label}</span>
        </div>
        <div class="iq-panel-field">
          <span class="iq-panel-label">Received</span>
          <span class="iq-panel-value">${formatDateLong(item.created_at)}</span>
        </div>
      `;
    }

    // Pre-select status in dropdown
    const sel = document.getElementById('iq-status-select');
    if (sel) sel.value = item.status || 'new';

    // Open panel + backdrop
    document.getElementById('iq-panel')?.classList.add('open');
    document.getElementById('iq-panel-backdrop')?.classList.add('visible');

    // Auto-mark as 'seen' if currently 'new'
    if (item.status === 'new') {
      updateStatus(id, 'seen', { silent: true });
    }
  }

  function closePanel() {
    _panelId = null;
    document.getElementById('iq-panel')?.classList.remove('open');
    document.getElementById('iq-panel-backdrop')?.classList.remove('visible');
    document.querySelectorAll('#iq-tbody .iq-row').forEach(r => {
      r.classList.remove('iq-row-active');
    });
  }

  async function handlePanelStatusUpdate() {
    if (!_panelId) return;
    const sel    = document.getElementById('iq-status-select');
    const status = sel?.value;
    if (!status) return;
    await updateStatus(_panelId, status, { silent: false });
    closePanel();
  }

  /**
   * Update a single inquiry's status.
   * @param {string}  id      - Row UUID
   * @param {string}  status  - New status value
   * @param {object}  opts
   * @param {boolean} opts.silent - If true, suppress toast (auto-seen flow)
   */
  async function updateStatus(id, status, { silent = false } = {}) {
    try {
      const { error } = await window.supabase
        .from(TABLE)
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      const item = _allItems.find(i => i.id === id);
      if (item) item.status = status;

      await window.logAudit('inquiries', 'update_status', { id, status });

      if (!silent) {
        const cfg = STATUS_CONFIG[status] || {};
        window.showToast(`Inquiry marked as "${cfg.label || status}".`, 'success');
      }

      // Refresh table and tabs to reflect change
      renderTabs();
      renderTable();
      refreshInquiryBadge();

      // Patch panel's current-status badge if panel is still open on same item
      if (_panelId === id) {
        const cfg  = STATUS_CONFIG[status] || STATUS_CONFIG.seen;
        const span = document.querySelector('#iq-panel-body .iq-badge');
        if (span) {
          span.className   = `iq-badge ${cfg.cls}`;
          span.textContent = cfg.label;
        }
      }

    } catch (err) {
      console.error('[inquiries] updateStatus error:', err);
      if (!silent) {
        window.showToast('Status update failed: ' + (err.message || 'Unknown error'), 'error');
      }
    }
  }


  /* ================================================================
     SIDEBAR BADGE  (unread = status 'new')
     ================================================================ */

  /**
   * window.refreshInquiryBadge()
   * Updates the #nav-badge-inquiries element with the count of new inquiries.
   * Can be called from any module or after a form submission.
   */
  window.refreshInquiryBadge = async function refreshInquiryBadge() {
    const badge = document.getElementById('nav-badge-inquiries');
    if (!badge) return;

    try {
      // Use local data if available, else fetch count from DB
      let count;
      if (_allItems.length > 0) {
        count = _allItems.filter(i => i.status === 'new').length;
      } else {
        const { count: dbCount, error } = await window.supabase
          .from(TABLE)
          .select('*', { count: 'exact', head: true })
          .eq('status', 'new');

        if (error) throw error;
        count = dbCount ?? 0;
      }

      if (count > 0) {
        badge.textContent = count;
        badge.style.display = '';
      } else {
        badge.textContent = '';
        badge.style.display = 'none';
      }
    } catch (err) {
      console.warn('[inquiries] badge refresh error:', err);
    }
  };


  /* ================================================================
     CSV EXPORT
     ================================================================ */

  async function exportCSV() {
    const btn = document.getElementById('btn-export-csv');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Exporting…';
    }

    try {
      const { data, error } = await window.supabase
        .from(TABLE)
        .select('id, name, email, phone, message, status, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = data || [];

      if (rows.length === 0) {
        window.showToast('No inquiries to export yet.', 'info');
        return;
      }

      // Build CSV
      const HEADERS = ['id', 'name', 'email', 'phone', 'message', 'status', 'created_at'];
      const csvLines = [
        HEADERS.join(','),
        ...rows.map(row =>
          HEADERS.map(h => csvCell(row[h])).join(',')
        ),
      ];
      const csvContent = csvLines.join('\r\n');

      // Trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = 'artwall-inquiries.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      window.showToast(`Exported ${rows.length} inquiries to CSV.`, 'success');
      await window.logAudit('inquiries', 'export_csv', { count: rows.length });

    } catch (err) {
      console.error('[inquiries] exportCSV error:', err);
      window.showToast('Export failed: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="ti ti-file-download"></i> Export CSV';
      }
    }
  }

  /** Wrap a CSV cell value — quotes if it contains comma, quote or newline. */
  function csvCell(val) {
    if (val == null) return '';
    const str = String(val).replace(/"/g, '""');
    return /[",\r\n]/.test(str) ? `"${str}"` : str;
  }


  /* ================================================================
     UTILITIES
     ================================================================ */

  function setLoading(on) {
    const loader = document.getElementById('iq-loading');
    const card   = document.getElementById('iq-table-card');
    if (!loader) return;
    if (on) {
      loader.classList.add('visible');
      if (card) card.style.opacity = '0.4';
    } else {
      loader.classList.remove('visible');
      if (card) card.style.opacity = '';
    }
  }

  /**
   * Format ISO timestamp → DD MMM YYYY  e.g. "02 Jun 2026"
   */
  function formatDate(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
    } catch (_) {
      return '—';
    }
  }

  /**
   * Format ISO timestamp → "02 Jun 2026, 14:35"
   */
  function formatDateLong(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch (_) {
      return '—';
    }
  }

  /** Minimal HTML escaping to prevent XSS. */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }


  /* ================================================================
     MAIN SITE CONTACT FORM HANDLER
     Runs on index.html — safely no-ops when the form isn't present.
     ================================================================ */

  function initContactForm() {
    const form = document.getElementById('contact-section-form');
    if (!form) return;

    const submitBtn = document.getElementById('btn-contact-submit');

    form.addEventListener('submit', async function onSubmit(e) {
      e.preventDefault();

      // Collect fields
      const firstName   = (document.getElementById('contact-first-name')?.value || '').trim();
      const lastName    = (document.getElementById('contact-last-name')?.value  || '').trim();
      const email       = (document.getElementById('contact-email')?.value       || '').trim();
      const phone       = (document.getElementById('contact-phone')?.value       || '').trim();
      const projectType = (document.getElementById('contact-project-type')?.value || '').trim();
      const message     = (document.getElementById('contact-message')?.value      || '').trim();

      const name = [firstName, lastName].filter(Boolean).join(' ') || null;

      // Inline feedback elements — create once, reuse
      let feedbackEl = form.querySelector('#contact-feedback');
      if (!feedbackEl) {
        feedbackEl = document.createElement('p');
        feedbackEl.id = 'contact-feedback';
        feedbackEl.style.cssText = [
          'margin-top:10px', 'font-size:0.84rem', 'font-weight:600',
          'border-radius:6px', 'padding:10px 14px', 'display:none',
        ].join(';');
        form.insertBefore(feedbackEl, submitBtn);
      }

      function showFeedback(msg, isError) {
        feedbackEl.textContent = msg;
        feedbackEl.style.display = 'block';
        if (isError) {
          feedbackEl.style.background = 'rgba(220,38,38,0.08)';
          feedbackEl.style.color      = '#dc2626';
          feedbackEl.style.border     = '1px solid rgba(220,38,38,0.25)';
        } else {
          feedbackEl.style.background = 'rgba(34,197,94,0.09)';
          feedbackEl.style.color      = '#16a34a';
          feedbackEl.style.border     = '1px solid rgba(34,197,94,0.28)';
        }
      }

      // Simple validation
      if (!name && !email) {
        showFeedback('Please fill in your name and email address.', true);
        return;
      }
      if (!email) {
        showFeedback('Please enter a valid email address.', true);
        return;
      }

      // Disable button & show loading state
      if (submitBtn) {
        submitBtn.disabled   = true;
        submitBtn.textContent = 'Sending…';
      }
      feedbackEl.style.display = 'none';

      try {
        const payload = {
          name,
          email    : email    || null,
          phone    : phone    || null,
          message  : [
            projectType ? `Project type: ${projectType}` : '',
            message,
          ].filter(Boolean).join('\n\n') || null,
          status   : 'new',
        };

        const { error } = await window.supabase
          .from(TABLE)
          .insert(payload);

        if (error) throw error;

        // ── Success ──
        showFeedback("✓ We'll get back to you soon!", false);
        form.reset();

        // Update sidebar badge if admin panel is also open on same page
        if (typeof window.refreshInquiryBadge === 'function') {
          window.refreshInquiryBadge();
        }

      } catch (err) {
        console.error('[contact form] submit error:', err);
        showFeedback('Something went wrong. Please try again.', true);
      } finally {
        if (submitBtn) {
          submitBtn.disabled   = false;
          submitBtn.textContent = 'Send Message →';
        }
      }
    });
  }

  // Always attempt to wire the contact form — safe on pages where it's absent
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContactForm);
  } else {
    initContactForm();
  }

})();
