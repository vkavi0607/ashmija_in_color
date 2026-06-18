'use strict';

(function () {
  const ADMIN_SECTION_ID = 'section-faq';
  const TABLE_NAME = 'faqs';

  let _faqs = [];
  let _sortable = null;
  let _quill = null;
  let _editingId = null;

  function getDb() {
    return window.supabase || null;
  }

  function showToastSafe(type, message) {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
      return;
    }
    console[type === 'error' ? 'error' : 'log']('[faq] ' + message);
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
      console.warn('[faq] audit failed', err);
    }
  }

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }

  function getCategoryLabel(item) {
    if (item.category) return escapeHtml(item.category);
    return 'General';
  }

  function getVisibleLabel(item) {
    if (typeof item.is_visible === 'boolean') {
      return item.is_visible ? 'Yes' : 'No';
    }
    return 'Yes';
  }

  function buildFaqRow(faq) {
    const question = escapeHtml(faq.question || 'Untitled question');
    const category = getCategoryLabel(faq);
    const visible = getVisibleLabel(faq);
    const order = typeof faq.display_order === 'number' ? faq.display_order : '-';

    return `
      <tr data-id="${faq.id}">
        <td class="drag-handle" style="cursor:grab;text-align:center;">
          <i class="ti ti-arrows-up-down"></i>
        </td>
        <td>${question}</td>
        <td>${category}</td>
        <td>${visible}</td>
        <td>${order}</td>
        <td style="white-space:nowrap;">
          <button class="btn btn-ghost btn-sm btn-edit-faq" data-id="${faq.id}">
            <i class="ti ti-pencil"></i>
          </button>
          <button class="btn btn-ghost btn-sm btn-delete-faq" data-id="${faq.id}">
            <i class="ti ti-trash"></i>
          </button>
        </td>
      </tr>`;
  }

  function renderFaqTable() {
    const tbody = document.getElementById('faq-table-body');
    if (!tbody) return;

    if (!_faqs.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state">
              <i class="ti ti-help-circle empty-icon"></i>
              <div class="empty-title">No FAQ items</div>
              <div class="empty-text">Add questions to help visitors understand your services.</div>
            </div>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = _faqs.map(buildFaqRow).join('');
  }

  async function fetchFaqs() {
    const db = getDb();
    if (!db) throw new Error('Supabase client not available');

    const { data, error } = await db.from(TABLE_NAME)
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  function initQuill(answerHtml = '') {
    _quill = null;
    const editorContainer = document.getElementById('faq-editor');
    if (!editorContainer) return;

    if (window.Quill) {
      _quill = new window.Quill(editorContainer, {
        theme: 'snow',
        placeholder: 'Write the answer here...',
      });
      _quill.root.innerHTML = answerHtml || '<p></p>';
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.id = 'faq-answer-textarea';
    textarea.style.width = '100%';
    textarea.style.minHeight = '240px';
    textarea.value = answerHtml.replace(/<[^>]+>/g, '');
    editorContainer.appendChild(textarea);
  }

  function getEditorContent() {
    if (_quill) {
      return _quill.root.innerHTML.trim();
    }
    const textarea = document.getElementById('faq-answer-textarea');
    return textarea ? textarea.value.trim() : '';
  }

  async function openFaqModal(isEdit, faq = {}) {
    _editingId = isEdit ? faq.id : null;

    openModal({
      title: isEdit ? 'Edit FAQ Item' : 'Add FAQ Item',
      size: 'large',
      bodyHTML: `
        <div class="form-grid">
          <label>
            Question
            <input type="text" id="faq-question-input" value="${escapeHtml(faq.question || '')}" placeholder="Enter a question" />
          </label>
          <label style="grid-column:1/-1;">
            Answer
            <div id="faq-editor" style="min-height:240px;background:#fff;border:1px solid #ddd;border-radius:10px;"></div>
          </label>
        </div>
      `,
      onConfirm: async function () {
        const questionInput = document.getElementById('faq-question-input');
        const question = questionInput ? questionInput.value.trim() : '';
        const answer = getEditorContent();

        if (!question) {
          showToastSafe('error', 'Please add a question.');
          return;
        }
        if (!answer || answer === '<p><br></p>') {
          showToastSafe('error', 'Please add an answer.');
          return;
        }

        try {
          const db = getDb();
          if (!db) throw new Error('Supabase client not available');

          if (_editingId) {
            const { error } = await db.from(TABLE_NAME)
              .update({ question, answer })
              .eq('id', _editingId);
            if (error) throw error;
            await logAudit('faq', 'update', { id: _editingId, question });
            showToastSafe('success', 'FAQ updated successfully.');
          } else {
            const maxOrder = _faqs.length ? Math.max(..._faqs.map(item => item.display_order || 0)) : -1;
            const payload = {
              question,
              answer,
              display_order: maxOrder + 1,
            };
            const { error } = await db.from(TABLE_NAME).insert(payload);
            if (error) throw error;
            await logAudit('faq', 'create', { question });
            showToastSafe('success', 'FAQ added successfully.');
          }

          closeModal();
          await loadFaqs();
        } catch (err) {
          console.error('[faq] save error', err);
          showToastSafe('error', err.message || 'Could not save FAQ item.');
        }
      },
    });

    initQuill(faq.answer || '');
  }

  async function deleteFaqItem(id) {
    if (!id || !window.confirm('Delete this FAQ item?')) return;

    try {
      const db = getDb();
      if (!db) throw new Error('Supabase client not available');

      const { error } = await db.from(TABLE_NAME).delete().eq('id', id);
      if (error) throw error;

      await logAudit('faq', 'delete', { id });
      showToastSafe('success', 'FAQ removed.');
      await loadFaqs();
    } catch (err) {
      console.error('[faq] delete error', err);
      showToastSafe('error', err.message || 'Could not delete FAQ item.');
    }
  }

  async function initSortable() {
    const tbody = document.getElementById('faq-table-body');
    if (!tbody || !window.Sortable) return;

    if (_sortable) {
      _sortable.destroy();
      _sortable = null;
    }

    _sortable = window.Sortable.create(tbody, {
      animation: 180,
      handle: '.drag-handle',
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      onEnd: onSortEnd,
    });
  }

  async function onSortEnd() {
    const tbody = document.getElementById('faq-table-body');
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr[data-id]'));
    const updates = rows.map((row, index) => ({
      id: row.dataset.id,
      display_order: index,
    }));

    updates.forEach(({ id, display_order }) => {
      const item = _faqs.find(entry => String(entry.id) === String(id));
      if (item) item.display_order = display_order;
    });

    try {
      const db = getDb();
      if (!db) throw new Error('Supabase client not available');
      const promises = updates.map(({ id, display_order }) =>
        db.from(TABLE_NAME).update({ display_order }).eq('id', id)
      );

      const results = await Promise.all(promises);
      const failed = results.find(result => result.error);
      if (failed) throw failed.error;

      await logAudit('faq', 'reorder', { count: updates.length });
      showToastSafe('success', 'FAQ order saved.');
    } catch (err) {
      console.error('[faq] reorder error', err);
      showToastSafe('error', err.message || 'Could not save FAQ order.');
    }
  }

  async function handleFaqAction(event) {
    const editBtn = event.target.closest('.btn-edit-faq');
    const deleteBtn = event.target.closest('.btn-delete-faq');
    if (editBtn) {
      const id = editBtn.dataset.id;
      const faq = _faqs.find(item => String(item.id) === String(id));
      if (faq) openFaqModal(true, faq);
      return;
    }
    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      await deleteFaqItem(id);
    }
  }

  async function loadFaqs() {
    try {
      _faqs = await fetchFaqs();
      renderFaqTable();
      initSortable();
    } catch (err) {
      console.error('[faq] load error', err);
      showToastSafe('error', 'Unable to load FAQ items.');
    }
  }

  function createFaqSection() {
    const section = document.createElement('section');
    section.id = 'faq-section';
    section.className = 'faq-section';
    section.innerHTML = `
      <div class="works-header reveal">
        <div class="faq-header-text">
          <h2 class="sec-title">Frequently Asked Questions</h2>
          <p class="sec-sub">Discover how we design murals, manage timelines, and select premium materials for every wall.</p>
        </div>
      </div>
      <div class="faq-list reveal"></div>
    `;
    return section;
  }

  function attachFaqAccordionListeners(container) {
    if (!container) return;
    container.querySelectorAll('.faq-question').forEach((questionEl) => {
      questionEl.setAttribute('role', 'button');
      questionEl.setAttribute('tabindex', '0');
      questionEl.setAttribute('aria-expanded', 'false');

      const toggleItem = () => {
        const item = questionEl.closest('.faq-item');
        if (!item) return;
        const isOpen = item.classList.contains('open');
        container.querySelectorAll('.faq-item.open').forEach((otherItem) => {
          if (otherItem !== item) {
            otherItem.classList.remove('open');
            const otherQuestion = otherItem.querySelector('.faq-question');
            if (otherQuestion) otherQuestion.setAttribute('aria-expanded', 'false');
          }
        });
        item.classList.toggle('open');
        questionEl.setAttribute('aria-expanded', String(!isOpen));
      };

      questionEl.addEventListener('click', toggleItem);
      questionEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleItem();
        }
      });
    });
  }

  async function renderFAQsToMainSite(supabaseClient) {
    let section = document.getElementById('faq-section');
    const originalHtml = section ? section.innerHTML : null;

    if (section) {
      const list = section.querySelector('.faq-list');
      if (list) {
        list.innerHTML = `
          <div style="grid-column:1/-1;display:flex;align-items:center;justify-content:center;padding:60px 0;gap:12px;color:var(--muted,#7a7268);font-size:0.85rem;">
            <span style="display:inline-block;width:20px;height:20px;border:2px solid #e0d9ce;border-top-color:#b8933a;border-radius:50%;animation:spin 0.7s linear infinite;"></span>
            Loading FAQs…
          </div>`;
      }
    }

    try {
      const db = supabaseClient || window.supabase;
      if (!db) {
        console.warn('[renderFAQsToMainSite] Supabase client not found.');
        if (section && originalHtml !== null) section.innerHTML = originalHtml;
        return;
      }

      const { data, error } = await db.from(TABLE_NAME)
        .select('id, question, answer')
        .order('display_order', { ascending: true });

      if (error) {
        console.warn('[renderFAQsToMainSite] Fetch error:', error.message);
        if (section && originalHtml !== null) section.innerHTML = originalHtml;
        return;
      }

      const faqs = data || [];
      if (!section) {
        section = createFaqSection();
        const footer = document.querySelector('footer');
        if (footer && footer.parentElement) {
          footer.parentElement.insertBefore(section, footer);
        } else {
          document.body.appendChild(section);
        }
      }

      const list = section.querySelector('.faq-list');
      if (!list) return;

      list.innerHTML = faqs.map((faq) => `
        <div class="faq-item glass-card">
          <button type="button" class="faq-question" aria-expanded="false">
            <span>${faq.question || ''}</span>
            <i class="ti ti-chevron-down"></i>
          </button>
          <div class="faq-answer">${faq.answer || ''}</div>
        </div>
      `).join('');

      attachFaqAccordionListeners(list);
      if (window.revealObserver) {
        window.revealObserver.observe(section.querySelector('.works-header'));
        window.revealObserver.observe(section.querySelector('.faq-list'));
      }
    } catch (err) {
      console.error('[renderFAQsToMainSite] error', err);
      if (section && originalHtml !== null) section.innerHTML = originalHtml;
    }
  }

  window.renderFAQsToMainSite = renderFAQsToMainSite;

  function initAdminFaqSection() {
    const section = document.getElementById(ADMIN_SECTION_ID);
    if (!section) return;

    const addButton = document.getElementById('btn-add-faq');
    const tbody = document.getElementById('faq-table-body');

    if (addButton) {
      addButton.addEventListener('click', () => openFaqModal(false));
    }
    if (tbody) {
      tbody.addEventListener('click', handleFaqAction);
    }
    loadFaqs();
  }

  window.initFAQ = initAdminFaqSection;

  document.addEventListener('DOMContentLoaded', function () {
    initAdminFaqSection();
  });
})();
