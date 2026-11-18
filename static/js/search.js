(function () {
  'use strict';

  var modal = null;
  var closeBtn = null;
  var backdrop = null;
  var pagefindInstance = null;
  var isAssetsLoading = false;

  function init() {
    modal = document.getElementById('site-search-modal');
    if (!modal) return;

    closeBtn = modal.querySelector('.site-search-close');
    backdrop = modal.querySelector('.site-search-backdrop');

    // Attach click listeners to all search toggle buttons
    document.querySelectorAll('.site-search-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openSearch();
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        closeSearch();
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', function (e) {
        e.preventDefault();
        closeSearch();
      });
    }

    // Global keyboard shortcuts
    window.addEventListener('keydown', function (e) {
      // ⌘K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (modal.classList.contains('is-open')) {
          closeSearch();
        } else {
          openSearch();
        }
        return;
      }

      // Escape to close
      if (e.key === 'Escape' && modal.classList.contains('is-open')) {
        e.preventDefault();
        closeSearch();
        return;
      }

      // '/' shortcut (when not typing in an input/textarea)
      if (e.key === '/' && !modal.classList.contains('is-open')) {
        var activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (activeTag !== 'input' && activeTag !== 'textarea' && activeTag !== 'select') {
          e.preventDefault();
          openSearch();
        }
      }
    });

    // Close search modal when clicking search results
    modal.addEventListener('click', function (e) {
      var link = e.target.closest('a');
      if (link && link.href) {
        closeSearch();
      }
    });

    // Track when input has search query for active results divider
    modal.addEventListener('input', function (e) {
      if (e.target && e.target.classList.contains('pagefind-ui__search-input')) {
        var hasQuery = e.target.value.trim().length > 0;
        modal.classList.toggle('has-search-query', hasQuery);
      }
    });
  }

  function openSearch() {
    if (!modal) return;

    // Close any open mobile navigation or wiki drawers
    var mobileNav = document.getElementById('site-mobile-nav-modal');
    if (mobileNav) mobileNav.classList.remove('is-open');
    document.body.classList.remove('has-wiki-sidebar-open', 'has-wiki-toc-open', 'has-modal-open');
    document.documentElement.classList.remove('has-modal-open');

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('has-search-open');
    document.documentElement.classList.add('has-search-open');

    loadPagefindAndInit();
  }

  function closeSearch() {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.classList.remove('has-search-query');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('has-search-open');
    document.documentElement.classList.remove('has-search-open');
  }

  function loadPagefindAndInit() {
    if (pagefindInstance) {
      focusInput();
      return;
    }

    if (isAssetsLoading) return;
    isAssetsLoading = true;

    // Load Pagefind UI CSS if not present
    if (!document.querySelector('link[href*="pagefind-ui.css"]')) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/pagefind/pagefind-ui.css';
      document.head.appendChild(link);
    }

    // Load Pagefind UI JS if not present
    if (!window.PagefindUI) {
      var script = document.createElement('script');
      script.src = '/pagefind/pagefind-ui.js';
      script.async = true;
      script.onload = function () {
        setupPagefindUI();
      };
      script.onerror = function () {
        isAssetsLoading = false;
        var container = document.getElementById('site-search-container');
        if (container) {
          container.innerHTML = '<div class="site-search-placeholder"><span>Search index is not available. Build site with Pagefind to enable search.</span></div>';
        }
      };
      document.head.appendChild(script);
    } else {
      setupPagefindUI();
    }
  }

  function setupPagefindUI() {
    var container = document.getElementById('site-search-container');
    if (!container) return;
    container.innerHTML = '';

    try {
      pagefindInstance = new PagefindUI({
        element: '#site-search-container',
        showSubResults: true,
        showImages: false,
        autofocus: true,
        resetStyles: false,
        translations: {
          placeholder: 'Search site',
          clear_search: 'Clear',
          load_more: 'Load more results',
          search_label: 'Search',
          filters_label: 'Filters',
          zero_results: 'No results found for "[SEARCH_TERM]"',
          many_results: '[COUNT] results found',
          one_result: '1 result found',
          alt_search: 'No results found for "[SEARCH_TERM]". Showing results for [DIFFERENT_TERM] instead',
          search_suggestion: 'No results found for "[SEARCH_TERM]". Try searching for:'
        }
      });
      focusInput();
    } catch (err) {
      console.error('PagefindUI initialization failed:', err);
    }
  }

  function focusInput() {
    setTimeout(function () {
      var input = modal ? modal.querySelector('.pagefind-ui__search-input') : null;
      if (input) {
        input.focus();
        input.select();
      }
    }, 60);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
