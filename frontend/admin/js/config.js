'use strict';

(function () {
  const SECTION_ID = 'section-config';
  const TABLE_NAME = 'site_config';
  const WARNING_BANNER_ID = 'config-warning-banner';
  const SAVE_BUTTON_ID = 'btn-save-config';
  const PREVIEW_BUTTON_ID = 'btn-preview-live';

  const FIELD_MAP = {
    hero_tagline       : 'config-hero-tagline',
    hero_sub           : 'config-hero-sub',
    stat_sqft          : 'config-stat-sqft',
    stat_projects      : 'config-stat-projects',
    stat_cities        : 'config-stat-cities',
    contact_phone      : 'config-contact-phone',
    contact_email      : 'config-contact-email',
    contact_whatsapp   : 'config-contact-whatsapp',
  };

  let _hasUnsavedChanges = false;

  function getDb() {
    return window.supabase || null;
  }

  function showToastSafe(type, message) {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
      return;
    }
    console[type === 'error' ? 'error' : 'log']('[config] ' + message);
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
      console.warn('[config] audit failed', err);
    }
  }

  function getElement(id) {
    return document.getElementById(id);
  }

  function setUnsavedChanges(value) {
    _hasUnsavedChanges = Boolean(value);
    const banner = getElement(WARNING_BANNER_ID);
    if (banner) {
      banner.style.display = _hasUnsavedChanges ? 'block' : 'none';
    }
  }

  function getConfigInputs() {
    return Object.entries(FIELD_MAP).reduce((result, [key, id]) => {
      const input = getElement(id);
      if (input) {
        result[key] = input.value.trim();
      }
      return result;
    }, {});
  }

  async function loadConfig() {
    const section = getElement(SECTION_ID);
    if (!section) return;

    try {
      const db = getDb();
      if (!db) {
        console.warn('[config] Supabase client not available');
        return;
      }

      const { data, error } = await db.from(TABLE_NAME).select('key,value');
      if (error) throw error;

      const config = (data || []).reduce((acc, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {});

      Object.entries(FIELD_MAP).forEach(([key, id]) => {
        const input = getElement(id);
        if (input) input.value = config[key] || '';
      });

      setUnsavedChanges(false);
    } catch (err) {
      console.error('[config] load error', err);
      showToastSafe('error', 'Unable to load site configuration.');
    }
  }

  async function saveConfig() {
    try {
      const db = getDb();
      if (!db) throw new Error('Supabase client not available');

      const payload = Object.entries(FIELD_MAP).map(([key, id]) => {
        const input = getElement(id);
        return { key, value: input ? input.value.trim() : '' };
      });

      const { error } = await db.from(TABLE_NAME).upsert(payload, { onConflict: ['key'] });
      if (error) throw error;

      await logAudit('site_config', 'update', { keys: payload.map(item => item.key) });
      showToastSafe('success', 'Site configuration saved successfully.');
      setUnsavedChanges(false);
    } catch (err) {
      console.error('[config] save error', err);
      showToastSafe('error', err.message || 'Could not save site configuration.');
    }
  }

  function attachInputListeners() {
    Object.values(FIELD_MAP).forEach((id) => {
      const input = getElement(id);
      if (!input) return;
      input.addEventListener('input', () => setUnsavedChanges(true));
    });
  }

  function initPreviewButton() {
    const previewButton = getElement(PREVIEW_BUTTON_ID);
    if (!previewButton) return;
    previewButton.addEventListener('click', () => {
      window.open('../../index.html', '_blank');
    });
  }

  function initSaveButton() {
    const saveButton = getElement(SAVE_BUTTON_ID);
    if (!saveButton) return;
    saveButton.addEventListener('click', saveConfig);
  }

  async function initAdminConfig() {
    const section = getElement(SECTION_ID);
    if (!section) return;

    attachInputListeners();
    initSaveButton();
    initPreviewButton();
    await loadConfig();
  }

  window.initConfig = initAdminConfig;

  function updateTextContent(selector, value) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.textContent = value || '';
  }

  function setLinkHref(selector, href) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.setAttribute('href', href);
  }

  function normalizeWhatsAppNumber(value) {
    return String(value || '').replace(/[^0-9+]/g, '').replace(/^\+/, '');
  }

  async function renderConfigToMainSite(supabaseClient) {
    try {
      const db = supabaseClient || window.supabase;
      if (!db) {
        console.warn('[renderConfigToMainSite] Supabase client not found.');
        return;
      }

      const { data, error } = await db.from(TABLE_NAME).select('key,value');
      if (error) {
        console.warn('[renderConfigToMainSite] Fetch error:', error.message);
        return;
      }

      const config = (data || []).reduce((acc, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {});

      updateTextContent('.hero-title', config.hero_tagline || '');
      updateTextContent('.hero-sub', config.hero_sub || '');

      const statEls = document.querySelectorAll('.hero-stat-num');
      if (statEls.length > 0) statEls[0].textContent = config.stat_sqft || '';
      if (statEls.length > 1) statEls[1].textContent = config.stat_projects || '';
      if (statEls.length > 2) statEls[2].textContent = config.stat_cities || '';

      updateTextContent('#footer-link-email', config.contact_email || '');
      updateTextContent('#footer-link-phone', config.contact_phone || '');

      if (config.contact_email) {
        setLinkHref('#footer-link-email', `mailto:${config.contact_email}`);
      }
      if (config.contact_phone) {
        setLinkHref('#footer-link-phone', `tel:${config.contact_phone}`);
      }

      const waNumber = normalizeWhatsAppNumber(config.contact_whatsapp);
      if (waNumber) {
        const waUrl = `https://wa.me/${encodeURIComponent(waNumber)}`;
        setLinkHref('#footer-link-whatsapp', waUrl);
        setLinkHref('#whatsapp-cta-link', waUrl);
        const cta = document.getElementById('whatsapp-cta');
        if (cta) cta.style.display = 'block';
      } else {
        const cta = document.getElementById('whatsapp-cta');
        if (cta) cta.style.display = 'none';
      }

      if (window.revealObserver) {
        const heroTitle = document.querySelector('.hero-title');
        if (heroTitle) window.revealObserver.observe(heroTitle);
      }
    } catch (err) {
      console.error('[renderConfigToMainSite] error', err);
    }
  }

  window.renderConfigToMainSite = renderConfigToMainSite;

  document.addEventListener('DOMContentLoaded', initAdminConfig);
})();
