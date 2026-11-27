(function () {
  'use strict';

  var MAX_PAINTING_BLOCKS = 4;
  var MIN_ZOOM = 0.5;
  var MAX_ZOOM = 6.0;

  var modal = document.getElementById('site-lightbox');
  var backdrop = document.getElementById('site-lightbox-backdrop');
  var stage = document.getElementById('site-lightbox-stage');
  var imgEl = document.getElementById('site-lightbox-img');
  var closeBtn = document.getElementById('site-lightbox-close');
  var prevBtn = document.getElementById('site-lightbox-prev');
  var nextBtn = document.getElementById('site-lightbox-next');
  var zoomOutBtn = document.getElementById('site-lightbox-zoom-out');
  var zoomResetBtn = document.getElementById('site-lightbox-zoom-reset');
  var zoomInBtn = document.getElementById('site-lightbox-zoom-in');
  var statusEl = document.getElementById('site-lightbox-status');

  if (!modal || !stage || !imgEl) return;

  var state = {
    open: false,
    items: [],
    index: 0,
    zoom: 1,
    panX: 0,
    panY: 0,
    lastTrigger: null
  };

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function announce(msg) {
    if (statusEl) {
      statusEl.textContent = msg;
    }
  }

  function updateLayout() {
    if (!state.open) return;
    var item = state.items[state.index];
    if (!item) return;

    var rect = stage.getBoundingClientRect();
    var availW = Math.max(180, (rect.width || window.innerWidth) - 24);
    var availH = Math.max(180, (rect.height || window.innerHeight - 96) - 24);

    var baseW, baseH;
    if (item.pixelated && item.widthBlocks && item.heightBlocks) {
      /* Scale paintings proportionally to 4x4 max footprint so largest fill viewport cleanly */
      var pxPerBlock = Math.min(availW / MAX_PAINTING_BLOCKS, availH / MAX_PAINTING_BLOCKS);
      baseW = item.widthBlocks * pxPerBlock;
      baseH = item.heightBlocks * pxPerBlock;
    } else {
      var natW = imgEl.naturalWidth || 800;
      var natH = imgEl.naturalHeight || 600;
      var fitScale = Math.min(availW / natW, availH / natH);
      baseW = natW * fitScale;
      baseH = natH * fitScale;
    }

    var finalW = Math.round(baseW * state.zoom);
    var finalH = Math.round(baseH * state.zoom);

    imgEl.style.width = finalW + 'px';
    imgEl.style.height = finalH + 'px';
    imgEl.style.transform = 'translate3d(' + state.panX + 'px, ' + state.panY + 'px, 0)';
    imgEl.classList.toggle('is-pixelated', Boolean(item.pixelated));
    imgEl.classList.toggle('is-draggable', state.zoom > 1.01);

    if (zoomResetBtn) {
      zoomResetBtn.textContent = Math.round(state.zoom * 100) + '%';
    }
    if (prevBtn) prevBtn.disabled = state.items.length <= 1;
    if (nextBtn) nextBtn.disabled = state.items.length <= 1;
  }

  function showAt(index) {
    if (!state.items.length) return;
    var len = state.items.length;
    var idx = ((index % len) + len) % len;
    var item = state.items[idx];
    state.index = idx;
    state.zoom = 1;
    state.panX = 0;
    state.panY = 0;

    imgEl.src = item.src;
    imgEl.alt = item.alt || 'Image preview';
    updateLayout();
    announce((item.alt || 'Image') + ' (' + (idx + 1) + ' of ' + len + ')');
  }

  function openGallery(items, startIndex, triggerEl) {
    if (!Array.isArray(items) || !items.length) return;
    state.open = true;
    state.items = items;
    state.lastTrigger = triggerEl || document.activeElement;

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('has-modal-open');
    document.body.classList.add('has-modal-open');
    if (window.__cdA11y) {
      window.__cdA11y.setBackgroundInert(modal, true);
    }

    showAt(startIndex || 0);
    if (closeBtn) {
      setTimeout(function () { closeBtn.focus(); }, 20);
    }
  }

  function closeLightbox() {
    if (!state.open) return;
    state.open = false;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('has-modal-open');
    document.body.classList.remove('has-modal-open');
    if (window.__cdA11y) {
      window.__cdA11y.setBackgroundInert(modal, false);
    }
    var trig = state.lastTrigger;
    state.lastTrigger = null;
    if (trig && trig.offsetParent !== null) {
      trig.focus();
    }
  }

  imgEl.addEventListener('load', function () {
    if (state.open) updateLayout();
  });

  window.addEventListener('resize', function () {
    if (state.open) updateLayout();
  });

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (backdrop) backdrop.addEventListener('click', closeLightbox);
  if (prevBtn) prevBtn.addEventListener('click', function () { showAt(state.index - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { showAt(state.index + 1); });

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', function () {
      state.zoom = clamp(state.zoom * 1.25, MIN_ZOOM, MAX_ZOOM);
      updateLayout();
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', function () {
      state.zoom = clamp(state.zoom / 1.25, MIN_ZOOM, MAX_ZOOM);
      if (state.zoom <= 1) {
        state.panX = 0;
        state.panY = 0;
      }
      updateLayout();
    });
  }

  if (zoomResetBtn) {
    zoomResetBtn.addEventListener('click', function () {
      state.zoom = 1;
      state.panX = 0;
      state.panY = 0;
      updateLayout();
    });
  }

  /* Mousewheel zoom, two-finger pinch zoom, drag pan, backdrop click */
  (function setupGestures() {
    var pointers = new Map();
    var dragging = false;
    var sx = 0;
    var sy = 0;
    var spx = 0;
    var spy = 0;
    var pinchDist = 0;
    var pinchZoom = 1;

    function dist(a, b) {
      return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
    }

    stage.addEventListener('click', function (e) {
      if (e.target === stage && !dragging) {
        closeLightbox();
      }
    });

    stage.addEventListener('wheel', function (e) {
      e.preventDefault();
      var nextZoom = clamp(state.zoom * Math.exp(-e.deltaY * 0.0022), MIN_ZOOM, MAX_ZOOM);
      state.zoom = nextZoom;
      if (nextZoom <= 1) {
        state.panX = 0;
        state.panY = 0;
      }
      updateLayout();
    }, { passive: false });

    imgEl.addEventListener('pointerdown', function (e) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (imgEl.setPointerCapture) {
        try { imgEl.setPointerCapture(e.pointerId); } catch (err) {}
      }
      if (pointers.size === 2) {
        var pts = Array.from(pointers.values());
        pinchDist = Math.max(1, dist(pts[0], pts[1]));
        pinchZoom = state.zoom;
        dragging = false;
        return;
      }
      if (pointers.size === 1 && state.zoom > 1.01) {
        dragging = true;
        sx = e.clientX;
        sy = e.clientY;
        spx = state.panX;
        spy = state.panY;
        imgEl.classList.add('is-dragging');
      }
    });

    imgEl.addEventListener('pointermove', function (e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2 && pinchDist > 0) {
        var pts = Array.from(pointers.values());
        state.zoom = clamp(pinchZoom * (dist(pts[0], pts[1]) / pinchDist), MIN_ZOOM, MAX_ZOOM);
        updateLayout();
        return;
      }
      if (dragging) {
        state.panX = spx + (e.clientX - sx);
        state.panY = spy + (e.clientY - sy);
        updateLayout();
      }
    });

    function endPointer(e) {
      pointers.delete(e.pointerId);
      if (imgEl.releasePointerCapture) {
        try { imgEl.releasePointerCapture(e.pointerId); } catch (err) {}
      }
      if (pointers.size < 2) pinchDist = 0;
      if (pointers.size === 0) {
        dragging = false;
        imgEl.classList.remove('is-dragging');
      }
    }

    imgEl.addEventListener('pointerup', endPointer);
    imgEl.addEventListener('pointercancel', endPointer);
  })();

  document.addEventListener('keydown', function (e) {
    if (!state.open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeLightbox();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      showAt(state.index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      showAt(state.index + 1);
    } else if (e.key === 'Tab' && window.__cdA11y) {
      window.__cdA11y.trapTab(e, modal);
    }
  });

  /* Sitewide click delegation for content images */
  var CONTENT_IMG_SELECTOR = '.home-hero-image img, .wp-block-post-featured-image img, .entry-content img, .wiki-cover-banner, .wiki-article-body img';

  function isPreviewableImg(el) {
    if (!el || el.tagName !== 'IMG') return false;
    if (!el.matches || !el.matches(CONTENT_IMG_SELECTOR)) return false;
    var anchor = el.closest('a[href]');
    if (anchor) {
      var href = anchor.getAttribute('href') || '';
      if (!/\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(href)) {
        return false;
      }
    }
    return true;
  }

  function gatherContentImages() {
    var root = document.getElementById('main-content') || document.body;
    var nodes = Array.prototype.slice.call(root.querySelectorAll(CONTENT_IMG_SELECTOR));
    return nodes.filter(isPreviewableImg);
  }

  function openForImg(img) {
    var all = gatherContentImages();
    var idx = Math.max(0, all.indexOf(img));
    var items = all.map(function (node) {
      return {
        src: node.currentSrc || node.src,
        alt: node.alt || '',
        pixelated: false
      };
    });
    openGallery(items, idx, img);
  }

  function enhancePreviewableImages() {
    gatherContentImages().forEach(function (node) {
      if (node.dataset && node.dataset.lightboxReady) return;
      if (node.dataset) node.dataset.lightboxReady = '1';
      if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '0');
      if (!node.hasAttribute('role')) node.setAttribute('role', 'button');
      if (!node.hasAttribute('aria-label')) {
        node.setAttribute('aria-label', (node.alt ? 'Preview image: ' + node.alt : 'Preview image'));
      }
    });
  }

  document.addEventListener('click', function (e) {
    var img = e.target && e.target.closest ? e.target.closest('img') : null;
    if (!isPreviewableImg(img)) return;
    e.preventDefault();
    openForImg(img);
  });

  document.addEventListener('keydown', function (e) {
    if (state.open) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var img = e.target && e.target.tagName === 'IMG' ? e.target : null;
    if (!isPreviewableImg(img)) return;
    e.preventDefault();
    openForImg(img);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhancePreviewableImages);
  } else {
    enhancePreviewableImages();
  }
  document.addEventListener('wiki:navigated', enhancePreviewableImages);

  window.__cdLightbox = {
    openGallery: openGallery,
    close: closeLightbox
  };
})();
