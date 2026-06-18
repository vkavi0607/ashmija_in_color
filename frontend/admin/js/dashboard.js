'use strict';

/**
 * dashboard.js — ArtWall Studio Admin
 * Owns the dashboard home section and sidebar navigation routing.
 *
 * Exposes:
 *   window.initDashboard()   — called by auth.js after login / session restore
 *   window.navigateTo(key)   — used by sidebar links + quick-action buttons
 *                              (also defined in the inline bootstrap script;
 *                               this file enhances it to call section inits)
 *
 * Depends on:
 *   • window.supabase      — Supabase client  (supabase.js)
 *   • window.showToast     — toast helper     (toast.js)
 *   • window.logAudit      — audit helper     (supabase.js)
 *
 * Load order in index.html:
 *   1. supabase CDN
 *   2. js/supabase.js
 *   3. js/toast.js
 *   4. js/auth.js
 *   5. js/dashboard.js     ← this file
 *   6. js/portfolio.js, js/artists.js … (feature modules)
 */

(function () {

  /* ================================================================
     CONSTANTS
     ================================================================ */

  /** Map a sidebar data-section key → human-readable page title */
  const PAGE_TITLES = {
    dashboard : 'Dashboard',
    portfolio : 'Portfolio',
    artists   : 'Artists',
    inquiries : 'Inquiries',
    reviews   : 'Reviews',
    faq       : 'FAQ',
    config    : 'Site Config',
  };

  /**
   * Colour for the activity-feed dot, keyed by audit_log.module.
   * Falls back to --muted for unknown modules.
   */
  const MODULE_COLOURS = {
    portfolio : '#b8933a',   // gold
    artists   : '#6b7c6b',   // sage
    inquiries : '#4a8ab8',   // blue
    reviews   : '#9b6bbf',   // purple
    faq       : '#b86b4a',   // terracotta
    config    : '#4ab8a8',   // teal
    auth      : '#7a7268',   // muted
  };

  /** Tabler icon for each stat card */
  const STAT_ICONS = {
    portfolio : 'ti-photo',
    artists   : 'ti-palette',
    inquiries : 'ti-message-2',
    reviews   : 'ti-star',
  };


  /* ================================================================
     SKELETON HELPERS
     ================================================================ */

  /**
   * Injects a keyframe + .aw-skeleton class once into <head>.
   * The shimmer runs entirely in CSS so it works with no JS overhead.
   */
  (function injectSkeletonStyles () {
    if (document.getElementById('aw-skeleton-styles')) return;

    const style = document.createElement('style');
    style.id = 'aw-skeleton-styles';
    style.textContent = `
      @keyframes aw-shimmer {
        from { background-position: -600px 0; }
        to   { background-position:  600px 0; }
      }
      .aw-skeleton {
        background: linear-gradient(
          90deg,
          var(--beige3) 25%,
          var(--beige2) 50%,
          var(--beige3) 75%
        );
        background-size: 600px 100%;
        animation: aw-shimmer 1.4s infinite linear;
        border-radius: 6px;
        display: inline-block;
      }
      /* Quick-action strip */
      .aw-quick-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 28px;
      }
      .aw-quick-actions .btn {
        display: inline-flex;
        align-items: center;
        gap: 7px;
      }
      /* Activity feed */
      .aw-activity-feed {
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .aw-activity-row {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 13px 0;
        border-bottom: 1px solid var(--beige3);
      }
      .aw-activity-row:last-child { border-bottom: none; }
      .aw-activity-dot {
        flex-shrink: 0;
        width: 9px;
        height: 9px;
        border-radius: 50%;
        margin-top: 5px;
        background: var(--muted);
      }
      .aw-activity-text {
        flex: 1;
        font-size: 0.83rem;
        color: var(--ink2);
        line-height: 1.45;
      }
      .aw-activity-time {
        flex-shrink: 0;
        font-size: 0.72rem;
        color: var(--muted);
        font-family: 'Space Grotesk', sans-serif;
        white-space: nowrap;
        padding-top: 2px;
      }
      .aw-activity-empty {
        padding: 40px 0;
        text-align: center;
        color: var(--muted);
        font-size: 0.85rem;
      }
      .aw-activity-empty i {
        font-size: 2rem;
        display: block;
        margin-bottom: 8px;
        opacity: 0.35;
      }
    `;
    document.head.appendChild(style);
  })();


  /* ================================================================
     UTILITY: relative time
     ================================================================ */

  /**
   * Returns a human-friendly relative string for a past ISO timestamp.
   * Examples: "just now", "3 mins ago", "2 hrs ago", "4 days ago"
   *
   * @param {string} isoString
   * @returns {string}
   */
  function relativeTime (isoString) {
    const diff = Math.max(0, Date.now() - new Date(isoString).getTime());
    const secs  = Math.floor(diff / 1000);
    const mins  = Math.floor(secs  / 60);
    const hours = Math.floor(mins  / 60);
    const days  = Math.floor(hours / 24);

    if (secs  < 60)  return 'just now';
    if (mins  < 60)  return `${mins} min${mins  !== 1 ? 's' : ''} ago`;
    if (hours < 24)  return `${hours} hr${hours !== 1 ? 's' : ''} ago`;
    return               `${days} day${days !== 1 ? 's' : ''} ago`;
  }


  /* ================================================================
     SKELETON RENDERERS
     ================================================================ */

  /** Replace a stat value element with a shimmering placeholder */
  function showStatSkeleton (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '<span class="aw-skeleton" style="width:48px;height:28px;"></span>';
  }

  /** Replace the stat-delta element with a shimmering placeholder */
  function showDeltaSkeleton (card) {
    const delta = card.querySelector('.stat-delta');
    if (!delta) return;
    delta.innerHTML = '<span class="aw-skeleton" style="width:90px;height:13px;"></span>';
  }

  /** Render shimmer rows in the activity-feed container */
  function showActivitySkeleton (containerId, rows = 5) {
    const el = document.getElementById(containerId);
    if (!el) return;
    let html = '';
    for (let i = 0; i < rows; i++) {
      html += `
        <div class="aw-activity-row">
          <span class="aw-skeleton" style="width:9px;height:9px;border-radius:50%;flex-shrink:0;margin-top:5px;"></span>
          <span class="aw-skeleton" style="flex:1;height:14px;border-radius:4px;"></span>
          <span class="aw-skeleton" style="width:56px;height:12px;border-radius:4px;"></span>
        </div>`;
    }
    el.innerHTML = html;
  }


  /* ================================================================
     STAT CARDS — fetch & render
     ================================================================ */

  /**
   * Fetches all four dashboard counts from Supabase in parallel and
   * updates the matching #stat-* elements.
   *
   * Queries used:
   *   SELECT count(*) FROM portfolio
   *   SELECT count(*) FROM artists
   *   SELECT count(*) FROM inquiries WHERE created_at > now()-7d AND status='new'
   *   SELECT count(*) FROM reviews   WHERE is_approved=false
   */
  async function loadStatCards () {
    const db = window.supabase;

    /* Show skeletons while loading */
    const statIds = ['stat-portfolio', 'stat-artists', 'stat-inquiries', 'stat-rating'];
    statIds.forEach(showStatSkeleton);

    document.querySelectorAll('#stats-grid .stat-card').forEach(showDeltaSkeleton);

    /* Seven days ago in ISO format */
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    try {
      const [
        portfolioRes,
        artistsRes,
        inquiriesRes,
        reviewsRes,
      ] = await Promise.all([
        db.from('portfolio').select('*', { count: 'exact', head: true }),
        db.from('artists').select('*', { count: 'exact', head: true }),
        db.from('inquiries')
          .select('*', { count: 'exact', head: true })
          .gt('created_at', sevenDaysAgo)
          .eq('status', 'new'),
        db.from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('is_approved', false),
      ]);

      /* Collect any errors */
      const errors = [portfolioRes, artistsRes, inquiriesRes, reviewsRes]
        .filter(r => r.error)
        .map(r => r.error.message);

      if (errors.length) {
        throw new Error(errors.join('; '));
      }

      /* --- Portfolio Items --- */
      _setStatCard({
        valueId  : 'stat-portfolio',
        count    : portfolioRes.count ?? 0,
        deltaText: 'Total projects in gallery',
        icon     : STAT_ICONS.portfolio,
      });

      /* --- Artists --- */
      _setStatCard({
        valueId  : 'stat-artists',
        count    : artistsRes.count ?? 0,
        deltaText: 'Featured studio artists',
        icon     : STAT_ICONS.artists,
      });

      /* --- New Inquiries (last 7 days) --- */
      _setStatCard({
        valueId  : 'stat-inquiries',
        count    : inquiriesRes.count ?? 0,
        deltaText: 'New in last 7 days',
        icon     : STAT_ICONS.inquiries,
        deltaIcon: 'ti-clock',
        warn     : (inquiriesRes.count ?? 0) > 0,
      });

      /* --- Pending Reviews --- */
      _setStatCard({
        valueId  : 'stat-rating',
        count    : reviewsRes.count ?? 0,
        deltaText: 'Awaiting approval',
        icon     : STAT_ICONS.reviews,
        warn     : (reviewsRes.count ?? 0) > 0,
      });

      /* Update inquiries badge in the sidebar */
      _updateInquiriesBadge(inquiriesRes.count ?? 0);

    } catch (err) {
      console.error('[dashboard.js] loadStatCards error:', err);
      window.showToast('Could not load dashboard stats. Check your connection.', 'error');

      /* Show dash fallback on every stat value */
      statIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '—';
      });
      document.querySelectorAll('#stats-grid .stat-card .stat-delta').forEach(el => {
        el.innerHTML = '<i class="ti ti-alert-circle"></i> Failed to load';
      });
    }
  }

  /**
   * Populates a single stat card element.
   *
   * @param {object} opts
   * @param {string}  opts.valueId   - Element ID for the number (#stat-*)
   * @param {number}  opts.count     - The count to display
   * @param {string}  opts.deltaText - Subtitle beneath the number
   * @param {string} [opts.deltaIcon='ti-trending-up'] - Tabler icon class
   * @param {boolean}[opts.warn=false] - Use warning colour on value when > 0
   */
  function _setStatCard ({ valueId, count, deltaText, deltaIcon = 'ti-trending-up', warn = false }) {
    const valueEl = document.getElementById(valueId);
    if (!valueEl) return;

    valueEl.textContent = count.toLocaleString();

    if (warn && count > 0) {
      valueEl.style.color = 'var(--gold2)';
    }

    /* Locate the .stat-delta sibling inside the same .stat-card */
    const card   = valueEl.closest('.stat-card');
    const deltaEl = card?.querySelector('.stat-delta');
    if (deltaEl) {
      deltaEl.innerHTML = `<i class="ti ${deltaIcon}"></i> ${_escapeHtml(deltaText)}`;
    }
  }

  /** Show or hide the new-inquiries badge in the sidebar nav */
  function _updateInquiriesBadge (count) {
    const badge = document.getElementById('nav-badge-inquiries');
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }


  /* ================================================================
     RECENT ACTIVITY FEED — fetch & render
     ================================================================ */

  /**
   * Fetches the 10 most-recent rows from audit_log and renders them
   * in #dashboard-activity-feed (created dynamically if absent).
   */
  async function loadActivityFeed () {
    /* Ensure the feed container exists inside #section-dashboard */
    let feedWrap = document.getElementById('dashboard-activity-wrap');
    if (!feedWrap) {
      feedWrap = _buildActivityFeedShell();
    }

    const feedEl = document.getElementById('dashboard-activity-feed');
    if (!feedEl) return;

    showActivitySkeleton('dashboard-activity-feed');

    try {
      const { data: logs, error } = await window.supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (!logs || logs.length === 0) {
        feedEl.innerHTML = `
          <div class="aw-activity-empty">
            <i class="ti ti-history"></i>
            No activity yet — actions you take in the admin will appear here.
          </div>`;
        return;
      }

      feedEl.innerHTML = logs.map(_renderActivityRow).join('');

    } catch (err) {
      console.error('[dashboard.js] loadActivityFeed error:', err);
      feedEl.innerHTML = `
        <div class="aw-activity-empty">
          <i class="ti ti-alert-circle"></i>
          Could not load activity log.
        </div>`;
    }
  }

  /**
   * Builds and inserts the activity-feed card into #section-dashboard
   * (appended after the existing quick-actions strip, before the tables).
   *
   * @returns {HTMLElement} The wrapper element
   */
  function _buildActivityFeedShell () {
    const section = document.getElementById('section-dashboard');
    if (!section) return null;

    const wrap = document.createElement('div');
    wrap.id = 'dashboard-activity-wrap';
    wrap.className = 'card';
    wrap.style.marginBottom = '24px';
    wrap.innerHTML = `
      <div class="card-header">
        <span class="card-title">
          <i class="ti ti-history" style="margin-right:6px;color:var(--gold);"></i>
          Recent Activity
        </span>
      </div>
      <div style="padding:0 24px 8px;" id="dashboard-activity-feed">
        <div class="aw-activity-feed"></div>
      </div>`;

    /* Insert before the first existing .card (Recent Inquiries table) */
    const firstCard = section.querySelector('.card');
    if (firstCard) {
      section.insertBefore(wrap, firstCard);
    } else {
      section.appendChild(wrap);
    }

    return wrap;
  }

  /**
   * Renders a single audit_log row as an activity item.
   *
   * @param {object} log - Row from audit_log table
   * @returns {string} HTML string
   */
  function _renderActivityRow (log) {
    const module  = log.module || 'system';
    const action  = log.action || 'action';
    const colour  = MODULE_COLOURS[module] || 'var(--muted)';
    const time    = relativeTime(log.created_at);

    /* Build a readable sentence from module + action + optional details */
    const label   = _formatAuditLabel(module, action, log.details || {});

    return `
      <div class="aw-activity-row">
        <span class="aw-activity-dot" style="background:${_escapeHtml(colour)};"></span>
        <span class="aw-activity-text">${_escapeHtml(label)}</span>
        <span class="aw-activity-time">${_escapeHtml(time)}</span>
      </div>`;
  }

  /**
   * Converts raw audit module/action/details into a readable sentence.
   * Falls back gracefully for unknown combinations.
   *
   * @param {string} module
   * @param {string} action
   * @param {object} details
   * @returns {string}
   */
  function _formatAuditLabel (module, action, details) {
    const subject = details.title || details.name || details.email || '';
    const moduleLabel = module.charAt(0).toUpperCase() + module.slice(1);
    const actionLabel = action.replace(/_/g, ' ');

    if (subject) {
      return `${moduleLabel}: ${actionLabel} — "${subject}"`;
    }
    return `${moduleLabel}: ${actionLabel}`;
  }


  /* ================================================================
     QUICK ACTION BUTTONS — render & wire up
     ================================================================ */

  /**
   * Injects the quick-action button strip into #section-dashboard
   * (right after the stats grid, before the activity feed).
   * Idempotent — does nothing if the strip already exists.
   */
  function renderQuickActions () {
    if (document.getElementById('dashboard-quick-actions')) return;

    const statsGrid = document.getElementById('stats-grid');
    if (!statsGrid) return;

    const strip = document.createElement('div');
    strip.id = 'dashboard-quick-actions';
    strip.className = 'aw-quick-actions';
    strip.innerHTML = `
      <button
        class="btn btn-primary btn-sm"
        id="qa-add-portfolio"
        type="button"
        title="Open Portfolio section and trigger Add Project modal"
      >
        <i class="ti ti-photo-plus"></i>
        Add Portfolio Item
      </button>

      <button
        class="btn btn-secondary btn-sm"
        id="qa-add-artist"
        type="button"
        title="Open Artists section and trigger Add Artist modal"
      >
        <i class="ti ti-user-plus"></i>
        Add Artist
      </button>

      <button
        class="btn btn-ghost btn-sm"
        id="qa-view-inquiries"
        type="button"
        title="Open Inquiries section"
      >
        <i class="ti ti-message-2"></i>
        View Inquiries
      </button>`;

    /* Insert immediately after the stats grid */
    statsGrid.insertAdjacentElement('afterend', strip);

    /* Wire handlers */
    document.getElementById('qa-add-portfolio').addEventListener('click', function () {
      window.navigateTo('portfolio');
      _triggerAddModal('portfolio');
    });

    document.getElementById('qa-add-artist').addEventListener('click', function () {
      window.navigateTo('artists');
      _triggerAddModal('artists');
    });

    document.getElementById('qa-view-inquiries').addEventListener('click', function () {
      window.navigateTo('inquiries');
    });
  }

  /**
   * Triggers an "add" modal for the given section by clicking the
   * corresponding add-button once the section is visible.
   * Uses a short rAF delay so the section init has time to mount.
   *
   * @param {'portfolio'|'artists'} section
   */
  function _triggerAddModal (section) {
    const btnIds = {
      portfolio : 'btn-add-portfolio',
      artists   : 'btn-add-artist',
    };
    const btnId = btnIds[section];
    if (!btnId) return;

    /* Wait two animation frames so the section init can complete */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        const btn = document.getElementById(btnId);
        if (btn) btn.click();
      });
    });
  }


  /* ================================================================
     SIDEBAR NAVIGATION — section routing
     ================================================================ */

  /**
   * Map section keys → their init function name on window.
   * Only sections with a registered module are included.
   */
  const SECTION_INITS = {
    portfolio : 'initPortfolio',
    artists   : 'initArtists',
    inquiries : 'initInquiries',
    reviews   : 'initReviews',
    faq       : 'initFAQ',
    config    : 'initConfig',
  };

  /**
   * Activate a named section:
   *   1. Hides all .admin-section elements
   *   2. Shows #section-{key}
   *   3. Updates sidebar active class
   *   4. Updates the topbar title
   *   5. Calls window.init{Section}() if the module is loaded
   *   6. Optionally pushes the new section to browser history
   *
   * @param {string} key - Sidebar data-section value
   * @param {boolean} updateHistory - Whether to push state to history stack
   */
  function activateSection (key, updateHistory = true) {
    /* ── 1. Hide all sections ───────────────────────────────────── */
    document.querySelectorAll('.admin-section').forEach(function (s) {
      s.classList.remove('active');
    });

    /* ── 2. Show target section ─────────────────────────────────── */
    const target = document.getElementById('section-' + key);
    if (target) {
      target.classList.add('active');
    } else {
      console.warn('[dashboard.js] activateSection: no element for section "' + key + '"');
    }

    /* ── 3. Update sidebar active class ─────────────────────────── */
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(function (li) {
      li.classList.remove('active');
    });
    const navItem = document.querySelector('.nav-item[data-section="' + key + '"]');
    if (navItem) navItem.classList.add('active');

    /* ── 4. Update topbar title ──────────────────────────────────── */
    const titleEl = document.getElementById('topbar-title');
    if (titleEl) titleEl.textContent = PAGE_TITLES[key] || key;

    /* ── 5. Close sidebar on mobile ──────────────────────────────── */
    if (window.innerWidth <= 768) {
      const sb = document.getElementById('admin-sidebar');
      const ov = document.getElementById('sidebar-overlay');
      if (sb) sb.classList.remove('open');
      if (ov) ov.classList.add('hidden');
    }

    /* ── 6. Invoke section init ──────────────────────────────────── */
    if (key === 'dashboard') {
      _refreshDashboard();
    } else {
      const initFn = SECTION_INITS[key];
      if (initFn && typeof window[initFn] === 'function') {
        try {
          window[initFn]();
        } catch (err) {
          console.error('[dashboard.js] Error calling ' + initFn + '():', err);
          window.showToast('Failed to load ' + (PAGE_TITLES[key] || key) + ' section.', 'error');
        }
      }
    }

    /* ── 7. Update URL hash and history state ────────────────────── */
    if (updateHistory) {
      const currentHash = location.hash.replace('#', '');
      if (currentHash !== key) {
        history.pushState({ section: key }, '', '#' + key);
      }
    }
  }

  // Expose public wrapper
  window.navigateTo = function navigateTo (key) {
    activateSection(key, true);
    return false; // prevent anchor default / page jump
  };

  // Listen for browser Back/Forward navigation
  window.addEventListener('popstate', function (event) {
    const hashKey = location.hash.replace('#', '');
    const startKey = PAGE_TITLES[hashKey] ? hashKey : 'dashboard';
    activateSection(startKey, false);
  });

  /**
   * Wire up sidebar nav links via event delegation on the <nav> element.
   * Works alongside the inline onclick="return navigateTo('...')" attrs
   * already present in index.html — those will also route correctly
   * because we overwrite window.navigateTo above.
   */
  function _bindSidebarNav () {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav) return;

    nav.addEventListener('click', function (e) {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;

      const navItem = link.closest('.nav-item[data-section]');
      if (!navItem) return;

      e.preventDefault();
      window.navigateTo(navItem.dataset.section);
    });
  }

  /** Wire the Refresh button in the dashboard section header */
  function _bindRefreshButton () {
    const section = document.getElementById('section-dashboard');
    if (!section) return;

    const refreshBtn = section.querySelector('.section-actions .btn-secondary');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', _refreshDashboard);
    }
  }


  /* ================================================================
     DASHBOARD HOME — composite loader
     ================================================================ */

  /**
   * Loads all dashboard-home data in parallel.
   * Called on initial entry to dashboard and on explicit Refresh.
   */
  function _refreshDashboard () {
    loadStatCards();
    loadActivityFeed();
    loadRecentInquiries();
    loadRecentReviews();
  }

  /**
   * Fetches the 5 most recent inquiries and populates the dashboard inquiries table.
   */
  async function loadRecentInquiries () {
    const tbody = document.getElementById('dashboard-recent-inquiries');
    if (!tbody) return;

    // Show loading skeleton inside table
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;padding:24px;">
          <span class="spinner"></span> Loading recent inquiries…
        </td>
      </tr>`;

    try {
      const { data: inquiries, error } = await window.supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      if (!inquiries || inquiries.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5">
              <div class="empty-state" style="padding:32px 24px;">
                <i class="ti ti-inbox empty-icon"></i>
                <div class="empty-title">No inquiries yet</div>
                <div class="empty-text">New inquiry submissions will appear here.</div>
              </div>
            </td>
          </tr>`;
        return;
      }

      tbody.innerHTML = inquiries.map(inq => {
        const projType = _getProjectType(inq.message);
        const time = relativeTime(inq.created_at);
        
        let statusBadge = '';
        if (inq.status === 'new') {
          statusBadge = '<span class="badge badge-error">New</span>';
        } else if (inq.status === 'seen') {
          statusBadge = '<span class="badge badge-neutral">Seen</span>';
        } else if (inq.status === 'in_discussion') {
          statusBadge = '<span class="badge badge-info">Discussion</span>';
        } else {
          statusBadge = '<span class="badge badge-success">Closed</span>';
        }

        return `
          <tr>
            <td style="font-weight:600;">${_escapeHtml(inq.name || '—')}</td>
            <td>${_escapeHtml(projType)}</td>
            <td>${_escapeHtml(time)}</td>
            <td>${statusBadge}</td>
            <td style="text-align:right;">
              <button class="btn btn-ghost btn-sm" style="padding:4px 8px;" onclick="navigateTo('inquiries')" aria-label="View Inquiries">
                <i class="ti ti-arrow-right"></i>
              </button>
            </td>
          </tr>`;
      }).join('');

    } catch (err) {
      console.error('[dashboard.js] loadRecentInquiries error:', err);
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;color:var(--muted);padding:24px;">
            <i class="ti ti-alert-circle" style="color:var(--gold);margin-right:6px;"></i>
            Could not load recent inquiries.
          </td>
        </tr>`;
    }
  }

  /**
   * Helper to parse the project type from a formatted inquiry message
   */
  function _getProjectType (message) {
    if (!message) return 'Contact';
    const match = message.match(/Project type:\s*([^\n\r]+)/i);
    return match ? match[1].trim() : 'Contact';
  }

  /**
   * Fetches the 5 most recent pending (unapproved) reviews and populates the dashboard reviews table.
   */
  async function loadRecentReviews () {
    const tbody = document.getElementById('dashboard-recent-reviews');
    if (!tbody) return;

    // Show loading skeleton inside table
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;padding:24px;">
          <span class="spinner"></span> Loading pending reviews…
        </td>
      </tr>`;

    try {
      const { data: reviews, error } = await window.supabase
        .from('reviews')
        .select('*')
        .eq('is_approved', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      if (!reviews || reviews.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5">
              <div class="empty-state" style="padding:32px 24px;">
                <i class="ti ti-star empty-icon"></i>
                <div class="empty-title">No pending reviews</div>
                <div class="empty-text">Reviews awaiting approval will appear here.</div>
              </div>
            </td>
          </tr>`;
        return;
      }

      tbody.innerHTML = reviews.map(rev => {
        const time = relativeTime(rev.created_at);
        const stars = _renderStars(rev.rating);

        return `
          <tr>
            <td style="font-weight:600;">
              ${_escapeHtml(rev.name || '—')}
              <div style="font-size:0.75rem;color:var(--muted);font-weight:400;">${_escapeHtml(rev.company || '')}</div>
            </td>
            <td>${stars}</td>
            <td>${_escapeHtml(time)}</td>
            <td><span class="badge badge-warning">Pending</span></td>
            <td style="text-align:right;">
              <button class="btn btn-ghost btn-sm" style="padding:4px 8px;" onclick="navigateTo('reviews')" aria-label="View Reviews">
                <i class="ti ti-arrow-right"></i>
              </button>
            </td>
          </tr>`;
      }).join('');

    } catch (err) {
      console.error('[dashboard.js] loadRecentReviews error:', err);
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;color:var(--muted);padding:24px;">
            <i class="ti ti-alert-circle" style="color:var(--gold);margin-right:6px;"></i>
            Could not load pending reviews.
          </td>
        </tr>`;
    }
  }

  /**
   * Helper to render rating stars
   */
  function _renderStars (rating) {
    let html = '';
    const r = Math.min(5, Math.max(0, parseInt(rating) || 0));
    for (let i = 0; i < 5; i++) {
      html += `<i class="ti ti-star${i < r ? '-filled' : ''}" style="color:var(--gold);font-size:0.9rem;margin-right:2px;"></i>`;
    }
    return html;
  }


  /* ================================================================
     PUBLIC: window.initDashboard
     ================================================================ */

  /**
   * Called by auth.js after a successful login or session restore.
   * Sets up the full admin shell:
   *   • Sidebar nav delegation
   *   • Refresh button
   *   • Quick-action strip
   *   • Loads the default section (hash or "dashboard")
   */
  window.initDashboard = function initDashboard () {
    _bindSidebarNav();
    _bindRefreshButton();
    renderQuickActions();

    /* Determine the starting section from the URL hash */
    const hashKey = location.hash.replace('#', '');
    const startKey = PAGE_TITLES[hashKey] ? hashKey : 'dashboard';

    // Establish initial state in navigation history
    history.replaceState({ section: startKey }, '', '#' + startKey);
    activateSection(startKey, false);
  };


  /* ================================================================
     PRIVATE HELPERS
     ================================================================ */

  /**
   * Minimal HTML escaper — prevents XSS when rendering user-supplied
   * strings from the database into innerHTML.
   *
   * @param {string} str
   * @returns {string}
   */
  function _escapeHtml (str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

})();
