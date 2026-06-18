'use strict';

(function () {
  const ADMIN_SECTION_ID = 'section-reviews';
  const TABLE_NAME = 'reviews';

  let _reviews = [];
  let _activeTab = 'pending';

  function getDb() {
    return window.supabase || null;
  }

  function showToastSafe(type, message) {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
    } else {
      console[type === 'error' ? 'error' : 'log']('[reviews] ' + message);
    }
  }

  async function logAudit(module, action, details = {}) {
    if (typeof window.logAudit === 'function') {
      return window.logAudit(module, action, details);
    }

    try {
      const db = getDb();
      if (!db) return;
      const { data: { session } = {} } = await db.auth.getSession();
      const userId = session?.user?.id ?? null;
      await db.from('audit_log').insert({
        module,
        action,
        details,
        user_id: userId,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[reviews] audit failed', err);
    }
  }

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }

  function getStarRating(rating) {
    const count = Number.isFinite(rating) ? Math.max(0, Math.min(5, rating)) : 0;
    return Array.from({ length: 5 }, (_, i) => (i < count ? '★' : '☆')).join('');
  }

  function splitReviewText(value) {
    const rawText = value || '';
    if (!rawText.includes('||work_image:')) {
      return { text: rawText, workImage: '' };
    }

    const [text, workImage = ''] = rawText.split('||work_image:');
    return { text, workImage };
  }

  function formatReviewDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function getAvatarMarkup(review) {
    if (review.avatar_url) {
      return `<img src="${escapeHtml(review.avatar_url)}" alt="${escapeHtml(review.name || 'Client')}">`;
    }
    const initials = (review.name || '').split(' ').filter(Boolean).slice(0, 2).map(word => word.charAt(0).toUpperCase()).join('') || 'CL';
    return `<div class="review-avatar-fallback">${initials}</div>`;
  }

  function getStatusLabel(review) {
    if (review.is_approved) {
      return review.is_pinned ? 'Pinned' : 'Approved';
    }
    return 'Pending';
  }

  function buildReviewRow(review) {
    const avatar = getAvatarMarkup(review);
    const rating = getStarRating(review.rating);
    const company = escapeHtml(review.company || '—');
    const name = escapeHtml(review.name || 'Anonymous');
    const { text: cleanReviewText, workImage } = splitReviewText(review.review_text || review.text || '');
    const quote = escapeHtml(cleanReviewText || 'No review provided');
    const pinnedBadge = review.is_pinned ? '<span class="badge badge-success">Pinned</span>' : '';
    const workImageBadge = workImage ? '<span class="badge badge-success">Work Photo</span>' : '';

    const actionButtons = review.is_approved
      ? `
        <button class="btn btn-ghost btn-sm btn-pin-review" data-id="${review.id}" data-pinned="${review.is_pinned ? 'true' : 'false'}">
          ${review.is_pinned ? 'Unpin' : 'Pin to Homepage'}
        </button>
        <button class="btn btn-ghost btn-sm btn-delete-review" data-id="${review.id}">
          <i class="ti ti-trash"></i>
        </button>
      `
      : `
        <button class="btn btn-ghost btn-sm btn-approve-review" data-id="${review.id}">
          Approve
        </button>
        <button class="btn btn-ghost btn-sm btn-delete-review" data-id="${review.id}">
          Reject
        </button>
      `;

    return `
      <tr data-id="${review.id}">
        <td style="width:56px; text-align:center;">
          <div class="review-avatar-cell">${avatar}</div>
        </td>
        <td>${name}</td>
        <td>${company}</td>
        <td>${rating}</td>
        <td>${pinnedBadge}${workImageBadge}</td>
        <td>${getStatusLabel(review)}</td>
        <td>${review.is_approved ? '' : '-'}</td>
        <td style="white-space:nowrap;">${actionButtons}</td>
      </tr>`;
  }

  function renderReviewCountTabs() {
    const pendingCount = _reviews.filter(item => !item.is_approved).length;
    const approvedCount = _reviews.filter(item => item.is_approved).length;

    const pendingBtn = document.getElementById('btn-reviews-pending');
    const approvedBtn = document.getElementById('btn-reviews-approved');
    const pendingCountEl = document.getElementById('reviews-count-pending');
    const approvedCountEl = document.getElementById('reviews-count-approved');

    if (pendingCountEl) pendingCountEl.textContent = `(${pendingCount})`;
    if (approvedCountEl) approvedCountEl.textContent = `(${approvedCount})`;

    if (pendingBtn && approvedBtn) {
      if (_activeTab === 'pending') {
        pendingBtn.classList.add('active');
        approvedBtn.classList.remove('active');
      } else {
        pendingBtn.classList.remove('active');
        approvedBtn.classList.add('active');
      }
    }
  }

  function renderReviewTable() {
    const tbody = document.getElementById('reviews-table-body');
    if (!tbody) return;

    const rows = _reviews.filter(item => item.is_approved === (_activeTab === 'approved'));

    if (!rows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <i class="ti ti-star empty-icon"></i>
              <div class="empty-title">No reviews found</div>
              <div class="empty-text">Switch tabs or add a review to get started.</div>
            </div>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = rows.map(buildReviewRow).join('');
  }

  function getPinnedCount() {
    return _reviews.filter(item => item.is_approved && item.is_pinned).length;
  }

  async function loadReviews() {
    try {
      const db = getDb();
      if (!db) throw new Error('Supabase client not available');

      const { data, error } = await db.from(TABLE_NAME)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      _reviews = data || [];
      renderReviewCountTabs();
      renderReviewTable();
    } catch (err) {
      console.error('[reviews] load error', err);
      showToastSafe('error', 'Unable to load reviews.');
    }
  }

  async function saveReview(reviewId, payload) {
    const db = getDb();
    if (!db) throw new Error('Supabase client not available');

    if (reviewId) {
      const { error } = await db.from(TABLE_NAME).update(payload).eq('id', reviewId);
      if (error) throw error;
      return;
    }

    const { error } = await db.from(TABLE_NAME).insert(payload);
    if (error) throw error;
  }

  async function openReviewModal(editReview = null) {
    const isEdit = Boolean(editReview);
    let reviewTextValue = editReview?.review_text || editReview?.text || '';
    let hasWorkImage = false;
    let workImageSuffix = '';
    if (reviewTextValue.includes('||work_image:')) {
      const parts = reviewTextValue.split('||work_image:');
      reviewTextValue = parts[0];
      hasWorkImage = true;
      workImageSuffix = '||work_image:' + parts[1];
    }

    openModal({
      title: isEdit ? 'Edit Review' : 'Add Review',
      size: 'large',
      bodyHTML: `
        <div class="form-grid">
          <label>
            Client Name
            <input type="text" id="review-name" value="${escapeHtml(editReview?.name || '')}" placeholder="Client name" />
          </label>
          <label>
            Company
            <input type="text" id="review-company" value="${escapeHtml(editReview?.company || '')}" placeholder="Company or role" />
          </label>
          <label>
            Avatar URL
            <input type="url" id="review-avatar-url" value="${escapeHtml(editReview?.avatar_url || '')}" placeholder="https://..." />
          </label>
          <label>
            Rating
            <select id="review-rating">
              ${[1, 2, 3, 4, 5].map(score => `<option value="${score}" ${editReview?.rating === score ? 'selected' : ''}>${score} ★</option>`).join('')}
            </select>
          </label>
          <label style="grid-column:1/-1;">
            Review Text
            <textarea id="review-text" rows="6" placeholder="Client review text">${escapeHtml(reviewTextValue)}</textarea>
          </label>
        </div>
      `,
      onConfirm: async function () {
        const name = document.getElementById('review-name')?.value.trim();
        const company = document.getElementById('review-company')?.value.trim();
        const avatarUrl = document.getElementById('review-avatar-url')?.value.trim();
        const rating = Number(document.getElementById('review-rating')?.value || 0);
        const reviewText = document.getElementById('review-text')?.value.trim();

        if (!name || !reviewText) {
          showToastSafe('error', 'Name and review text are required.');
          return;
        }

        try {
          const payload = {
            name,
            company,
            avatar_url: avatarUrl,
            rating,
            review_text: hasWorkImage ? (reviewText + workImageSuffix) : reviewText,
            is_approved: editReview?.is_approved ?? false,
            is_pinned: editReview?.is_pinned ?? false,
            created_at: editReview?.created_at || new Date().toISOString(),
          };

          await saveReview(editReview?.id || null, payload);
          await logAudit('reviews', editReview ? 'update' : 'create', { name, company });
          showToastSafe('success', `Review ${editReview ? 'updated' : 'added'} successfully.`);
          closeModal();
          await loadReviews();
        } catch (err) {
          console.error('[reviews] save error', err);
          showToastSafe('error', err.message || 'Could not save review.');
        }
      },
    });
  }

  async function confirmAndDeleteReview(id) {
    if (!id || !window.confirm('Delete this review?')) return;
    try {
      const db = getDb();
      if (!db) throw new Error('Supabase client not available');
      const { error } = await db.from(TABLE_NAME).delete().eq('id', id);
      if (error) throw error;
      await logAudit('reviews', 'delete', { id });
      showToastSafe('success', 'Review deleted.');
      await loadReviews();
    } catch (err) {
      console.error('[reviews] delete error', err);
      showToastSafe('error', err.message || 'Could not delete review.');
    }
  }

  async function approveReview(id) {
    try {
      const db = getDb();
      if (!db) throw new Error('Supabase client not available');
      const { error } = await db.from(TABLE_NAME).update({ is_approved: true }).eq('id', id);
      if (error) throw error;
      await logAudit('reviews', 'approve', { id });
      showToastSafe('success', 'Review approved.');
      _activeTab = 'approved';
      await loadReviews();
    } catch (err) {
      console.error('[reviews] approve error', err);
      showToastSafe('error', err.message || 'Could not approve review.');
    }
  }

  async function togglePinReview(id, currentPinned) {
    try {
      const db = getDb();
      if (!db) throw new Error('Supabase client not available');

      if (!currentPinned && getPinnedCount() >= 3) {
        showToastSafe('warning', 'Unpin one before pinning another.');
        return;
      }

      const { error } = await db.from(TABLE_NAME).update({ is_pinned: !currentPinned }).eq('id', id);
      if (error) throw error;
      await logAudit('reviews', currentPinned ? 'unpin' : 'pin', { id });
      showToastSafe('success', currentPinned ? 'Review unpinned.' : 'Review pinned.');
      await loadReviews();
    } catch (err) {
      console.error('[reviews] pin error', err);
      showToastSafe('error', err.message || 'Could not update pin status.');
    }
  }

  async function handleReviewAction(event) {
    const approveBtn = event.target.closest('.btn-approve-review');
    const pinBtn = event.target.closest('.btn-pin-review');
    const deleteBtn = event.target.closest('.btn-delete-review');
    const editBtn = event.target.closest('.btn-edit-review');

    if (approveBtn) {
      await approveReview(approveBtn.dataset.id);
      return;
    }
    if (pinBtn) {
      await togglePinReview(pinBtn.dataset.id, pinBtn.dataset.pinned === 'true');
      return;
    }
    if (deleteBtn) {
      await confirmAndDeleteReview(deleteBtn.dataset.id);
      return;
    }
    if (editBtn) {
      const review = _reviews.find(item => String(item.id) === String(editBtn.dataset.id));
      if (review) await openReviewModal(review);
    }
  }

  function setActiveTab(tab) {
    _activeTab = tab;
    renderReviewCountTabs();
    renderReviewTable();
  }

  async function loadReviewsFromDb() {
    const db = getDb();
    if (!db) return;

    const { data, error } = await db.from(TABLE_NAME).select('*').order('created_at', { ascending: false });
    if (error) {
      throw error;
    }
    _reviews = data || [];
  }

  async function loadReviews() {
    try {
      await loadReviewsFromDb();
      renderReviewCountTabs();
      renderReviewTable();
    } catch (err) {
      console.error('[reviews] load error', err);
      showToastSafe('error', 'Unable to load reviews.');
    }
  }

  async function renderReviewsToMainSite(supabaseClient) {
    const grid = document.querySelector('.testimonials-grid');
    if (!grid) {
      console.warn('[renderReviewsToMainSite] .testimonials-grid not found.');
      return;
    }

    const originalHtml = grid.innerHTML;
    grid.innerHTML = `
      <div style="grid-column:1/-1;display:flex;align-items:center;justify-content:center;padding:60px 0;gap:12px;color:var(--muted,#7a7268);font-size:0.85rem;">
        <span style="display:inline-block;width:20px;height:20px;border:2px solid #e0d9ce;border-top-color:#b8933a;border-radius:50%;animation:spin 0.7s linear infinite;"></span>
        Loading testimonials…
      </div>`;

    try {
      const db = supabaseClient || window.supabase;
      if (!db) {
        console.warn('[renderReviewsToMainSite] Supabase client not found.');
        grid.innerHTML = originalHtml;
        return;
      }

      const { data, error } = await db.from(TABLE_NAME)
        .select('id, name, company, avatar_url, review_text, rating, created_at')
        .eq('is_approved', true)
        .eq('is_pinned', true)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) {
        console.warn('[renderReviewsToMainSite] Fetch error:', error.message);
        grid.innerHTML = originalHtml;
        return;
      }

      const reviews = data || [];
      if (!reviews.length) {
        grid.innerHTML = originalHtml;
        return;
      }

      grid.innerHTML = reviews.map((review) => {
        const { text: rawText, workImage } = splitReviewText(review.review_text || review.text || '');
        const rating = Math.max(0, Math.min(5, parseInt(review.rating, 10) || 0));
        const stars = Array.from({ length: 5 }, (_, i) => (
          `<i class="ti ti-star-filled${i < rating ? '' : ' testimonial-star-muted'}" aria-hidden="true"></i>`
        )).join('');
        const dateText = formatReviewDate(review.created_at);

        const workImageHtml = workImage
          ? `<div class="testimonial-work-img"><img src="${escapeHtml(workImage)}" alt="${escapeHtml(review.name || 'Client')} project work"></div>`
          : `<div class="testimonial-work-img testimonial-work-img-fallback"><span>ashmija in color Project</span></div>`;
        const avatarHtml = review.avatar_url 
          ? `<img src="${escapeHtml(review.avatar_url)}" alt="${escapeHtml(review.name || 'Client')}">`
          : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 100%; height: 100%; padding: 16px; color: var(--gold); box-sizing: border-box; display: block;">
               <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
             </svg>`;

        return `
        <article class="testimonial-card glass-card">
          ${workImageHtml}
          <div class="testimonial-content">
            <div class="testimonial-avatar">
              ${avatarHtml}
            </div>
            <h4 class="testimonial-name">${escapeHtml(review.name || 'Client')}</h4>
            <span class="testimonial-company">${escapeHtml(review.company || '')}</span>
            <div class="testimonial-stars" aria-label="${rating} out of 5 stars">${stars}</div>
            <p class="testimonial-quote">${escapeHtml(rawText)}</p>
            ${dateText ? `<time class="testimonial-date">${escapeHtml(dateText)}</time>` : ''}
          </div>
        </article>`;
      }).join('');

      grid.querySelectorAll('.testimonial-company').forEach((el, index) => {
        el.textContent = reviews[index]?.company || '';
      });

      if (window.revealObserver) {
        window.revealObserver.observe(grid);
      }
    } catch (err) {
      console.error('[renderReviewsToMainSite] error', err);
      grid.innerHTML = originalHtml;
    }
  }

  async function renderAllReviewsToModal(supabaseClient) {
    const listContainer = document.getElementById('all-reviews-list');
    if (!listContainer) {
      console.warn('[renderAllReviewsToModal] #all-reviews-list not found.');
      return;
    }

    listContainer.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;padding:40px 0;gap:12px;color:var(--muted,#7a7268);font-size:0.85rem;">
        <span style="display:inline-block;width:20px;height:20px;border:2px solid #e0d9ce;border-top-color:#b8933a;border-radius:50%;animation:spin 0.7s linear infinite;"></span>
        Loading all reviews…
      </div>`;

    try {
      const db = supabaseClient || window.supabase;
      if (!db) {
        console.warn('[renderAllReviewsToModal] Supabase client not found.');
        listContainer.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">Database connection offline.</div>';
        return;
      }

      const { data, error } = await db.from(TABLE_NAME)
        .select('id, name, company, avatar_url, review_text, rating, created_at')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[renderAllReviewsToModal] Fetch error:', error.message);
        listContainer.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">Failed to load reviews.</div>';
        return;
      }

      const reviews = data || [];
      if (!reviews.length) {
        listContainer.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">No reviews approved yet.</div>';
        return;
      }

      listContainer.innerHTML = reviews.map((review) => {
        const { text: rawText } = splitReviewText(review.review_text || review.text || '');
        const rating = Math.max(0, Math.min(5, parseInt(review.rating, 10) || 0));
        const stars = Array.from({ length: 5 }, (_, i) => (
          `<i class="ti ti-star-filled${i < rating ? '' : ' testimonial-star-muted'}" aria-hidden="true"></i>`
        )).join('');
        const dateText = formatReviewDate(review.created_at);

        const avatarHtml = review.avatar_url 
          ? `<img src="${escapeHtml(review.avatar_url)}" alt="${escapeHtml(review.name || 'Client')}">`
          : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 100%; height: 100%; padding: 12px; color: var(--gold); box-sizing: border-box; display: block;">
               <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
             </svg>`;

        return `
          <div class="all-reviews-item">
            <div class="all-reviews-header">
              <div class="all-reviews-avatar">
                ${avatarHtml}
              </div>
              <div class="all-reviews-meta">
                <h4 class="all-reviews-name">${escapeHtml(review.name || 'Client')}</h4>
                <span class="all-reviews-company">${escapeHtml(review.company || '')}</span>
              </div>
              <div class="all-reviews-rating" aria-label="${rating} out of 5 stars">${stars}</div>
            </div>
            <p class="all-reviews-quote">${escapeHtml(rawText)}</p>
            ${dateText ? `<time class="all-reviews-date">${escapeHtml(dateText)}</time>` : ''}
          </div>`;
      }).join('');

    } catch (err) {
      console.error('[renderAllReviewsToModal] error', err);
      listContainer.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">Failed to load reviews.</div>';
    }
  }

  window.renderReviewsToMainSite = renderReviewsToMainSite;
  window.renderAllReviewsToModal = renderAllReviewsToModal;

  function initReviewTabs() {
    const pendingBtn = document.getElementById('btn-reviews-pending');
    const approvedBtn = document.getElementById('btn-reviews-approved');
    const addBtn = document.getElementById('btn-add-review');
    const tbody = document.getElementById('reviews-table-body');

    if (pendingBtn) {
      pendingBtn.addEventListener('click', () => setActiveTab('pending'));
    }
    if (approvedBtn) {
      approvedBtn.addEventListener('click', () => setActiveTab('approved'));
    }
    if (addBtn) {
      addBtn.addEventListener('click', () => openReviewModal());
    }
    if (tbody) {
      tbody.addEventListener('click', handleReviewAction);
    }
  }

  function createReviewTabs() {
    const container = document.createElement('div');
    container.className = 'section-tabs';
    container.style.display = 'flex';
    container.style.gap = '0.5rem';
    container.style.marginBottom = '1rem';
    container.innerHTML = `
      <button class="btn btn-ghost btn-sm active" id="btn-reviews-pending">
        Pending <span id="reviews-count-pending">(0)</span>
      </button>
      <button class="btn btn-ghost btn-sm" id="btn-reviews-approved">
        Approved <span id="reviews-count-approved">(0)</span>
      </button>
    `;
    return container;
  }

  function initAdminReviews() {
    const section = document.getElementById(ADMIN_SECTION_ID);
    if (!section) return;

    const header = section.querySelector('.section-header');
    if (header && !document.getElementById('btn-reviews-pending')) {
      header.insertAdjacentElement('afterend', createReviewTabs());
    }

    initReviewTabs();
    loadReviews();
  }

  window.initReviews = initAdminReviews;

  document.addEventListener('DOMContentLoaded', function () {
    initAdminReviews();
  });
})();
