(function () {
  'use strict';

  var STORAGE_KEYS = {
    theme: 'collegedebt_theme',
    accent: 'collegedebt_accent',
    font: 'collegedebt_font'
  };

  var VALID_THEMES = ['auto', 'light', 'dark'];
  var VALID_ACCENTS = ['red', 'orange', 'yellow', 'lime', 'green', 'cyan', 'light-blue', 'blue', 'purple', 'pink', 'gray', 'jeb'];
  var VALID_FONTS = ['default', 'sans', 'serif', 'mojangles'];

  var modal = null;
  var backdrop = null;
  var dialog = null;
  var triggerButtons = [];
  var activeTrigger = null;

  function readPref(key, validList, fallback) {
    try {
      var val = localStorage.getItem(key);
      if (val && validList.indexOf(val) !== -1) {
        return val;
      }
    } catch (e) {}
    return fallback;
  }

  function writePref(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {}
  }

  function getState() {
    var root = document.documentElement;
    var t = root.getAttribute('data-theme');
    var a = root.getAttribute('data-accent');
    var f = root.getAttribute('data-font');
    return {
      theme: VALID_THEMES.indexOf(t) !== -1 ? t : readPref(STORAGE_KEYS.theme, VALID_THEMES, 'auto'),
      accent: VALID_ACCENTS.indexOf(a) !== -1 ? a : readPref(STORAGE_KEYS.accent, VALID_ACCENTS, 'cyan'),
      font: VALID_FONTS.indexOf(f) !== -1 ? f : readPref(STORAGE_KEYS.font, VALID_FONTS, 'default')
    };
  }

  function applyState(state) {
    var root = document.documentElement;
    root.setAttribute('data-theme', state.theme);
    root.setAttribute('data-accent', state.accent);
    root.setAttribute('data-font', state.font);
    syncControls(state);
  }

  function syncControls(state) {
    if (!modal) return;

    modal.querySelectorAll('.site-theme-option').forEach(function (btn) {
      var isSelected = btn.getAttribute('data-theme-value') === state.theme;
      btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    });

    modal.querySelectorAll('.site-accent-swatch').forEach(function (btn) {
      var isSelected = btn.getAttribute('data-accent-value') === state.accent;
      btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    });

    modal.querySelectorAll('.site-font-option').forEach(function (btn) {
      var isSelected = btn.getAttribute('data-font-value') === state.font;
      btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    });
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
      // Fallback to visible desktop trigger button
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
    var rightPx = Math.max(14, Math.round(window.innerWidth - rect.right));
    dialog.style.top = topPx + 'px';
    dialog.style.right = rightPx + 'px';
    dialog.style.left = 'auto';
  }

  function openPersonalize(triggerEl) {
    if (!modal) return;

    // Close mobile nav, wiki drawers, or search modal if open
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
    var accountModal = document.getElementById('site-account-modal');
    if (accountModal && accountModal.classList.contains('is-open')) {
      accountModal.classList.remove('is-open');
      accountModal.setAttribute('aria-hidden', 'true');
      document.querySelectorAll('.site-account-btn').forEach(function (b) {
        b.setAttribute('aria-expanded', 'false');
      });
    }
    document.body.classList.remove('has-wiki-sidebar-open', 'has-wiki-toc-open', 'has-modal-open');
    document.documentElement.classList.remove('has-modal-open');

    activeTrigger = triggerEl || triggerButtons[0] || null;
    syncControls(getState());

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    if (window.__cdA11y) window.__cdA11y.setBackgroundInert(modal, true);
    triggerButtons.forEach(function (btn) {
      btn.setAttribute('aria-expanded', 'true');
    });

    positionDialog();

    if (dialog) {
      var initialFocus = dialog.querySelector('[role="radio"][aria-checked="true"]') || dialog.querySelector('[role="radio"]');
      if (initialFocus) {
        setTimeout(function () { initialFocus.focus({ preventScroll: true }); }, 15);
      }
    }
  }

  function closePersonalize(restoreFocus) {
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

  function togglePersonalize(triggerEl) {
    if (!modal) return;
    if (modal.classList.contains('is-open')) {
      closePersonalize(false);
    } else {
      openPersonalize(triggerEl);
    }
  }

  function init() {
    modal = document.getElementById('site-personalize-modal');
    if (!modal) return;

    backdrop = modal.querySelector('.site-personalize-backdrop');
    dialog = document.getElementById('site-personalize-dialog');
    triggerButtons = Array.prototype.slice.call(document.querySelectorAll('.site-personalize-btn'));

    // Ensure initial DOM state matches stored prefs
    applyState(getState());

    triggerButtons.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        togglePersonalize(btn);
      });
    });

    if (backdrop) {
      backdrop.addEventListener('click', function (e) {
        e.preventDefault();
        closePersonalize(false);
      });
    }

    // Theme Selection
    modal.querySelectorAll('.site-theme-option').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var nextTheme = btn.getAttribute('data-theme-value');
        if (VALID_THEMES.indexOf(nextTheme) === -1) return;
        var state = getState();
        state.theme = nextTheme;
        writePref(STORAGE_KEYS.theme, nextTheme);
        applyState(state);
      });
    });

    // Accent Selection
    modal.querySelectorAll('.site-accent-swatch').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var nextAccent = btn.getAttribute('data-accent-value');
        if (VALID_ACCENTS.indexOf(nextAccent) === -1) return;
        var state = getState();
        state.accent = nextAccent;
        writePref(STORAGE_KEYS.accent, nextAccent);
        applyState(state);
      });
    });

    // Font Selection
    modal.querySelectorAll('.site-font-option').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var nextFont = btn.getAttribute('data-font-value');
        if (VALID_FONTS.indexOf(nextFont) === -1) return;
        var state = getState();
        state.font = nextFont;
        writePref(STORAGE_KEYS.font, nextFont);
        applyState(state);
      });
    });

    // Radio group arrow-key navigation inside popover
    modal.querySelectorAll('[role="radiogroup"]').forEach(function (group) {
      group.addEventListener('keydown', function (e) {
        var keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
        if (keys.indexOf(e.key) === -1) return;
        var items = Array.prototype.slice.call(group.querySelectorAll('[role="radio"]'));
        var idx = items.indexOf(document.activeElement);
        if (idx === -1) return;

        e.preventDefault();
        var delta = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1;
        var nextIdx = (idx + delta + items.length) % items.length;
        items[nextIdx].focus();
        items[nextIdx].click();
      });
    });

    // Close on Escape and trap Tab inside dialog
    window.addEventListener('keydown', function (e) {
      if (!modal.classList.contains('is-open')) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closePersonalize(true);
      } else if (e.key === 'Tab' && window.__cdA11y) {
        window.__cdA11y.trapTab(e, dialog || modal);
      }
    });

    // Keep anchored properly on viewport changes
    window.addEventListener('resize', positionDialog);
    window.addEventListener('scroll', positionDialog, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
