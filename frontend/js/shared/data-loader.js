'use strict';

(function () {
  const CONTACT_FORM_ID = 'contact-section-form';
  const CONTACT_BUTTON_ID = 'btn-contact-submit';
  const STATUS_MESSAGE_ID = 'contact-status-message';
  const INQUIRIES_TABLE = 'inquiries';

  function createStatusNode() {
    const status = document.createElement('div');
    status.id = STATUS_MESSAGE_ID;
    status.setAttribute('aria-live', 'polite');
    status.style.marginTop = '1rem';
    status.style.fontSize = '0.95rem';
    status.style.fontWeight = '500';
    status.style.lineHeight = '1.4';
    return status;
  }

  function getStatusNode() {
    let node = document.getElementById(STATUS_MESSAGE_ID);
    if (!node) {
      const form = document.getElementById(CONTACT_FORM_ID);
      if (!form) return null;
      node = createStatusNode();
      form.appendChild(node);
    }
    return node;
  }

  function setStatusMessage(message, type = 'info') {
    const node = getStatusNode();
    if (!node) return;
    node.textContent = message;
    node.style.color = type === 'error' ? '#b12929' : type === 'success' ? '#1f6d2d' : '#3f3f3f';
  }

  function clearStatusMessage() {
    const node = document.getElementById(STATUS_MESSAGE_ID);
    if (node) node.textContent = '';
  }

  function getInputValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function toggleSubmitButton(disabled) {
    const button = document.getElementById(CONTACT_BUTTON_ID);
    if (!button) return;
    button.disabled = disabled;
    button.style.opacity = disabled ? '0.65' : '';
    button.style.cursor = disabled ? 'not-allowed' : 'pointer';
  }

  async function handleContactSubmit(event) {
    event.preventDefault();
    clearStatusMessage();

    const firstName = getInputValue('contact-first-name');
    const lastName = getInputValue('contact-last-name');
    const email = getInputValue('contact-email');
    const phone = getInputValue('contact-phone');
    const projectType = getInputValue('contact-project-type');
    const message = getInputValue('contact-message');

    if (!firstName || !lastName || !email || !message) {
      setStatusMessage('Please complete name, email, and message before submitting.', 'error');
      return;
    }

    toggleSubmitButton(true);

    try {
      if (!window.supabase) {
        throw new Error('Supabase client is not available.');
      }

      const name = [firstName, lastName].filter(Boolean).join(' ') || null;
      const payload = {
        name,
        email: email || null,
        phone: phone || null,
        message: [
          projectType ? `Project type: ${projectType}` : '',
          message,
        ].filter(Boolean).join('\n\n') || null,
        status: 'new',
        created_at: new Date().toISOString(),
      };

      const { error } = await window.supabase.from(INQUIRIES_TABLE).insert(payload);
      if (error) throw error;

      setStatusMessage("Thank you! We'll get back to you soon.", 'success');
      const form = document.getElementById(CONTACT_FORM_ID);
      if (form) form.reset();
    } catch (err) {
      console.warn('[data-loader] inquiry submit failed', err);
      setStatusMessage('Something went wrong. Please try again.', 'error');
    } finally {
      toggleSubmitButton(false);
    }
  }

  function attachContactFormHandler() {
    const form = document.getElementById(CONTACT_FORM_ID);
    if (!form) return;
    form.addEventListener('submit', handleContactSubmit);
  }

  const COOKIE_KEY = 'cookie_consent';

  function createCookieBanner() {
    const banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.className = 'cookie-banner';
    banner.innerHTML = `
      <div class="cookie-banner-copy">We use cookies to improve your experience.</div>
      <div class="cookie-banner-actions">
        <button type="button" class="cookie-btn cookie-decline" id="cookie-decline">Decline</button>
        <button type="button" class="cookie-btn cookie-accept" id="cookie-accept">Accept</button>
      </div>`;
    document.body.appendChild(banner);

    document.getElementById('cookie-accept')?.addEventListener('click', () => {
      localStorage.setItem(COOKIE_KEY, 'accepted');
      banner.style.display = 'none';
    });
    document.getElementById('cookie-decline')?.addEventListener('click', () => {
      localStorage.setItem(COOKIE_KEY, 'declined');
      banner.style.display = 'none';
    });
  }

  function initCookieConsent() {
    if (typeof window === 'undefined' || !document.body) return;
    const existing = localStorage.getItem(COOKIE_KEY);
    if (existing) return;
    createCookieBanner();
  }

  async function loadAllSections() {
    if (typeof window.renderConfigToMainSite !== 'function' ||
        typeof window.renderPortfolioToMainSite !== 'function' ||
        typeof window.renderArtistsToMainSite !== 'function' ||
        typeof window.renderReviewsToMainSite !== 'function' ||
        typeof window.renderFAQsToMainSite !== 'function') {
      console.warn('[data-loader] One or more render functions are not available yet.');
    }

    await Promise.all([
      window.renderConfigToMainSite?.(),
      window.renderPortfolioToMainSite?.(),
      window.renderArtistsToMainSite?.(),
      window.renderReviewsToMainSite?.(),
      window.renderFAQsToMainSite?.(),
    ]);
  }

  window.loadAllSections = loadAllSections;

  function initDataLoader() {
    attachContactFormHandler();
    initCookieConsent();
    loadAllSections().catch((err) => {
      console.warn('[data-loader] loadAllSections failed', err);
    });
  }

  document.addEventListener('DOMContentLoaded', initDataLoader);
})();
