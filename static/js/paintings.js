(function () {
  'use strict';

  var MAX_BATCH = 10;
  var BASE_PX_PER_BLOCK = 16;
  var MAX_BLOCKS = 4;
  var ALLOWED_SCALES = [1, 2, 4, 8];
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
      authenticated: false,
      email: '',
      name: '',
      isAdmin: false,
      source: 'none'
    },
    gallery: {
      loaded: false,
      loading: false,
      readOnlyFallback: false,
      items: [],
      editingSlug: null,
      confirmDeleteSlug: null
    },
    busy: false
  };

  /* --- DOM Handles --- */
  var els = {
    ssoPill: document.getElementById('pt-sso-pill'),
    ssoText: document.getElementById('pt-sso-text'),
    srStatus: document.getElementById('pt-sr-status'),
    tabStudio: document.getElementById('pt-tab-studio'),
    tabGallery: document.getElementById('pt-tab-gallery'),
    panelStudio: document.getElementById('pt-panel-studio'),
    panelGallery: document.getElementById('pt-panel-gallery'),
    stagedCount: document.getElementById('pt-staged-count'),
    galleryCount: document.getElementById('pt-gallery-count'),
    dropzone: document.getElementById('pt-dropzone'),
    fileInput: document.getElementById('pt-file-input'),
    batchBar: document.getElementById('pt-batch-bar'),
    batchAuthor: document.getElementById('pt-batch-author'),
    useSsoAuthor: document.getElementById('pt-use-sso-author'),
    applyAuthorAll: document.getElementById('pt-apply-author-all'),
    batchFrame: document.getElementById('pt-batch-frame'),
    applyFrameAll: document.getElementById('pt-apply-frame-all'),
    clearAll: document.getElementById('pt-clear-all'),
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

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* Mirrors College-Debt/resource-pack/scripts/process_paintings.py sanitize_name */
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

  /* Compute best (w, h) in 1..4 x 1..4 for image aspect ratio */
  function pickInitialBlockSize(imgW, imgH) {
    var ar = imgW / imgH;
    var best = { w: 2, h: 2, score: Infinity };
    var targetWidthPx = Math.min(256, Math.max(64, imgW));

    for (var w = 1; w <= MAX_BLOCKS; w++) {
      for (var h = 1; h <= MAX_BLOCKS; h++) {
        var diff = Math.abs(ar - w / h);
        /* Tiny tie-breaker among equal aspect ratios toward balanced pixel scale */
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

  /* --- Canvas Frame + Crop Renderer (mc-tools scaled crop + vanilla frames) --- */
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

        /* Deterministic wood/stone mottling with slight top-left highlight bias */
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
    var stw = tw * scale;
    var sth = th * scale;
    var preset = FRAME_MAP[item.frame] || FRAME_MAP['dark-oak'];
    var hasFrame = Boolean(preset && preset.colors);
    var border = hasFrame ? scale : 0;

    var cvs = targetCanvas || document.createElement('canvas');
    if (cvs.width !== stw) cvs.width = stw;
    if (cvs.height !== sth) cvs.height = sth;

    var ctx = cvs.getContext('2d');
    ctx.clearRect(0, 0, stw, sth);

    if (hasFrame) {
      drawVanillaFrame(ctx, tw, th, scale, preset);
    }

    var iw = stw - border * 2;
    var ih = sth - border * 2;
    var srcW = item.img.naturalWidth || item.img.width;
    var srcH = item.img.naturalHeight || item.img.height;
    var ar = srcW / srcH;
    var tar = iw / ih;

    var sw = srcW;
    var sh = srcH;
    var sx = 0;
    var sy = 0;

    if (ar > tar) {
      sw = srcH * tar;
      sx = (srcW - sw) * item.panX;
    } else if (ar < tar) {
      sh = srcW / tar;
      sy = (srcH - sh) * item.panY;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(border, border, iw, ih);
    ctx.clip();
    ctx.imageSmoothingEnabled = !item.pixelArt;
    if (!item.pixelArt && ctx.imageSmoothingQuality) {
      ctx.imageSmoothingQuality = 'high';
    }
    ctx.drawImage(item.img, sx, sy, sw, sh, border, border, iw, ih);
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

  /* --- SSO Identity Detection --- */
  function updateSsoPill() {
    if (!els.ssoPill || !els.ssoText) return;
    els.ssoPill.classList.remove('is-authenticated', 'is-preview');

    if (state.identity.authenticated) {
      els.ssoPill.classList.add('is-authenticated');
      var display = state.identity.name || state.identity.email;
      els.ssoText.innerHTML = 'Signed in as <strong>' + escapeHtml(display) + '</strong>' +
        (state.identity.isAdmin ? ' (Admin)' : '');
      if (els.useSsoAuthor && display) {
        els.useSsoAuthor.hidden = false;
      }
    } else if (isLocalHost()) {
      els.ssoPill.classList.add('is-preview');
      els.ssoText.textContent = 'Local Preview Mode (SSO inactive)';
      if (els.useSsoAuthor) els.useSsoAuthor.hidden = true;
    } else {
      els.ssoPill.classList.add('is-preview');
      els.ssoText.textContent = 'Session unverified';
      if (els.useSsoAuthor) els.useSsoAuthor.hidden = true;
    }
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
          state.identity.source = 'cf-get-identity';
        }
      }
    } catch (err) {
      /* Non-fatal in local preview or when CF Access route is not yet attached */
    }
    updateSsoPill();
  }

  /* --- Sequential Image Import (matches mc-tools ptAddFiles ordering guarantee) --- */
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
      showBanner(els.studioBanner, 'warning', 'Batch limit reached (' + MAX_BATCH + ' paintings). Publish or clear items before adding more.');
      announce('Batch limit of ' + MAX_BATCH + ' paintings reached.');
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
      var authorDefault = (els.batchAuthor && els.batchAuthor.value.trim()) || DEFAULT_AUTHOR;
      var frameDefault = (els.batchFrame && els.batchFrame.value) || 'dark-oak';

      state.staged.push({
        id: state.nextId++,
        filename: file.name,
        title: cleanTitleFromFilename(file.name),
        author: authorDefault,
        img: img,
        blocksW: size.w,
        blocksH: size.h,
        scale: 4,
        frame: frameDefault,
        panX: 0.5,
        panY: 0.5,
        pixelArt: false
      });
      addedCount += 1;
    }

    var warnings = [];
    if (files.length > remaining) {
      warnings.push('Only added ' + remaining + ' of ' + files.length + ' files (max ' + MAX_BATCH + ' per batch).');
    }
    if (skippedNames.length) {
      warnings.push('Skipped unreadable or non-image file(s): ' + skippedNames.map(escapeHtml).join(', ') + '.');
    }
    if (warnings.length) {
      showBanner(els.studioBanner, 'warning', warnings.join(' '));
    }

    renderStudio();
    if (addedCount > 0) {
      announce('Added ' + addedCount + ' painting' + (addedCount === 1 ? '' : 's') + ' to studio.');
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
    els.batchBar.hidden = count === 0;
    els.publishCard.hidden = count === 0;
    updateHeaderCounts();

    if (!count) return;

    var totalPxAreas = state.staged.reduce(function (sum, item) {
      return sum + (item.blocksW * 16 * item.scale) * (item.blocksH * 16 * item.scale);
    }, 0);
    els.publishSummary.textContent = count + ' painting' + (count === 1 ? '' : 's') +
      ' ready (' + totalPxAreas.toLocaleString() + ' total output pixels)';
  }

  function needsCropAxes(item) {
    var hasFrame = (FRAME_MAP[item.frame] && FRAME_MAP[item.frame].colors) ? true : false;
    var border = hasFrame ? item.scale : 0;
    var iw = item.blocksW * BASE_PX_PER_BLOCK * item.scale - border * 2;
    var ih = item.blocksH * BASE_PX_PER_BLOCK * item.scale - border * 2;
    var srcW = item.img.naturalWidth || item.img.width;
    var srcH = item.img.naturalHeight || item.img.height;
    var ar = srcW / srcH;
    var tar = iw / ih;
    return {
      needsH: ar - tar > 0.005,
      needsV: tar - ar > 0.005
    };
  }

  function attachCanvasDrag(canvas, item, sliderX, sliderY) {
    var dragging = false;
    var startX = 0;
    var startY = 0;
    var startPanX = 0;
    var startPanY = 0;

    canvas.addEventListener('pointerdown', function (e) {
      var crop = needsCropAxes(item);
      if (!crop.needsH && !crop.needsV) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startPanX = item.panX;
      startPanY = item.panY;
      canvas.classList.add('is-dragging');
      if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var rect = canvas.getBoundingClientRect();
      var crop = needsCropAxes(item);
      if (crop.needsH && rect.width > 0) {
        var dx = (e.clientX - startX) / rect.width;
        item.panX = Math.max(0, Math.min(1, startPanX - dx));
        if (sliderX) sliderX.value = String(Math.round(item.panX * 100));
      }
      if (crop.needsV && rect.height > 0) {
        var dy = (e.clientY - startY) / rect.height;
        item.panY = Math.max(0, Math.min(1, startPanY - dy));
        if (sliderY) sliderY.value = String(Math.round(item.panY * 100));
      }
      renderPaintingToCanvas(item, canvas);
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      canvas.classList.remove('is-dragging');
      if (canvas.releasePointerCapture) {
        try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
      }
    }

    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
  }

  function renderStudio() {
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
      var cropInfo = needsCropAxes(item);
      if (cropInfo.needsH || cropInfo.needsV) {
        canvas.classList.add('is-pannable');
        canvas.title = 'Drag to adjust crop framing';
      }
      stage.appendChild(canvas);

      var rmBtn = document.createElement('button');
      rmBtn.type = 'button';
      rmBtn.className = 'pt-card-remove';
      rmBtn.innerHTML = '&times;';
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

      /* --- Crop Sliders (shown when aspect ratio requires cropping) --- */
      var sliderX = null;
      var sliderY = null;
      if (cropInfo.needsH || cropInfo.needsV) {
        var cropBox = document.createElement('div');
        cropBox.className = 'pt-crop-box';

        if (cropInfo.needsH) {
          var rowX = document.createElement('div');
          rowX.className = 'pt-crop-row';
          var lblX = document.createElement('label');
          lblX.className = 'pt-crop-axis';
          lblX.htmlFor = 'pt-panx-' + item.id;
          lblX.textContent = 'Crop X';
          sliderX = document.createElement('input');
          sliderX.type = 'range';
          sliderX.id = 'pt-panx-' + item.id;
          sliderX.className = 'pt-range';
          sliderX.min = '0';
          sliderX.max = '100';
          sliderX.value = String(Math.round(item.panX * 100));
          sliderX.setAttribute('aria-label', 'Horizontal crop position');
          sliderX.addEventListener('input', function () {
            item.panX = Number(sliderX.value) / 100;
            renderPaintingToCanvas(item, canvas);
          });
          rowX.appendChild(lblX);
          rowX.appendChild(sliderX);
          cropBox.appendChild(rowX);
        }

        if (cropInfo.needsV) {
          var rowY = document.createElement('div');
          rowY.className = 'pt-crop-row';
          var lblY = document.createElement('label');
          lblY.className = 'pt-crop-axis';
          lblY.htmlFor = 'pt-pany-' + item.id;
          lblY.textContent = 'Crop Y';
          sliderY = document.createElement('input');
          sliderY.type = 'range';
          sliderY.id = 'pt-pany-' + item.id;
          sliderY.className = 'pt-range';
          sliderY.min = '0';
          sliderY.max = '100';
          sliderY.value = String(Math.round(item.panY * 100));
          sliderY.setAttribute('aria-label', 'Vertical crop position');
          sliderY.addEventListener('input', function () {
            item.panY = Number(sliderY.value) / 100;
            renderPaintingToCanvas(item, canvas);
          });
          rowY.appendChild(lblY);
          rowY.appendChild(sliderY);
          cropBox.appendChild(rowY);
        }

        var cropActions = document.createElement('div');
        cropActions.style.display = 'flex';
        cropActions.style.justifyContent = 'flex-end';
        var resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'pt-btn pt-btn-xs';
        resetBtn.textContent = 'Center crop';
        resetBtn.addEventListener('click', function () {
          item.panX = 0.5;
          item.panY = 0.5;
          renderStudio();
        });
        cropActions.appendChild(resetBtn);
        cropBox.appendChild(cropActions);
        card.appendChild(cropBox);
      }

      attachCanvasDrag(canvas, item, sliderX, sliderY);

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
        /* Update only slug previews instead of rebuilding focus-bearing DOM */
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

      /* --- Full 1..4 x 1..4 Dimensions + Scale --- */
      var sizeBox = document.createElement('div');
      sizeBox.className = 'pt-size-box';

      var sizeSelects = document.createElement('div');
      sizeSelects.className = 'pt-size-selects';

      var wWrap = document.createElement('div');
      var wLbl = document.createElement('label');
      wLbl.className = 'pt-field-label';
      wLbl.htmlFor = 'pt-w-' + item.id;
      wLbl.textContent = 'Width (blocks)';
      var wSel = document.createElement('select');
      wSel.id = 'pt-w-' + item.id;
      wSel.className = 'pt-select';
      for (var bw = 1; bw <= MAX_BLOCKS; bw++) {
        var optW = document.createElement('option');
        optW.value = String(bw);
        optW.textContent = bw + (bw === 1 ? ' block' : ' blocks');
        optW.selected = item.blocksW === bw;
        wSel.appendChild(optW);
      }
      wSel.addEventListener('change', function () {
        item.blocksW = Number(wSel.value);
        renderStudio();
      });
      wWrap.appendChild(wLbl);
      wWrap.appendChild(wSel);

      var hWrap = document.createElement('div');
      var hLbl = document.createElement('label');
      hLbl.className = 'pt-field-label';
      hLbl.htmlFor = 'pt-h-' + item.id;
      hLbl.textContent = 'Height (blocks)';
      var hSel = document.createElement('select');
      hSel.id = 'pt-h-' + item.id;
      hSel.className = 'pt-select';
      for (var bh = 1; bh <= MAX_BLOCKS; bh++) {
        var optH = document.createElement('option');
        optH.value = String(bh);
        optH.textContent = bh + (bh === 1 ? ' block' : ' blocks');
        optH.selected = item.blocksH === bh;
        hSel.appendChild(optH);
      }
      hSel.addEventListener('change', function () {
        item.blocksH = Number(hSel.value);
        renderStudio();
      });
      hWrap.appendChild(hLbl);
      hWrap.appendChild(hSel);

      sizeSelects.appendChild(wWrap);
      sizeSelects.appendChild(hWrap);
      sizeBox.appendChild(sizeSelects);

      /* Interactive 4x4 grid picker */
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
            var cell = document.createElement('button');
            cell.type = 'button';
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
              renderStudio();
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
      sizeBox.appendChild(gridWrap);

      /* Detail resolution scale selector (capped at 8x) */
      var scaleWrap = document.createElement('div');
      scaleWrap.style.flex = '1 1 160px';
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
        renderStudio();
      });
      scaleWrap.appendChild(scaleLbl);
      scaleWrap.appendChild(scaleSel);
      sizeBox.appendChild(scaleWrap);

      card.appendChild(sizeBox);

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
        var swBtn = document.createElement('button');
        swBtn.type = 'button';
        swBtn.className = 'pt-frame-swatch' + (item.frame === preset.id ? ' is-selected' : '');
        swBtn.dataset.frame = preset.id;
        swBtn.setAttribute('role', 'radio');
        swBtn.setAttribute('aria-checked', item.frame === preset.id ? 'true' : 'false');
        swBtn.setAttribute('aria-label', preset.label);
        swBtn.title = preset.label;
        swBtn.innerHTML = '<span class="pt-frame-swatch-preview" aria-hidden="true"></span>';
        swBtn.addEventListener('click', function () {
          item.frame = preset.id;
          renderStudio();
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

  /* --- Batch Controls & Dropzone Events --- */
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

  if (els.useSsoAuthor) {
    els.useSsoAuthor.addEventListener('click', function () {
      var name = state.identity.name || state.identity.email.split('@')[0];
      if (name && els.batchAuthor) {
        els.batchAuthor.value = name;
      }
    });
  }

  if (els.applyAuthorAll) {
    els.applyAuthorAll.addEventListener('click', function () {
      var val = (els.batchAuthor && els.batchAuthor.value.trim()) || DEFAULT_AUTHOR;
      state.staged.forEach(function (item) { item.author = val; });
      renderStudio();
      announce('Applied author ' + val + ' to all paintings.');
    });
  }

  if (els.applyFrameAll) {
    els.applyFrameAll.addEventListener('click', function () {
      var val = (els.batchFrame && els.batchFrame.value) || 'dark-oak';
      state.staged.forEach(function (item) { item.frame = val; });
      renderStudio();
      announce('Applied frame style to all paintings.');
    });
  }

  if (els.clearAll) {
    els.clearAll.addEventListener('click', function () {
      state.staged = [];
      hideBanner(els.studioBanner);
      renderStudio();
      announce('Cleared all staged paintings.');
    });
  }

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
      var origLabel = btnSpan ? btnSpan.textContent : 'Publish to Resource Pack';

      try {
        if (btnSpan) btnSpan.textContent = 'Rendering PNGs\u2026';
        showBanner(els.studioBanner, '', 'Rendering ' + state.staged.length + ' PNG file(s)\u2026');

        var payloadItems = [];
        var totalBytes = 0;
        for (var i = 0; i < state.staged.length; i++) {
          var item = state.staged[i];
          var cvs = renderPaintingToCanvas(item);
          var blob = await canvasToPngBlob(cvs);
          if (blob.size > 2 * 1024 * 1024) {
            throw new Error('"' + item.title + '" PNG exceeds 2 MB (' + formatBytes(blob.size) + '). Lower its detail scale.');
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
          throw new Error('Total batch size (' + formatBytes(totalBytes) + ') exceeds 8 MB. Split into two batches.');
        }

        if (btnSpan) btnSpan.textContent = 'Publishing\u2026';
        showBanner(els.studioBanner, '', 'Committing paintings to <code>College-Debt/resource-pack</code> (' + formatBytes(totalBytes) + ')\u2026');

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
          throw new Error('Your Cloudflare Access SSO session expired. Please refresh this page to sign back in — your staged paintings stay ready if you download PNGs first.');
        }
        if (res.status === 404 || ct.indexOf('application/json') === -1) {
          throw new Error('The Cloudflare Worker endpoint (/api/paintings) is not live yet. You can still use "Download PNGs" to save your rendered textures locally.');
        }

        var result = await res.json();
        if (!res.ok) {
          throw new Error(result && result.error ? result.error : 'Server error (' + res.status + ')');
        }

        var committed = Array.isArray(result.paintings) ? result.paintings : [];
        var listHtml = committed.map(function (p) {
          return '<li><strong>' + escapeHtml(p.title) + '</strong> by ' + escapeHtml(p.author) +
            ' (' + p.width + '&times;' + p.height + ') &mdash; <code>cdsmp:' + escapeHtml(p.slug) + '</code></li>';
        }).join('');

        var releaseNote = result.workflowUrl
          ? ' <a href="' + escapeHtml(result.workflowUrl) + '" target="_blank" rel="noopener">View pack build run</a>.'
          : ' The server resource pack release workflow has been triggered.';

        showBanner(
          els.studioBanner,
          'success',
          '<strong>Published ' + committed.length + ' painting' + (committed.length === 1 ? '' : 's') + '!</strong>' +
          releaseNote +
          (listHtml ? '<ul class="pt-banner-list">' + listHtml + '</ul>' : '')
        );
        announce('Published ' + committed.length + ' paintings to the server resource pack.');

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
      throw new Error('Could not reach GitHub gallery (' + listRes.status + ')');
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
            state.identity.authenticated = Boolean(data.viewer.email || data.viewer.name);
            state.identity.email = data.viewer.email || state.identity.email;
            state.identity.name = data.viewer.name || state.identity.name;
            state.identity.isAdmin = Boolean(data.viewer.isAdmin);
            updateSsoPill();
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
          'Showing live read-only paintings from <code>College-Debt/resource-pack</code>. Editing and deleting unlock once the <code>/api/paintings</code> Cloudflare Worker is connected.'
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
    showBanner(els.galleryBanner, 'success', 'Updated <code>cdsmp:' + escapeHtml(slug) + '</code> and triggered pack rebuild.');
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
    showBanner(els.galleryBanner, 'success', 'Deleted <code>cdsmp:' + escapeHtml(slug) + '</code> and triggered pack rebuild.');
    await loadGallery(true);
  }

  function renderGallery() {
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
        (it.author || '').toLowerCase().indexOf(query) !== -1 ||
        (it.slug || '').toLowerCase().indexOf(query) !== -1
      );
    });

    if (!filtered.length) {
      els.galleryGrid.innerHTML = '<div class="pt-empty-state">No paintings match the current filter.</div>';
      return;
    }

    filtered.forEach(function (item) {
      var card = document.createElement('article');
      card.className = 'pt-gallery-card';

      var thumbStage = document.createElement('div');
      thumbStage.className = 'pt-gallery-thumb-stage';
      var img = document.createElement('img');
      img.className = 'pt-gallery-thumb';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = item.textureUrl;
      img.alt = item.title + ' (' + item.width + '×' + item.height + ' painting)';
      thumbStage.appendChild(img);
      card.appendChild(thumbStage);

      var info = document.createElement('div');
      info.innerHTML =
        '<h2 class="pt-gallery-title">' + escapeHtml(item.title) + '</h2>' +
        '<p class="pt-gallery-meta">by ' + escapeHtml(item.author) + '</p>';
      card.appendChild(info);

      var badges = document.createElement('div');
      badges.className = 'pt-gallery-badges';
      badges.innerHTML =
        '<span class="pt-gallery-size-badge">' + item.width + '&times;' + item.height + '</span>' +
        '<span class="pt-gallery-id">cdsmp:' + escapeHtml(item.slug) + '</span>';
      card.appendChild(badges);

      /* Inline Edit Panel (only if Worker marked canEdit = true) */
      if (item.canEdit && state.gallery.editingSlug === item.slug) {
        var editForm = document.createElement('form');
        editForm.className = 'pt-inline-edit';
        editForm.innerHTML =
          '<div><label class="pt-field-label" for="pt-edit-title-' + escapeHtml(item.slug) + '">Title</label>' +
          '<input class="pt-input pt-input-compact" id="pt-edit-title-' + escapeHtml(item.slug) + '" value="' + escapeHtml(item.title) + '" maxlength="64" required></div>' +
          '<div><label class="pt-field-label" for="pt-edit-author-' + escapeHtml(item.slug) + '">Author</label>' +
          '<input class="pt-input pt-input-compact" id="pt-edit-author-' + escapeHtml(item.slug) + '" value="' + escapeHtml(item.author) + '" maxlength="64" required></div>';
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
          renderGallery();
        });
        editBtns.appendChild(saveBtn);
        editBtns.appendChild(cancelBtn);
        editForm.appendChild(editBtns);
        editForm.addEventListener('submit', async function (e) {
          e.preventDefault();
          saveBtn.disabled = true;
          try {
            var newTitle = editForm.querySelector('#pt-edit-title-' + item.slug).value.trim();
            var newAuthor = editForm.querySelector('#pt-edit-author-' + item.slug).value.trim();
            await savePaintingEdit(item.slug, newTitle, newAuthor);
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
          renderGallery();
        });
        delBtns.appendChild(confirmBtn);
        delBtns.appendChild(cancelDel);
        delBox.appendChild(delBtns);
        card.appendChild(delBox);
      }

      /* Card Action Buttons */
      var actions = document.createElement('div');
      actions.className = 'pt-gallery-actions';

      var copyIdBtn = document.createElement('button');
      copyIdBtn.type = 'button';
      copyIdBtn.className = 'pt-btn pt-btn-xs';
      copyIdBtn.textContent = 'Copy ID';
      copyIdBtn.addEventListener('click', function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('cdsmp:' + item.slug);
          copyIdBtn.textContent = 'Copied!';
          setTimeout(function () { copyIdBtn.textContent = 'Copy ID'; }, 1400);
        }
      });
      actions.appendChild(copyIdBtn);

      var copyGiveBtn = document.createElement('button');
      copyGiveBtn.type = 'button';
      copyGiveBtn.className = 'pt-btn pt-btn-xs';
      copyGiveBtn.textContent = 'Copy /give';
      copyGiveBtn.addEventListener('click', function () {
        var cmd = '/give @s minecraft:painting[minecraft:painting/variant="cdsmp:' + item.slug + '"]';
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(cmd);
          copyGiveBtn.textContent = 'Copied!';
          setTimeout(function () { copyGiveBtn.textContent = 'Copy /give'; }, 1400);
        }
      });
      actions.appendChild(copyGiveBtn);

      if (item.canEdit) {
        var editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'pt-btn pt-btn-xs';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', function () {
          state.gallery.confirmDeleteSlug = null;
          state.gallery.editingSlug = item.slug;
          renderGallery();
        });
        actions.appendChild(editBtn);

        var delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'pt-btn pt-btn-xs pt-btn-danger-outline';
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', function () {
          state.gallery.editingSlug = null;
          state.gallery.confirmDeleteSlug = item.slug;
          renderGallery();
        });
        actions.appendChild(delBtn);
      }

      card.appendChild(actions);
      els.galleryGrid.appendChild(card);
    });
  }

  if (els.gallerySearch) {
    els.gallerySearch.addEventListener('input', renderGallery);
  }
  if (els.gallerySizeFilter) {
    els.gallerySizeFilter.addEventListener('change', renderGallery);
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
