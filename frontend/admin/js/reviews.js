'use strict';

(function () {
  const ADMIN_SECTION_ID = 'section-reviews';
  const TABLE_NAME = 'reviews';

  let _reviews = [];
  let _searchTimer = null;
  let _editingId = null;
  let _schemaWarningShown = false;

  function getDb() {
    return window.supabase || null;
  }

  function showToastSafe(type, message) {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
      return;
    }
    console[type === 'error' ? 'error' : 'log'](`[reviews] ${message}`);
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

  function escHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function isMissingTableError(err) {
    const message = String(err?.message || err?.details || err || '').toLowerCase();
    return message.includes('could not find the table') ||
      message.includes('schema cache') ||
      message.includes('does not exist');
  }

  function shouldBypassRemoteData() {
    return typeof window.shouldBypassRemoteData === 'function' && window.shouldBypassRemoteData();
  }

  function extractWorkImage(reviewText) {
    const text = String(reviewText || '');
    const marker = '||work_image:';
    const markerIndex = text.indexOf(marker);
    if (markerIndex < 0) return { text, workImage: '' };
    return {
      text: text.slice(0, markerIndex),
      workImage: text.slice(markerIndex + marker.length),
    };
  }

  function extractReviewLocation(reviewText) {
    const text = String(reviewText || '');
    const marker = '||location:';
    const markerIndex = text.indexOf(marker);
    if (markerIndex < 0) return { text, location: '' };
    const remainder = text.slice(markerIndex + marker.length);
    const nextMarkerIndex = remainder.indexOf('||');
    return {
      text: text.slice(0, markerIndex),
      location: nextMarkerIndex >= 0 ? remainder.slice(0, nextMarkerIndex) : remainder,
    };
  }

  function parseReviewText(reviewText) {
    const withLocation = extractReviewLocation(reviewText);
    const withImage = extractWorkImage(withLocation.text);
    return {
      text: withImage.text,
      location: withLocation.location,
      workImage: withImage.workImage,
    };
  }

  function buildStars(rating) {
    const count = Math.min(5, Math.max(0, parseInt(rating, 10) || 0));
    return `<span class="review-stars" aria-hidden="true">${Array.from({ length: 5 }, (_, index) => {
      const filled = index < count;
      return `<i class="ti ${filled ? 'ti-star-filled' : 'ti-star'}" aria-hidden="true"></i>`;
    }).join('')}</span>`;
  }

  function buildRatingPicker(rating) {
    const current = Math.min(5, Math.max(1, parseInt(rating, 10) || 5));
    return `
      <div class="review-rating-picker" id="review-rating-picker" role="radiogroup" aria-label="Review rating">
        ${[5, 4, 3, 2, 1].map((value) => `
          <button
            type="button"
            class="review-rating-star${value === current ? ' selected' : ''}"
            data-rating="${value}"
            role="radio"
            aria-checked="${value === current ? 'true' : 'false'}"
            aria-label="${value} star${value === 1 ? '' : 's'}">
            <i class="ti ti-star-filled" aria-hidden="true"></i>
            <span>${value}</span>
          </button>`).join('')}
        <input type="hidden" id="review-rating" value="${current}">
      </div>
    `;
  }

  function buildReviewRow(review) {
    const name = escHtml(review.name || 'Unnamed client');
    const company = escHtml(review.company || '—');
    const rating = buildStars(review.rating);
    const featured = review.is_pinned ? 'Yes' : 'No';
    const status = review.is_approved ? 'Approved' : 'Pending';
    const sortValue = formatDate(review.created_at);
    const parsedReview = parseReviewText(review.review_text);
    const locationValue = escHtml(review.location || parsedReview.location || '—');
    const reviewText = escHtml(String(parsedReview.text || ''));
    const previewText = reviewText.length > 80 ? `${reviewText.slice(0, 80)}…` : reviewText || '—';

    return `
      <tr data-id="${review.id}">
        <td style="text-align:center;">${rating}</td>
        <td>${name}</td>
        <td>${company}</td>
        <td>${locationValue}</td>
        <td>${parsedReview.workImage ? `<div class="review-work-photo"><img src="${escHtml(parsedReview.workImage)}" alt="${escHtml(review.name || 'Client')} project work" loading="lazy"><span class="review-work-photo-location">${locationValue}</span></div>` : `<span style="color:var(--muted);">—</span>`}</td>
        <td title="${reviewText}">${previewText}</td>
        <td>${review.rating != null ? escHtml(String(review.rating)) : '0'}</td>
        <td>${featured}</td>
        <td>
          <button class="btn btn-ghost btn-sm btn-toggle-approval" data-id="${review.id}" title="Toggle approval">
            ${status}
          </button>
        </td>
        <td>${sortValue}</td>
        <td style="white-space:nowrap;">
          <button class="btn btn-ghost btn-sm btn-edit-review" data-id="${review.id}" title="Edit review">
            <i class="ti ti-pencil"></i>
          </button>
          <button class="btn btn-ghost btn-sm btn-delete-review" data-id="${review.id}" title="Delete review">
            <i class="ti ti-trash"></i>
          </button>
        </td>
      </tr>`;
  }

  function renderReviewTable(items = _reviews) {
    const tbody = document.getElementById('reviews-table-body');
    if (!tbody) return;

    if (!items.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11">
            <div class="empty-state">
              <i class="ti ti-star empty-icon"></i>
              <div class="empty-title">No reviews found</div>
              <div class="empty-text">Client testimonials will appear here once submitted.</div>
            </div>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = items.map(buildReviewRow).join('');
  }

  async function fetchReviews() {
    const db = getDb();
    if (!db) throw new Error('Supabase client not available');
    if (shouldBypassRemoteData()) return [];

    const { data, error } = await db.from(TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  function filterReviews(query) {
    const search = String(query || document.getElementById('reviews-search')?.value || '').trim().toLowerCase();
    if (!search) {
      renderReviewTable(_reviews);
      return;
    }

    const filtered = _reviews.filter((item) => {
      return [item.name, item.company, item.location, item.review_text]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });

    renderReviewTable(filtered);
  }

  async function openReviewModal(isEdit, review = {}) {
    _editingId = isEdit ? review.id : null;

    openModal({
      title: isEdit ? 'Edit Review' : 'Add Review',
      size: 'lg',
      bodyHTML: `
        <div class="form-grid">
          <div class="form-group full">
            <label class="form-label" for="review-name">Client Name</label>
            <input class="form-input" type="text" id="review-name" value="${escHtml(review.name || '')}" placeholder="Enter client name" />
          </div>
          <div class="form-group full">
            <label class="form-label" for="review-company">Company</label>
            <input class="form-input" type="text" id="review-company" value="${escHtml(review.company || '')}" placeholder="Enter company name" />
          </div>
          <div class="form-group full">
            <label class="form-label" for="review-location">Location</label>
            <input class="form-input" type="text" id="review-location" value="${escHtml(review.location || parseReviewText(review.review_text).location || '')}" placeholder="Enter project location" />
          </div>
          <div class="form-group half">
            <label class="form-label" for="review-rating">Rating</label>
            ${buildRatingPicker(review.rating)}
          </div>
          <div class="form-group half">
            <label class="form-label" for="review-avatar-url">Avatar URL</label>
            <input class="form-input" type="text" id="review-avatar-url" value="${escHtml(review.avatar_url || '')}" placeholder="https://..." />
          </div>
          <div class="form-group full">
            <label class="form-label" for="review-text">Review Text</label>
            <textarea class="form-input" id="review-text" rows="5" placeholder="Share the testimonial...">${escHtml(parseReviewText(review.review_text).text || '')}</textarea>
          </div>
        </div>
      `,
      onConfirm: async function () {
        const name = document.getElementById('review-name')?.value.trim() || '';
        const company = document.getElementById('review-company')?.value.trim() || '';
        const location = document.getElementById('review-location')?.value.trim() || '';
        const rating = parseInt(document.getElementById('review-rating')?.value, 10) || 0;
        const avatarUrl = document.getElementById('review-avatar-url')?.value.trim() || null;
        const reviewText = document.getElementById('review-text')?.value.trim() || '';
        const isApproved = _editingId ? review.is_approved : false;
        const isPinned = _editingId ? review.is_pinned : false;
        const existingReview = parseReviewText(review.review_text);
        const existingWorkImage = existingReview.workImage;
        const existingLocation = existingReview.location;

        if (!name) {
          showToastSafe('error', 'Please enter the client name.');
          return;
        }
        if (!company) {
          showToastSafe('error', 'Please enter the company name.');
          return;
        }
        if (!location) {
          showToastSafe('error', 'Please enter the location.');
          return;
        }
        if (!reviewText) {
          showToastSafe('error', 'Please enter the review text.');
          return;
        }

        try {
          const db = getDb();
          if (!db) throw new Error('Supabase client not available');

          const payload = {
            name,
            company,
            location,
            review_text: [reviewText, location || existingLocation ? `location:${location || existingLocation}` : '', existingWorkImage ? `work_image:${existingWorkImage}` : '']
              .filter(Boolean)
              .join('||'),
            rating,
            avatar_url: avatarUrl,
            is_approved: isApproved,
            is_pinned: isPinned,
          };

          if (_editingId) {
            const { error } = await db.from(TABLE_NAME)
              .update(payload)
              .eq('id', _editingId);
            if (error) throw error;
            await logAudit('reviews', 'update', { id: _editingId, name });
            showToastSafe('success', 'Review updated successfully.');
          } else {
            const { error } = await db.from(TABLE_NAME)
              .insert(payload);
            if (error) throw error;
            await logAudit('reviews', 'create', { name });
            showToastSafe('success', 'Review added successfully.');
          }

          closeModal();
          await loadReviews();
        } catch (err) {
          console.error('[reviews] save error', err);
          showToastSafe('error', err.message || 'Could not save review.');
        }
      },
    });

    setTimeout(() => {
      const picker = document.getElementById('review-rating-picker');
      const hidden = document.getElementById('review-rating');
      if (!picker || !hidden) return;

      picker.querySelectorAll('.review-rating-star').forEach((button) => {
        button.addEventListener('click', () => {
          const value = String(button.getAttribute('data-rating') || '0');
          hidden.value = value;
          picker.querySelectorAll('.review-rating-star').forEach((item) => {
            const selected = item === button;
            item.classList.toggle('selected', selected);
            item.setAttribute('aria-checked', selected ? 'true' : 'false');
          });
        });
      });
    }, 0);
  }

  async function deleteReviewItem(id) {
    if (!id || !window.confirm('Delete this review?')) return;

    try {
      const db = getDb();
      if (!db) throw new Error('Supabase client not available');

      const { error } = await db.from(TABLE_NAME).delete().eq('id', id);
      if (error) throw error;

      await logAudit('reviews', 'delete', { id });
      showToastSafe('success', 'Review deleted successfully.');
      await loadReviews();
    } catch (err) {
      console.error('[reviews] delete error', err);
      showToastSafe('error', err.message || 'Could not delete review.');
    }
  }

  async function handleReviewAction(event) {
    const editBtn = event.target.closest('.btn-edit-review');
    const deleteBtn = event.target.closest('.btn-delete-review');
    const toggleBtn = event.target.closest('.btn-toggle-approval');

    if (editBtn) {
      const id = editBtn.dataset.id;
      const review = _reviews.find((item) => String(item.id) === String(id));
      if (review) openReviewModal(true, review);
      return;
    }

    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      await deleteReviewItem(id);
      return;
    }

    if (toggleBtn) {
      const id = toggleBtn.dataset.id;
      await toggleReviewApproval(id);
    }
  }

  async function toggleReviewApproval(id) {
    if (!id) return;

    const review = _reviews.find((item) => String(item.id) === String(id));
    if (!review) return;

    try {
      const db = getDb();
      if (!db) throw new Error('Supabase client not available');

      const newStatus = !review.is_approved;
      const { error } = await db.from(TABLE_NAME).update({ is_approved: newStatus }).eq('id', id);
      if (error) throw error;

      review.is_approved = newStatus;
      renderReviewTable(_reviews);
      await logAudit('reviews', 'toggle_approval', { id, is_approved: newStatus });
      showToastSafe('success', `Review ${newStatus ? 'approved' : 'marked pending'}.`);
    } catch (err) {
      console.error('[reviews] approval toggle error', err);
      showToastSafe('error', err.message || 'Could not change approval status.');
    }
  }

  async function loadReviews() {
    try {
      _reviews = await fetchReviews();
      renderReviewTable(_reviews);
    } catch (err) {
      if (isMissingTableError(err)) {
        if (!_schemaWarningShown) {
          showToastSafe('warning', 'Reviews table is missing in Supabase. Showing an empty list until the schema is applied.');
          _schemaWarningShown = true;
        }
        _reviews = [];
        renderReviewTable(_reviews);
        return;
      }

      console.error('[reviews] load error', err);
      showToastSafe('error', 'Unable to load reviews.');
    }
  }

  function initAdminReviewSection() {
    const section = document.getElementById(ADMIN_SECTION_ID);
    if (!section) return;

    const addButton = document.getElementById('btn-add-review');
    const tbody = document.getElementById('reviews-table-body');
    const searchInput = document.getElementById('reviews-search');

    if (addButton) {
      addButton.addEventListener('click', () => openReviewModal(false));
    }
    if (tbody) {
      tbody.addEventListener('click', handleReviewAction);
    }
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(_searchTimer);
        _searchTimer = setTimeout(() => filterReviews(searchInput.value), 180);
      });
    }

    loadReviews();
  }

  window.initReviews = initAdminReviewSection;

  document.addEventListener('DOMContentLoaded', function () {
    initAdminReviewSection();
  });
})();
