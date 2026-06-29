/**
 * api-client.js — MySQL API Client
 * 
 * This replaces supabase.js. Instead of using Supabase, all data
 * operations go through our own backend API server.
 * 
 * Usage:
 *   window.api.get('/api/portfolio')     → GET request
 *   window.api.post('/api/portfolio', data) → POST request
 *   window.api.put('/api/portfolio/1', data) → PUT request
 *   window.api.patch('/api/portfolio/1', data) → PATCH request
 *   window.api.del('/api/portfolio/1')  → DELETE request
 * 
 * The API_BASE_URL below should point to your backend server.
 */

(function () {
  'use strict';

  // 🔴 CHANGE THIS to your backend server URL
  // If running locally: http://localhost:4000
  // If deployed: https://your-domain.com
  const API_BASE_URL = 'http://localhost:4000';

  /**
   * Generic request function
   */
  async function request(method, path, body = null) {
    const url = API_BASE_URL + path;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body !== null) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * API client object
   */
  const api = {
    get: (path) => request('GET', path),
    post: (path, data) => request('POST', path, data),
    put: (path, data) => request('PUT', path, data),
    patch: (path, data) => request('PATCH', path, data),
    del: (path) => request('DELETE', path),
  };

  // Expose globally
  window.api = api;

  console.log('[API Client] Initialized. Base URL:', API_BASE_URL);
})();