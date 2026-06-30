'use strict';

/**
 * auth.js - ArtWall Studio Admin
 * Handles session bootstrap, login, logout, and auth-state changes.
 *
 * Depends on:
 *   - window.supabase    - client instance (from supabase.js)
 *   - window.showToast   - toast helper    (from toast.js)
 *   - window.logAudit    - audit helper    (from supabase.js)
 *
 * Load order in index.html:
 *   1. supabase CDN
 *   2. js/supabase.js
 *   3. js/toast.js
 *   4. js/auth.js
 */

(function () {
  function showLoginOverlay () {
    const overlay = document.getElementById('login-overlay');
    const main = document.getElementById('admin-main');
    const sidebar = document.getElementById('admin-sidebar');

    if (overlay) overlay.style.display = '';
    if (main) main.style.display = 'none';
    if (sidebar) sidebar.style.display = 'none';
  }

  function showDashboard () {
    const overlay = document.getElementById('login-overlay');
    const main = document.getElementById('admin-main');
    const sidebar = document.getElementById('admin-sidebar');

    if (overlay) overlay.style.display = 'none';
    if (main) main.style.display = '';
    if (sidebar) sidebar.style.display = '';
  }

  function applySession (user) {
    const displayName = user.user_metadata?.full_name
      || user.email?.split('@')[0]
      || 'Admin';

    const nameEl = document.getElementById('admin-display-name');
    const avatarEl = document.getElementById('admin-avatar');

    if (nameEl) nameEl.textContent = displayName;
    if (avatarEl) avatarEl.textContent = displayName.charAt(0).toUpperCase();

    showDashboard();

    if (typeof window.initDashboard === 'function') {
      window.initDashboard();
    }
  }

  function showLoginError (message) {
    const errEl = document.getElementById('login-error');
    const msgEl = document.getElementById('login-error-msg');

    if (msgEl) msgEl.textContent = message || 'An unexpected error occurred.';
    if (errEl) errEl.classList.add('show');
  }

  function clearLoginError () {
    const errEl = document.getElementById('login-error');
    if (errEl) errEl.classList.remove('show');
  }

  function buildAdminAuthHint (errorMessage, email) {
    const message = String(errorMessage || '').toLowerCase();
    if (message.includes('email not confirmed')) {
      return email
        ? `Your Supabase Auth user for ${email} exists but is not confirmed. Confirm the account and try again.`
        : 'Your Supabase Auth user exists but is not confirmed. Confirm the account and try again.';
    }
    if (message.includes('invalid login credentials')) {
      return email
        ? `Check that ${email} exists in Supabase Auth and that the password is correct.`
        : 'Check that the user exists in Supabase Auth and that the password is correct.';
    }
    if (message.includes('user not found') || message.includes('does not exist')) {
      return email
        ? `Create ${email} in Supabase Auth first, then confirm the email address.`
        : 'Create the user in Supabase Auth first, then confirm the email address.';
    }
    return errorMessage || 'Please sign in with a confirmed Supabase Auth admin account.';
  }

  async function handleLoginSubmit () {
    const emailEl = document.getElementById('login-email');
    const passwordEl = document.getElementById('login-password');
    const btn = document.getElementById('btn-login');

    const email = emailEl?.value.trim() ?? '';
    const password = passwordEl?.value.trim() ?? '';

    clearLoginError();

    if (!email || !password) {
      showLoginError('Please enter your email address and password.');
      return;
    }

    const originalHTML = btn?.innerHTML ?? '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Signing in...';
    }

    try {
      const { error } = await window.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        showLoginError(buildAdminAuthHint(error.message, email));
        return;
      }

      const { data: userData, error: userErr } = await window.supabase.auth.getUser();
      if (userErr || !userData?.user) {
        showLoginError('Admin login did not create a valid authenticated session. Check that the user is confirmed in Supabase Auth.');
        return;
      }

      await window.logAudit('auth', 'login', { email });

      if (typeof window.showToast === 'function') {
        window.showToast('Welcome back!', 'success');
      }

      applySession(userData.user);
    } finally {
      if (btn) {
        btn.innerHTML = originalHTML || 'Sign In';
        btn.disabled = false;
      }
    }
  }

  async function handleLogout () {
    await window.logAudit('auth', 'logout', {});
    await window.supabase.auth.signOut();
    location.reload();
  }

  document.addEventListener('DOMContentLoaded', async () => {
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

    const btnLogin = document.getElementById('btn-login');
    if (btnLogin) {
      btnLogin.addEventListener('click', handleLoginSubmit);
    }

    ['login-email', 'login-password'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') handleLoginSubmit();
        });
      }
    });

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', handleLogout);
    }

    window.supabase.auth.onAuthStateChange(function (event, changedSession) {
      if (event === 'SIGNED_OUT' || (!changedSession && event !== 'INITIAL_SESSION')) {
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
