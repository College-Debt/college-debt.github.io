(function () {
  'use strict';

  var AUTH_HINT_KEY = 'collegedebt_auth_hint';
  var IDENTITY_URL = '/cdn-cgi/access/get-identity';
  var SESSION_URL = '/api/paintings/session';
  var LOGIN_BASE_URL = '/api/paintings/login';
  var LOGOUT_URL = '/cdn-cgi/access/logout';

  var modal = null;
  var backdrop = null;
  var dialog = null;
  var triggerButtons = [];
  var activeTrigger = null;

  var signedOutView = null;
  var signedInView = null;
  var signInLink = null;
  var signOutLink = null;
  var nameEl = null;
  var emailEl = null;
  var adminBadgeEl = null;

  var authState = {
    checked: false,
    authenticated: false,
    email: '',
    name: '',
    isAdmin: null,
    roleLoaded: false,
    roleLoading: false
  };

  function readHint() {
    try {
      return sessionStorage.getItem(AUTH_HINT_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function writeHint(signedIn) {
    try {
      sessionStorage.setItem(AUTH_HINT_KEY, signedIn ? '1' : '0');
    } catch (e) {}
  }

  function currentReturnPath() {
    return (window.location.pathname || '/') + (window.location.search || '') + (window.location.hash || '');
  }

  function buildLoginHref() {
    return LOGIN_BASE_URL + '?next=' + encodeURIComponent(currentReturnPath());
  }

  function syncUI() {
    var root = document.documentElement;
    if (authState.authenticated) {
      root.setAttribute('data-account', 'signed-in');
    } else if (authState.checked) {
      root.setAttribute('data-account', 'signed-out');
    } else {
      root.setAttribute('data-account', readHint() ? 'signed-in' : 'signed-out');
    }

    var label = authState.authenticated
      ? 'Account menu (' + (authState.email || authState.name || 'signed in') + ')'
      : 'Account sign in';

    triggerButtons.forEach(function (btn) {
      btn.setAttribute('aria-label', label);
      btn.title = authState.authenticated ? (authState.name || authState.email || 'Account') : 'Sign in';
    });

    if (signInLink) {
      signInLink.setAttribute('href', buildLoginHref());
    }

    if (signedOutView && signedInView) {
      signedOutView.hidden = authState.authenticated;
      signedInView.hidden = !authState.authenticated;
    }

    if (nameEl) {
      nameEl.textContent = authState.name || (authState.email ? authState.email.split('@')[0] : 'Member');
    }
    if (emailEl) {
      emailEl.textContent = authState.email || '';
      emailEl.hidden = !authState.email;
    }
    if (adminBadgeEl) {
      adminBadgeEl.hidden = authState.isAdmin !== true;
    }
  }

  function positionDialog() {
    if (!dialog || !modal || !modal.classList.contains('is-open')) return;

    if (window.innerWidth <= 600) {
      dialog.style.top = '';
      dialog.style.right = '';
      dialog.style.left = '';
      return;
    }

    var anchor = activeTrigger;
    if (!anchor || anchor.offsetParent === null) {
      for (var i = 0; i < triggerButtons.length; i++) {
        if (triggerButtons[i].offsetParent !== null) {
          anchor = triggerButtons[i];
          break;
        }
      }
    }

    if (!anchor) return;
    var rect = anchor.getBoundingClientRect();
    var topPx = Math.round(rect.bottom + 12);
    var rightPx = Math.max(12, Math.round(window.innerWidth - rect.right));
    dialog.style.top = topPx + 'px';
    dialog.style.right = rightPx + 'px';
    dialog.style.left = 'auto';
  }

  async function refreshSessionRole() {
    if (!authState.authenticated || authState.roleLoaded || authState.roleLoading) return;
    authState.roleLoading = true;
    try {
      var res = await fetch(SESSION_URL, {
        credentials: 'same-origin',
        redirect: 'manual',
        headers: { Accept: 'application/json' }
      });
      if (res.type === 'opaqueredirect' || res.status === 401 || res.status === 403) {
        authState.authenticated = false;
        authState.email = '';
        authState.name = '';
        authState.isAdmin = false;
        authState.roleLoaded = false;
        writeHint(false);
        syncUI();
        return;
      }
      var ct = (res.headers.get('content-type') || '').toLowerCase();
      if (res.ok && ct.indexOf('application/json') !== -1) {
        var data = await res.json();
        if (data && data.viewer) {
          authState.email = data.viewer.email || authState.email;
          authState.name = data.viewer.name || authState.name;
          authState.isAdmin = Boolean(data.viewer.isAdmin);
          authState.roleLoaded = true;
          syncUI();
        }
      }
    } catch (e) {
      // Edge get-identity already populated name/email; keep UI intact on transient failure
    } finally {
      authState.roleLoading = false;
    }
  }

  async function checkEdgeIdentity() {
    try {
      var res = await fetch(IDENTITY_URL, {
        credentials: 'same-origin',
        redirect: 'manual',
        headers: { Accept: 'application/json' }
      });
      var ct = (res.headers.get('content-type') || '').toLowerCase();
      if (res.ok && ct.indexOf('application/json') !== -1) {
        var data = await res.json();
        if (data && (data.email || data.name)) {
          authState.authenticated = true;
          authState.email = String(data.email || '').trim().toLowerCase();
          authState.name = String(data.name || (authState.email ? authState.email.split('@')[0] : '')).trim();
          writeHint(true);
        } else {
          authState.authenticated = false;
          authState.email = '';
          authState.name = '';
          authState.isAdmin = null;
          authState.roleLoaded = false;
          writeHint(false);
        }
      } else {
        authState.authenticated = false;
        authState.email = '';
        authState.name = '';
        authState.isAdmin = null;
        authState.roleLoaded = false;
        writeHint(false);
      }
    } catch (e) {
      authState.authenticated = false;
      writeHint(false);
    } finally {
      authState.checked = true;
      syncUI();
    }
  }

  function closeOtherModals() {
    var mobileNav = document.getElementById('site-mobile-nav-modal');
    if (mobileNav && mobileNav.classList.contains('is-open')) {
      mobileNav.classList.remove('is-open');
      mobileNav.setAttribute('aria-hidden', 'true');
      var navToggle = document.querySelector('.wp-block-navigation__responsive-container-open');
      if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
    }
    var searchModal = document.getElementById('site-search-modal');
    if (searchModal && searchModal.classList.contains('is-open')) {
      searchModal.classList.remove('is-open', 'has-search-query', 'is-typing', 'using-keyboard');
      searchModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('has-search-open');
      document.documentElement.classList.remove('has-search-open');
    }
    var personalizeModal = document.getElementById('site-personalize-modal');
    if (personalizeModal && personalizeModal.classList.contains('is-open')) {
      personalizeModal.classList.remove('is-open');
      personalizeModal.setAttribute('aria-hidden', 'true');
      document.querySelectorAll('.site-personalize-btn').forEach(function (b) {
        b.setAttribute('aria-expanded', 'false');
      });
    }
    document.body.classList.remove('has-wiki-sidebar-open', 'has-wiki-toc-open', 'has-modal-open');
    document.documentElement.classList.remove('has-modal-open');
  }

  function openAccountModal(triggerEl) {
    if (!modal) return;
    closeOtherModals();

    activeTrigger = triggerEl || triggerButtons[0] || null;
    syncUI();

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    if (window.__cdA11y) window.__cdA11y.setBackgroundInert(modal, true);
    triggerButtons.forEach(function (btn) {
      btn.setAttribute('aria-expanded', 'true');
    });

    positionDialog();

    if (authState.authenticated) {
      refreshSessionRole();
    }

    if (dialog) {
      var target = authState.authenticated ? dialog.querySelector('.site-account-link-item') : signInLink;
      if (target && typeof target.focus === 'function') {
        setTimeout(function () { target.focus({ preventScroll: true }); }, 15);
      }
    }
  }

  function closeAccountModal(restoreFocus) {
    if (!modal || !modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    if (window.__cdA11y) window.__cdA11y.setBackgroundInert(modal, false);
    triggerButtons.forEach(function (btn) {
      btn.setAttribute('aria-expanded', 'false');
    });
    if (restoreFocus && activeTrigger && activeTrigger.offsetParent !== null) {
      activeTrigger.focus();
    }
  }

  function toggleAccountModal(triggerEl) {
    if (!modal) return;
    if (modal.classList.contains('is-open')) {
      closeAccountModal(false);
    } else {
      openAccountModal(triggerEl);
    }
  }

  function init() {
    modal = document.getElementById('site-account-modal');
    if (!modal) return;

    backdrop = modal.querySelector('.site-account-backdrop');
    dialog = document.getElementById('site-account-dialog');
    triggerButtons = Array.prototype.slice.call(document.querySelectorAll('.site-account-btn'));
    signedOutView = document.getElementById('site-account-signed-out');
    signedInView = document.getElementById('site-account-signed-in');
    signInLink = document.getElementById('site-account-signin-link');
    signOutLink = document.getElementById('site-account-signout-link');
    nameEl = document.getElementById('site-account-name');
    emailEl = document.getElementById('site-account-email');
    adminBadgeEl = document.getElementById('site-account-admin-badge');

    syncUI();

    triggerButtons.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleAccountModal(btn);
      });
    });

    if (backdrop) {
      backdrop.addEventListener('click', function (e) {
        e.preventDefault();
        closeAccountModal(false);
      });
    }

    if (signOutLink) {
      signOutLink.setAttribute('href', LOGOUT_URL);
      signOutLink.addEventListener('click', function () {
        writeHint(false);
      });
    }

    window.addEventListener('collegedebt:authchange', function (e) {
      var detail = (e && e.detail) || {};
      authState.checked = true;
      authState.authenticated = Boolean(detail.authenticated);
      if (authState.authenticated) {
        authState.email = String(detail.email || authState.email || '').trim().toLowerCase();
        authState.name = String(detail.name || authState.name || '').trim();
        if (typeof detail.isAdmin === 'boolean') {
          authState.isAdmin = detail.isAdmin;
          authState.roleLoaded = true;
        }
        writeHint(true);
      } else {
        authState.email = '';
        authState.name = '';
        authState.isAdmin = false;
        authState.roleLoaded = false;
        writeHint(false);
      }
      syncUI();
    });

    window.addEventListener('keydown', function (e) {
      if (!modal.classList.contains('is-open')) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeAccountModal(true);
      } else if (e.key === 'Tab' && window.__cdA11y) {
        window.__cdA11y.trapTab(e, dialog || modal);
      }
    });

    window.addEventListener('resize', positionDialog);
    window.addEventListener('scroll', positionDialog, { passive: true });

    checkEdgeIdentity();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
