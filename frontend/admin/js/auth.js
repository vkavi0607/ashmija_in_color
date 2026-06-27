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
  const ADMIN_EMAIL = 'admin@ashmijaincolor.in';

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

  function buildAdminAuthHint(errorMessage) {
    const message = String(errorMessage || '').toLowerCase();
    if (message.includes('email not confirmed')) {
      return `Your admin account exists but is not confirmed in Supabase Auth. Confirm ${ADMIN_EMAIL} and try again.`;
    }
    if (message.includes('invalid login credentials')) {
      return `Check that ${ADMIN_EMAIL} exists in Supabase Auth and that the password is correct.`;
    }
    if (message.includes('user not found') || message.includes('does not exist')) {
      return `Create ${ADMIN_EMAIL} in Supabase Auth first, then confirm the email address.`;
    }
    return errorMessage || 'Please sign in with a confirmed Supabase Auth admin account.';
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
      showLoginError(buildAdminAuthHint(error.message));
      btn.innerHTML = originalHTML;
      btn.disabled  = false;
      return;
    }

    const { data: userData, error: userErr } = await window.supabase.auth.getUser();
    if (userErr || !userData?.user) {
      showLoginError('Admin login did not create a valid authenticated session. Check that the user is confirmed in Supabase Auth.');
      btn.innerHTML = originalHTML;
      btn.disabled  = false;
      return;
    }

    // Audit the successful login
    await window.logAudit('auth', 'login', { email });

    if (typeof window.showToast === 'function') {
      window.showToast('Welcome back!', 'success');
    }

    applySession(userData.user);
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

    /* 1 ── Check for an existing Supabase session ── */
    try {
      const { data: { session } } = await window.supabase.auth.getSession();
      if (session?.user) {
        applySession(session.user);
      } else {
        showLoginOverlay();
      }
    } catch (err) {
      console.warn('[auth] session bootstrap failed', err);
      showLoginOverlay();
    }


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
