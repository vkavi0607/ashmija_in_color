'use strict';

/**
 * toast.js — ArtWall Studio Admin
 * Lightweight, accessible toast notification system.
 *
 * Exposes: window.showToast(message, type)
 *
 * Requires a #toast-container element in the document (already present
 * in admin/index.html with aria-live="polite").
 *
 * No external dependencies.  No alert() used anywhere.
 */

(function () {

  /* ─── Constants ─────────────────────────────────────────────────── */

  const TOAST_DURATION_MS = 3000;

  /**
   * Tabler icon class names keyed by toast type.
   * Falls back to 'ti-info-circle' for unknown types.
   */
  const TYPE_ICONS = {
    success : 'ti-circle-check',
    error   : 'ti-alert-circle',
    info    : 'ti-info-circle',
    warning : 'ti-alert-triangle',
  };

  /**
   * CSS class applied to the toast element — drives colour theming via
   * the existing admin.css variables (toast-success, toast-error, etc.).
   */
  const VALID_TYPES = new Set(['success', 'error', 'info', 'warning']);


  /* ─── Slide-in keyframe styles (injected once) ──────────────────── */

  (function injectStyles () {
    if (document.getElementById('aw-toast-styles')) return;   // already injected

    const style = document.createElement('style');
    style.id = 'aw-toast-styles';
    style.textContent = `
      @keyframes aw-toast-in {
        from {
          opacity          : 0;
          transform        : translateX(calc(100% + 24px));
        }
        to {
          opacity          : 1;
          transform        : translateX(0);
        }
      }

      @keyframes aw-toast-out {
        from {
          opacity          : 1;
          transform        : translateX(0);
          max-height       : 80px;
          margin-bottom    : 8px;
        }
        to {
          opacity          : 0;
          transform        : translateX(calc(100% + 24px));
          max-height       : 0;
          margin-bottom    : 0;
          padding-top      : 0;
          padding-bottom   : 0;
        }
      }

      /* Applied on creation */
      .aw-toast {
        animation : aw-toast-in 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      }

      /* Applied before removal */
      .aw-toast.aw-toast--hiding {
        animation : aw-toast-out 0.24s ease-in forwards;
        pointer-events : none;
      }
    `;

    document.head.appendChild(style);
  })();


  /* ─── Core dismiss logic ────────────────────────────────────────── */

  /**
   * Animate a toast out and remove it from the DOM.
   * Safe to call multiple times on the same element.
   *
   * @param {HTMLElement} toastEl
   */
  function dismissToast (toastEl) {
    if (!toastEl || toastEl.classList.contains('aw-toast--hiding')) return;

    toastEl.classList.add('aw-toast--hiding');

    toastEl.addEventListener('animationend', function onEnd () {
      toastEl.removeEventListener('animationend', onEnd);
      toastEl.remove();
    });
  }


  /* ─── Public API ────────────────────────────────────────────────── */

  /**
   * window.showToast(message, type)
   *
   * Creates a toast notification, appends it to #toast-container, and
   * auto-removes it after TOAST_DURATION_MS milliseconds.
   *
   * @param {string} message - Text to display in the toast body.
   * @param {'success'|'error'|'info'|'warning'} [type='info'] - Visual variant.
   */
  window.showToast = function showToast (message, type) {
    const resolvedType = VALID_TYPES.has(type) ? type : 'info';
    const iconClass    = TYPE_ICONS[resolvedType];

    const container = document.getElementById('toast-container');
    if (!container) {
      // Graceful degradation: log to console if container missing.
      console.warn('[toast.js] #toast-container not found. Message:', message);
      return;
    }

    /* Build the toast element ─────────────────────────────────────── */
    const toast = document.createElement('div');

    // Class list: existing admin.css classes + our animation class
    toast.className = `toast toast-${resolvedType} aw-toast`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    // Dismiss button (no alert() — purely UI interaction)
    const dismissBtn = document.createElement('button');
    dismissBtn.className   = 'toast-close';
    dismissBtn.setAttribute('aria-label', 'Dismiss notification');
    dismissBtn.innerHTML   = '<i class="ti ti-x"></i>';
    dismissBtn.addEventListener('click', function () {
      dismissToast(toast);
    });

    // Icon
    const icon = document.createElement('i');
    icon.className = `ti ${iconClass} toast-icon`;

    // Body
    const body = document.createElement('div');
    body.className   = 'toast-body';

    const msgEl = document.createElement('div');
    msgEl.className   = 'toast-msg';
    msgEl.textContent = message;
    body.appendChild(msgEl);

    toast.appendChild(icon);
    toast.appendChild(body);
    toast.appendChild(dismissBtn);

    container.appendChild(toast);

    /* Auto-dismiss ────────────────────────────────────────────────── */
    const timer = setTimeout(function () {
      dismissToast(toast);
    }, TOAST_DURATION_MS);

    // If the user manually dismisses, clear the pending timer to
    // avoid a redundant second dismiss attempt.
    dismissBtn.addEventListener('click', function () {
      clearTimeout(timer);
    }, { once: true });
  };

})();
