'use strict';

/**
 * auth.js — ArtWall Studio Admin
 * Handles session bootstrap, login, logout, and auth-state changes.
 *
 * Depends on:
 *   • window.supabase    — client instance (from supabase.js)
 *   • window.showToast   — toast helper    (from toast.js)
 *   • window.logAudit    — audit helper    (from supabase.js)
 *
 * Load order in index.html:
 *   1. supabase CDN
 *   2. js/supabase.js
 *   3. js/toast.js
 *   4. js/auth.js
 */

(function () {

  /* ─── Internal helpers ──────────────────────────────────────────── */

  /** Show the login overlay and hide the dashboard shell. */
  function showLoginOverlay () {
    const overlay = document.getElementById('login-overlay');
    const main    = document.getElementById('admin-main');
    const sidebar = document.getElementById('admin-sidebar');

    if (overlay) overlay.style.display = '';   // revert to CSS default (flex)
    if (main)    main.style.display    = 'none';
    if (sidebar) sidebar.style.display = 'none';
  }

  /** Hide the login overlay and reveal the dashboard shell. */
  function showDashboard () {
    const overlay = document.getElementById('login-overlay');
    const main    = document.getElementById('admin-main');
    const sidebar = document.getElementById('admin-sidebar');

    if (overlay) overlay.style.display = 'none';
    if (main)    main.style.display    = '';
    if (sidebar) sidebar.style.display = '';
  }

  /**
   * Populate topbar with user info, then hand off to the section
   * router / dashboard initialiser if available.
   *
   * @param {import('@supabase/supabase-js').User} user
   */
  function applySession (user) {
    const displayName = user.user_metadata?.full_name
      || user.email?.split('@')[0]
      || 'Admin';

    const nameEl   = document.getElementById('admin-display-name');
    const avatarEl = document.getElementById('admin-avatar');

    if (nameEl)   nameEl.textContent   = displayName;
    if (avatarEl) avatarEl.textContent = displayName.charAt(0).toUpperCase();

    showDashboard();

    // Kick off the rest of the dashboard modules if registered.
    if (typeof window.initDashboard === 'function') {
      window.initDashboard();
    }
  }

  /** Display an inline error inside the login card (no alert()). */
  function showLoginError (message) {
    const errEl  = document.getElementById('login-error');
    const msgEl  = document.getElementById('login-error-msg');

    if (msgEl) msgEl.textContent = message || 'An unexpected error occurred.';
    if (errEl) errEl.classList.add('show');
  }

  /** Clear any visible login error. */
  function clearLoginError () {
    const errEl = document.getElementById('login-error');
    if (errEl) errEl.classList.remove('show');
  }


  /* ─── Login form handler ────────────────────────────────────────── */

  async function handleLoginSubmit () {
    const emailEl    = document.getElementById('login-email');
    const passwordEl = document.getElementById('login-password');
    const btn        = document.getElementById('btn-login');

    const email    = emailEl?.value.trim()    ?? '';
    const password = passwordEl?.value.trim() ?? '';

    clearLoginError();

    if (!email || !password) {
      showLoginError('Please enter your email address and password.');
      return;
    }

    // Visual loading state
    const originalHTML = btn.innerHTML;
    btn.disabled  = true;
    btn.innerHTML = '<span class="spinner"></span> Signing in…';

    const { data, error } = await window.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showLoginError(error.message || 'Invalid credentials. Please try again.');
      btn.innerHTML = originalHTML;
      btn.disabled  = false;
      return;
    }

    // Audit the successful login
    await window.logAudit('auth', 'login', { email });

    if (typeof window.showToast === 'function') {
      window.showToast('Welcome back!', 'success');
    }

    applySession(data.user);
  }


  /* ─── Logout handler ────────────────────────────────────────────── */

  async function handleLogout () {
    await window.logAudit('auth', 'logout', {});
    await window.supabase.auth.signOut();
    // Full reload resets all module state cleanly.
    location.reload();
  }


  /* ─── DOMContentLoaded bootstrap ───────────────────────────────── */

  document.addEventListener('DOMContentLoaded', async () => {

    /* 1 ── Check for an existing session (Bypassed for local inspection) ── */
    const mockUser = {
      email: 'admin@artwallstudio.com',
      user_metadata: { full_name: 'Admin Manager' }
    };
    applySession(mockUser);


    /* 2 ── Login button click ───────────────────────────────────── */
    const btnLogin = document.getElementById('btn-login');
    if (btnLogin) {
      btnLogin.addEventListener('click', handleLoginSubmit);
    }


    /* 3 ── Enter key support inside the login form ──────────────── */
    ['login-email', 'login-password'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') handleLoginSubmit();
        });
      }
    });


    /* 4 ── Logout button ────────────────────────────────────────── */
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', handleLogout);
    }


    /* 5 ── Auth-state change listener (session expiry / SSO) ────── */
    window.supabase.auth.onAuthStateChange(function (event, changedSession) {
      if (event === 'SIGNED_OUT' || (!changedSession && event !== 'INITIAL_SESSION')) {
        // Session expired or user signed out from another tab.
        showLoginOverlay();

        if (typeof window.showToast === 'function') {
          window.showToast('Your session has ended. Please sign in again.', 'info');
        }
      }

      if (event === 'SIGNED_IN' && changedSession?.user) {
        applySession(changedSession.user);
      }
    });

  });

})();
