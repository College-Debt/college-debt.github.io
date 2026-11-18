(function () {
  'use strict';

  var modal = null;
  var backdrop = null;
  var fallbackWrap = null;
  var fallbackInput = null;
  var fallbackClear = null;
  var loadingNotice = null;
  var searchContainer = null;
  var pagefindInstance = null;
  var isAssetsLoading = false;
  var pagefindLoaded = false;
  var selectedIndex = -1;

  function init() {
    modal = document.getElementById('site-search-modal');
    if (!modal) return;

    backdrop = modal.querySelector('.site-search-backdrop');
    fallbackWrap = document.getElementById('site-search-fallback-wrap');
    fallbackInput = modal.querySelector('.site-search-fallback-input');
    fallbackClear = modal.querySelector('.site-search-fallback-clear');
    loadingNotice = document.getElementById('site-search-loading-notice');
    searchContainer = document.getElementById('site-search-container');

    // Attach click listeners to all search toggle buttons
    document.querySelectorAll('.site-search-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openSearch();
      });
    });

    if (backdrop) {
      backdrop.addEventListener('click', function (e) {
        e.preventDefault();
        closeSearch();
      });
    }

    // Fallback input event handlers
    if (fallbackInput) {
      fallbackInput.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Escape' && e.key !== 'Enter' && e.key !== 'Tab') {
          handleTyping();
        }
      });

      fallbackInput.addEventListener('input', function () {
        handleTyping();
        var val = fallbackInput.value.trim();
        if (fallbackClear) {
          fallbackClear.style.display = val.length > 0 ? 'flex' : 'none';
        }
        // Show loading message ONLY when user types while index is still loading
        if (!pagefindLoaded && loadingNotice) {
          loadingNotice.style.display = val.length > 0 ? 'flex' : 'none';
        }
      });

      if (fallbackClear) {
        fallbackClear.addEventListener('click', function (e) {
          e.preventDefault();
          fallbackInput.value = '';
          fallbackClear.style.display = 'none';
          if (loadingNotice) loadingNotice.style.display = 'none';
          fallbackInput.focus();
        });
      }
    }

    function handleTyping() {
      if (!modal.classList.contains('is-typing')) {
        modal.classList.add('is-typing');
      }
      modal.classList.remove('using-keyboard');
      cachedResultItems = null;
    }

    // Track when Pagefind input has search query for active results divider & reset selection
    modal.addEventListener('input', function (e) {
      if (e.target && e.target.classList.contains('pagefind-ui__search-input')) {
        handleTyping();
        var hasQuery = e.target.value.trim().length > 0;
        modal.classList.toggle('has-search-query', hasQuery);
      }
    });

    // Close search modal when clicking search results
    modal.addEventListener('click', function (e) {
      if (e.target === modal || e.target.classList.contains('site-search-backdrop')) {
        closeSearch();
        return;
      }
      var closeBtn = e.target.closest('.site-search-close-btn');
      if (closeBtn) {
        closeSearch();
        return;
      }
      var item = e.target.closest('.pagefind-ui__result-parent, .pagefind-ui__result-nested');
      if (item) {
        var link = item.querySelector('.pagefind-ui__result-link');
        if (link) {
          closeSearch();
          link.click();
          return;
        }
      }
      var directLink = e.target.closest('a');
      if (directLink && directLink.href) {
        closeSearch();
      }
    });

    // Mouse movement: reveal cursor, exit typing mode, track hovered item
    var lastMouseX = -1;
    var lastMouseY = -1;

    modal.addEventListener('mousemove', function (e) {
      // Ignore synthetic events where mouse coordinates haven't changed
      if (e.clientX === lastMouseX && e.clientY === lastMouseY) return;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;

      // Restore cursor visibility as soon as mouse physically moves
      if (modal.classList.contains('is-typing')) {
        modal.classList.remove('is-typing');
      }

      if (modal.classList.contains('using-keyboard')) {
        modal.classList.remove('using-keyboard');
      }

      var item = e.target.closest('.pagefind-ui__result-parent, .pagefind-ui__result-nested');
      if (item) {
        var items = getResultItems();
        var idx = items.indexOf(item);
        if (idx !== -1 && idx !== selectedIndex) {
          updateSelection(idx, false);
        }
      }
    });

    // Global keyboard shortcuts and modal navigation
    window.addEventListener('keydown', function (e) {
      // Track typing in Pagefind search input to hide cursor immediately
      if (e.target && e.target.classList.contains('pagefind-ui__search-input')) {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Escape' && e.key !== 'Enter' && e.key !== 'Tab') {
          handleTyping();
        }
      }
      // ⌘K or Ctrl+K to toggle search
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

      // Arrow keys and Enter when search overlay is open
      if (modal.classList.contains('is-open')) {
        var items = getResultItems();

        if (e.key === 'ArrowDown') {
          if (items.length > 0) {
            e.preventDefault();
            modal.classList.add('using-keyboard');
            modal.classList.remove('is-typing');
            var nextIndex = selectedIndex + 1;
            if (nextIndex >= items.length) {
              nextIndex = items.length - 1; // clamp to bottom, do not cycle back to top
            }
            updateSelection(nextIndex, true);
          }
          return;
        }

        if (e.key === 'ArrowUp') {
          if (items.length > 0) {
            e.preventDefault();
            modal.classList.add('using-keyboard');
            modal.classList.remove('is-typing');
            var prevIndex = selectedIndex - 1;
            if (prevIndex < 0) {
              prevIndex = 0; // clamp to top, do not cycle back to bottom
            }
            updateSelection(prevIndex, true);
          }
          return;
        }

        if (e.key === 'Enter') {
          if (items.length > 0) {
            e.preventDefault();
            var targetItem = (selectedIndex >= 0 && selectedIndex < items.length) ? items[selectedIndex] : items[0];
            if (targetItem) {
              var link = targetItem.querySelector('.pagefind-ui__result-link');
              if (link) {
                closeSearch();
                link.click();
              }
            }
          }
          return;
        }
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

    // Proactively preload search index in background on idle so search opens instantly
    if ('requestIdleCallback' in window) {
      requestIdleCallback(function () {
        loadPagefindAndInit();
      }, { timeout: 2500 });
    } else {
      setTimeout(loadPagefindAndInit, 250);
    }
  }

  var cachedResultItems = null;

  function ensureResultItemsStructure() {
    if (!modal) return;
    var inners = modal.querySelectorAll('.pagefind-ui__result-inner');
    var changed = false;
    for (var i = 0; i < inners.length; i++) {
      var inner = inners[i];
      if (inner.querySelector('.pagefind-ui__result-parent')) continue;
      var title = null;
      var excerpt = null;
      var children = inner.children;
      for (var j = 0; j < children.length; j++) {
        var ch = children[j];
        if (!title && ch.classList.contains('pagefind-ui__result-title')) {
          title = ch;
        } else if (!excerpt && ch.classList.contains('pagefind-ui__result-excerpt')) {
          excerpt = ch;
        }
      }
      if (title) {
        var parentWrap = document.createElement('div');
        parentWrap.className = 'pagefind-ui__result-parent';
        inner.insertBefore(parentWrap, title);
        parentWrap.appendChild(title);
        if (excerpt && excerpt.parentNode === inner) {
          parentWrap.appendChild(excerpt);
        }
        changed = true;
      }
    }
    if (changed) {
      cachedResultItems = null;
    }
  }

  function getResultItems() {
    if (!modal) return [];
    if (cachedResultItems && cachedResultItems.length > 0 && cachedResultItems[0].isConnected) {
      return cachedResultItems;
    }
    ensureResultItemsStructure();
    cachedResultItems = Array.from(modal.querySelectorAll('.pagefind-ui__result-parent, .pagefind-ui__result-nested'));
    return cachedResultItems;
  }

  function clearKeyboardSelection() {
    selectedIndex = -1;
    if (!modal) return;
    var selected = modal.querySelectorAll('.is-selected');
    for (var i = 0; i < selected.length; i++) {
      selected[i].classList.remove('is-selected');
      selected[i].removeAttribute('aria-selected');
    }
  }

  function updateSelection(newIndex, scroll) {
    var items = getResultItems();
    if (items.length === 0) {
      selectedIndex = -1;
      return;
    }

    items.forEach(function (item) {
      item.classList.remove('is-selected');
      item.removeAttribute('aria-selected');
    });

    if (newIndex >= 0 && newIndex < items.length) {
      selectedIndex = newIndex;
      var current = items[selectedIndex];
      current.classList.add('is-selected');
      current.setAttribute('aria-selected', 'true');

      if (scroll) {
        current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    } else {
      selectedIndex = -1;
    }
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

    cachedResultItems = null;
    loadPagefindAndInit();
    var items = getResultItems();
    if (items.length > 0) {
      updateSelection(0, false);
    } else {
      clearKeyboardSelection();
    }
    focusInput();
  }

  function closeSearch() {
    if (!modal) return;
    modal.classList.remove('is-open', 'has-search-query', 'is-typing', 'using-keyboard');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('has-search-open');
    document.documentElement.classList.remove('has-search-open');
    clearKeyboardSelection();
    cachedResultItems = null;
  }

  function loadPagefindAndInit() {
    if (pagefindInstance && pagefindLoaded) {
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
        if (loadingNotice) {
          loadingNotice.innerHTML = '<span>Search index could not be loaded.</span>';
          loadingNotice.style.display = 'flex';
        }
      };
      document.head.appendChild(script);
    } else {
      setupPagefindUI();
    }
  }

  function setupPagefindUI() {
    if (!searchContainer || pagefindLoaded) return;
    searchContainer.innerHTML = '';

    try {
      pagefindInstance = new PagefindUI({
        element: '#site-search-container',
        showSubResults: true,
        showImages: false,
        autofocus: false,
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

      pagefindLoaded = true;

      // Observe search container to ensure structure and highlight first result
      if (window.MutationObserver) {
        var resultsObserver = new MutationObserver(function () {
          cachedResultItems = null;
          ensureResultItemsStructure();
          var items = getResultItems();
          if (items.length > 0) {
            // Highlight the first entry by default upon showing results
            if (selectedIndex < 0 || selectedIndex >= items.length) {
              updateSelection(0, false);
            }
          } else {
            clearKeyboardSelection();
          }
        });
        resultsObserver.observe(searchContainer, { childList: true, subtree: true });
      }

      // Swap from fallback search bar to Pagefind container
      var pendingQuery = fallbackInput ? fallbackInput.value.trim() : '';
      if (fallbackWrap) fallbackWrap.style.display = 'none';
      if (loadingNotice) loadingNotice.style.display = 'none';
      searchContainer.style.display = 'flex';

      var pfInput = modal.querySelector('.pagefind-ui__search-input');
      if (pfInput && pendingQuery) {
        pfInput.value = pendingQuery;
        modal.classList.add('has-search-query');
        pagefindInstance.triggerSearch(pendingQuery);
      }

      focusInput();
    } catch (err) {
      console.error('PagefindUI initialization failed:', err);
    }
  }

  function focusInput() {
    setTimeout(function () {
      if (!modal || !modal.classList.contains('is-open')) return;
      if (pagefindLoaded) {
        var input = modal.querySelector('.pagefind-ui__search-input');
        if (input) {
          input.focus();
          var len = input.value.length;
          input.setSelectionRange(len, len);
        }
      } else if (fallbackInput) {
        fallbackInput.focus();
        var len = fallbackInput.value.length;
        fallbackInput.setSelectionRange(len, len);
      }
    }, 40);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
