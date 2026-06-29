'use strict';

(function () {
  const CONTACT_FORM_ID = 'contact-section-form';
  const CONTACT_BUTTON_ID = 'btn-contact-submit';
  const STATUS_MESSAGE_ID = 'contact-status-message';

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
      const subject = encodeURIComponent(`Website enquiry from ${firstName} ${lastName}`);
      const body = encodeURIComponent([
        `Name: ${firstName} ${lastName}`,
        `Email: ${email}`,
        phone ? `Phone: ${phone}` : '',
        projectType ? `Project type: ${projectType}` : '',
        '',
        message,
      ].filter(Boolean).join('\n'));

      setStatusMessage('Opening your email app so you can send the message directly.', 'success');
      const mailtoUrl = `mailto:ashmijaincolor@gmail.com?subject=${subject}&body=${body}`;
      window.location.href = mailtoUrl;
      const form = document.getElementById(CONTACT_FORM_ID);
      if (form) form.reset();
    } catch (err) {
      console.warn('[data-loader] static contact handoff failed', err);
      setStatusMessage('Please use the email link below to contact us directly.', 'error');
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
    const optionalRenderers = [
      { name: 'renderPortfolioToMainSite', fn: window.renderPortfolioToMainSite },
      { name: 'renderArtistsToMainSite', fn: window.renderArtistsToMainSite },
      { name: 'renderConfigToMainSite', fn: window.renderConfigToMainSite },
      { name: 'renderFAQsToMainSite', fn: window.renderFAQsToMainSite },
    ];

    const availableRenders = optionalRenderers.filter((entry) => typeof entry.fn === 'function');
    if (availableRenders.length === 0) {
      return Promise.resolve();
    }

    await Promise.all(availableRenders.map(async (entry) => {
      try {
        await entry.fn();
      } catch (err) {
        console.warn(`[data-loader] ${entry.name} failed`, err);
      }
    }));
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
