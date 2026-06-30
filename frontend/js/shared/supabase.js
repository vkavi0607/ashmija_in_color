'use strict';

/**
 * supabase.js — ArtWall Studio Admin
 * Initialises the Supabase client and exposes shared helpers.
 *
 * Usage (in index.html, AFTER the Supabase CDN script):
 *   <script src="js/supabase.js"></script>
 *
 * The CDN already attaches the library as window.supabase (the module
 * namespace).  We overwrite window.supabase with the *client instance*
 * so every other script can reach it via window.supabase directly.
 */

(function () {
  window.isLocalPreviewMode = function isLocalPreviewMode() {
    return window.location.protocol === 'file:';
  };

  window.shouldBypassRemoteData = function shouldBypassRemoteData() {
    return window.isLocalPreviewMode();
  };

  /* ─── 1. Configuration ──────────────────────────────────────────── */

  /**
   * Replace these two placeholders with your actual Supabase project
   * values before deploying.
   *
   * Recommended: load them from a build-time env substitution or a
   * separate non-committed config.js so secrets stay out of source
   * control.
   */
  const SUPABASE_URL = 'https://dtsxrlmxshczokvbvyaf.supabase.co';       // e.g. https://xxxx.supabase.co
  const SUPABASE_ANON_KEY = 'sb_publishable_9Ghx4Bm5HpKGWaxFzgQSTw_slL6cZop';  // public publishable key


  /* ─── 2. Client initialisation ──────────────────────────────────── */

  /**
   * The Supabase CDN bundle exposes `supabase` (the module namespace)
   * on window.  We need `supabase.createClient` from that namespace,
   * then we replace window.supabase with the live client instance so
   * the rest of the codebase can call window.supabase.from(...) etc.
   */
  const { createClient } = window.supabase;   // module namespace from CDN

  if (!createClient) {
    console.error(
      '[supabase.js] Supabase CDN not loaded.  ' +
      'Ensure the CDN <script> tag appears before supabase.js.'
    );
    return;
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  /**
   * Overwrite the global so every other admin script accesses the
   * client through the same reference:
   *   window.supabase.auth.getSession()
   *   window.supabase.from('portfolio').select(...)
   */
  window.supabase = client;


  /* ─── 3. Audit-log helper ───────────────────────────────────────── */

  /**
   * window.logAudit(module, action, details)
   *
   * Inserts one row into the `audit_log` table.  Failures are caught
   * and logged to the console so they never surface as unhandled
   * promise rejections or break the calling flow.
   *
   * @param {string} module   - Feature area, e.g. 'portfolio', 'auth'
   * @param {string} action   - What happened, e.g. 'create', 'delete'
   * @param {Object} [details={}] - Any extra JSON-serialisable context
   * @returns {Promise<void>}
   */
  window.logAudit = async function logAudit(module, action, details = {}) {
    try {
      // Attempt to attach the current authenticated user's ID.
      const { data: { session } } = await window.supabase.auth.getSession();
      const userId = session?.user?.id ?? null;

      const { error } = await window.supabase
        .from('audit_log')
        .insert({
          module,
          action,
          details,
          user_id: userId,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.warn('[logAudit] Insert failed:', error.message, { module, action, details });
      }
    } catch (err) {
      // Never block the calling feature on an audit failure.
      console.warn('[logAudit] Unexpected error:', err);
    }
  };

})();
