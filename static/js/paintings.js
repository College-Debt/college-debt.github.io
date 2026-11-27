(function () {
  'use strict';

  var MAX_BATCH = 10;
  var BASE_PX_PER_BLOCK = 16;
  var MAX_BLOCKS = 4;
  var ALLOWED_SCALES = [1, 2, 4, 8];
  var MAX_CROP_ZOOM = 5.0;
  var DEFAULT_AUTHOR = 'College Debt SMP';
  var WORKER_BASE = '/api/paintings';
  var IDENTITY_URL = '/cdn-cgi/access/get-identity';
  var GITHUB_CONTENTS_URL = 'https://api.github.com/repos/College-Debt/resource-pack/contents/data-pack/data/cdsmp/painting_variant?ref=main';
  var GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/College-Debt/resource-pack/main';

  /* Frame presets sampled from vanilla 1.21.4 painting border rings */
  var FRAME_PRESETS = [
    {
      id: 'dark-oak',
      label: 'Dark Oak (Classic)',
      colors: ['#3e190c', '#43200e', '#4b2212', '#4c2b0e', '#4e3010']
    },
    {
      id: 'warm-amber',
      label: 'Warm Amber',
      colors: ['#87291b', '#954421', '#a55d23', '#a9601e', '#b0802f']
    },
    {
      id: 'crimson',
      label: 'Crimson',
      colors: ['#521e1c', '#63292f', '#783b39', '#844048', '#8b4942']
    },
    {
      id: 'deep-walnut',
      label: 'Deep Walnut',
      colors: ['#260f0f', '#281510', '#2f1616', '#34181c', '#371d1a']
    },
    {
      id: 'charcoal',
      label: 'Charcoal',
      colors: ['#0f0a09', '#100c0a', '#120e0b', '#130e0c', '#15110d']
    },
    {
      id: 'slate-teal',
      label: 'Slate Teal',
      colors: ['#193232', '#244141', '#2a4848', '#335353', '#3f6161']
    },
    {
      id: 'frameless',
      label: 'Frameless',
      colors: null
    }
  ];

  var FRAME_MAP = {};
  FRAME_PRESETS.forEach(function (preset) {
    FRAME_MAP[preset.id] = preset;
  });

  var state = {
    nextId: 1,
    staged: [],
    identity: {
      checked: false,
      authenticated: false,
      email: '',
      name: '',
      isAdmin: false,
      anomalyReason: ''
    },
    gallery: {
      loaded: false,
      loading: false,
      readOnlyFallback: false,
      items: [],
      filtered: [],
      editingSlug: null,
      confirmDeleteSlug: null
    },
    busy: false
  };

  /* --- DOM Handles --- */
  var els = {
    sessionCallout: document.getElementById('pt-session-callout'),
    srStatus: document.getElementById('pt-sr-status'),
    tabStudio: document.getElementById('pt-tab-studio'),
    tabGallery: document.getElementById('pt-tab-gallery'),
    panelStudio: document.getElementById('pt-panel-studio'),
    panelGallery: document.getElementById('pt-panel-gallery'),
    stagedCount: document.getElementById('pt-staged-count'),
    galleryCount: document.getElementById('pt-gallery-count'),
    dropzone: document.getElementById('pt-dropzone'),
    fileInput: document.getElementById('pt-file-input'),
    studioGrid: document.getElementById('pt-studio-grid'),
    publishCard: document.getElementById('pt-publish-card'),
    publishSummary: document.getElementById('pt-publish-summary'),
    downloadAllBtn: document.getElementById('pt-download-all-png'),
    publishBtn: document.getElementById('pt-publish-btn'),
    studioBanner: document.getElementById('pt-studio-banner'),
    gallerySearch: document.getElementById('pt-gallery-search'),
    gallerySizeFilter: document.getElementById('pt-gallery-size-filter'),
    galleryRefresh: document.getElementById('pt-gallery-refresh'),
    galleryBanner: document.getElementById('pt-gallery-banner'),
    galleryGrid: document.getElementById('pt-gallery-grid')
  };

  if (!els.dropzone || !els.studioGrid) return;

  /* --- Utilities --- */
  function announce(msg) {
    if (els.srStatus) {
      els.srStatus.textContent = msg;
    }
  }

  function showBanner(bannerEl, kind, htmlContent) {
    if (!bannerEl) return;
    bannerEl.className = 'pt-banner' + (kind ? ' is-' + kind : '');
    bannerEl.innerHTML = htmlContent;
    bannerEl.hidden = false;
  }

  function hideBanner(bannerEl) {
    if (!bannerEl) return;
    bannerEl.hidden = true;
    bannerEl.innerHTML = '';
  }

  function restoreFocusById(id) {
    if (!id) return;
    var el = document.getElementById(id);
    if (el && typeof el.focus === 'function') {
      el.focus();
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeSlug(raw) {
    var s = String(raw || '').trim().toLowerCase().replace(/\s+/g, '_');
    s = s.replace(/[^a-z0-9_.\-]/g, '');
    s = s.replace(/^[_\.\-]+|[_\.\-]+$/g, '');
    return s || 'unnamed';
  }

  function cleanTitleFromFilename(filename) {
    var stem = String(filename || '').replace(/\.[^.]+$/, '');
    stem = stem.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    return stem || 'Untitled Painting';
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function isLocalHost() {
    var h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function pickInitialBlockSize(imgW, imgH) {
    var ar = imgW / imgH;
    var best = { w: 2, h: 2, score: Infinity };
    var targetWidthPx = Math.min(256, Math.max(64, imgW));

    for (var w = 1; w <= MAX_BLOCKS; w++) {
      for (var h = 1; h <= MAX_BLOCKS; h++) {
        var diff = Math.abs(ar - w / h);
        var tie = Math.abs(w * 64 - targetWidthPx) * 0.0001 + (w + h) * 0.00001;
        var score = diff + tie;
        if (score < best.score) {
          best = { w: w, h: h, score: score };
        }
      }
    }
    return { w: best.w, h: best.h };
  }

  function predictSlugsForStaged() {
    var used = new Set();
    state.gallery.items.forEach(function (it) {
      if (it && it.slug) used.add(it.slug);
    });
    return state.staged.map(function (item) {
      var base = sanitizeSlug(item.title || 'unnamed');
      var candidate = base;
      var counter = 1;
      while (used.has(candidate)) {
        candidate = base + '-' + counter;
        counter += 1;
      }
      used.add(candidate);
      return {
        predicted: candidate,
        collided: candidate !== base
      };
    });
  }

  /* --- Full 2D Crop + Zoom Math --- */
  function computeCropWindow(item) {
    var hasFrame = Boolean(FRAME_MAP[item.frame] && FRAME_MAP[item.frame].colors);
    var border = hasFrame ? item.scale : 0;
    var stw = item.blocksW * BASE_PX_PER_BLOCK * item.scale;
    var sth = item.blocksH * BASE_PX_PER_BLOCK * item.scale;
    var iw = stw - border * 2;
    var ih = sth - border * 2;

    var srcW = item.img.naturalWidth || item.img.width;
    var srcH = item.img.naturalHeight || item.img.height;
    var ar = srcW / srcH;
    var tar = iw / ih;

    var baseSw = ar > tar ? srcH * tar : srcW;
    var baseSh = ar > tar ? srcH : srcW / tar;
    var zoom = clamp(item.zoom || 1, 1, MAX_CROP_ZOOM);
    var sw = baseSw / zoom;
    var sh = baseSh / zoom;
    var slackX = Math.max(0, srcW - sw);
    var slackY = Math.max(0, srcH - sh);

    return {
      stw: stw,
      sth: sth,
      border: border,
      iw: iw,
      ih: ih,
      srcW: srcW,
      srcH: srcH,
      sw: sw,
      sh: sh,
      sx: slackX * clamp(item.panX, 0, 1),
      sy: slackY * clamp(item.panY, 0, 1),
      canPanX: slackX > 0.5,
      canPanY: slackY > 0.5
    };
  }

  /* Keep preview visual size constant across 1x/2x/4x/8x scales */
  function applyPreviewDisplaySize(canvas, item) {
    var maxW = 288;
    var maxH = 190;
    var dispScale = Math.min(maxW / item.blocksW, maxH / item.blocksH);
    canvas.style.width = Math.round(item.blocksW * dispScale) + 'px';
    canvas.style.height = Math.round(item.blocksH * dispScale) + 'px';
  }

  /* --- Canvas Frame + Crop Renderer --- */
  function drawVanillaFrame(ctx, tw, th, scale, preset) {
    if (!preset || !preset.colors) return;
    var palette = preset.colors;
    for (var gy = 0; gy < th; gy++) {
      for (var gx = 0; gx < tw; gx++) {
        var onTop = gy === 0;
        var onBottom = gy === th - 1;
        var onLeft = gx === 0;
        var onRight = gx === tw - 1;
        if (!onTop && !onBottom && !onLeft && !onRight) continue;

        var h = ((gx * 73856093) ^ (gy * 19349663) ^ 0x9e3779b9) >>> 0;
        var idx = h % palette.length;
        if ((onTop || onLeft) && !onBottom && !onRight && idx < palette.length - 1 && (h & 3) !== 0) {
          idx += 1;
        } else if ((onBottom || onRight) && !onTop && !onLeft && idx > 0 && (h & 3) !== 0) {
          idx -= 1;
        }
        ctx.fillStyle = palette[idx];
        ctx.fillRect(gx * scale, gy * scale, scale, scale);
      }
    }
  }

  function renderPaintingToCanvas(item, targetCanvas) {
    var tw = item.blocksW * BASE_PX_PER_BLOCK;
    var th = item.blocksH * BASE_PX_PER_BLOCK;
    var scale = item.scale;
    var win = computeCropWindow(item);
    var preset = FRAME_MAP[item.frame] || FRAME_MAP['dark-oak'];

    var cvs = targetCanvas || document.createElement('canvas');
    if (cvs.width !== win.stw) cvs.width = win.stw;
    if (cvs.height !== win.sth) cvs.height = win.sth;

    var ctx = cvs.getContext('2d');
    ctx.clearRect(0, 0, win.stw, win.sth);

    if (win.border > 0) {
      drawVanillaFrame(ctx, tw, th, scale, preset);
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(win.border, win.border, win.iw, win.ih);
    ctx.clip();
    ctx.imageSmoothingEnabled = !item.pixelArt;
    if (!item.pixelArt && ctx.imageSmoothingQuality) {
      ctx.imageSmoothingQuality = 'high';
    }
    ctx.drawImage(item.img, win.sx, win.sy, win.sw, win.sh, win.border, win.border, win.iw, win.ih);
    ctx.restore();

    return cvs;
  }

  function canvasToPngBlob(cvs) {
    return new Promise(function (resolve, reject) {
      cvs.toBlob(function (blob) {
        if (!blob) {
          reject(new Error('Failed to encode PNG'));
        } else {
          resolve(blob);
        }
      }, 'image/png');
    });
  }

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = String(reader.result || '');
        var comma = result.indexOf(',');
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = function () {
        reject(new Error('Failed to read rendered PNG blob'));
      };
      reader.readAsDataURL(blob);
    });
  }

  /* --- Tabs Controller (WAI-ARIA) --- */
  function setActiveTab(tabName) {
    var isStudio = tabName === 'studio';
    els.tabStudio.classList.toggle('is-active', isStudio);
    els.tabGallery.classList.toggle('is-active', !isStudio);
    els.tabStudio.setAttribute('aria-selected', isStudio ? 'true' : 'false');
    els.tabGallery.setAttribute('aria-selected', !isStudio ? 'true' : 'false');
    els.tabStudio.tabIndex = isStudio ? 0 : -1;
    els.tabGallery.tabIndex = !isStudio ? 0 : -1;
    els.panelStudio.hidden = !isStudio;
    els.panelGallery.hidden = isStudio;

    if (!isStudio && !state.gallery.loaded && !state.gallery.loading) {
      loadGallery(false);
    }
  }

  [els.tabStudio, els.tabGallery].forEach(function (tabBtn) {
    tabBtn.addEventListener('click', function () {
      setActiveTab(tabBtn === els.tabStudio ? 'studio' : 'gallery');
    });
    tabBtn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        var next = tabBtn === els.tabStudio ? els.tabGallery : els.tabStudio;
        if (e.key === 'Home') next = els.tabStudio;
        if (e.key === 'End') next = els.tabGallery;
        next.focus();
        setActiveTab(next === els.tabStudio ? 'studio' : 'gallery');
      }
    });
  });

  /* --- Conditional Session Callout (Hidden When Operating Normally) --- */
  function updateSessionCallout() {
    if (!els.sessionCallout) return;
    if (!state.identity.checked && !state.identity.anomalyReason) {
      els.sessionCallout.hidden = true;
      return;
    }

    if (state.identity.authenticated && !state.identity.anomalyReason) {
      els.sessionCallout.hidden = true;
      els.sessionCallout.innerHTML = '';
      return;
    }

    var msg = state.identity.anomalyReason ||
      (isLocalHost()
        ? 'Local preview mode: Login protection is inactive here, so publishing is unavailable.'
        : 'Your login session could not be verified. Please refresh the page to sign back in before publishing or editing paintings.');

    els.sessionCallout.innerHTML = '<span class="sr-only">Warning: </span>' + escapeHtml(msg);
    els.sessionCallout.hidden = false;
  }

  async function detectSsoIdentity() {
    try {
      var res = await fetch(IDENTITY_URL, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      var ct = (res.headers.get('content-type') || '').toLowerCase();
      if (res.ok && ct.indexOf('application/json') !== -1) {
        var data = await res.json();
        if (data && (data.email || data.name)) {
          state.identity.authenticated = true;
          state.identity.email = data.email || '';
          state.identity.name = data.name || (data.email ? data.email.split('@')[0] : '');
          state.identity.anomalyReason = '';
        }
      } else if (res.status === 401 || res.status === 403) {
        state.identity.anomalyReason = 'Your login session expired. Please refresh the page to sign back in.';
      }
    } catch (err) {
      if (!isLocalHost()) {
        state.identity.anomalyReason = 'Unable to verify your login session right now. Please refresh the page or check your connection.';
      }
    } finally {
      state.identity.checked = true;
      updateSessionCallout();
    }
  }

  /* --- Sequential Image Import --- */
  function loadImageFile(file) {
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onerror = function () { resolve(null); };
      reader.onload = function () {
        var img = new Image();
        img.onload = function () { resolve(img); };
        img.onerror = function () { resolve(null); };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function addFiles(fileList) {
    hideBanner(els.studioBanner);
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;

    var remaining = MAX_BATCH - state.staged.length;
    if (remaining <= 0) {
      showBanner(els.studioBanner, 'warning', 'Upload limit reached (' + MAX_BATCH + ' paintings). Publish or remove an item before adding more.');
      announce('Upload limit of ' + MAX_BATCH + ' paintings reached.');
      return;
    }

    var toAdd = files.slice(0, remaining);
    var skippedNames = [];
    var addedCount = 0;

    for (var i = 0; i < toAdd.length; i++) {
      var file = toAdd[i];
      if (!file.type || file.type.indexOf('image/') !== 0) {
        if (!/\.(png|jpe?g|webp|gif)$/i.test(file.name)) {
          skippedNames.push(file.name);
          continue;
        }
      }
      var img = await loadImageFile(file);
      if (!img) {
        skippedNames.push(file.name);
        continue;
      }

      var size = pickInitialBlockSize(img.naturalWidth || img.width, img.naturalHeight || img.height);
      var authorDefault = (state.identity.authenticated && state.identity.name)
        ? state.identity.name
        : DEFAULT_AUTHOR;

      state.staged.push({
        id: state.nextId++,
        filename: file.name,
        title: cleanTitleFromFilename(file.name),
        author: authorDefault,
        img: img,
        blocksW: size.w,
        blocksH: size.h,
        scale: 4,
        frame: 'dark-oak',
        panX: 0.5,
        panY: 0.5,
        zoom: 1.0,
        pixelArt: false
      });
      addedCount += 1;
    }

    var warnings = [];
    if (files.length > remaining) {
      warnings.push('Only added ' + remaining + ' of ' + files.length + ' files (max ' + MAX_BATCH + ' per upload).');
    }
    if (skippedNames.length) {
      warnings.push('Skipped unreadable or unsupported file(s): ' + skippedNames.map(escapeHtml).join(', ') + '.');
    }
    if (warnings.length) {
      showBanner(els.studioBanner, 'warning', warnings.join(' '));
    }

    renderStudio();
    if (addedCount > 0) {
      announce('Added ' + addedCount + ' painting' + (addedCount === 1 ? '' : 's') + '.');
    }
  }

  /* --- Studio UI Rendering --- */
  function updateHeaderCounts() {
    if (els.stagedCount) {
      els.stagedCount.textContent = String(state.staged.length);
      els.stagedCount.hidden = state.staged.length === 0;
    }
    if (els.galleryCount) {
      els.galleryCount.textContent = String(state.gallery.items.length);
      els.galleryCount.hidden = state.gallery.items.length === 0;
    }
  }

  function updatePublishSummary() {
    var count = state.staged.length;
    els.publishCard.hidden = count === 0;
    updateHeaderCounts();

    if (!count) return;
    els.publishSummary.textContent = count + ' painting' + (count === 1 ? '' : 's') + ' ready to publish';
  }

  function syncCropControlsUI(item, canvas, sliderZoom, valZoom, sliderX, valX, sliderY, valY) {
    var win = computeCropWindow(item);
    if (sliderZoom) sliderZoom.value = String(Math.round(item.zoom * 100));
    if (valZoom) valZoom.textContent = item.zoom.toFixed(1) + '×';
    if (sliderX) {
      sliderX.disabled = !win.canPanX;
      sliderX.value = String(Math.round(item.panX * 100));
    }
    if (valX) valX.textContent = win.canPanX ? Math.round(item.panX * 100) + '%' : '—';
    if (sliderY) {
      sliderY.disabled = !win.canPanY;
      sliderY.value = String(Math.round(item.panY * 100));
    }
    if (valY) valY.textContent = win.canPanY ? Math.round(item.panY * 100) + '%' : '—';
    canvas.classList.toggle('is-pannable', win.canPanX || win.canPanY);
  }

  function attachCanvasInteractions(stage, canvas, item, controls) {
    var activePointers = new Map();
    var dragging = false;
    var startX = 0;
    var startY = 0;
    var startPanX = 0;
    var startPanY = 0;
    var pinchStartDist = 0;
    var pinchStartZoom = 1;

    function refreshAll() {
      syncCropControlsUI(
        item, canvas,
        controls.sliderZoom, controls.valZoom,
        controls.sliderX, controls.valX,
        controls.sliderY, controls.valY
      );
      renderPaintingToCanvas(item, canvas);
    }

    function distance(p1, p2) {
      var dx = p1.x - p2.x;
      var dy = p1.y - p2.y;
      return Math.sqrt(dx * dx + dy * dy);
    }

    canvas.addEventListener('pointerdown', function (e) {
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (canvas.setPointerCapture) {
        try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      }

      if (activePointers.size === 2) {
        var pts = Array.from(activePointers.values());
        pinchStartDist = Math.max(1, distance(pts[0], pts[1]));
        pinchStartZoom = item.zoom || 1;
        dragging = false;
        canvas.classList.remove('is-dragging');
        return;
      }

      var win = computeCropWindow(item);
      if (activePointers.size === 1 && (win.canPanX || win.canPanY)) {
        dragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startPanX = item.panX;
        startPanY = item.panY;
        canvas.classList.add('is-dragging');
      }
    });

    canvas.addEventListener('pointermove', function (e) {
      if (!activePointers.has(e.pointerId)) return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size === 2) {
        var pts = Array.from(activePointers.values());
        var dist = distance(pts[0], pts[1]);
        if (pinchStartDist > 0) {
          item.zoom = clamp(pinchStartZoom * (dist / pinchStartDist), 1, MAX_CROP_ZOOM);
          refreshAll();
        }
        return;
      }

      if (!dragging) return;
      var rect = canvas.getBoundingClientRect();
      var win = computeCropWindow(item);
      var zoomFactor = Math.max(1, item.zoom || 1);

      if (win.canPanX && rect.width > 0) {
        var dx = ((e.clientX - startX) / rect.width) / (zoomFactor * 0.75);
        item.panX = clamp(startPanX - dx, 0, 1);
      }
      if (win.canPanY && rect.height > 0) {
        var dy = ((e.clientY - startY) / rect.height) / (zoomFactor * 0.75);
        item.panY = clamp(startPanY - dy, 0, 1);
      }
      refreshAll();
    });

    function endPointer(e) {
      activePointers.delete(e.pointerId);
      if (canvas.releasePointerCapture) {
        try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
      }
      if (activePointers.size < 2) {
        pinchStartDist = 0;
      }
      if (activePointers.size === 0) {
        dragging = false;
        canvas.classList.remove('is-dragging');
      }
    }

    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);

    stage.addEventListener('wheel', function (e) {
      e.preventDefault();
      var factor = Math.exp(-e.deltaY * 0.0022);
      item.zoom = clamp((item.zoom || 1) * factor, 1, MAX_CROP_ZOOM);
      refreshAll();
    }, { passive: false });
  }

  function createDimensionStepper(idPrefix, labelText, value, onChange) {
    var wrap = document.createElement('div');
    var lblId = idPrefix + '-lbl';
    var valId = idPrefix + '-val';
    var lbl = document.createElement('span');
    lbl.className = 'pt-field-label';
    lbl.id = lblId;
    lbl.textContent = labelText;

    var box = document.createElement('div');
    box.className = 'pt-stepper';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-labelledby', lblId);

    var decId = idPrefix + '-dec';
    var incId = idPrefix + '-inc';

    var decBtn = document.createElement('button');
    decBtn.type = 'button';
    decBtn.id = decId;
    decBtn.className = 'pt-stepper-btn';
    decBtn.textContent = '\u2212';
    decBtn.setAttribute('aria-label', 'Decrease ' + labelText.toLowerCase());
    decBtn.disabled = value <= 1;
    decBtn.addEventListener('click', function () {
      if (value > 1) {
        var nextVal = value - 1;
        onChange(nextVal, nextVal <= 1 ? incId : decId);
      }
    });

    var valEl = document.createElement('span');
    valEl.id = valId;
    valEl.className = 'pt-stepper-val';
    valEl.textContent = String(value);

    var incBtn = document.createElement('button');
    incBtn.type = 'button';
    incBtn.id = incId;
    incBtn.className = 'pt-stepper-btn';
    incBtn.textContent = '+';
    incBtn.setAttribute('aria-label', 'Increase ' + labelText.toLowerCase());
    incBtn.disabled = value >= MAX_BLOCKS;
    incBtn.addEventListener('click', function () {
      if (value < MAX_BLOCKS) {
        var nextVal = value + 1;
        onChange(nextVal, nextVal >= MAX_BLOCKS ? decId : incId);
      }
    });

    box.appendChild(decBtn);
    box.appendChild(valEl);
    box.appendChild(incBtn);
    wrap.appendChild(lbl);
    wrap.appendChild(box);
    return wrap;
  }

  function renderStudio(focusTargetId) {
    els.studioGrid.innerHTML = '';
    var slugMeta = predictSlugsForStaged();

    state.staged.forEach(function (item, idx) {
      var meta = slugMeta[idx];
      var card = document.createElement('article');
      card.className = 'pt-card';
      card.setAttribute('aria-label', 'Painting editor: ' + item.title);

      /* --- Preview Stage --- */
      var stage = document.createElement('div');
      stage.className = 'pt-preview-stage';

      var canvas = document.createElement('canvas');
      canvas.className = 'pt-preview-canvas';
      canvas.title = 'Scroll or pinch to zoom; drag to pan crop';
      applyPreviewDisplaySize(canvas, item);
      stage.appendChild(canvas);

      var rmBtn = document.createElement('button');
      rmBtn.type = 'button';
      rmBtn.className = 'pt-card-remove';
      rmBtn.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<line x1="18" y1="6" x2="6" y2="18"></line>' +
        '<line x1="6" y1="6" x2="18" y2="18"></line>' +
        '</svg>';
      rmBtn.setAttribute('aria-label', 'Remove ' + item.title);
      rmBtn.title = 'Remove painting';
      rmBtn.addEventListener('click', function () {
        state.staged.splice(idx, 1);
        renderStudio();
        announce('Removed ' + item.title + '.');
      });
      stage.appendChild(rmBtn);

      var pxW = item.blocksW * BASE_PX_PER_BLOCK * item.scale;
      var pxH = item.blocksH * BASE_PX_PER_BLOCK * item.scale;
      var srcW = item.img.naturalWidth || item.img.width;
      var srcH = item.img.naturalHeight || item.img.height;

      var chipRow = document.createElement('div');
      chipRow.className = 'pt-chip-row';

      var sizeChip = document.createElement('span');
      sizeChip.className = 'pt-chip';
      sizeChip.textContent = item.blocksW + '×' + item.blocksH + ' blocks · ' + pxW + '×' + pxH + ' px';
      chipRow.appendChild(sizeChip);

      if (srcW < pxW || srcH < pxH) {
        var warnChip = document.createElement('span');
        warnChip.className = 'pt-chip pt-chip-warn';
        warnChip.textContent = 'Source ' + srcW + '×' + srcH + ' (upscaled)';
        chipRow.appendChild(warnChip);
      } else {
        var scaleChip = document.createElement('span');
        scaleChip.className = 'pt-chip';
        scaleChip.textContent = item.scale + '× detail';
        chipRow.appendChild(scaleChip);
      }
      stage.appendChild(chipRow);
      card.appendChild(stage);

      /* --- Full 2D Crop + Zoom Box --- */
      var cropBox = document.createElement('div');
      cropBox.className = 'pt-crop-box';

      var rowZoom = document.createElement('div');
      rowZoom.className = 'pt-crop-row';
      var lblZoom = document.createElement('label');
      lblZoom.className = 'pt-crop-axis';
      lblZoom.htmlFor = 'pt-zoom-' + item.id;
      lblZoom.textContent = 'Zoom';
      var sliderZoom = document.createElement('input');
      sliderZoom.type = 'range';
      sliderZoom.id = 'pt-zoom-' + item.id;
      sliderZoom.className = 'pt-range';
      sliderZoom.min = '100';
      sliderZoom.max = String(Math.round(MAX_CROP_ZOOM * 100));
      var valZoom = document.createElement('span');
      valZoom.className = 'pt-crop-val';
      rowZoom.appendChild(lblZoom);
      rowZoom.appendChild(sliderZoom);
      rowZoom.appendChild(valZoom);
      cropBox.appendChild(rowZoom);

      var rowX = document.createElement('div');
      rowX.className = 'pt-crop-row';
      var lblX = document.createElement('label');
      lblX.className = 'pt-crop-axis';
      lblX.htmlFor = 'pt-panx-' + item.id;
      lblX.textContent = 'Crop X';
      var sliderX = document.createElement('input');
      sliderX.type = 'range';
      sliderX.id = 'pt-panx-' + item.id;
      sliderX.className = 'pt-range';
      sliderX.min = '0';
      sliderX.max = '100';
      var valX = document.createElement('span');
      valX.className = 'pt-crop-val';
      rowX.appendChild(lblX);
      rowX.appendChild(sliderX);
      rowX.appendChild(valX);
      cropBox.appendChild(rowX);

      var rowY = document.createElement('div');
      rowY.className = 'pt-crop-row';
      var lblY = document.createElement('label');
      lblY.className = 'pt-crop-axis';
      lblY.htmlFor = 'pt-pany-' + item.id;
      lblY.textContent = 'Crop Y';
      var sliderY = document.createElement('input');
      sliderY.type = 'range';
      sliderY.id = 'pt-pany-' + item.id;
      sliderY.className = 'pt-range';
      sliderY.min = '0';
      sliderY.max = '100';
      var valY = document.createElement('span');
      valY.className = 'pt-crop-val';
      rowY.appendChild(lblY);
      rowY.appendChild(sliderY);
      rowY.appendChild(valY);
      cropBox.appendChild(rowY);

      var cropFooter = document.createElement('div');
      cropFooter.className = 'pt-crop-footer';
      var cropTip = document.createElement('span');
      cropTip.className = 'pt-crop-tip';
      cropTip.textContent = 'Scroll or pinch preview to zoom · drag to pan';
      var resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'pt-btn pt-btn-xs';
      resetBtn.textContent = 'Reset crop';
      resetBtn.addEventListener('click', function () {
        item.zoom = 1.0;
        item.panX = 0.5;
        item.panY = 0.5;
        syncCropControlsUI(item, canvas, sliderZoom, valZoom, sliderX, valX, sliderY, valY);
        renderPaintingToCanvas(item, canvas);
      });
      cropFooter.appendChild(cropTip);
      cropFooter.appendChild(resetBtn);
      cropBox.appendChild(cropFooter);
      card.appendChild(cropBox);

      sliderZoom.addEventListener('input', function () {
        item.zoom = Number(sliderZoom.value) / 100;
        syncCropControlsUI(item, canvas, sliderZoom, valZoom, sliderX, valX, sliderY, valY);
        renderPaintingToCanvas(item, canvas);
      });
      sliderX.addEventListener('input', function () {
        item.panX = Number(sliderX.value) / 100;
        syncCropControlsUI(item, canvas, sliderZoom, valZoom, sliderX, valX, sliderY, valY);
        renderPaintingToCanvas(item, canvas);
      });
      sliderY.addEventListener('input', function () {
        item.panY = Number(sliderY.value) / 100;
        syncCropControlsUI(item, canvas, sliderZoom, valZoom, sliderX, valX, sliderY, valY);
        renderPaintingToCanvas(item, canvas);
      });

      var ctrlBundle = {
        sliderZoom: sliderZoom,
        valZoom: valZoom,
        sliderX: sliderX,
        valX: valX,
        sliderY: sliderY,
        valY: valY
      };
      syncCropControlsUI(item, canvas, sliderZoom, valZoom, sliderX, valX, sliderY, valY);
      attachCanvasInteractions(stage, canvas, item, ctrlBundle);

      /* --- Title + Author Inputs --- */
      var metaGrid = document.createElement('div');
      metaGrid.className = 'pt-field-grid';

      var titleWrap = document.createElement('div');
      var titleLbl = document.createElement('label');
      titleLbl.className = 'pt-field-label';
      titleLbl.htmlFor = 'pt-title-' + item.id;
      titleLbl.textContent = 'Painting Title';
      var titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.id = 'pt-title-' + item.id;
      titleInput.className = 'pt-input';
      titleInput.maxLength = 64;
      titleInput.value = item.title;
      titleInput.placeholder = 'Enter display title';

      var slugPreview = document.createElement('div');
      slugPreview.className = 'pt-slug-preview';
      slugPreview.innerHTML = '<span>ID:</span> <code>cdsmp:' + escapeHtml(meta.predicted) + '</code>' +
        (meta.collided ? ' <span class="pt-slug-collision">(auto-suffixed)</span>' : '');

      titleInput.addEventListener('input', function () {
        item.title = titleInput.value;
        var updatedSlugs = predictSlugsForStaged();
        var cards = els.studioGrid.querySelectorAll('.pt-card');
        updatedSlugs.forEach(function (m, cIdx) {
          var box = cards[cIdx] && cards[cIdx].querySelector('.pt-slug-preview');
          if (box) {
            box.innerHTML = '<span>ID:</span> <code>cdsmp:' + escapeHtml(m.predicted) + '</code>' +
              (m.collided ? ' <span class="pt-slug-collision">(auto-suffixed)</span>' : '');
          }
        });
      });

      titleWrap.appendChild(titleLbl);
      titleWrap.appendChild(titleInput);
      titleWrap.appendChild(slugPreview);

      var authorWrap = document.createElement('div');
      var authorLbl = document.createElement('label');
      authorLbl.className = 'pt-field-label';
      authorLbl.htmlFor = 'pt-author-' + item.id;
      authorLbl.textContent = 'Author';
      var authorInput = document.createElement('input');
      authorInput.type = 'text';
      authorInput.id = 'pt-author-' + item.id;
      authorInput.className = 'pt-input';
      authorInput.maxLength = 64;
      authorInput.value = item.author;
      authorInput.placeholder = DEFAULT_AUTHOR;
      authorInput.addEventListener('input', function () {
        item.author = authorInput.value;
      });
      authorWrap.appendChild(authorLbl);
      authorWrap.appendChild(authorInput);

      metaGrid.appendChild(titleWrap);
      metaGrid.appendChild(authorWrap);
      card.appendChild(metaGrid);

      /* --- Left Half: Size Block (Stacked W/H Steppers + Square 4x4 Grid) | Right Half: Detail Scale --- */
      var sizeRow = document.createElement('div');
      sizeRow.className = 'pt-size-row';

      var sizeBlock = document.createElement('div');
      sizeBlock.className = 'pt-size-block';

      var sizeStack = document.createElement('div');
      sizeStack.className = 'pt-size-stack';

      sizeStack.appendChild(createDimensionStepper('pt-w-' + item.id, 'Width', item.blocksW, function (nextW, btnId) {
        item.blocksW = nextW;
        announce('Width set to ' + nextW + ' blocks');
        renderStudio(btnId);
      }));

      sizeStack.appendChild(createDimensionStepper('pt-h-' + item.id, 'Height', item.blocksH, function (nextH, btnId) {
        item.blocksH = nextH;
        announce('Height set to ' + nextH + ' blocks');
        renderStudio(btnId);
      }));

      sizeBlock.appendChild(sizeStack);

      /* Strict square 4x4 grid matching stepper stack height inside left half */
      var gridWrap = document.createElement('div');
      gridWrap.className = 'pt-grid-picker-wrap';
      var gridLbl = document.createElement('span');
      gridLbl.className = 'pt-field-label';
      gridLbl.textContent = 'Size Grid';
      var gridPicker = document.createElement('div');
      gridPicker.className = 'pt-grid-picker';
      gridPicker.setAttribute('role', 'group');
      gridPicker.setAttribute('aria-label', 'Quick 1x1 to 4x4 block size grid');

      var cellEls = [];
      for (var gy = 1; gy <= MAX_BLOCKS; gy++) {
        for (var gx = 1; gx <= MAX_BLOCKS; gx++) {
          (function (cw, ch) {
            var cellId = 'pt-cell-' + item.id + '-' + cw + 'x' + ch;
            var cell = document.createElement('button');
            cell.type = 'button';
            cell.id = cellId;
            cell.className = 'pt-grid-cell' + (cw <= item.blocksW && ch <= item.blocksH ? ' is-selected' : '');
            cell.setAttribute('aria-label', cw + ' by ' + ch + ' blocks');
            cell.title = cw + '×' + ch + ' blocks';
            cell.addEventListener('mouseenter', function () {
              cellEls.forEach(function (entry) {
                entry.el.classList.toggle('is-hovered', entry.w <= cw && entry.h <= ch);
              });
            });
            cell.addEventListener('click', function () {
              item.blocksW = cw;
              item.blocksH = ch;
              announce('Size set to ' + cw + ' by ' + ch + ' blocks');
              renderStudio(cellId);
            });
            gridPicker.appendChild(cell);
            cellEls.push({ el: cell, w: cw, h: ch });
          })(gx, gy);
        }
      }
      gridPicker.addEventListener('mouseleave', function () {
        cellEls.forEach(function (entry) {
          entry.el.classList.remove('is-hovered');
        });
      });

      gridWrap.appendChild(gridLbl);
      gridWrap.appendChild(gridPicker);
      sizeBlock.appendChild(gridWrap);
      sizeRow.appendChild(sizeBlock);

      /* Right half: Detail resolution scale dropdown */
      var scaleWrap = document.createElement('div');
      scaleWrap.className = 'pt-scale-col';
      var scaleLbl = document.createElement('label');
      scaleLbl.className = 'pt-field-label';
      scaleLbl.htmlFor = 'pt-scale-' + item.id;
      scaleLbl.textContent = 'Detail Scale (max 8×)';
      var scaleSel = document.createElement('select');
      scaleSel.id = 'pt-scale-' + item.id;
      scaleSel.className = 'pt-select';
      ALLOWED_SCALES.forEach(function (sc) {
        var optS = document.createElement('option');
        optS.value = String(sc);
        optS.textContent = sc + '× (' + (item.blocksW * BASE_PX_PER_BLOCK * sc) + '×' + (item.blocksH * BASE_PX_PER_BLOCK * sc) + ' px)';
        optS.selected = item.scale === sc;
        scaleSel.appendChild(optS);
      });
      scaleSel.addEventListener('change', function () {
        item.scale = Number(scaleSel.value);
        renderStudio(scaleSel.id);
      });
      scaleWrap.appendChild(scaleLbl);
      scaleWrap.appendChild(scaleSel);
      sizeRow.appendChild(scaleWrap);

      card.appendChild(sizeRow);

      /* --- Frame Preset Selector (Frameless + 6 Vanilla Frame Families) --- */
      var frameWrap = document.createElement('div');
      var frameHeader = document.createElement('div');
      frameHeader.className = 'pt-frame-header';
      var frameLbl = document.createElement('span');
      frameLbl.className = 'pt-field-label';
      frameLbl.id = 'pt-frame-lbl-' + item.id;
      frameLbl.textContent = 'Frame Style';
      var frameActive = document.createElement('span');
      frameActive.className = 'pt-frame-active-name';
      frameActive.textContent = (FRAME_MAP[item.frame] || FRAME_MAP['dark-oak']).label;
      frameHeader.appendChild(frameLbl);
      frameHeader.appendChild(frameActive);

      var swatches = document.createElement('div');
      swatches.className = 'pt-frame-swatches';
      swatches.setAttribute('role', 'radiogroup');
      swatches.setAttribute('aria-labelledby', frameLbl.id);

      FRAME_PRESETS.forEach(function (preset) {
        var swId = 'pt-frame-' + item.id + '-' + preset.id;
        var swBtn = document.createElement('button');
        swBtn.type = 'button';
        swBtn.id = swId;
        swBtn.className = 'pt-frame-swatch' + (item.frame === preset.id ? ' is-selected' : '');
        swBtn.dataset.frame = preset.id;
        swBtn.setAttribute('role', 'radio');
        swBtn.setAttribute('aria-checked', item.frame === preset.id ? 'true' : 'false');
        swBtn.setAttribute('aria-label', preset.label);
        swBtn.title = preset.label;
        swBtn.innerHTML = '<span class="pt-frame-swatch-preview" aria-hidden="true"></span>';
        swBtn.addEventListener('click', function () {
          item.frame = preset.id;
          renderStudio(swId);
        });
        swatches.appendChild(swBtn);
      });

      frameWrap.appendChild(frameHeader);
      frameWrap.appendChild(swatches);
      card.appendChild(frameWrap);

      /* --- Card Footer: Nearest-Neighbor Toggle + Download Single PNG --- */
      var cardFooter = document.createElement('div');
      cardFooter.className = 'pt-card-footer';

      var pixelLabel = document.createElement('label');
      pixelLabel.className = 'pt-check-label';
      pixelLabel.title = 'Turns off smoothing so small pixel art keeps crisp pixel edges instead of blurring when scaled up.';
      var pixelCb = document.createElement('input');
      pixelCb.type = 'checkbox';
      pixelCb.checked = item.pixelArt;
      pixelCb.addEventListener('change', function () {
        item.pixelArt = pixelCb.checked;
        renderPaintingToCanvas(item, canvas);
      });
      pixelLabel.appendChild(pixelCb);
      pixelLabel.appendChild(document.createTextNode('Sharp pixel-art scaling'));

      var dlSingle = document.createElement('button');
      dlSingle.type = 'button';
      dlSingle.className = 'pt-btn pt-btn-xs';
      dlSingle.textContent = 'Download PNG';
      dlSingle.addEventListener('click', async function () {
        var outCvs = renderPaintingToCanvas(item);
        var blob = await canvasToPngBlob(outCvs);
        triggerBlobDownload(blob, (meta.predicted || 'painting') + '.png');
      });

      cardFooter.appendChild(pixelLabel);
      cardFooter.appendChild(dlSingle);
      card.appendChild(cardFooter);

      els.studioGrid.appendChild(card);
      renderPaintingToCanvas(item, canvas);
    });

    updatePublishSummary();
    restoreFocusById(focusTargetId);
  }

  function triggerBlobDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  /* --- Dropzone Events --- */
  els.dropzone.addEventListener('click', function () {
    els.fileInput.click();
  });

  els.dropzone.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      els.fileInput.click();
    }
  });

  els.dropzone.addEventListener('dragover', function (e) {
    e.preventDefault();
    els.dropzone.classList.add('is-dragover');
  });

  els.dropzone.addEventListener('dragleave', function () {
    els.dropzone.classList.remove('is-dragover');
  });

  els.dropzone.addEventListener('drop', function (e) {
    e.preventDefault();
    els.dropzone.classList.remove('is-dragover');
    addFiles(e.dataTransfer && e.dataTransfer.files);
  });

  els.fileInput.addEventListener('change', function () {
    addFiles(els.fileInput.files);
    els.fileInput.value = '';
  });

  if (els.downloadAllBtn) {
    els.downloadAllBtn.addEventListener('click', async function () {
      if (!state.staged.length) return;
      var slugs = predictSlugsForStaged();
      for (var i = 0; i < state.staged.length; i++) {
        var cvs = renderPaintingToCanvas(state.staged[i]);
        var blob = await canvasToPngBlob(cvs);
        triggerBlobDownload(blob, slugs[i].predicted + '.png');
      }
    });
  }

  /* --- Publish to Cloudflare Worker --- */
  if (els.publishBtn) {
    els.publishBtn.addEventListener('click', async function () {
      if (state.busy || !state.staged.length) return;
      hideBanner(els.studioBanner);
      state.busy = true;
      els.publishBtn.disabled = true;
      var btnSpan = els.publishBtn.querySelector('span');
      var origLabel = btnSpan ? btnSpan.textContent : 'Publish Paintings';

      try {
        if (btnSpan) btnSpan.textContent = 'Preparing\u2026';
        showBanner(els.studioBanner, '', 'Preparing ' + state.staged.length + ' painting(s)\u2026');

        var payloadItems = [];
        var totalBytes = 0;
        for (var i = 0; i < state.staged.length; i++) {
          var item = state.staged[i];
          var cvs = renderPaintingToCanvas(item);
          var blob = await canvasToPngBlob(cvs);
          if (blob.size > 2 * 1024 * 1024) {
            throw new Error('"' + item.title + '" image file is too large (' + formatBytes(blob.size) + '). Try lowering its detail scale.');
          }
          totalBytes += blob.size;
          var b64 = await blobToBase64(blob);
          payloadItems.push({
            title: (item.title || '').trim() || cleanTitleFromFilename(item.filename),
            author: (item.author || '').trim() || DEFAULT_AUTHOR,
            width: item.blocksW,
            height: item.blocksH,
            scale: item.scale,
            filenameHint: sanitizeSlug(item.title || item.filename),
            pngBase64: b64
          });
        }

        if (totalBytes > 8 * 1024 * 1024) {
          throw new Error('Total upload size (' + formatBytes(totalBytes) + ') exceeds 8 MB. Try publishing in two smaller groups.');
        }

        if (btnSpan) btnSpan.textContent = 'Publishing\u2026';
        showBanner(els.studioBanner, '', 'Saving your paintings to the server pack\u2026');

        var res = await fetch(WORKER_BASE, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({ items: payloadItems })
        });

        var ct = (res.headers.get('content-type') || '').toLowerCase();
        if (res.status === 401 || res.status === 403 || (res.redirected && ct.indexOf('text/html') !== -1)) {
          state.identity.authenticated = false;
          state.identity.anomalyReason = 'Your login session expired. Please refresh this page to sign back in.';
          updateSessionCallout();
          throw new Error('Your login session expired. Please refresh this page to sign back in.');
        }
        if (res.status === 404 || ct.indexOf('application/json') === -1) {
          throw new Error('Publishing is not active yet. You can still use "Download PNGs" to save your images.');
        }

        var result = await res.json();
        if (!res.ok) {
          throw new Error(result && result.error ? result.error : 'Server error (' + res.status + ')');
        }

        var committed = Array.isArray(result.paintings) ? result.paintings : [];
        var listHtml = committed.map(function (p) {
          return '<li><strong>' + escapeHtml(p.title) + '</strong> by ' + escapeHtml(p.author) +
            ' (' + p.width + '&times;' + p.height + ')</li>';
        }).join('');

        showBanner(
          els.studioBanner,
          'success',
          '<strong>Published ' + committed.length + ' painting' + (committed.length === 1 ? '' : 's') + '!</strong> ' +
          'The server pack is updating, and you can edit or remove them anytime in the Server Gallery.' +
          (listHtml ? '<ul class="pt-banner-list">' + listHtml + '</ul>' : '')
        );
        announce('Published ' + committed.length + ' paintings.');

        state.staged = [];
        renderStudio();
        state.gallery.loaded = false;
        loadGallery(true);
      } catch (err) {
        showBanner(els.studioBanner, 'error', escapeHtml(err.message || 'Failed to publish paintings.'));
        announce('Publish failed: ' + (err.message || 'Unknown error'));
      } finally {
        state.busy = false;
        els.publishBtn.disabled = false;
        if (btnSpan) btnSpan.textContent = origLabel;
      }
    });
  }

  /* --- Server Gallery (Worker First, Read-Only GitHub Fallback) --- */
  function componentText(val, fallback) {
    if (typeof val === 'string') return val;
    if (val && typeof val === 'object' && typeof val.text === 'string') return val.text;
    return fallback || '';
  }

  async function fetchGalleryFromGitHubFallback() {
    var listRes = await fetch(GITHUB_CONTENTS_URL, { headers: { Accept: 'application/vnd.github+json' } });
    if (!listRes.ok) {
      throw new Error('Could not load paintings (' + listRes.status + ')');
    }
    var entries = await listRes.json();
    var jsonFiles = (Array.isArray(entries) ? entries : []).filter(function (f) {
      return f && f.name && /\.json$/i.test(f.name);
    });

    var items = await Promise.all(jsonFiles.map(async function (entry) {
      var slug = entry.name.replace(/\.json$/i, '');
      var rawJsonUrl = entry.download_url || (GITHUB_RAW_BASE + '/data-pack/data/cdsmp/painting_variant/' + entry.name);
      var vRes = await fetch(rawJsonUrl);
      var vData = vRes.ok ? await vRes.json() : {};
      return {
        slug: slug,
        title: componentText(vData.title, slug),
        author: componentText(vData.author, DEFAULT_AUTHOR),
        width: Number(vData.width) || 1,
        height: Number(vData.height) || 1,
        textureUrl: GITHUB_RAW_BASE + '/resource-pack/assets/cdsmp/textures/painting/' + slug + '.png',
        submittedBy: null,
        canEdit: false
      };
    }));

    items.sort(function (a, b) {
      return a.title.localeCompare(b.title);
    });
    return items;
  }

  async function loadGallery(silentRefresh) {
    if (state.gallery.loading) return;
    state.gallery.loading = true;
    if (!silentRefresh) {
      els.galleryGrid.innerHTML = '<div class="pt-empty-state">Loading server paintings&hellip;</div>';
    }
    hideBanner(els.galleryBanner);

    try {
      var usedFallback = false;
      var items = [];

      try {
        var res = await fetch(WORKER_BASE, {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' }
        });
        var ct = (res.headers.get('content-type') || '').toLowerCase();
        if (res.ok && ct.indexOf('application/json') !== -1) {
          var data = await res.json();
          if (data && data.viewer) {
            state.identity.checked = true;
            state.identity.authenticated = Boolean(data.viewer.email || data.viewer.name);
            state.identity.email = data.viewer.email || state.identity.email;
            state.identity.name = data.viewer.name || state.identity.name;
            state.identity.isAdmin = Boolean(data.viewer.isAdmin);
            if (state.identity.authenticated) {
              state.identity.anomalyReason = '';
            }
            updateSessionCallout();
          }
          items = Array.isArray(data.paintings) ? data.paintings : [];
        } else {
          usedFallback = true;
          items = await fetchGalleryFromGitHubFallback();
        }
      } catch (workerErr) {
        usedFallback = true;
        items = await fetchGalleryFromGitHubFallback();
      }

      state.gallery.items = items;
      state.gallery.loaded = true;
      state.gallery.readOnlyFallback = usedFallback;

      if (usedFallback) {
        showBanner(
          els.galleryBanner,
          '',
          'Showing current server paintings in read-only mode.'
        );
      }

      populateGallerySizeFilter(items);
      renderGallery();
      renderStudio();
    } catch (err) {
      els.galleryGrid.innerHTML = '';
      showBanner(els.galleryBanner, 'error', escapeHtml(err.message || 'Unable to load server paintings.'));
    } finally {
      state.gallery.loading = false;
    }
  }

  function populateGallerySizeFilter(items) {
    if (!els.gallerySizeFilter) return;
    var prev = els.gallerySizeFilter.value || 'all';
    var sizes = [];
    var seen = new Set();
    items.forEach(function (it) {
      var label = it.width + 'x' + it.height;
      if (!seen.has(label)) {
        seen.add(label);
        sizes.push(label);
      }
    });
    sizes.sort();

    els.gallerySizeFilter.innerHTML = '<option value="all">All sizes</option>';
    sizes.forEach(function (sz) {
      var opt = document.createElement('option');
      opt.value = sz;
      opt.textContent = sz.replace('x', '\u00d7') + ' blocks';
      els.gallerySizeFilter.appendChild(opt);
    });
    els.gallerySizeFilter.value = seen.has(prev) ? prev : 'all';
  }

  async function savePaintingEdit(slug, title, author) {
    hideBanner(els.galleryBanner);
    var res = await fetch(WORKER_BASE + '/' + encodeURIComponent(slug), {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ title: title, author: author })
    });
    var ct = (res.headers.get('content-type') || '').toLowerCase();
    if (res.status === 401 || res.status === 403) {
      var errBody = ct.indexOf('application/json') !== -1 ? await res.json() : null;
      throw new Error((errBody && errBody.error) || 'You do not have permission to edit this painting.');
    }
    if (!res.ok) {
      var bad = ct.indexOf('application/json') !== -1 ? await res.json() : null;
      throw new Error((bad && bad.error) || 'Failed to save changes (' + res.status + ')');
    }
    state.gallery.editingSlug = null;
    showBanner(els.galleryBanner, 'success', 'Saved changes. The server pack will update shortly.');
    await loadGallery(true);
  }

  async function deletePainting(slug) {
    hideBanner(els.galleryBanner);
    var res = await fetch(WORKER_BASE + '/' + encodeURIComponent(slug), {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    });
    var ct = (res.headers.get('content-type') || '').toLowerCase();
    if (res.status === 401 || res.status === 403) {
      var errBody = ct.indexOf('application/json') !== -1 ? await res.json() : null;
      throw new Error((errBody && errBody.error) || 'You do not have permission to delete this painting.');
    }
    if (!res.ok) {
      var bad = ct.indexOf('application/json') !== -1 ? await res.json() : null;
      throw new Error((bad && bad.error) || 'Failed to delete painting (' + res.status + ')');
    }
    state.gallery.confirmDeleteSlug = null;
    showBanner(els.galleryBanner, 'success', 'Painting removed. The server pack will update shortly.');
    await loadGallery(true);
  }

  function renderGallery(focusTargetId) {
    updateHeaderCounts();
    els.galleryGrid.innerHTML = '';

    var query = (els.gallerySearch && els.gallerySearch.value.trim().toLowerCase()) || '';
    var sizeFilter = (els.gallerySizeFilter && els.gallerySizeFilter.value) || 'all';

    var filtered = state.gallery.items.filter(function (it) {
      if (sizeFilter !== 'all' && (it.width + 'x' + it.height) !== sizeFilter) {
        return false;
      }
      if (!query) return true;
      return (
        (it.title || '').toLowerCase().indexOf(query) !== -1 ||
        (it.author || '').toLowerCase().indexOf(query) !== -1
      );
    });
    state.gallery.filtered = filtered;

    if (!filtered.length) {
      els.galleryGrid.innerHTML = '<div class="pt-empty-state">No paintings match the current filter.</div>';
      return;
    }

    filtered.forEach(function (item, fIdx) {
      var card = document.createElement('article');
      card.className = 'pt-gallery-card';

      var thumbBtn = document.createElement('button');
      thumbBtn.type = 'button';
      thumbBtn.className = 'pt-gallery-thumb-btn';
      thumbBtn.setAttribute('aria-label', 'Preview ' + item.title + ' (' + item.width + '×' + item.height + ' blocks)');
      thumbBtn.title = 'Click to preview';

      var img = document.createElement('img');
      img.className = 'pt-gallery-thumb';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = item.textureUrl;
      img.alt = item.title + ' (' + item.width + '×' + item.height + ' painting)';
      img.style.width = ((item.width / MAX_BLOCKS) * 100) + '%';
      img.style.height = 'auto';
      img.style.aspectRatio = item.width + ' / ' + item.height;
      thumbBtn.appendChild(img);
      thumbBtn.addEventListener('click', function () {
        if (window.__cdLightbox) {
          var lbItems = state.gallery.filtered.map(function (it) {
            return {
              src: it.textureUrl,
              alt: it.title + ' by ' + it.author + ' (' + it.width + '×' + it.height + ')',
              widthBlocks: it.width,
              heightBlocks: it.height,
              pixelated: true
            };
          });
          window.__cdLightbox.openGallery(lbItems, fIdx, thumbBtn);
        }
      });
      card.appendChild(thumbBtn);

      var infoRow = document.createElement('div');
      infoRow.className = 'pt-gallery-info-row';
      infoRow.innerHTML =
        '<div>' +
          '<h2 class="pt-gallery-title">' + escapeHtml(item.title) + '</h2>' +
          '<p class="pt-gallery-meta">by ' + escapeHtml(item.author) + '</p>' +
        '</div>' +
        '<span class="pt-gallery-size-badge">' + item.width + '&times;' + item.height + '</span>';
      card.appendChild(infoRow);

      /* Inline Edit Panel (only if Worker marked canEdit = true) */
      if (item.canEdit && state.gallery.editingSlug === item.slug) {
        var editForm = document.createElement('form');
        editForm.className = 'pt-inline-edit';

        var tGroup = document.createElement('div');
        var tLbl = document.createElement('label');
        tLbl.className = 'pt-field-label';
        tLbl.htmlFor = 'pt-edit-title-' + item.slug;
        tLbl.textContent = 'Title';
        var tIn = document.createElement('input');
        tIn.type = 'text';
        tIn.className = 'pt-input pt-input-compact';
        tIn.id = 'pt-edit-title-' + item.slug;
        tIn.value = item.title;
        tIn.maxLength = 64;
        tIn.required = true;
        tGroup.appendChild(tLbl);
        tGroup.appendChild(tIn);

        var aGroup = document.createElement('div');
        var aLbl = document.createElement('label');
        aLbl.className = 'pt-field-label';
        aLbl.htmlFor = 'pt-edit-author-' + item.slug;
        aLbl.textContent = 'Author';
        var aIn = document.createElement('input');
        aIn.type = 'text';
        aIn.className = 'pt-input pt-input-compact';
        aIn.id = 'pt-edit-author-' + item.slug;
        aIn.value = item.author;
        aIn.maxLength = 64;
        aIn.required = true;
        aGroup.appendChild(aLbl);
        aGroup.appendChild(aIn);

        editForm.appendChild(tGroup);
        editForm.appendChild(aGroup);

        var editBtns = document.createElement('div');
        editBtns.className = 'pt-inline-btn-row';
        var saveBtn = document.createElement('button');
        saveBtn.type = 'submit';
        saveBtn.className = 'pt-btn pt-btn-primary pt-btn-xs';
        saveBtn.textContent = 'Save';
        var cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'pt-btn pt-btn-xs';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', function () {
          state.gallery.editingSlug = null;
          renderGallery('pt-edit-btn-' + item.slug);
        });
        editBtns.appendChild(saveBtn);
        editBtns.appendChild(cancelBtn);
        editForm.appendChild(editBtns);
        editForm.addEventListener('submit', async function (e) {
          e.preventDefault();
          saveBtn.disabled = true;
          try {
            await savePaintingEdit(item.slug, tIn.value.trim(), aIn.value.trim());
          } catch (err) {
            saveBtn.disabled = false;
            showBanner(els.galleryBanner, 'error', escapeHtml(err.message));
          }
        });
        card.appendChild(editForm);
      }

      /* Inline Delete Confirmation */
      if (item.canEdit && state.gallery.confirmDeleteSlug === item.slug) {
        var delBox = document.createElement('div');
        delBox.className = 'pt-inline-confirm';
        delBox.innerHTML = '<p>Remove <strong>' + escapeHtml(item.title) + '</strong> from the server pack?</p>';
        var delBtns = document.createElement('div');
        delBtns.className = 'pt-inline-btn-row';
        var confirmBtn = document.createElement('button');
        confirmBtn.type = 'button';
        confirmBtn.id = 'pt-confirm-del-' + item.slug;
        confirmBtn.className = 'pt-btn pt-btn-danger pt-btn-xs';
        confirmBtn.textContent = 'Confirm delete';
        confirmBtn.addEventListener('click', async function () {
          confirmBtn.disabled = true;
          try {
            await deletePainting(item.slug);
          } catch (err) {
            confirmBtn.disabled = false;
            showBanner(els.galleryBanner, 'error', escapeHtml(err.message));
          }
        });
        var cancelDel = document.createElement('button');
        cancelDel.type = 'button';
        cancelDel.className = 'pt-btn pt-btn-xs';
        cancelDel.textContent = 'Cancel';
        cancelDel.addEventListener('click', function () {
          state.gallery.confirmDeleteSlug = null;
          renderGallery('pt-del-btn-' + item.slug);
        });
        delBtns.appendChild(confirmBtn);
        delBtns.appendChild(cancelDel);
        delBox.appendChild(delBtns);
        card.appendChild(delBox);
      }

      if (item.canEdit) {
        var actions = document.createElement('div');
        actions.className = 'pt-gallery-actions';

        var editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.id = 'pt-edit-btn-' + item.slug;
        editBtn.className = 'pt-btn pt-btn-xs';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', function () {
          state.gallery.confirmDeleteSlug = null;
          state.gallery.editingSlug = item.slug;
          renderGallery('pt-edit-title-' + item.slug);
        });
        actions.appendChild(editBtn);

        var delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.id = 'pt-del-btn-' + item.slug;
        delBtn.className = 'pt-btn pt-btn-xs pt-btn-danger-outline';
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', function () {
          state.gallery.editingSlug = null;
          state.gallery.confirmDeleteSlug = item.slug;
          renderGallery('pt-confirm-del-' + item.slug);
        });
        actions.appendChild(delBtn);

        card.appendChild(actions);
      }

      els.galleryGrid.appendChild(card);
    });

    restoreFocusById(focusTargetId);
  }

  if (els.gallerySearch) {
    els.gallerySearch.addEventListener('input', function () { renderGallery(); });
  }
  if (els.gallerySizeFilter) {
    els.gallerySizeFilter.addEventListener('change', function () { renderGallery(); });
  }
  if (els.galleryRefresh) {
    els.galleryRefresh.addEventListener('click', function () {
      state.gallery.loaded = false;
      loadGallery(false);
    });
  }

  /* --- Initial Boot --- */
  detectSsoIdentity();
  loadGallery(true);
})();
