/* Grafik-Editor – ein Canva-ähnlicher Design-Editor auf Basis von Fabric.js. */
(function () {
  'use strict';

  const D = window.EditorData;
  const params = new URLSearchParams(location.search);

  // Eigene Objekt-Eigenschaften, die mit gespeichert werden.
  const EXTRA = ['id', 'name', 'isBackground', 'isBgImage', 'locked', 'kind', 'adjust', 'mask', 'effect', 'effectIntensity', 'selectable', 'evented'];
  const ACCENT = '#7d2ae8';
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const MAX_UPLOAD_SIDE = 2048;
  const HISTORY_LIMIT = 60;

  // ---------------------------------------------------------------- Helfer

  const $ = (sel, root) => (root || document).querySelector(sel);
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const isMobile = () => window.matchMedia('(max-width: 768px)').matches;
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const withTimeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(r, ms))]);

  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'html') el.innerHTML = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (typeof v !== 'string' && k in el) el[k] = v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const c of kids.flat()) {
      if (c == null || c === false) continue;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9v11h14V9"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
    type: '<path d="M4 7V4h16v3"/><path d="M9 20h6M12 4v16"/>',
    shapes: '<circle cx="7.5" cy="7.5" r="4.5"/><rect x="13" y="13" width="8" height="8" rx="1"/><path d="m17 2.5 4 7h-8z"/><path d="M3 21l7-7"/>',
    upload: '<path d="M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 7.9"/><path d="M12 12v9M8.5 15.5 12 12l3.5 3.5"/>',
    palette: '<path d="M12 21a9 9 0 1 1 9-9c0 2.8-2.2 4-4 4h-2.5a2 2 0 0 0-1.5 3.3A1.6 1.6 0 0 1 12 21z"/><circle cx="7.5" cy="11" r="1.2" fill="currentColor"/><circle cx="10.5" cy="7" r="1.2" fill="currentColor"/><circle cx="15.5" cy="7.5" r="1.2" fill="currentColor"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    minus: '<path d="M5 12h14"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    bold: '<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/>',
    italic: '<path d="M19 4h-9M14 20H5M15 4 9 20"/>',
    underline: '<path d="M6 4v6a6 6 0 0 0 12 0V4M4 21h16"/>',
    left: '<path d="M3 6h18M3 12h12M3 18h16"/>',
    center: '<path d="M3 6h18M6 12h12M4 18h16"/>',
    right: '<path d="M3 6h18M9 12h12M5 18h16"/>',
    justify: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/><path d="M10 11v5M14 11v5"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    unlock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/>',
    up: '<path d="m18 15-6-6-6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    flipH: '<path d="M12 3v18"/><path d="M8 7 3 12l5 5z"/><path d="m16 7 5 5-5 5z"/>',
    flipV: '<path d="M3 12h18"/><path d="M7 8l5-5 5 5z"/><path d="m7 16 5 5 5-5z"/>',
    opacity: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M6.3 15.5h11.4"/>',
    position: '<path d="M12 2v20M2 12h20"/><path d="m9 5 3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3M19 9l3 3-3 3"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    sparkles: '<path d="M11 3l1.8 4.7 4.7 1.8-4.7 1.8L11 16l-1.8-4.7L4.5 9.5l4.7-1.8z"/><path d="M18.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    spacing: '<path d="M4 4v16M20 4v16"/><path d="M8 12h8M10 9l-3 3 3 3M14 9l3 3-3 3"/>',
    group: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/><path d="M2 2h20v20H2z" stroke-dasharray="2 3"/>',
    ungroup: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    corner: '<path d="M4 20V10a6 6 0 0 1 6-6h10"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    resize: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
    border: '<rect x="4" y="4" width="16" height="16" rx="2" stroke-dasharray="3 3"/>',
    aLeft: '<path d="M4 3v18"/><rect x="7" y="6" width="12" height="4" rx="1"/><rect x="7" y="14" width="7" height="4" rx="1"/>',
    aCenterH: '<path d="M12 3v18"/><rect x="5" y="6" width="14" height="4" rx="1"/><rect x="8" y="14" width="8" height="4" rx="1"/>',
    aRight: '<path d="M20 3v18"/><rect x="5" y="6" width="12" height="4" rx="1"/><rect x="10" y="14" width="7" height="4" rx="1"/>',
    aTop: '<path d="M3 4h18"/><rect x="6" y="7" width="4" height="12" rx="1"/><rect x="14" y="7" width="4" height="7" rx="1"/>',
    aCenterV: '<path d="M3 12h18"/><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="8" width="4" height="8" rx="1"/>',
    aBottom: '<path d="M3 20h18"/><rect x="6" y="5" width="4" height="12" rx="1"/><rect x="14" y="10" width="4" height="7" rx="1"/>',
    toFront: '<rect x="8" y="8" width="12" height="12" rx="1" fill="currentColor" fill-opacity=".25"/><path d="M4 16V4h12"/>',
    toBack: '<rect x="4" y="4" width="12" height="12" rx="1" fill="currentColor" fill-opacity=".25"/><path d="M20 8v12H8"/>',
  };

  const icon = (name, size) =>
    `<svg class="i" width="${size || 20}" height="${size || 20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

  function toast(msg, ms) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { el.hidden = true; }, ms || 2400);
  }

  // ---------------------------------------------------------------- Speicher (IndexedDB mit Fallback)

  const Store = (() => {
    const mem = { designs: new Map(), uploads: new Map() };
    let dbp = null;
    const reqP = req => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
    function open() {
      if (!dbp) {
        dbp = new Promise(res => {
          try {
            const r = indexedDB.open('grafik-editor', 1);
            r.onupgradeneeded = () => {
              r.result.createObjectStore('designs', { keyPath: 'id' });
              r.result.createObjectStore('uploads', { keyPath: 'id' });
            };
            r.onsuccess = () => res(r.result);
            r.onerror = () => res(null);
            r.onblocked = () => res(null);
          } catch (e) { res(null); }
        });
      }
      return dbp;
    }
    async function store(name, mode) {
      const db = await open();
      return db ? db.transaction(name, mode).objectStore(name) : null;
    }
    return {
      async get(name, id) { const s = await store(name, 'readonly'); return s ? reqP(s.get(id)) : mem[name].get(id); },
      async put(name, val) { const s = await store(name, 'readwrite'); return s ? reqP(s.put(val)) : mem[name].set(val.id, val); },
      async del(name, id) { const s = await store(name, 'readwrite'); return s ? reqP(s.delete(id)) : mem[name].delete(id); },
      async all(name) { const s = await store(name, 'readonly'); return s ? reqP(s.getAll()) : [...mem[name].values()]; },
    };
  })();

  // ---------------------------------------------------------------- Schriften

  const fontCssReady = (() => {
    const links = D.FONTS.map(f => {
      const l = h('link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=' + f.spec + '&display=swap' });
      document.head.appendChild(l);
      return new Promise(r => { l.onload = r; l.onerror = r; });
    });
    return withTimeout(Promise.all(links), 5000);
  })();

  const fontPromises = new Map();
  function loadFont(name) {
    if (!name || name.includes(',')) return Promise.resolve();
    if (!fontPromises.has(name)) {
      fontPromises.set(name, (async () => {
        await fontCssReady;
        if (document.fonts && document.fonts.load) {
          await withTimeout(Promise.all([
            document.fonts.load(`400 48px "${name}"`).catch(() => {}),
            document.fonts.load(`700 48px "${name}"`).catch(() => {}),
            document.fonts.load(`italic 400 48px "${name}"`).catch(() => {}),
          ]), 4000);
        }
        fabric.util.clearFabricFontCache(name);
      })());
    }
    return fontPromises.get(name);
  }

  function fontsInJSON(json) {
    const set = new Set();
    const walk = objs => (objs || []).forEach(o => {
      if (o.fontFamily) set.add(o.fontFamily);
      if (o.objects) walk(o.objects);
    });
    walk(json && json.objects);
    return [...set];
  }

  // ---------------------------------------------------------------- Farben & Verläufe

  function makeGradient(colors, angle) {
    const rad = ((angle == null ? 90 : angle) - 90) * Math.PI / 180;
    const dx = Math.cos(rad) / 2, dy = Math.sin(rad) / 2;
    return new fabric.Gradient({
      type: 'linear',
      gradientUnits: 'percentage',
      coords: { x1: 0.5 - dx, y1: 0.5 - dy, x2: 0.5 + dx, y2: 0.5 + dy },
      colorStops: colors.map((c, i) => ({ offset: i / (colors.length - 1), color: c })),
    });
  }

  function makeFill(v) {
    if (v && typeof v === 'object' && v.gradient) return makeGradient(v.gradient, v.angle);
    return v;
  }

  function fillToCss(fill) {
    if (!fill) return 'transparent';
    if (typeof fill === 'string') return fill;
    if (fill.colorStops) {
      const c = fill.coords || {};
      const angle = Math.round(Math.atan2((c.y2 || 0) - (c.y1 || 0), (c.x2 || 0) - (c.x1 || 0)) * 180 / Math.PI + 90);
      const stops = fill.colorStops.slice().sort((a, b) => a.offset - b.offset).map(s => `${s.color} ${Math.round(s.offset * 100)}%`);
      return `linear-gradient(${angle}deg, ${stops.join(', ')})`;
    }
    return '#cccccc';
  }

  function toHex(color) {
    if (!color || typeof color !== 'string' || color === 'transparent') return '#000000';
    try { return '#' + new fabric.Color(color).toHex().toLowerCase(); } catch (e) { return '#000000'; }
  }

  // ---------------------------------------------------------------- Zustand

  const state = {
    design: null,     // { id, name, w, h, created }
    zoom: 1,
    fitMode: true,
    history: [],
    hIndex: -1,
    loading: false,
    clipboard: null,
    guides: [],
    panel: null,
  };
  let canvas = null;
  const W = () => state.design.w;
  const H = () => state.design.h;

  // ---------------------------------------------------------------- Canvas

  function initCanvas() {
    fabric.Object.prototype.set({
      transparentCorners: false,
      cornerColor: '#ffffff',
      cornerStrokeColor: ACCENT,
      borderColor: ACCENT,
      cornerStyle: 'circle',
      cornerSize: 12,
      touchCornerSize: 30,
      borderScaleFactor: 2,
    });
    fabric.Object.prototype.controls.mtr.offsetY = -32;
    fabric.Textbox.prototype.cursorColor = ACCENT;
    fabric.Textbox.prototype.selectionColor = 'rgba(125,42,232,0.25)';

    canvas = new fabric.Canvas('canvas', {
      preserveObjectStacking: true,
      selectionColor: 'rgba(125,42,232,0.08)',
      selectionBorderColor: ACCENT,
      selectionLineWidth: 1,
      stopContextMenu: true,
      backgroundColor: '#ffffff',
      allowTouchScrolling: false,
    });

    canvas.on('object:added', e => { if (!state.loading) { decorate(e.target); commitSoon(); } });
    canvas.on('object:removed', () => { if (!state.loading) commitSoon(); });
    canvas.on('object:modified', e => {
      normalizeText(e.target);
      commitSoon();
      renderToolbar();
    });
    canvas.on('text:changed', () => commitSoon(500));
    canvas.on('text:editing:exited', () => commitSoon());
    canvas.on('selection:created', onSelectionChange);
    canvas.on('selection:updated', onSelectionChange);
    canvas.on('selection:cleared', onSelectionChange);
    canvas.on('object:moving', snapObject);
    canvas.on('mouse:up', () => { if (state.guides.length) { state.guides = []; canvas.requestRenderAll(); } });
    canvas.on('after:render', drawGuides);

    canvas.on('mouse:dblclick', e => {
      const t = e.target;
      if (t && t.type === 'textbox' && !t.isEditing && !t.locked) startTextEdit(t);
    });
  }

  function onSelectionChange() {
    closePopover();
    renderToolbar();
    if (state.panel === 'layers') renderPanel();
  }

  function getBg() { return canvas.getObjects().find(o => o.isBackground); }
  function getBgImage() { return canvas.getObjects().find(o => o.isBgImage); }
  function contentObjects() { return canvas.getObjects().filter(o => !o.isBackground && !o.isBgImage); }
  function baseIndex() { return canvas.getObjects().filter(o => o.isBackground || o.isBgImage).length; }

  function createBg(fill) {
    const bg = new fabric.Rect({
      left: 0, top: 0, width: W(), height: H(), fill: makeFill(fill || '#ffffff'),
      isBackground: true, name: 'Hintergrund', strokeWidth: 0,
    });
    decorate(bg);
    return bg;
  }

  function decorate(o) {
    if (!o) return;
    if (!o.id) o.id = uid();
    if (o.isBackground || o.isBgImage) {
      o.set({ selectable: false, evented: false, hoverCursor: 'default', objectCaching: true });
      return;
    }
    if (o.type === 'textbox') o.setControlsVisibility({ mt: false, mb: false });
    if (o.kind === 'line') o.setControlsVisibility({ mt: false, mb: false, tl: false, tr: false, bl: false, br: false });
    if (o.kind === 'arrow') o.setControlsVisibility({ mt: false, mb: false });
    if (o.kind === 'line' || o.kind === 'arrow') o.padding = 10;
    applyLock(o);
  }

  function applyLock(o) {
    const l = !!o.locked;
    o.set({ lockMovementX: l, lockMovementY: l, lockScalingX: l, lockScalingY: l, lockRotation: l, hasControls: !l });
    if (o.type === 'textbox') o.editable = !l;
  }

  // Skalierte Textboxen in echte Schriftgröße umrechnen (wie bei Canva).
  function normalizeText(o) {
    if (!o || o.type !== 'textbox') return;
    if (Math.abs(o.scaleX - 1) < 0.001 && Math.abs(o.scaleY - 1) < 0.001) return;
    const s = o.scaleY;
    o.set({
      fontSize: Math.max(1, Math.round(o.fontSize * s * 10) / 10),
      width: o.width * o.scaleX,
      strokeWidth: (o.strokeWidth || 0) * s,
      scaleX: 1,
      scaleY: 1,
    });
    if (o.shadow) {
      o.shadow.blur *= s; o.shadow.offsetX *= s; o.shadow.offsetY *= s;
    }
    o.setCoords();
  }

  // ---------------------------------------------------------------- Ausrichtungshilfen (Snapping)

  function snapObject(e) {
    const o = e.target;
    const th = 6 / state.zoom;
    const r = o.getBoundingRect(true, true);
    const guides = [];
    const xs = [[r.left, 0], [r.left + r.width / 2, W() / 2], [r.left + r.width, W()]];
    const ys = [[r.top, 0], [r.top + r.height / 2, H() / 2], [r.top + r.height, H()]];
    for (const [v, target] of xs) {
      if (Math.abs(v - target) < th) { o.left += target - v; guides.push({ x: target }); break; }
    }
    for (const [v, target] of ys) {
      if (Math.abs(v - target) < th) { o.top += target - v; guides.push({ y: target }); break; }
    }
    o.setCoords();
    state.guides = guides;
  }

  function drawGuides() {
    if (!state.guides.length) return;
    const ctx = canvas.getContext();
    const v = canvas.viewportTransform;
    ctx.save();
    ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
    ctx.strokeStyle = '#ff2fa8';
    ctx.lineWidth = 1 / state.zoom;
    ctx.setLineDash([4 / state.zoom, 4 / state.zoom]);
    ctx.beginPath();
    for (const g of state.guides) {
      if (g.x != null) { ctx.moveTo(g.x, 0); ctx.lineTo(g.x, H()); }
      if (g.y != null) { ctx.moveTo(0, g.y); ctx.lineTo(W(), g.y); }
    }
    ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------- Zoom

  function setZoom(z, fromFit) {
    if (!fromFit) state.fitMode = false;
    z = clamp(z, 0.05, 5);
    state.zoom = z;
    canvas.setDimensions({ width: Math.round(W() * z), height: Math.round(H() * z) });
    canvas.setZoom(z);
    $('#zoomValue').textContent = Math.round(z * 100) + '%';
    canvas.calcOffset();
    canvas.requestRenderAll();
  }

  function fitZoom() {
    const ws = $('#workspace');
    const pad = isMobile() ? 20 : 56;
    const z = Math.min((ws.clientWidth - pad * 2) / W(), (ws.clientHeight - pad * 2) / H());
    state.fitMode = true;
    setZoom(z, true);
  }

  function initPinchZoom() {
    const ws = $('#workspace');
    let pinch = null;
    const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    ws.addEventListener('touchstart', e => {
      if (e.touches.length === 2) pinch = { d: dist(e.touches), z: state.zoom };
    }, { passive: true, capture: true });
    ws.addEventListener('touchmove', e => {
      if (pinch && e.touches.length === 2) {
        e.preventDefault();
        setZoom(pinch.z * dist(e.touches) / pinch.d);
      }
    }, { passive: false, capture: true });
    ws.addEventListener('touchend', e => { if (e.touches.length < 2) pinch = null; }, { capture: true });
    ws.addEventListener('wheel', e => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom(state.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
      }
    }, { passive: false });
  }

  // ---------------------------------------------------------------- Verlauf (Rückgängig/Wiederholen) & Autosave

  const snapshot = () => JSON.stringify(canvas.toJSON(EXTRA));

  function resetHistory() {
    state.history = [snapshot()];
    state.hIndex = 0;
    updateHistoryButtons();
  }

  function commit() {
    if (state.loading || !canvas) return;
    const snap = snapshot();
    if (snap === state.history[state.hIndex]) return;
    state.history = state.history.slice(0, state.hIndex + 1);
    state.history.push(snap);
    if (state.history.length > HISTORY_LIMIT) state.history.shift();
    state.hIndex = state.history.length - 1;
    updateHistoryButtons();
    saveSoon();
    if (state.panel === 'layers') renderPanel();
  }
  const commitDebounced = debounce(commit, 250);
  const commitDebouncedSlow = debounce(commit, 600);
  function commitSoon(ms) { (ms && ms > 300 ? commitDebouncedSlow : commitDebounced)(); }

  function updateHistoryButtons() {
    $('#btnUndo').disabled = state.hIndex <= 0;
    $('#btnRedo').disabled = state.hIndex >= state.history.length - 1;
  }

  function loadJSON(json) {
    return new Promise(resolve => {
      state.loading = true;
      canvas.discardActiveObject();
      canvas.loadFromJSON(json, () => {
        canvas.getObjects().forEach(decorate);
        if (!getBg()) canvas.insertAt(createBg('#ffffff'), 0);
        state.loading = false;
        canvas.requestRenderAll();
        resolve();
      });
    });
  }

  async function undo() {
    if (state.hIndex <= 0) return;
    state.hIndex--;
    await loadJSON(state.history[state.hIndex]);
    afterHistoryJump();
  }

  async function redo() {
    if (state.hIndex >= state.history.length - 1) return;
    state.hIndex++;
    await loadJSON(state.history[state.hIndex]);
    afterHistoryJump();
  }

  function afterHistoryJump() {
    updateHistoryButtons();
    renderToolbar();
    if (state.panel === 'layers' || state.panel === 'background') renderPanel();
    saveSoon();
  }

  function setSaveState(text) { $('#saveState').textContent = text; }

  const saveSoon = (() => {
    const run = debounce(() => saveDesign(), 900);
    return () => { setSaveState('Wird gespeichert …'); run(); };
  })();

  function renderToCanvas(scale, opts) {
    opts = opts || {};
    const active = canvas.getActiveObject();
    if (active && active.isEditing) active.exitEditing();
    const guides = state.guides;
    state.guides = [];
    const bg = getBg();
    const prevVisible = bg && bg.visible;
    if (opts.transparent && bg) bg.visible = false;
    const multiplier = (W() * scale) / canvas.width;
    // Auswahlrahmen nicht mit exportieren.
    const prevActive = canvas._activeObject;
    canvas._activeObject = null;
    const src = canvas.toCanvasElement(multiplier);
    canvas._activeObject = prevActive;
    if (bg) bg.visible = prevVisible;
    state.guides = guides;
    canvas.requestRenderAll();

    const out = document.createElement('canvas');
    out.width = Math.round(W() * scale);
    out.height = Math.round(H() * scale);
    const ctx = out.getContext('2d');
    if (opts.opaque) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, out.width, out.height); }
    ctx.drawImage(src, 0, 0, out.width, out.height);
    return out;
  }

  async function saveDesign() {
    if (!state.design || !canvas) return;
    const thumbScale = 400 / Math.max(W(), H());
    const rec = {
      ...state.design,
      name: $('#designName').value.trim() || 'Unbenanntes Design',
      json: JSON.parse(state.history[state.hIndex] || snapshot()),
      thumb: renderToCanvas(thumbScale, { opaque: true }).toDataURL('image/jpeg', 0.75),
      updated: Date.now(),
    };
    try {
      await Store.put('designs', rec);
      setSaveState('Gespeichert');
    } catch (e) {
      console.error(e);
      setSaveState('Speichern fehlgeschlagen');
    }
  }

  // ---------------------------------------------------------------- Objekte erzeugen

  // Erzeugt ein Fabric-Objekt aus einer Vorlagen-Beschreibung (relative Einheiten).
  function fromSpec(it, w, hgt) {
    const S = Math.min(w, hgt);
    const common = {
      left: (it.x == null ? 0.5 : it.x) * w,
      top: (it.y == null ? 0.5 : it.y) * hgt,
      originX: 'center', originY: 'center',
      opacity: it.opacity == null ? 1 : it.opacity,
    };
    const shadow = it.shadow ? new fabric.Shadow({ color: it.shadow.color, blur: it.shadow.blur * S, offsetX: 0, offsetY: 0 }) : null;
    switch (it.t) {
      case 'text':
        return new fabric.Textbox(it.text, {
          ...common,
          width: (it.w || 0.8) * w,
          fontSize: it.size * S,
          fontFamily: it.font || 'Inter',
          fontWeight: it.weight || 'normal',
          fontStyle: it.style || 'normal',
          fill: makeFill(it.fill || '#111111'),
          textAlign: it.align || 'center',
          lineHeight: it.lineHeight || 1.16,
          charSpacing: it.charSpacing || 0,
          stroke: it.stroke || null,
          strokeWidth: it.stroke ? (it.strokeWidth || 0.003) * S : 0,
          paintFirst: 'stroke',
          shadow,
          effect: it.stroke && it.fill === 'transparent' ? 'hollow' : (it.shadow ? 'glow' : 'none'),
          splitByGrapheme: false,
        });
      case 'emoji':
        return new fabric.Text(it.text, { ...common, fontSize: it.size * S, fontFamily: EMOJI_FONT, kind: 'emoji', name: 'Emoji' });
      case 'rect':
        return new fabric.Rect({
          ...common,
          width: it.w * w, height: it.hh * hgt,
          rx: (it.rx || 0) * S, ry: (it.rx || 0) * S,
          fill: makeFill(it.fill || '#cccccc'),
          stroke: it.stroke || null,
          strokeWidth: it.stroke ? (it.strokeWidth || 0.004) * S : 0,
          strokeUniform: true,
          kind: 'shape',
        });
      case 'circle':
        return new fabric.Circle({ ...common, radius: it.r * S, fill: makeFill(it.fill || '#cccccc'), strokeWidth: 0, kind: 'shape' });
      default:
        return null;
    }
  }

  function applyBgSpec(bgObj, bg) {
    bgObj.set('fill', bg.gradient ? makeGradient(bg.gradient, bg.angle) : (bg.color || '#ffffff'));
  }

  function specFonts(items) { return items.filter(i => i.font).map(i => i.font); }

  async function applyTemplate(tpl) {
    await Promise.all(specFonts(tpl.items).map(loadFont));
    state.loading = true;
    canvas.discardActiveObject();
    contentObjects().forEach(o => canvas.remove(o));
    const bgImg = getBgImage();
    if (bgImg) canvas.remove(bgImg);
    applyBgSpec(getBg(), tpl.bg);
    tpl.items.forEach(it => {
      const o = fromSpec(it, W(), H());
      if (o) { decorate(o); canvas.add(o); }
    });
    state.loading = false;
    canvas.requestRenderAll();
    commit();
    renderToolbar();
  }

  // Fügt Objekte in die Seitenmitte ein und wählt sie aus.
  async function addItems(items, relativeY) {
    await Promise.all(specFonts(items).map(loadFont));
    const S = Math.min(W(), H());
    const objs = items.map(it => {
      const spec = { ...it };
      if (relativeY) spec.y = 0.5 + ((it.y || 0) * S) / H();
      return fromSpec(spec, W(), H());
    }).filter(Boolean);
    objs.forEach(o => canvas.add(o));
    selectObjects(objs);
    afterAdd();
  }

  function selectObjects(objs) {
    canvas.discardActiveObject();
    if (objs.length === 1) canvas.setActiveObject(objs[0]);
    else if (objs.length > 1) canvas.setActiveObject(new fabric.ActiveSelection(objs, { canvas }));
    canvas.requestRenderAll();
  }

  function afterAdd() {
    if (isMobile()) closePanel();
  }

  function addText(preset) {
    addItems(preset.items, true);
  }

  function shapeObject(shape, fill) {
    const size = Math.min(W(), H()) * 0.3;
    const common = {
      left: W() / 2, top: H() / 2, originX: 'center', originY: 'center',
      fill: shape.outline ? 'transparent' : fill,
      stroke: shape.outline ? fill : null,
      strokeWidth: shape.outline ? Math.max(2, size * 0.04) : 0,
      strokeUniform: true,
      kind: 'shape', name: shape.name,
    };
    let o;
    if (shape.kind === 'rect') o = new fabric.Rect({ ...common, width: 100, height: 100, rx: shape.rx || 0, ry: shape.rx || 0 });
    else if (shape.kind === 'circle') o = new fabric.Circle({ ...common, radius: 50 });
    else if (shape.kind === 'triangle') o = new fabric.Triangle({ ...common, width: 100, height: 100 });
    else if (shape.kind === 'polygon') o = new fabric.Polygon(shape.points.map(p => ({ x: p.x, y: p.y })), common);
    else o = new fabric.Path(shape.path, common);
    if (shape.kind === 'rect') {
      o.set({ width: size, height: size, rx: (shape.rx || 0) * size / 100, ry: (shape.rx || 0) * size / 100 });
    } else {
      o.scaleToWidth(size);
    }
    return o;
  }

  function addShape(shape) {
    const o = shapeObject(shape, '#8c52ff');
    canvas.add(o);
    selectObjects([o]);
    afterAdd();
  }

  function addLine(line) {
    const len = W() * 0.4;
    const sw = Math.max(3, Math.min(W(), H()) * 0.008);
    let o;
    if (line.arrow) {
      const s = sw * 3;
      o = new fabric.Path(`M 0 ${s} L ${len} ${s} M ${len - s * 1.6} 0 L ${len} ${s} L ${len - s * 1.6} ${s * 2}`, {
        fill: '', stroke: '#111111', strokeWidth: sw, strokeLineCap: 'round', strokeLineJoin: 'round',
        strokeUniform: true, kind: 'arrow', name: 'Pfeil',
      });
    } else {
      o = new fabric.Line([0, 0, len, 0], {
        stroke: '#111111', strokeWidth: sw, strokeUniform: true,
        strokeDashArray: line.dash ? line.dash.map(d => d * sw / 6) : null,
        strokeLineCap: line.round ? 'round' : 'butt',
        kind: 'line', name: line.name,
      });
    }
    o.set({ left: W() / 2, top: H() / 2, originX: 'center', originY: 'center' });
    canvas.add(o);
    selectObjects([o]);
    afterAdd();
  }

  function addEmoji(ch) {
    addItems([{ t: 'emoji', text: ch, size: 0.18 }], true);
  }

  // ---------------------------------------------------------------- Bilder

  function readFileAsDataURL(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(r.error);
      r.readAsDataURL(file);
    });
  }

  function loadImageEl(src) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = src;
    });
  }

  // Große Bilder verkleinern: spart Speicher und hält WebGL-Filter innerhalb der Texturgröße.
  async function normalizeImage(dataUrl, type) {
    const img = await loadImageEl(dataUrl);
    const scale = Math.min(1, MAX_UPLOAD_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    if (scale === 1 && !/svg/.test(type)) return { src: dataUrl, w: img.naturalWidth, h: img.naturalHeight };
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const keepAlpha = /png|gif|webp|svg/.test(type);
    return { src: c.toDataURL(keepAlpha ? 'image/png' : 'image/jpeg', 0.9), w: c.width, h: c.height };
  }

  async function uploadFiles(files, addToCanvas) {
    const imgs = [...files].filter(f => f.type.startsWith('image/'));
    if (!imgs.length) { toast('Bitte wähle eine Bilddatei.'); return; }
    for (const file of imgs) {
      try {
        const raw = await readFileAsDataURL(file);
        const norm = await normalizeImage(raw, file.type);
        const rec = { id: uid(), src: norm.src, w: norm.w, h: norm.h, name: file.name, created: Date.now() };
        await Store.put('uploads', rec);
        if (addToCanvas && state.design) await addImage(norm.src);
      } catch (e) {
        console.error(e);
        toast('Bild konnte nicht geladen werden.');
      }
    }
    if (state.panel === 'uploads') renderPanel();
  }

  function fabricImage(src) {
    return new Promise((res, rej) => {
      fabric.Image.fromURL(src, img => (img && img.width ? res(img) : rej(new Error('Bild konnte nicht geladen werden'))), { crossOrigin: 'anonymous' });
    });
  }

  async function addImage(src) {
    const img = await fabricImage(src);
    const scale = Math.min((W() * 0.6) / img.width, (H() * 0.6) / img.height, 1 / 0.6);
    img.set({
      left: W() / 2, top: H() / 2, originX: 'center', originY: 'center',
      scaleX: scale, scaleY: scale, kind: 'image', name: 'Bild',
    });
    canvas.add(img);
    selectObjects([img]);
    afterAdd();
    return img;
  }

  async function setBackgroundImage(src) {
    const img = await fabricImage(src);
    const scale = Math.max(W() / img.width, H() / img.height);
    img.set({
      left: W() / 2, top: H() / 2, originX: 'center', originY: 'center',
      scaleX: scale, scaleY: scale, isBgImage: true, name: 'Hintergrundbild',
    });
    decorate(img);
    state.loading = true;
    const old = getBgImage();
    if (old) canvas.remove(old);
    canvas.insertAt(img, 1);
    state.loading = false;
    canvas.requestRenderAll();
    commit();
    if (state.panel === 'background') renderPanel();
  }

  function removeBackgroundImage() {
    const old = getBgImage();
    if (old) { canvas.remove(old); commit(); }
    if (state.panel === 'background') renderPanel();
  }

  const FILTER_PRESETS = [
    { id: 'none', name: 'Original' },
    { id: 'grayscale', name: 'S/W', make: () => new fabric.Image.filters.Grayscale() },
    { id: 'sepia', name: 'Sepia', make: () => new fabric.Image.filters.Sepia() },
    { id: 'vintage', name: 'Vintage', make: () => new fabric.Image.filters.Vintage() },
    { id: 'kodachrome', name: 'Retro', make: () => new fabric.Image.filters.Kodachrome() },
    { id: 'polaroid', name: 'Polaroid', make: () => new fabric.Image.filters.Polaroid() },
    { id: 'technicolor', name: 'Technicolor', make: () => new fabric.Image.filters.Technicolor() },
    { id: 'invert', name: 'Invertiert', make: () => new fabric.Image.filters.Invert() },
  ];

  function applyImageAdjust(img) {
    const a = img.adjust || {};
    const F = fabric.Image.filters;
    const filters = [];
    const preset = FILTER_PRESETS.find(p => p.id === a.preset);
    if (preset && preset.make) filters.push(preset.make());
    if (a.brightness) filters.push(new F.Brightness({ brightness: a.brightness / 200 }));
    if (a.contrast) filters.push(new F.Contrast({ contrast: a.contrast / 150 }));
    if (a.saturation) filters.push(new F.Saturation({ saturation: a.saturation / 100 }));
    if (a.blur) filters.push(new F.Blur({ blur: a.blur / 200 }));
    img.filters = filters;
    img.applyFilters();
    canvas.requestRenderAll();
  }

  function applyImageMask(img) {
    const m = img.mask || { shape: 'none' };
    const minSide = Math.min(img.width, img.height);
    if (m.shape === 'rounded') {
      const r = (m.radius == null ? 20 : m.radius) / 100 * minSide / 2;
      img.clipPath = new fabric.Rect({ width: img.width, height: img.height, rx: r, ry: r, originX: 'center', originY: 'center' });
    } else if (m.shape === 'circle') {
      img.clipPath = new fabric.Circle({ radius: minSide / 2, originX: 'center', originY: 'center' });
    } else {
      img.clipPath = null;
    }
    img.dirty = true;
    canvas.requestRenderAll();
  }

  // ---------------------------------------------------------------- Aktionen auf der Auswahl

  const active = () => canvas.getActiveObject();

  function eachSelected(fn) {
    const a = active();
    if (!a) return;
    if (a.type === 'activeSelection') a.getObjects().forEach(fn);
    else fn(a);
  }

  function deleteSelection() {
    const objs = canvas.getActiveObjects().filter(o => !o.locked);
    if (!objs.length) return;
    canvas.discardActiveObject();
    state.loading = true;
    objs.forEach(o => canvas.remove(o));
    state.loading = false;
    canvas.requestRenderAll();
    commit();
  }

  function cloneObject(o) {
    return new Promise(res => o.clone(c => res(c), EXTRA));
  }

  async function duplicateSelection(offset) {
    const a = active();
    if (!a) return;
    const d = offset == null ? Math.min(W(), H()) * 0.03 : offset;
    const clone = await cloneObject(a);
    canvas.discardActiveObject();
    state.loading = true;
    let added = [];
    if (clone.type === 'activeSelection') {
      clone.canvas = canvas;
      clone.forEachObject(o => { o.id = uid(); o.locked = false; decorate(o); canvas.add(o); added.push(o); });
      clone.set({ left: clone.left + d, top: clone.top + d });
      clone.setCoords();
      state.loading = false;
      canvas.setActiveObject(clone);
    } else {
      clone.set({ left: clone.left + d, top: clone.top + d, id: uid(), locked: false });
      decorate(clone);
      canvas.add(clone);
      added = [clone];
      state.loading = false;
      canvas.setActiveObject(clone);
    }
    canvas.requestRenderAll();
    commit();
  }

  async function copySelection() {
    const a = active();
    if (a) state.clipboard = await cloneObject(a);
  }

  async function pasteClipboard() {
    if (!state.clipboard) return;
    const clone = await cloneObject(state.clipboard);
    const d = Math.min(W(), H()) * 0.03;
    state.clipboard.set({ left: state.clipboard.left + d, top: state.clipboard.top + d });
    canvas.discardActiveObject();
    state.loading = true;
    clone.set({ left: clone.left + d, top: clone.top + d });
    if (clone.type === 'activeSelection') {
      clone.canvas = canvas;
      clone.forEachObject(o => { o.id = uid(); decorate(o); canvas.add(o); });
      clone.setCoords();
    } else {
      clone.id = uid();
      decorate(clone);
      canvas.add(clone);
    }
    state.loading = false;
    canvas.setActiveObject(clone);
    canvas.requestRenderAll();
    commit();
  }

  function toggleLock() {
    const a = active();
    if (!a) return;
    const lock = !a.locked;
    eachSelected(o => { o.locked = lock; applyLock(o); });
    if (a.type === 'activeSelection') { a.locked = lock; applyLock(a); }
    canvas.requestRenderAll();
    commit();
    renderToolbar();
  }

  function arrange(where) {
    const a = active();
    if (!a) return;
    const objs = a.type === 'activeSelection' ? a.getObjects() : [a];
    const min = baseIndex();
    const max = canvas.getObjects().length - 1;
    const sorted = objs.slice().sort((x, y) => canvas.getObjects().indexOf(x) - canvas.getObjects().indexOf(y));
    const order = where === 'front' || where === 'forward' ? sorted.reverse() : sorted;
    order.forEach(o => {
      const i = canvas.getObjects().indexOf(o);
      let target = i;
      if (where === 'front') target = max;
      else if (where === 'back') target = min;
      else if (where === 'forward') target = Math.min(max, i + 1);
      else if (where === 'backward') target = Math.max(min, i - 1);
      canvas.moveTo(o, target);
    });
    canvas.requestRenderAll();
    commit();
  }

  function alignToPage(where) {
    const a = active();
    if (!a) return;
    const r = a.getBoundingRect(true, true);
    let dx = 0, dy = 0;
    if (where === 'left') dx = -r.left;
    if (where === 'centerH') dx = W() / 2 - (r.left + r.width / 2);
    if (where === 'right') dx = W() - (r.left + r.width);
    if (where === 'top') dy = -r.top;
    if (where === 'centerV') dy = H() / 2 - (r.top + r.height / 2);
    if (where === 'bottom') dy = H() - (r.top + r.height);
    a.set({ left: a.left + dx, top: a.top + dy });
    a.setCoords();
    canvas.requestRenderAll();
    commit();
  }

  function flip(axis) {
    const a = active();
    if (!a) return;
    if (axis === 'x') a.set('flipX', !a.flipX); else a.set('flipY', !a.flipY);
    canvas.requestRenderAll();
    commit();
  }

  function groupSelection() {
    const a = active();
    if (!a || a.type !== 'activeSelection') return;
    a.toGroup();
    const g = active();
    g.set({ id: uid(), name: 'Gruppe', kind: 'group' });
    decorate(g);
    canvas.requestRenderAll();
    commit();
    renderToolbar();
  }

  function ungroupSelection() {
    const a = active();
    if (!a || a.type !== 'group') return;
    a.toActiveSelection();
    active().getObjects().forEach(decorate);
    canvas.requestRenderAll();
    commit();
    renderToolbar();
  }

  function startTextEdit(o) {
    if (!o || o.type !== 'textbox' || o.locked) return;
    canvas.setActiveObject(o);
    o.enterEditing();
    o.selectAll();
    if (o.hiddenTextarea) o.hiddenTextarea.focus();
    canvas.requestRenderAll();
  }

  // Textattribute: während der Bearbeitung nur auf den markierten Text, sonst aufs ganze Objekt.
  function setTextProp(o, prop, value) {
    if (o.isEditing && o.selectionStart !== o.selectionEnd) {
      o.setSelectionStyles({ [prop]: value });
    } else {
      o.set(prop, value);
      if (o.styles && Object.keys(o.styles).length && o.removeStyle) o.removeStyle(prop);
    }
    o.initDimensions && o.initDimensions();
    o.setCoords();
    o.dirty = true;
  }

  function textValue(o, prop) {
    if (o.isEditing && o.selectionStart !== o.selectionEnd) {
      const st = o.getSelectionStyles(o.selectionStart, o.selectionStart + 1)[0];
      if (st && st[prop] != null) return st[prop];
    }
    return o[prop];
  }

  function applyEffect(o, effect, intensity, color) {
    const isText = o.type === 'textbox' || o.type === 'text';
    const base = isText ? o.fontSize : Math.max(o.getScaledWidth(), o.getScaledHeight()) / 4;
    const k = (intensity == null ? 50 : intensity) / 50;
    const prevEffect = o.effect || 'none';
    if (prevEffect === 'hollow' && effect !== 'hollow' && isText) o.set('fill', o.stroke || '#111111');
    o.set({ shadow: null });
    if (isText) o.set({ stroke: null, strokeWidth: 0 });
    if (effect === 'shadow') {
      o.set('shadow', new fabric.Shadow({ color: color || 'rgba(0,0,0,0.45)', blur: base * 0.15 * k, offsetX: base * 0.06 * k, offsetY: base * 0.06 * k }));
    } else if (effect === 'glow') {
      const c = color || (typeof o.fill === 'string' && o.fill !== 'transparent' ? o.fill : '#ffffff');
      o.set('shadow', new fabric.Shadow({ color: c, blur: base * 0.35 * k, offsetX: 0, offsetY: 0 }));
    } else if (effect === 'outline' && isText) {
      o.set({ stroke: color || '#111111', strokeWidth: Math.max(1, base * 0.035 * k), paintFirst: 'stroke' });
    } else if (effect === 'hollow' && isText) {
      const c = color || (typeof o.fill === 'string' && o.fill !== 'transparent' ? o.fill : '#111111');
      o.set({ fill: 'transparent', stroke: c, strokeWidth: Math.max(1, base * 0.025 * k), paintFirst: 'fill' });
    }
    o.effect = effect;
    o.effectIntensity = intensity;
    o.dirty = true;
    canvas.requestRenderAll();
  }

  // ---------------------------------------------------------------- Popover & Dialoge

  let popoverAnchor = null;

  function openPopover(anchor, content, opts) {
    const pop = $('#popover');
    if (popoverAnchor === anchor && !pop.hidden) { closePopover(); return; }
    pop.innerHTML = '';
    pop.className = 'popover' + (opts && opts.wide ? ' wide' : '');
    pop.append(content);
    pop.hidden = false;
    popoverAnchor = anchor;
    if (isMobile()) {
      pop.style.left = ''; pop.style.top = '';
      pop.classList.add('sheet');
      return;
    }
    const r = anchor.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let left = r.left + r.width / 2 - pw / 2;
    left = clamp(left, 8, window.innerWidth - pw - 8);
    let top = r.bottom + 8;
    if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 8);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }

  function closePopover() {
    const pop = $('#popover');
    if (!pop.hidden) { pop.hidden = true; pop.innerHTML = ''; }
    popoverAnchor = null;
  }

  function modal(content) {
    const m = $('#modal');
    const body = $('#modalBody');
    body.innerHTML = '';
    body.append(content);
    m.hidden = false;
    return () => { m.hidden = true; body.innerHTML = ''; };
  }

  function confirmDialog(text, okLabel) {
    return new Promise(res => {
      let close;
      const done = v => { close(); res(v); };
      close = modal(h('div', { class: 'dialog' },
        h('p', null, text),
        h('div', { class: 'dialog-actions' },
          h('button', { class: 'btn btn-light', onclick: () => done(false) }, 'Abbrechen'),
          h('button', { class: 'btn btn-primary', onclick: () => done(true) }, okLabel || 'OK'))));
    });
  }

  // Farbwähler: Dokumentfarben, Standardpalette, optional Verläufe, eigene Farbe.
  function colorPicker(current, opts, onChange) {
    opts = opts || {};
    const docColors = new Set();
    canvas.getObjects().forEach(o => {
      [o.fill, o.stroke].forEach(c => { if (typeof c === 'string' && c && c !== 'transparent' && c[0] === '#') docColors.add(c.toLowerCase()); });
    });
    const curHex = typeof current === 'string' ? toHex(current) : '#000000';
    const swatch = (c, title) => h('button', {
      class: 'swatch' + (typeof current === 'string' && toHex(current) === toHex(c) ? ' selected' : ''),
      style: { background: c }, title: title || c,
      onclick: () => { onChange(c, true); closePopover(); },
    });
    const native = h('input', { type: 'color', value: curHex, class: 'native-color' });
    const hex = h('input', { type: 'text', value: curHex, class: 'hex-input', maxLength: 7, spellcheck: false });
    native.addEventListener('input', () => { hex.value = native.value; onChange(native.value, false); });
    native.addEventListener('change', () => onChange(native.value, true));
    hex.addEventListener('change', () => {
      const v = hex.value.trim();
      if (/^#?[0-9a-f]{6}$/i.test(v)) { const c = v[0] === '#' ? v : '#' + v; native.value = c; onChange(c, true); }
    });
    return h('div', { class: 'color-picker' },
      h('div', { class: 'pop-title' }, opts.title || 'Farbe'),
      h('div', { class: 'custom-color' }, h('label', { class: 'native-wrap', title: 'Eigene Farbe', style: { background: curHex } }, native), hex),
      opts.allowNone ? h('button', { class: 'btn btn-light btn-sm full', onclick: () => { onChange(null, true); closePopover(); } }, 'Keine Farbe') : null,
      docColors.size ? [h('div', { class: 'pop-sub' }, 'Dokumentfarben'), h('div', { class: 'swatches' }, [...docColors].slice(0, 12).map(c => swatch(c)))] : null,
      h('div', { class: 'pop-sub' }, 'Standardfarben'),
      h('div', { class: 'swatches' }, D.COLORS.map(c => swatch(c))),
      opts.gradient ? [
        h('div', { class: 'pop-sub' }, 'Farbverläufe'),
        h('div', { class: 'swatches' }, D.GRADIENTS.map(g => h('button', {
          class: 'swatch', style: { background: `linear-gradient(135deg, ${g[0]}, ${g[1]})` }, title: 'Verlauf',
          onclick: () => { onChange({ gradient: g, angle: 135 }, true); closePopover(); },
        }))),
      ] : null);
  }

  function slider(label, value, min, max, step, onInput, onChange, fmt) {
    const out = h('span', { class: 'slider-val' }, fmt ? fmt(value) : value);
    const input = h('input', { type: 'range', min, max, step: step || 1, value });
    input.addEventListener('input', () => { out.textContent = fmt ? fmt(+input.value) : input.value; onInput(+input.value); });
    input.addEventListener('change', () => onChange && onChange(+input.value));
    return h('label', { class: 'slider' }, h('span', { class: 'slider-head' }, h('span', null, label), out), input);
  }

  // ---------------------------------------------------------------- Werkzeugleiste

  function tbBtn(iconName, title, onClick, opts) {
    opts = opts || {};
    const b = h('button', {
      class: 'tb-btn' + (opts.active ? ' active' : '') + (opts.label ? ' with-label' : ''),
      title, 'aria-label': title,
      html: (iconName ? icon(iconName) : '') + (opts.label ? `<span>${opts.label}</span>` : ''),
    });
    b.addEventListener('click', e => onClick(e, b));
    if (opts.disabled) b.disabled = true;
    return b;
  }
  const tbSep = () => h('span', { class: 'tb-sep' });

  function fillSwatchBtn(title, fill, onClick, textMode) {
    const b = h('button', { class: 'tb-btn swatch-btn' + (textMode ? ' text-color' : ''), title, 'aria-label': title });
    if (textMode) {
      b.innerHTML = '<span class="tc-letter">A</span>';
      b.append(h('span', { class: 'tc-bar', style: { background: fillToCss(fill) } }));
    } else {
      b.append(h('span', { class: 'tb-swatch', style: { background: fillToCss(fill) } }));
    }
    b.addEventListener('click', () => onClick(b));
    return b;
  }

  function openColorFor(anchor, getVal, setVal, opts) {
    openPopover(anchor, colorPicker(getVal(), opts, (v, final) => {
      setVal(v);
      canvas.requestRenderAll();
      const sw = anchor.querySelector('.tb-swatch, .tc-bar');
      if (sw) sw.style.background = fillToCss(makeFill(v));
      if (final) commit();
    }));
  }

  function renderToolbar() {
    const tb = $('#toolbar');
    if (!tb || !canvas) return;
    tb.innerHTML = '';
    const a = active();
    const items = [];

    if (!a) {
      const bg = getBg();
      items.push(fillSwatchBtn('Hintergrundfarbe', bg && bg.fill, b =>
        openColorFor(b, () => getBg().fill, v => getBg().set('fill', makeFill(v || '#ffffff')), { gradient: true, title: 'Hintergrundfarbe' })));
      items.push(h('span', { class: 'tb-label' }, 'Hintergrund'));
      items.push(tbSep());
      items.push(tbBtn('resize', 'Größe ändern', () => openResizeDialog(), { label: 'Größe ändern' }));
      if (getBgImage()) items.push(tbBtn('trash', 'Hintergrundbild entfernen', removeBackgroundImage, { label: 'Hintergrundbild entfernen' }));
      tb.append(...items);
      return;
    }

    const isSel = a.type === 'activeSelection';
    const isText = a.type === 'textbox';
    const isImage = a.type === 'image';
    const isLine = a.kind === 'line' || a.kind === 'arrow';
    const isEmoji = a.kind === 'emoji';
    const isGroup = a.type === 'group';
    const isShape = !isSel && !isText && !isImage && !isLine && !isEmoji && !isGroup;

    if (isText) items.push(...textTools(a));
    if (isShape) items.push(...shapeTools(a));
    if (isLine) items.push(...lineTools(a));
    if (isImage) items.push(...imageTools(a));
    if (isSel) {
      items.push(tbBtn('group', 'Gruppieren (Strg+G)', groupSelection, { label: 'Gruppieren' }));
      items.push(tbSep());
    }
    if (isGroup) {
      items.push(tbBtn('ungroup', 'Gruppierung aufheben', ungroupSelection, { label: 'Gruppierung aufheben' }));
      items.push(tbSep());
    }

    // Allgemeine Werkzeuge
    items.push(tbBtn('opacity', 'Transparenz', (e, b) => openPopover(b, h('div', { class: 'pop-pad' },
      h('div', { class: 'pop-title' }, 'Transparenz'),
      slider('Deckkraft', Math.round((a.opacity == null ? 1 : a.opacity) * 100), 0, 100, 1,
        v => { a.set('opacity', v / 100); canvas.requestRenderAll(); }, () => commit(), v => v + ' %')))));
    if (!isSel && !isLine && !isImage) {
      items.push(tbBtn('sparkles', 'Effekte', (e, b) => openPopover(b, effectsPanel(a)), { label: isMobile() ? null : 'Effekte' }));
    }
    items.push(tbBtn('position', 'Position & Ebene', (e, b) => openPopover(b, positionPanel()), { label: isMobile() ? null : 'Position' }));
    items.push(tbSep());
    items.push(tbBtn('copy', 'Duplizieren (Strg+D)', () => duplicateSelection()));
    items.push(tbBtn(a.locked ? 'lock' : 'unlock', a.locked ? 'Entsperren' : 'Sperren', toggleLock, { active: a.locked }));
    items.push(tbBtn('trash', 'Löschen (Entf)', deleteSelection, { disabled: !!a.locked }));
    tb.append(...items);
  }

  function textTools(o) {
    const items = [];
    const family = textValue(o, 'fontFamily');
    const fontBtn = h('button', { class: 'tb-btn font-btn', title: 'Schriftart', style: { fontFamily: `"${family}"` } }, h('span', null, family), h('span', { html: icon('down', 14) }));
    fontBtn.addEventListener('click', () => openPopover(fontBtn, fontPanel(o, fontBtn), { wide: true }));
    items.push(fontBtn);

    const sizeOf = () => Math.round(textValue(o, 'fontSize') * o.scaleY);
    const sizeInput = h('input', { class: 'size-input', type: 'number', min: 1, max: 2000, value: sizeOf(), title: 'Schriftgröße' });
    const setSize = v => {
      v = clamp(Math.round(v), 1, 2000);
      setTextProp(o, 'fontSize', v / o.scaleY);
      sizeInput.value = v;
      canvas.requestRenderAll();
      commit();
    };
    sizeInput.addEventListener('change', () => setSize(+sizeInput.value));
    sizeInput.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') sizeInput.blur(); });
    const step = () => Math.max(1, Math.round(sizeOf() * 0.1));
    items.push(h('div', { class: 'size-group' },
      tbBtn('minus', 'Kleiner', () => setSize(sizeOf() - step())),
      sizeInput,
      tbBtn('plus', 'Größer', () => setSize(sizeOf() + step()))));

    items.push(fillSwatchBtn('Textfarbe', textValue(o, 'fill'), b =>
      openColorFor(b, () => textValue(o, 'fill'), v => setTextProp(o, 'fill', makeFill(v || '#111111')), { gradient: !o.isEditing, title: 'Textfarbe' }), true));

    const toggle = (iconName, title, prop, on, off) => tbBtn(iconName, title, (e, b) => {
      const isOn = textValue(o, prop) === on;
      setTextProp(o, prop, isOn ? off : on);
      b.classList.toggle('active', !isOn);
      canvas.requestRenderAll();
      commit();
    }, { active: textValue(o, prop) === on });
    items.push(toggle('bold', 'Fett (Strg+B)', 'fontWeight', 'bold', 'normal'));
    items.push(toggle('italic', 'Kursiv (Strg+I)', 'fontStyle', 'italic', 'normal'));
    items.push(toggle('underline', 'Unterstrichen (Strg+U)', 'underline', true, false));

    const aligns = ['left', 'center', 'right', 'justify'];
    items.push(tbBtn(o.textAlign || 'left', 'Ausrichtung', (e, b) => {
      const next = aligns[(aligns.indexOf(o.textAlign) + 1) % aligns.length];
      o.set('textAlign', next);
      b.innerHTML = icon(next);
      canvas.requestRenderAll();
      commit();
    }));
    items.push(tbBtn('spacing', 'Abstand', (e, b) => openPopover(b, h('div', { class: 'pop-pad' },
      h('div', { class: 'pop-title' }, 'Abstand'),
      slider('Zeichenabstand', o.charSpacing || 0, -200, 1000, 10, v => { o.set('charSpacing', v); canvas.requestRenderAll(); }, () => commit()),
      slider('Zeilenabstand', o.lineHeight || 1.16, 0.5, 3, 0.01, v => { o.set('lineHeight', v); canvas.requestRenderAll(); }, () => commit(), v => (+v).toFixed(2))))));
    if (isMobile()) items.push(tbBtn('edit', 'Text bearbeiten', () => startTextEdit(o)));
    items.push(tbSep());
    return items;
  }

  function fontPanel(o, btn) {
    const search = h('input', { class: 'search', type: 'search', placeholder: 'Schriftart suchen' });
    const list = h('div', { class: 'font-list' });
    const current = textValue(o, 'fontFamily');
    const renderList = () => {
      const q = search.value.trim().toLowerCase();
      list.innerHTML = '';
      D.FONTS.filter(f => !q || f.name.toLowerCase().includes(q)).forEach(f => {
        list.append(h('button', {
          class: 'font-item' + (f.name === current ? ' selected' : ''),
          style: { fontFamily: `"${f.name}"` },
          onclick: async () => {
            await loadFont(f.name);
            setTextProp(o, 'fontFamily', f.name);
            canvas.requestRenderAll();
            commit();
            btn.style.fontFamily = `"${f.name}"`;
            btn.firstChild.textContent = f.name;
            closePopover();
          },
        }, f.name));
      });
    };
    search.addEventListener('input', renderList);
    search.addEventListener('keydown', e => e.stopPropagation());
    renderList();
    return h('div', { class: 'font-panel' }, search, list);
  }

  function shapeTools(o) {
    const items = [];
    const hasFill = o.fill && o.fill !== 'transparent';
    items.push(fillSwatchBtn('Füllfarbe', o.fill, b =>
      openColorFor(b, () => o.fill, v => o.set('fill', makeFill(v || 'transparent')), { gradient: true, allowNone: true, title: 'Füllfarbe' })));
    items.push(tbBtn('border', 'Rahmen', (e, b) => openPopover(b, h('div', { class: 'pop-pad' },
      h('div', { class: 'pop-title' }, 'Rahmen'),
      slider('Stärke', Math.round(o.strokeWidth || 0), 0, 60, 1, v => {
        o.set({ strokeWidth: v, stroke: o.stroke || '#111111', strokeUniform: true });
        canvas.requestRenderAll();
      }, () => commit()),
      h('div', { class: 'pop-sub' }, 'Rahmenfarbe'),
      h('div', { class: 'swatches' }, D.COLORS.map(c => h('button', {
        class: 'swatch', style: { background: c },
        onclick: () => { o.set({ stroke: c, strokeWidth: o.strokeWidth || 4, strokeUniform: true }); canvas.requestRenderAll(); commit(); },
      }))),
      h('div', { class: 'pop-sub' }, 'Linienart'),
      h('div', { class: 'seg' },
        [['Durchgezogen', null], ['Gestrichelt', [12, 8]], ['Gepunktet', [2, 6]]].map(([label, dash]) =>
          h('button', { class: 'btn btn-light btn-sm', onclick: () => { o.set('strokeDashArray', dash && dash.map(d => d * Math.max(1, (o.strokeWidth || 4) / 4))); canvas.requestRenderAll(); commit(); } }, label)))))));
    if (o.type === 'rect') {
      items.push(tbBtn('corner', 'Eckenradius', (e, b) => {
        const maxR = Math.round(Math.min(o.width, o.height) / 2);
        openPopover(b, h('div', { class: 'pop-pad' },
          h('div', { class: 'pop-title' }, 'Ecken abrunden'),
          slider('Radius', Math.round(o.rx || 0), 0, maxR, 1, v => { o.set({ rx: v, ry: v }); canvas.requestRenderAll(); }, () => commit())));
      }));
    }
    if (!hasFill && !o.strokeWidth) items.push(h('span', { class: 'tb-label' }, 'unsichtbar'));
    items.push(tbSep());
    return items;
  }

  function lineTools(o) {
    const items = [];
    items.push(fillSwatchBtn('Linienfarbe', o.stroke, b =>
      openColorFor(b, () => o.stroke, v => o.set('stroke', v || '#111111'), { title: 'Linienfarbe' })));
    items.push(tbBtn('sliders', 'Linienstärke & Stil', (e, b) => openPopover(b, h('div', { class: 'pop-pad' },
      h('div', { class: 'pop-title' }, 'Linie'),
      slider('Stärke', Math.round(o.strokeWidth), 1, 80, 1, v => {
        const ratio = v / (o.strokeWidth || 1);
        o.set('strokeWidth', v);
        if (o.strokeDashArray) o.set('strokeDashArray', o.strokeDashArray.map(d => d * ratio));
        canvas.requestRenderAll();
      }, () => commit()),
      o.kind === 'line' ? [h('div', { class: 'pop-sub' }, 'Linienart'), h('div', { class: 'seg' },
        [['Durchgezogen', null, 'butt'], ['Gestrichelt', [4, 2.4], 'butt'], ['Gepunktet', [0.01, 2.4], 'round']].map(([label, dash, cap]) =>
          h('button', { class: 'btn btn-light btn-sm', onclick: () => {
            o.set({ strokeDashArray: dash && dash.map(d => d * o.strokeWidth), strokeLineCap: cap });
            canvas.requestRenderAll(); commit();
          } }, label)))] : null))));
    items.push(tbSep());
    return items;
  }

  function imageTools(img) {
    const items = [];
    items.push(tbBtn('sliders', 'Bild bearbeiten', (e, b) => openPopover(b, imageAdjustPanel(img), { wide: true }), { label: 'Bearbeiten' }));
    items.push(tbBtn('corner', 'Form', (e, b) => openPopover(b, imageMaskPanel(img)), { label: isMobile() ? null : 'Form' }));
    items.push(tbBtn('image', 'Als Hintergrund verwenden', async () => {
      const src = img.getSrc();
      canvas.remove(img);
      await setBackgroundImage(src);
    }, { label: isMobile() ? null : 'Als Hintergrund' }));
    items.push(tbSep());
    return items;
  }

  function imageAdjustPanel(img) {
    img.adjust = img.adjust || {};
    const a = img.adjust;
    const presets = h('div', { class: 'filter-grid' }, FILTER_PRESETS.map(p => {
      const b = h('button', { class: 'filter-btn' + ((a.preset || 'none') === p.id ? ' selected' : '') }, p.name);
      b.addEventListener('click', () => {
        a.preset = p.id;
        presets.querySelectorAll('.filter-btn').forEach(x => x.classList.remove('selected'));
        b.classList.add('selected');
        applyImageAdjust(img);
        commit();
      });
      return b;
    }));
    const s = (label, key, min, max) => slider(label, a[key] || 0, min, max, 1, v => { a[key] = v; applyImageAdjust(img); }, () => commit());
    return h('div', { class: 'pop-pad' },
      h('div', { class: 'pop-title' }, 'Filter'),
      presets,
      h('div', { class: 'pop-title' }, 'Anpassen'),
      s('Helligkeit', 'brightness', -100, 100),
      s('Kontrast', 'contrast', -100, 100),
      s('Sättigung', 'saturation', -100, 100),
      s('Unschärfe', 'blur', 0, 100),
      h('button', { class: 'btn btn-light btn-sm full', onclick: () => { img.adjust = {}; applyImageAdjust(img); commit(); closePopover(); } }, 'Zurücksetzen'));
  }

  function imageMaskPanel(img) {
    const m = img.mask || { shape: 'none', radius: 20 };
    const set = patch => { img.mask = { ...m, ...img.mask, ...patch }; applyImageMask(img); };
    return h('div', { class: 'pop-pad' },
      h('div', { class: 'pop-title' }, 'Form'),
      h('div', { class: 'seg' },
        [['none', 'Original'], ['rounded', 'Abgerundet'], ['circle', 'Kreis']].map(([shape, label]) =>
          h('button', { class: 'btn btn-light btn-sm', onclick: () => { set({ shape }); commit(); } }, label))),
      slider('Eckenradius', m.radius == null ? 20 : m.radius, 0, 100, 1, v => set({ shape: 'rounded', radius: v }), () => commit(), v => v + ' %'));
  }

  function effectsPanel(o) {
    const isText = o.type === 'textbox' || o.type === 'text';
    const effects = isText
      ? [['none', 'Keiner'], ['shadow', 'Schatten'], ['glow', 'Leuchten'], ['outline', 'Kontur'], ['hollow', 'Hohl']]
      : [['none', 'Keiner'], ['shadow', 'Schatten'], ['glow', 'Leuchten']];
    let current = o.effect || 'none';
    let intensity = o.effectIntensity == null ? 50 : o.effectIntensity;
    let color = null;
    const grid = h('div', { class: 'effect-grid' });
    const renderGrid = () => {
      grid.innerHTML = '';
      effects.forEach(([id, label]) => grid.append(h('button', {
        class: 'effect-btn' + (current === id ? ' selected' : ''),
        onclick: () => { current = id; color = null; applyEffect(o, id, intensity, null); renderGrid(); commit(); },
      }, h('span', { class: 'effect-preview fx-' + id }, 'Ag'), label)));
    };
    renderGrid();
    return h('div', { class: 'pop-pad' },
      h('div', { class: 'pop-title' }, 'Effekte'),
      grid,
      slider('Intensität', intensity, 0, 100, 1, v => { intensity = v; if (current !== 'none') applyEffect(o, current, v, color); }, () => commit()),
      h('div', { class: 'pop-sub' }, 'Effektfarbe'),
      h('div', { class: 'swatches' }, ['rgba(0,0,0,0.45)', ...D.COLORS.slice(5)].map(c => h('button', {
        class: 'swatch', style: { background: c },
        onclick: () => { color = c; if (current === 'none') current = 'shadow'; applyEffect(o, current, intensity, c); renderGrid(); commit(); },
      }))));
  }

  function positionPanel() {
    const btn = (iconName, label, fn) => h('button', { class: 'pos-btn', onclick: fn, html: icon(iconName) + `<span>${label}</span>` });
    return h('div', { class: 'pop-pad' },
      h('div', { class: 'pop-title' }, 'Ebene'),
      h('div', { class: 'pos-grid' },
        btn('up', 'Nach vorne', () => arrange('forward')),
        btn('down', 'Nach hinten', () => arrange('backward')),
        btn('toFront', 'Ganz nach vorne', () => arrange('front')),
        btn('toBack', 'Ganz nach hinten', () => arrange('back'))),
      h('div', { class: 'pop-title' }, 'An Seite ausrichten'),
      h('div', { class: 'pos-grid three' },
        btn('aLeft', 'Links', () => alignToPage('left')),
        btn('aCenterH', 'Mitte', () => alignToPage('centerH')),
        btn('aRight', 'Rechts', () => alignToPage('right')),
        btn('aTop', 'Oben', () => alignToPage('top')),
        btn('aCenterV', 'Mittig', () => alignToPage('centerV')),
        btn('aBottom', 'Unten', () => alignToPage('bottom'))),
      h('div', { class: 'pop-title' }, 'Spiegeln'),
      h('div', { class: 'pos-grid' },
        btn('flipH', 'Horizontal', () => flip('x')),
        btn('flipV', 'Vertikal', () => flip('y'))));
  }

  // ---------------------------------------------------------------- Seitenpanels

  const PANELS = {
    templates: 'Vorlagen', text: 'Text', elements: 'Elemente',
    uploads: 'Uploads', background: 'Hintergrund', layers: 'Ebenen',
  };

  function openPanel(name) {
    if (state.panel === name && !$('#panel').hidden) { closePanel(); return; }
    state.panel = name;
    $('#panel').hidden = false;
    document.querySelectorAll('.rail-btn').forEach(b => b.classList.toggle('active', b.dataset.panel === name));
    renderPanel();
    if (!isMobile() && state.fitMode) requestAnimationFrame(fitZoom);
  }

  function closePanel() {
    state.panel = null;
    $('#panel').hidden = true;
    document.querySelectorAll('.rail-btn').forEach(b => b.classList.remove('active'));
    if (!isMobile() && state.fitMode) requestAnimationFrame(fitZoom);
  }

  function renderPanel() {
    const name = state.panel;
    if (!name) return;
    $('#panelTitle').textContent = PANELS[name];
    const c = $('#panelContent');
    const scroll = c.scrollTop;
    c.innerHTML = '';
    const builders = { templates: templatesPanel, text: textPanel, elements: elementsPanel, uploads: uploadsPanel, background: backgroundPanel, layers: layersPanel };
    c.append(builders[name]());
    c.scrollTop = scroll;
  }

  // Vorschaubilder für Vorlagen/Textkombinationen werden einmalig gerendert und gecacht.
  const previewCache = new Map();
  async function renderPreview(key, items, bg, w, hgt, thumbW) {
    if (previewCache.has(key)) return previewCache.get(key);
    const p = (async () => {
      await Promise.all(specFonts(items).map(loadFont));
      const z = thumbW / w;
      const sc = new fabric.StaticCanvas(null, { width: Math.round(w * z), height: Math.round(hgt * z), enableRetinaScaling: false });
      sc.setZoom(z);
      if (bg) {
        const r = new fabric.Rect({ left: 0, top: 0, width: w, height: hgt, strokeWidth: 0 });
        applyBgSpec(r, bg);
        sc.add(r);
      }
      items.forEach(it => { const o = fromSpec(it, w, hgt); if (o) sc.add(o); });
      sc.renderAll();
      const url = sc.toDataURL({ format: 'png' });
      sc.dispose();
      return url;
    })();
    previewCache.set(key, p);
    return p;
  }

  function previewImg(promise, cls) {
    const img = h('img', { class: cls || '', alt: '' });
    promise.then(u => { img.src = u; }).catch(() => {});
    return img;
  }

  function templatesPanel() {
    const w = W(), hh = H();
    return h('div', null,
      h('p', { class: 'panel-hint' }, `Passend für ${w} × ${hh} px. Eine Vorlage ersetzt den aktuellen Inhalt.`),
      h('div', { class: 'tpl-grid', style: { gridTemplateColumns: w / hh > 1.3 ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))' } }, D.TEMPLATES.map(t =>
        h('button', {
          class: 'tpl-card', title: t.name,
          onclick: async () => {
            if (contentObjects().length && !(await confirmDialog('Vorlage anwenden? Der aktuelle Inhalt wird ersetzt (du kannst es mit „Rückgängig“ zurückholen).', 'Anwenden'))) return;
            await applyTemplate(t);
            afterAdd();
          },
        }, previewImg(renderPreview(`${t.id}-${w}x${hh}`, t.items, t.bg, w, hh, 300)), h('span', null, t.name)))));
  }

  function textPanel() {
    const S = 1000;
    return h('div', null,
      h('button', { class: 'btn btn-primary full', onclick: () => addText(D.TEXT_PRESETS[2]), html: icon('type', 18) + '<span>Textfeld hinzufügen</span>' }),
      h('div', { class: 'panel-sub' }, 'Standard-Textstile'),
      D.TEXT_PRESETS.map(p => h('button', { class: 'text-preset', style: { cssText: p.css }, onclick: () => addText(p) }, p.label)),
      h('div', { class: 'panel-sub' }, 'Schriftkombinationen'),
      h('div', { class: 'combo-grid' }, D.TEXT_COMBOS.map(c => {
        const items = c.items.map(it => ({ ...it, y: 0.5 + (it.y || 0) }));
        const dark = c.items.some(it => it.shadow);
        return h('button', { class: 'combo-card' + (dark ? ' dark' : ''), onclick: () => addItems(c.items, true) },
          previewImg(renderPreview('combo-' + c.id, items, null, S, S, 240)));
      })));
  }

  function shapeSvg(path, outline) {
    return `<svg viewBox="-4 -4 108 108" width="100%" height="100%"><path d="${path}" fill="${outline ? 'none' : 'currentColor'}" stroke="currentColor" stroke-width="${outline ? 6 : 0}"/></svg>`;
  }

  function elementsPanel() {
    const lineSvg = l => l.arrow
      ? '<svg viewBox="0 0 100 40" width="100%" height="100%"><path d="M6 20H92M78 8l14 12-14 12" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : `<svg viewBox="0 0 100 40" width="100%" height="100%"><path d="M6 20H94" stroke="currentColor" stroke-width="5" stroke-linecap="${l.round ? 'round' : 'butt'}" ${l.dash ? `stroke-dasharray="${l.round ? '0.1 10' : '14 8'}"` : ''}/></svg>`;
    return h('div', null,
      h('div', { class: 'panel-sub' }, 'Formen'),
      h('div', { class: 'shape-grid' }, D.SHAPES.map(s => h('button', { class: 'shape-btn', title: s.name, html: shapeSvg(s.preview, s.outline), onclick: () => addShape(s) }))),
      h('div', { class: 'panel-sub' }, 'Linien'),
      h('div', { class: 'line-grid' }, D.LINES.map(l => h('button', { class: 'shape-btn line', title: l.name, html: lineSvg(l), onclick: () => addLine(l) }))),
      h('div', { class: 'panel-sub' }, 'Emojis & Sticker'),
      h('div', { class: 'emoji-grid' }, D.EMOJIS.map(e => h('button', { class: 'emoji-btn', onclick: () => addEmoji(e) }, e))));
  }

  function uploadsPanel() {
    const grid = h('div', { class: 'upload-grid' });
    Store.all('uploads').then(list => {
      list.sort((a, b) => b.created - a.created);
      if (!list.length) grid.append(h('p', { class: 'panel-hint' }, 'Noch keine Uploads. Lade Fotos, Logos oder Grafiken hoch – oder ziehe sie direkt auf die Arbeitsfläche.'));
      list.forEach(u => grid.append(h('div', { class: 'upload-item' },
        h('button', { class: 'upload-thumb', title: 'Einfügen', onclick: () => addImage(u.src) }, h('img', { src: u.src, alt: u.name || '' })),
        h('button', { class: 'upload-del', title: 'Aus Uploads löschen', html: icon('close', 14), onclick: async () => {
          if (await confirmDialog('Diesen Upload löschen?', 'Löschen')) { await Store.del('uploads', u.id); renderPanel(); }
        } }))));
    });
    return h('div', null,
      h('button', { class: 'btn btn-primary full', onclick: () => $('#fileInput').click(), html: icon('upload', 18) + '<span>Dateien hochladen</span>' }),
      grid);
  }

  function backgroundPanel() {
    const setBg = v => { getBg().set('fill', makeFill(v)); canvas.requestRenderAll(); };
    const bgFill = getBg() && getBg().fill;
    const native = h('input', { type: 'color', value: toHex(typeof bgFill === 'string' ? bgFill : '#ffffff'), class: 'native-color' });
    native.addEventListener('input', () => setBg(native.value));
    native.addEventListener('change', () => commit());
    const uploads = h('div', { class: 'upload-grid small' });
    Store.all('uploads').then(list => {
      list.sort((a, b) => b.created - a.created).forEach(u => uploads.append(
        h('button', { class: 'upload-thumb', title: 'Als Hintergrund', onclick: () => setBackgroundImage(u.src) }, h('img', { src: u.src, alt: '' }))));
      if (!list.length) uploads.append(h('p', { class: 'panel-hint' }, 'Lade unter „Uploads“ ein Bild hoch, um es als Hintergrund zu verwenden.'));
    });
    return h('div', null,
      h('div', { class: 'panel-sub' }, 'Farbe'),
      h('div', { class: 'swatches big' },
        h('label', { class: 'swatch native-wrap rainbow', title: 'Eigene Farbe' }, native),
        D.COLORS.map(c => h('button', { class: 'swatch', style: { background: c }, title: c, onclick: () => { setBg(c); commit(); } }))),
      h('div', { class: 'panel-sub' }, 'Farbverläufe'),
      h('div', { class: 'swatches big' }, D.GRADIENTS.map(g => h('button', {
        class: 'swatch', style: { background: `linear-gradient(135deg, ${g[0]}, ${g[1]})` },
        onclick: () => { setBg({ gradient: g, angle: 135 }); commit(); },
      }))),
      h('div', { class: 'panel-sub' }, 'Bild als Hintergrund'),
      getBgImage() ? h('button', { class: 'btn btn-light full', onclick: removeBackgroundImage }, 'Hintergrundbild entfernen') : null,
      uploads);
  }

  function objectLabel(o) {
    if (o.type === 'textbox') return '„' + (o.text || '').replace(/\s+/g, ' ').slice(0, 28) + '“';
    if (o.kind === 'emoji') return 'Emoji ' + o.text;
    if (o.name) return o.name;
    if (o.type === 'image') return 'Bild';
    if (o.type === 'group') return 'Gruppe';
    return 'Form';
  }

  function objectIcon(o) {
    if (o.type === 'textbox') return 'type';
    if (o.type === 'image') return 'image';
    if (o.type === 'group') return 'group';
    if (o.kind === 'line' || o.kind === 'arrow') return 'minus';
    return 'shapes';
  }

  function layersPanel() {
    const objs = contentObjects().slice().reverse();
    if (!objs.length) return h('p', { class: 'panel-hint' }, 'Noch keine Elemente auf der Seite.');
    const selected = new Set(canvas.getActiveObjects());
    return h('div', { class: 'layer-list' }, objs.map(o => {
      const row = h('div', { class: 'layer' + (selected.has(o) ? ' selected' : '') + (o.visible === false ? ' hidden-obj' : '') });
      const name = h('button', { class: 'layer-name', html: icon(objectIcon(o), 16) });
      name.append(h('span', null, objectLabel(o)));
      name.addEventListener('click', () => { if (o.visible !== false) { canvas.setActiveObject(o); canvas.requestRenderAll(); } });
      const act = (ic, title, fn) => h('button', { class: 'layer-act', title, html: icon(ic, 16), onclick: e => { e.stopPropagation(); fn(); } });
      row.append(name,
        act(o.visible === false ? 'eyeOff' : 'eye', o.visible === false ? 'Einblenden' : 'Ausblenden', () => {
          o.visible = o.visible === false;
          if (!o.visible && canvas.getActiveObjects().includes(o)) canvas.discardActiveObject();
          canvas.requestRenderAll(); commit(); renderPanel();
        }),
        act(o.locked ? 'lock' : 'unlock', o.locked ? 'Entsperren' : 'Sperren', () => { o.locked = !o.locked; applyLock(o); canvas.requestRenderAll(); commit(); renderToolbar(); }),
        act('up', 'Nach vorne', () => { canvas.setActiveObject(o); arrange('forward'); }),
        act('down', 'Nach hinten', () => { canvas.setActiveObject(o); arrange('backward'); }));
      return row;
    }));
  }

  // ---------------------------------------------------------------- Größe ändern & Export

  function openResizeDialog() {
    let close;
    const wIn = h('input', { type: 'number', min: 50, max: 5000, value: W() });
    const hIn = h('input', { type: 'number', min: 50, max: 5000, value: H() });
    const apply = () => {
      const nw = clamp(+wIn.value || W(), 50, 5000), nh = clamp(+hIn.value || H(), 50, 5000);
      close();
      resizeDesign(nw, nh);
    };
    close = modal(h('div', { class: 'dialog' },
      h('h3', null, 'Größe ändern'),
      h('div', { class: 'format-list' }, D.FORMATS.map(f => h('button', {
        class: 'format-row' + (f.w === W() && f.h === H() ? ' selected' : ''),
        onclick: () => { wIn.value = f.w; hIn.value = f.h; },
      }, h('span', null, f.name), h('span', { class: 'muted' }, `${f.w} × ${f.h}`)))),
      h('div', { class: 'size-fields' }, h('label', null, 'Breite', wIn), h('span', null, '×'), h('label', null, 'Höhe', hIn)),
      h('div', { class: 'dialog-actions' },
        h('button', { class: 'btn btn-light', onclick: () => close() }, 'Abbrechen'),
        h('button', { class: 'btn btn-primary', onclick: apply }, 'Größe ändern'))));
  }

  // Inhalte proportional an das neue Format anpassen (ähnlich „Magic Resize“).
  function resizeDesign(nw, nh) {
    const ow = W(), oh = H();
    if (nw === ow && nh === oh) return;
    const s = Math.min(nw / ow, nh / oh);
    canvas.discardActiveObject();
    state.loading = true;
    contentObjects().forEach(o => {
      const c = o.getCenterPoint();
      o.set({ scaleX: o.scaleX * s, scaleY: o.scaleY * s });
      o.setPositionByOrigin(new fabric.Point((c.x - ow / 2) * s + nw / 2, (c.y - oh / 2) * s + nh / 2), 'center', 'center');
      normalizeText(o);
      o.setCoords();
    });
    state.design.w = nw;
    state.design.h = nh;
    getBg().set({ width: nw, height: nh });
    const bgImg = getBgImage();
    if (bgImg) {
      const sc = Math.max(nw / bgImg.width, nh / bgImg.height);
      bgImg.set({ left: nw / 2, top: nh / 2, scaleX: sc, scaleY: sc });
    }
    state.loading = false;
    updateSizeInfo();
    fitZoom();
    commit();
    if (state.panel === 'templates') renderPanel();
  }

  function updateSizeInfo() { $('#sizeInfo').textContent = `${W()} × ${H()} px`; }

  function fileBaseName() {
    return ($('#designName').value.trim() || 'design').replace(/[\\/:*?"<>|]+/g, '-');
  }

  function exportDataUrl(format, scale, transparent) {
    const c = renderToCanvas(scale, { transparent: transparent && format === 'png', opaque: format !== 'png' });
    return format === 'png' ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.92);
  }

  async function exportPdf() {
    if (!window.jspdf) { toast('PDF-Export wird noch geladen …'); return null; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: W() > H() ? 'landscape' : 'portrait', unit: 'px', format: [W(), H()], hotfixes: ['px_scaling'], compress: true });
    doc.addImage(exportDataUrl('jpg', 2), 'JPEG', 0, 0, W(), H());
    return doc.output('blob');
  }

  async function dataUrlToBlob(url) { return (await fetch(url)).blob(); }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function openDownloadDialog() {
    let close;
    let format = 'png';
    let scale = 1;
    const sizeLabel = h('span', { class: 'muted' });
    const transparent = h('input', { type: 'checkbox' });
    const transRow = h('label', { class: 'check-row' }, transparent, 'Transparenter Hintergrund');
    const scaleRow = h('div', { class: 'seg' });
    const update = () => {
      sizeLabel.textContent = format === 'pdf' ? `${W()} × ${H()} px (Druckqualität)` : `${W() * scale} × ${H() * scale} px`;
      transRow.hidden = format !== 'png';
      scaleRow.hidden = format === 'pdf';
    };
    const segButtons = (container, options, get, set) => {
      container.innerHTML = '';
      options.forEach(([val, label]) => {
        const b = h('button', { class: 'btn btn-sm ' + (get() === val ? 'btn-primary' : 'btn-light') }, label);
        b.addEventListener('click', () => { set(val); segButtons(container, options, get, set); update(); });
        container.append(b);
      });
    };
    const formatRow = h('div', { class: 'seg' });
    segButtons(formatRow, [['png', 'PNG'], ['jpg', 'JPG'], ['pdf', 'PDF']], () => format, v => { format = v; });
    segButtons(scaleRow, [[1, '1×'], [2, '2×'], [3, '3×']], () => scale, v => { scale = v; });
    update();
    const go = async () => {
      close();
      try {
        const name = fileBaseName();
        let blob;
        if (format === 'pdf') blob = await exportPdf();
        else blob = await dataUrlToBlob(exportDataUrl(format, scale, transparent.checked));
        if (!blob) return;
        const filename = `${name}.${format}`;
        if (Bridge.hasNativeHost()) {
          const dataUrl = await blobToDataUrl(blob);
          Bridge.send({ type: 'design-editor:download', filename, mimeType: blob.type, dataUrl, width: W() * (format === 'pdf' ? 1 : scale), height: H() * (format === 'pdf' ? 1 : scale) });
          toast('An die App übergeben');
        } else {
          downloadBlob(blob, filename);
        }
      } catch (e) {
        console.error(e);
        toast('Export fehlgeschlagen');
      }
    };
    close = modal(h('div', { class: 'dialog' },
      h('h3', null, 'Herunterladen'),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Dateityp'), formatRow),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Größe'), scaleRow, sizeLabel),
      transRow,
      h('div', { class: 'dialog-actions' },
        h('button', { class: 'btn btn-light', onclick: () => close() }, 'Abbrechen'),
        h('button', { class: 'btn btn-primary', onclick: go, html: icon('download', 18) + '<span>Herunterladen</span>' }))));
  }

  function blobToDataUrl(blob) {
    return new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
  }

  async function shareDesign() {
    try {
      const blob = await dataUrlToBlob(exportDataUrl('png', 1));
      const file = new File([blob], fileBaseName() + '.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: fileBaseName() });
      } else {
        downloadBlob(blob, file.name);
      }
    } catch (e) {
      if (e && e.name !== 'AbortError') toast('Teilen nicht möglich');
    }
  }

  // ---------------------------------------------------------------- App-Bridge (Einbettung in native Apps / WebViews)

  const Bridge = {
    embedded: params.get('embed') === '1',
    hasNativeHost() {
      return !!(window.Android || window.ReactNativeWebView || (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) ||
        window.DesignEditorChannel || (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.designEditor) ||
        window.parent !== window);
    },
    send(payload) {
      const json = JSON.stringify(payload);
      const tryCall = fn => { try { fn(); } catch (e) { console.warn(e); } };
      // Android WebView: addJavascriptInterface(obj, "Android") mit @JavascriptInterface onDesignExported(String)
      if (window.Android && typeof window.Android.onDesignExported === 'function') tryCall(() => window.Android.onDesignExported(json));
      // React Native WebView
      if (window.ReactNativeWebView) tryCall(() => window.ReactNativeWebView.postMessage(json));
      // Flutter: flutter_inappwebview bzw. webview_flutter JavaScriptChannel "DesignEditorChannel"
      if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) tryCall(() => window.flutter_inappwebview.callHandler('onDesignExported', payload));
      if (window.DesignEditorChannel && window.DesignEditorChannel.postMessage) tryCall(() => window.DesignEditorChannel.postMessage(json));
      // iOS WKWebView: userContentController.add(self, name: "designEditor")
      if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.designEditor) tryCall(() => window.webkit.messageHandlers.designEditor.postMessage(payload));
      // iframe-Einbettung
      if (window.parent !== window) tryCall(() => window.parent.postMessage(payload, '*'));
      window.dispatchEvent(new CustomEvent('design-editor:export', { detail: payload }));
    },
  };

  async function finishAndSend() {
    await saveDesign();
    const format = params.get('exportFormat') === 'jpg' ? 'jpg' : 'png';
    const scale = clamp(+params.get('exportScale') || 1, 0.1, 4);
    Bridge.send({
      type: 'design-editor:export',
      designId: state.design.id,
      name: fileBaseName(),
      width: Math.round(W() * scale),
      height: Math.round(H() * scale),
      mimeType: format === 'png' ? 'image/png' : 'image/jpeg',
      dataUrl: exportDataUrl(format, scale),
      json: JSON.parse(state.history[state.hIndex]),
    });
    toast('Design übernommen');
  }

  // Öffentliche API für Host-Apps (z. B. evaluateJavascript)
  window.DesignEditor = {
    newDesign: (w, hgt, templateId) => createDesign({ w, h: hgt, template: templateId }),
    openDesign: id => { location.hash = '#/design/' + id; },
    addImage: src => state.design && addImage(src),
    setBackgroundImage: src => state.design && setBackgroundImage(src),
    addText: text => state.design && addItems([{ t: 'text', text, size: 0.07, w: 0.8, font: 'Inter', weight: 'bold' }], true),
    exportImage: (format, scale) => (state.design ? exportDataUrl(format === 'jpg' ? 'jpg' : 'png', scale || 1) : null),
    getJSON: () => (state.design ? JSON.parse(snapshot()) : null),
    loadJSON: async json => { if (state.design) { await Promise.all(fontsInJSON(json).map(loadFont)); await loadJSON(json); commit(); } },
    finish: () => state.design && finishAndSend(),
  };

  window.addEventListener('message', e => {
    const d = e.data;
    if (!d || typeof d !== 'object' || typeof d.type !== 'string' || !d.type.startsWith('design-editor:')) return;
    if (d.type === 'design-editor:add-image' && d.src) window.DesignEditor.addImage(d.src);
    if (d.type === 'design-editor:set-background' && d.src) window.DesignEditor.setBackgroundImage(d.src);
    if (d.type === 'design-editor:add-text' && d.text) window.DesignEditor.addText(d.text);
    if (d.type === 'design-editor:load' && d.json) window.DesignEditor.loadJSON(d.json);
    if (d.type === 'design-editor:new') window.DesignEditor.newDesign(d.width || 1080, d.height || 1080, d.template);
    if (d.type === 'design-editor:finish') window.DesignEditor.finish();
  });

  // ---------------------------------------------------------------- Startseite

  function formatPreviewBox(w, hgt, max) {
    const s = max / Math.max(w, hgt);
    return h('span', { class: 'format-box', style: { width: Math.round(w * s) + 'px', height: Math.round(hgt * s) + 'px' } });
  }

  function renderHome() {
    const fg = $('#formatGrid');
    fg.innerHTML = '';
    D.FORMATS.forEach(f => fg.append(h('button', { class: 'format-card', onclick: () => createDesign({ w: f.w, h: f.h, name: f.name }) },
      h('span', { class: 'format-visual' }, formatPreviewBox(f.w, f.h, 54)),
      h('span', { class: 'format-name' }, f.name),
      h('span', { class: 'format-size' }, `${f.w} × ${f.h}`))));

    const tg = $('#homeTemplates');
    tg.innerHTML = '';
    D.TEMPLATES.forEach(t => tg.append(h('button', { class: 'tpl-card', onclick: () => createDesign({ w: 1080, h: 1080, template: t.id, name: t.name }) },
      previewImg(renderPreview(`${t.id}-1080x1080`, t.items, t.bg, 1080, 1080, 300)), h('span', null, t.name))));

    const dg = $('#designGrid');
    dg.innerHTML = '';
    Store.all('designs').then(list => {
      list.sort((a, b) => (b.updated || 0) - (a.updated || 0));
      $('#designsTitle').hidden = !list.length;
      list.forEach(d => {
        const card = h('div', { class: 'design-card' },
          h('button', { class: 'design-thumb', onclick: () => { location.hash = '#/design/' + d.id; } },
            d.thumb ? h('img', { src: d.thumb, alt: '' }) : null),
          h('div', { class: 'design-meta' },
            h('div', null,
              h('div', { class: 'design-title' }, d.name || 'Unbenannt'),
              h('div', { class: 'muted' }, `${d.w} × ${d.h} · ${new Date(d.updated || d.created).toLocaleDateString('de-DE')}`)),
            h('div', { class: 'design-actions' },
              h('button', { class: 'icon-btn', title: 'Duplizieren', html: icon('copy', 18), onclick: async () => {
                await Store.put('designs', { ...d, id: uid(), name: d.name + ' (Kopie)', created: Date.now(), updated: Date.now() });
                renderHome();
              } }),
              h('button', { class: 'icon-btn', title: 'Löschen', html: icon('trash', 18), onclick: async () => {
                if (await confirmDialog(`„${d.name}“ endgültig löschen?`, 'Löschen')) { await Store.del('designs', d.id); renderHome(); }
              } }))));
        dg.append(card);
      });
    });
  }

  async function createDesign(opts) {
    const w = clamp(Math.round(+opts.w || 1080), 50, 5000);
    const hgt = clamp(Math.round(+opts.h || 1080), 50, 5000);
    const rec = { id: uid(), name: opts.name || 'Unbenanntes Design', w, h: hgt, created: Date.now(), updated: Date.now(), json: null, template: opts.template || null };
    await Store.put('designs', rec);
    const target = '#/design/' + rec.id;
    if (location.hash === target) route(); else location.hash = target;
  }

  // ---------------------------------------------------------------- Editor öffnen

  async function openDesign(id) {
    const rec = await Store.get('designs', id);
    if (!rec) { toast('Design nicht gefunden'); location.hash = '#/'; return; }
    $('#home').hidden = true;
    $('#editor').hidden = false;
    if (!canvas) { initCanvas(); initPinchZoom(); }
    closePopover();
    state.design = { id: rec.id, name: rec.name, w: rec.w, h: rec.h, created: rec.created };
    $('#designName').value = rec.name;
    setSaveState('');
    updateSizeInfo();
    fitZoom();

    if (rec.json) {
      await Promise.all(fontsInJSON(rec.json).map(loadFont));
      await loadJSON(rec.json);
    } else {
      state.loading = true;
      canvas.clear();
      canvas.add(createBg('#ffffff'));
      state.loading = false;
      const tpl = rec.template && D.TEMPLATES.find(t => t.id === rec.template);
      if (tpl) await applyTemplate(tpl);
    }
    resetHistory();
    renderToolbar();
    if (state.panel) renderPanel();
    else if (!isMobile() && !rec.json && !rec.template) openPanel('templates');
    if (!rec.json) saveDesign();
  }

  function route() {
    const m = location.hash.match(/^#\/design\/([\w-]+)/);
    closePopover();
    if (m) {
      openDesign(m[1]);
    } else {
      if (state.design) { saveDesign(); state.design = null; }
      $('#editor').hidden = true;
      $('#home').hidden = false;
      renderHome();
    }
  }

  // ---------------------------------------------------------------- Tastatur, Zwischenablage, Drag & Drop

  function isTyping(e) {
    const t = e.target;
    const a = canvas && canvas.getActiveObject();
    return (a && a.isEditing) || (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable));
  }

  function onKeyDown(e) {
    if ($('#editor').hidden || !canvas) return;
    if (!$('#modal').hidden) { if (e.key === 'Escape') { $('#modal').hidden = true; } return; }
    if (e.key === 'Escape' && !$('#popover').hidden) { closePopover(); return; }
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (mod && key === 's') { e.preventDefault(); saveDesign(); return; }
    if (isTyping(e)) {
      if (e.key === 'Escape') { const a = active(); if (a && a.isEditing) { a.exitEditing(); canvas.requestRenderAll(); } }
      return;
    }
    const a = active();
    if (mod && key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
    if ((mod && key === 'y') || (mod && key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); return; }
    if (mod && key === 'c') { copySelection(); return; }
    if (mod && key === 'x') { copySelection().then(deleteSelection); return; }
    if (mod && key === 'd') { e.preventDefault(); duplicateSelection(); return; }
    if (mod && key === 'a') {
      e.preventDefault();
      const objs = contentObjects().filter(o => o.visible !== false && !o.locked);
      selectObjects(objs);
      return;
    }
    if (mod && key === 'g') { e.preventDefault(); if (e.shiftKey) ungroupSelection(); else groupSelection(); return; }
    if (mod && (key === '+' || key === '=')) { e.preventDefault(); setZoom(state.zoom * 1.2); return; }
    if (mod && key === '-') { e.preventDefault(); setZoom(state.zoom / 1.2); return; }
    if (mod && key === '0') { e.preventDefault(); fitZoom(); return; }
    if (!a) return;
    if (a.type === 'textbox' && mod && ['b', 'i', 'u'].includes(key)) {
      e.preventDefault();
      const map = { b: ['fontWeight', 'bold', 'normal'], i: ['fontStyle', 'italic', 'normal'], u: ['underline', true, false] };
      const [prop, on, off] = map[key];
      setTextProp(a, prop, a[prop] === on ? off : on);
      canvas.requestRenderAll(); commit(); renderToolbar();
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelection(); return; }
    if (e.key === 'Escape') { canvas.discardActiveObject(); canvas.requestRenderAll(); return; }
    if (e.key === 'Enter' && a.type === 'textbox') { e.preventDefault(); startTextEdit(a); return; }
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (arrows[e.key] && !a.locked) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      a.set({ left: a.left + arrows[e.key][0] * step, top: a.top + arrows[e.key][1] * step });
      a.setCoords();
      canvas.requestRenderAll();
      commitSoon(400);
    }
  }

  function onPaste(e) {
    if ($('#editor').hidden || !canvas || isTyping(e)) return;
    const files = [...(e.clipboardData ? e.clipboardData.files : [])].filter(f => f.type.startsWith('image/'));
    if (files.length) { e.preventDefault(); uploadFiles(files, true); return; }
    if (state.clipboard) { e.preventDefault(); pasteClipboard(); }
  }

  function initDragDrop() {
    const overlay = $('#dropOverlay');
    let depth = 0;
    const hasFiles = e => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
    window.addEventListener('dragenter', e => { if (!hasFiles(e) || $('#editor').hidden) return; depth++; overlay.hidden = false; });
    window.addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) overlay.hidden = true; });
    window.addEventListener('dragover', e => { if (hasFiles(e)) e.preventDefault(); });
    window.addEventListener('drop', e => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      overlay.hidden = true;
      if (!$('#editor').hidden) uploadFiles(e.dataTransfer.files, true);
    });
  }

  // ---------------------------------------------------------------- Initialisierung

  function initUI() {
    document.querySelectorAll('[data-icon]').forEach(el => el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon)));
    $('#btnHome').addEventListener('click', () => { location.hash = '#/'; });
    $('#btnUndo').addEventListener('click', undo);
    $('#btnRedo').addEventListener('click', redo);
    $('#btnDownload').addEventListener('click', openDownloadDialog);
    $('#btnDone').addEventListener('click', finishAndSend);
    $('#btnShare').addEventListener('click', shareDesign);
    $('#zoomIn').addEventListener('click', () => setZoom(state.zoom * 1.2));
    $('#zoomOut').addEventListener('click', () => setZoom(state.zoom / 1.2));
    $('#zoomValue').addEventListener('click', fitZoom);
    $('#panelClose').addEventListener('click', closePanel);
    $('#panelGrip').addEventListener('click', closePanel);
    document.querySelectorAll('.rail-btn').forEach(b => b.addEventListener('click', () => openPanel(b.dataset.panel)));
    $('#designName').addEventListener('change', () => { if (state.design) { state.design.name = $('#designName').value; saveSoon(); } });
    $('#designName').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
    $('#fileInput').addEventListener('change', e => { uploadFiles(e.target.files, true); e.target.value = ''; });
    $('#customSizeForm').addEventListener('submit', e => {
      e.preventDefault();
      const f = new FormData(e.target);
      createDesign({ w: f.get('w'), h: f.get('h'), name: 'Eigenes Format' });
    });
    $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') $('#modal').hidden = true; });

    document.addEventListener('pointerdown', e => {
      const pop = $('#popover');
      if (pop.hidden) return;
      if (pop.contains(e.target) || (popoverAnchor && popoverAnchor.contains(e.target))) return;
      closePopover();
    }, true);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('paste', onPaste);
    initDragDrop();

    // Klick in den grauen Bereich hebt die Auswahl auf.
    $('#workspace').addEventListener('pointerdown', e => {
      if (canvas && (e.target.id === 'workspace' || e.target.id === 'stage')) { canvas.discardActiveObject(); canvas.requestRenderAll(); }
    });

    window.addEventListener('resize', debounce(() => { if (canvas && state.design && state.fitMode) fitZoom(); }, 150));
    window.addEventListener('beforeunload', () => { if (state.design) saveDesign(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && state.design) saveDesign(); });

    if (Bridge.embedded) {
      document.body.classList.add('embedded');
      $('#btnDone').hidden = false;
    }
    if (navigator.share && !Bridge.hasNativeHost()) $('#btnShare').hidden = false;
  }

  async function boot() {
    initUI();
    window.addEventListener('hashchange', route);
    // Direkteinstieg per URL: ?format=story | ?w=1080&h=1080, optional &template=sale
    const fmt = D.FORMATS.find(f => f.id === params.get('format'));
    const w = +params.get('w') || (fmt && fmt.w);
    const hgt = +params.get('h') || (fmt && fmt.h);
    if (w && hgt && !location.hash.startsWith('#/design/')) {
      const startKey = 'design-editor-start:' + location.search;
      // Beim Neuladen nicht jedes Mal ein neues Design anlegen.
      const existing = sessionStorageGet(startKey);
      if (existing && (await Store.get('designs', existing))) { location.replace('#/design/' + existing); route(); return; }
      const before = location.hash;
      await createDesign({ w, h: hgt, template: params.get('template'), name: params.get('name') || (fmt && fmt.name) });
      const m = location.hash.match(/^#\/design\/([\w-]+)/);
      if (m) sessionStorageSet(startKey, m[1]);
      if (before === location.hash) route();
      return;
    }
    route();
  }

  function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* egal */ } }

  boot();
})();
