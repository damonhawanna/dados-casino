(function () {
  'use strict';

  var KEY = 'dados-casino.v1';
  var THEMES = ['noche', 'rojo', 'esmeralda'];
  var FACE = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
  var ROLL_MS = 1000;
  var STAGGER = 110;
  var HISTORY_MAX = 18;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    root: document.documentElement,
    metaTheme: $('metaTheme'),
    netState: $('netState'),
    btnSound: $('btnSound'),
    btnInstall: $('btnInstall'),
    btnTheme: $('btnTheme'),
    btnRoll: $('btnRoll'),
    btnReset: $('btnReset'),
    switchEl: $('switch'),
    dice: $('dice'),
    total: $('total'),
    detail: $('detail'),
    readoutLabel: $('readoutLabel'),
    flash: $('flash'),
    sparkles: $('sparkles'),
    history: $('history'),
    stats: $('stats'),
    panelFoot: $('panelFoot'),
    panel: document.querySelector('.panel'),
    panelToggle: $('panelToggle'),
    hint: $('hint'),
    toast: $('toast')
  };

  var slots = Array.prototype.map.call(el.dice.querySelectorAll('.die-slot'), function (slot) {
    return {
      slot: slot,
      die: slot.querySelector('.die'),
      pips: [],
      value: null
    };
  });
  slots.forEach(function (s) {
    for (var i = 1; i <= 9; i++) {
      var pip = document.createElement('span');
      pip.className = 'pip';
      pip.dataset.i = String(i);
      s.die.querySelector('.die-face').appendChild(pip);
      s.pips.push(pip);
    }
  });

  var state = {
    mode: 'two',
    theme: 'noche',
    sound: true,
    rolling: false,
    total: 0,
    history: [],
    counts: {},
    rolls: 0,
    sum: 0
  };

  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { }
    if (!raw) return;
    var data;
    try { data = JSON.parse(raw); } catch (e) { return; }
    if (!data) return;
    if (data.mode === 'one' || data.mode === 'two') state.mode = data.mode;
    if (THEMES.indexOf(data.theme) > -1) state.theme = data.theme;
    if (typeof data.sound === 'boolean') state.sound = data.sound;
    if (Array.isArray(data.history)) state.history = data.history.slice(0, HISTORY_MAX);
    if (data.counts && typeof data.counts === 'object') state.counts = data.counts;
    if (typeof data.rolls === 'number') state.rolls = data.rolls;
    if (typeof data.sum === 'number') state.sum = data.sum;
    if (!state.sum && state.rolls) {
      Object.keys(state.counts).forEach(function (k) { state.sum += state.counts[k] * Number(k); });
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        mode: state.mode,
        theme: state.theme,
        sound: state.sound,
        history: state.history,
        counts: state.counts,
        rolls: state.rolls,
        sum: state.sum
      }));
    } catch (e) { }
  }

  /* ---------- audio ---------- */
  var actx = null;
  var noise = null;

  function audio() {
    if (!state.sound) return null;
    if (!actx) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      actx = new Ctx();
      var len = Math.floor(actx.sampleRate * 0.22);
      noise = actx.createBuffer(1, len, actx.sampleRate);
      var d = noise.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }

  function clack(pitch, gain) {
    var ctx = audio();
    if (!ctx) return;
    var t = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = noise;
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1500 * pitch;
    bp.Q.value = 1.1;
    var g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    src.connect(bp); bp.connect(g); g.connect(ctx.destination);
    src.start(t); src.stop(t + 0.14);

    var osc = ctx.createOscillator();
    var og = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210 * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(90 * pitch, t + 0.1);
    og.gain.setValueAtTime(gain * 0.9, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    osc.connect(og); og.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.13);
  }

  function chime() {
    var ctx = audio();
    if (!ctx) return;
    var t = ctx.currentTime;
    [880, 1174.7, 1567.98].forEach(function (f, i) {
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.075, t + 0.02 + i * 0.055);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55 + i * 0.06);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.7);
    });
  }

  function buzz() {
    var ctx = audio();
    if (!ctx) return;
    var t = ctx.currentTime;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.3);
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    o.connect(lp); lp.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + 0.36);
  }

  function vibrate(p) {
    if (navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { } }
  }

  /* ---------- dice render ---------- */
  function setFace(s, value) {
    s.value = value;
    var on = FACE[value] || [];
    s.pips.forEach(function (pip, idx) {
      pip.classList.toggle('on', on.indexOf(idx + 1) > -1);
    });
  }

  function activeCount() { return state.mode === 'one' ? 1 : 2; }
  function range() { return state.mode === 'one' ? [1, 2, 3, 4, 5, 6] : [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; }
  function d() { return Math.floor(Math.random() * 6) + 1; }

  /* ---------- total readout ---------- */
  var countTimer = null, countGuard = null;
  function paintTotal(target, animate) {
    clearTimeout(countTimer);
    clearTimeout(countGuard);
    if (!animate || reduceMotion) {
      state.total = target;
      el.total.textContent = String(target);
      return;
    }
    var from = state.total;
    var start = performance.now();
    var dur = 480;
    (function step(now) {
      var p = Math.min(1, (now - start) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.total.textContent = String(Math.round(from + (target - from) * e));
      if (p < 1) countTimer = requestAnimationFrame(step);
      else state.total = target;
    })(start);
    countGuard = setTimeout(function () {
      state.total = target;
      el.total.textContent = String(target);
    }, dur + 80);
    el.total.classList.remove('bump');
    void el.total.offsetWidth;
    el.total.classList.add('bump');
  }

  /* ---------- effects ---------- */
  function flash(text) {
    el.flash.textContent = text;
    el.flash.classList.remove('show');
    void el.flash.offsetWidth;
    el.flash.classList.add('show');
  }

  function sparkle(count) {
    if (reduceMotion) return;
    var box = el.sparkles;
    box.innerHTML = '';
    for (var i = 0; i < count; i++) {
      var s = document.createElement('span');
      s.className = 'spark';
      var ang = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      var dist = 60 + Math.random() * 110;
      s.style.left = '50%';
      s.style.top = '46%';
      s.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      s.style.setProperty('--dy', (Math.sin(ang) * dist - 40) + 'px');
      s.style.setProperty('--dur', (700 + Math.random() * 500) + 'ms');
      s.style.width = s.style.height = (3 + Math.random() * 4) + 'px';
      box.appendChild(s);
    }
    setTimeout(function () { box.innerHTML = ''; }, 1300);
  }

  var toastTimer = null;
  function toast(html, ms) {
    el.toast.innerHTML = html;
    el.toast.hidden = false;
    requestAnimationFrame(function () { el.toast.classList.add('show'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.toast.classList.remove('show');
      setTimeout(function () { el.toast.hidden = true; }, 320);
    }, ms || 3200);
  }

  /* ---------- roll ---------- */
  function roll() {
    if (state.rolling) return;
    state.rolling = true;
    el.btnRoll.disabled = true;
    el.btnRoll.classList.add('is-rolling');
    el.flash.classList.remove('show');
    el.sparkles.innerHTML = '';
    vibrate(12);

    var n = activeCount();
    var list = [];
    for (var i = 0; i < n; i++) list.push(d(6));

    var duration = reduceMotion ? 220 : ROLL_MS;
    var stagger = reduceMotion ? 40 : STAGGER;
    var landers = [];

    for (var k = 0; k < n; k++) {
      (function (index, value) {
        var s = slots[index];
        var delay = index * stagger;
        s.die.style.animationDelay = delay + 'ms';
        s.die.classList.remove('landed');
        s.die.classList.add('rolling');

        var iv = null;
        iv = setInterval(function () {
          if (audio() && Math.random() < 0.3) clack(1.1 + Math.random() * 0.4, 0.05);
        }, 130);

        landers.push(setTimeout(function () {
          clearInterval(iv);
          s.die.classList.remove('rolling');
          s.die.style.animationDelay = '';
          setFace(s, value);
          s.die.classList.add('landed');
          clack(0.85 + index * 0.18, 0.3);
          vibrate(index === n - 1 ? [10, 40, 12] : 8);
          setTimeout(function () { s.die.classList.remove('landed'); }, 440);
        }, delay + duration));
      })(k, list[k]);
    }

    setTimeout(function () {
      state.rolling = false;
      el.btnRoll.disabled = false;
      el.btnRoll.classList.remove('is-rolling');
      resolve(list, n);
    }, duration + stagger * (n - 1) + 60);
  }

  function resolve(list, n) {
    var total = list.reduce(function (a, b) { return a + b; }, 0);
    paintTotal(total, true);
    el.detail.textContent = n === 2 ? (list[0] + ' + ' + list[1]) : 'un solo dado';
    el.detail.classList.remove('hot');

    state.rolls++;
    state.sum += total;
    state.total = total;
    state.history.unshift(total);
    if (state.history.length > HISTORY_MAX) state.history.length = HISTORY_MAX;
    var k = String(total);
    state.counts[k] = (state.counts[k] || 0) + 1;
    save();

    renderHistory();
    renderStats();

    if (n === 2) {
      if (list[0] === list[1]) {
        el.detail.classList.add('hot');
        if (total === 12) { flash('dobles de seis'); chime(); sparkle(26); }
        else if (total === 2) { flash('serpiente'); buzz(); sparkle(10); }
        else { flash('dobles'); sparkle(18); }
      } else if (total === 7) {
        flash('¡siete!');
        chime();
        sparkle(22);
      } else if (total === 8) {
        flash('ocho alto');
        sparkle(14);
      }
    } else if (total === 6) {
      flash('seis');
      sparkle(18);
    }
  }

  /* ---------- render ---------- */
  function hotValue(v, n) {
    if (n === 2) return v === 7 || v === 12;
    return v === 6;
  }

  function renderHistory() {
    el.history.innerHTML = '';
    if (!state.history.length) {
      var p = document.createElement('p');
      p.className = 'hist-empty';
      p.textContent = 'Aún no hay tiradas';
      el.history.appendChild(p);
      return;
    }
    var n = activeCount();
    state.history.forEach(function (v, i) {
      var c = document.createElement('span');
      c.className = 'hist-chip' + (hotValue(v, n) ? ' hot' : '') + (i === 0 ? ' last' : '');
      c.style.animationDelay = Math.min(i, 8) * 22 + 'ms';
      c.textContent = String(v);
      el.history.appendChild(c);
    });
  }

  function renderStats() {
    var vals = range();
    var max = 0;
    vals.forEach(function (v) { max = Math.max(max, state.counts[v] || 0); });
    var top = max > 0 ? vals.filter(function (v) { return (state.counts[v] || 0) === max && max > 0; }) : [];

    el.stats.innerHTML = '';
    vals.forEach(function (v) {
      var c = state.counts[v] || 0;
      var col = document.createElement('div');
      col.className = 'bar-col' + (top.length === 1 && v === top[0] ? ' top' : '');
      var track = document.createElement('div');
      track.className = 'bar-track';
      var fill = document.createElement('div');
      fill.className = 'bar-fill';
      fill.style.height = (max > 0 ? Math.max(3, (c / max) * 100) : 3) + '%';
      track.appendChild(fill);
      var n = document.createElement('span');
      n.className = 'bar-n';
      n.textContent = c ? String(c) : '';
      var l = document.createElement('span');
      l.className = 'bar-l';
      l.textContent = String(v);
      col.appendChild(track);
      col.appendChild(n);
      col.appendChild(l);
      el.stats.appendChild(col);
    });

    var avg = state.rolls ? (state.sum / state.rolls).toFixed(2).replace('.', ',') : '—';
    el.panelFoot.textContent = state.rolls + (state.rolls === 1 ? ' tirada' : ' tiradas') +
      (state.rolls ? ' · media ' + avg : '');
  }

  function applyMode() {
    var mode = state.mode;
    el.switchEl.dataset.mode = mode;
    el.readoutLabel.textContent = mode === 'one' ? 'Dado' : 'Total';
    Array.prototype.forEach.call(el.switchEl.querySelectorAll('.switch-btn'), function (b) {
      var on = b.dataset.mode === mode;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    el.dice.dataset.mode = mode;
    slots[1].slot.setAttribute('aria-hidden', mode === 'one' ? 'true' : 'false');
    el.detail.textContent = 'Lanza para empezar';
    el.detail.classList.remove('hot');
    el.flash.classList.remove('show');
    paintTotal(0, false);
    renderHistory();
    renderStats();
  }

  function setMode(mode) {
    if (state.mode === mode) { applyMode(); return; }
    state.mode = mode;
    if (!state.rolling) setFace(slots[1], 1);
    applyMode();
    save();
  }

  var THEMES_META = { noche: '#060b18', rojo: '#0d0507', esmeralda: '#04140f' };
  var THEME_LABEL = { noche: 'Azul noche', rojo: 'Rojo y oro', esmeralda: 'Fieltro verde' };

  function setTheme(theme) {
    state.theme = theme;
    el.root.dataset.theme = theme;
    var meta = THEMES_META[theme];
    el.metaTheme.setAttribute('content', meta);
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) {
      if (m.id !== 'metaTheme') m.setAttribute('content', meta);
    });
    el.btnTheme.title = 'Tema: ' + THEME_LABEL[theme];
    el.btnTheme.setAttribute('aria-label', el.btnTheme.title + '. Cambiar tema');
    save();
  }

  function cycleTheme() {
    var i = THEMES.indexOf(state.theme);
    var next = THEMES[(i + 1) % THEMES.length];
    setTheme(next);
    toast('Tema <b>' + THEME_LABEL[next] + '</b>', 1500);
    clack(1.3, 0.12);
  }

  function setSound(on) {
    state.sound = on;
    el.btnSound.setAttribute('aria-pressed', on ? 'true' : 'false');
    el.btnSound.title = on ? 'Sonido: activado' : 'Sonido: silenciado';
    save();
  }

  function reset() {
    if (state.rolling) return;
    state.history = [];
    state.counts = {};
    state.rolls = 0;
    state.sum = 0;
    state.total = 0;
    paintTotal(0, false);
    el.detail.textContent = 'Lanza para empezar';
    el.detail.classList.remove('hot');
    el.flash.classList.remove('show');
    renderHistory();
    renderStats();
    save();
    buzz();
  }

  /* ---------- network ---------- */
  function paintNet() {
    var on = navigator.onLine;
    el.netState.textContent = on ? 'Mesa abierta' : 'Sin conexión · funciona igual';
  }

  /* ---------- install ---------- */
  var deferred = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    el.btnInstall.hidden = false;
  });

  function standalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.navigator.standalone === true;
  }

  el.btnInstall.addEventListener('click', function () {
    if (!deferred) return;
    deferred.prompt();
    deferred.userChoice.then(function () { deferred = null; el.btnInstall.hidden = true; });
  });

  window.addEventListener('appinstalled', function () {
    deferred = null;
    el.btnInstall.hidden = true;
    toast('App instalada. Juega sin conexión.', 2600);
  });

  function iOSHint() {
    var isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!isIOS || standalone()) return;
    toast('Pulsa <b>Compartir</b> → <b>Añadir a pantalla de inicio</b>', 4600);
  }

  /* ---------- events ---------- */
  el.btnRoll.addEventListener('click', function () { audio(); roll(); });
  el.btnReset.addEventListener('click', reset);
  el.btnTheme.addEventListener('click', cycleTheme);
  el.btnSound.addEventListener('click', function () {
    setSound(!state.sound);
    if (state.sound) clack(1.2, 0.2);
  });

  el.switchEl.addEventListener('click', function (e) {
    var b = e.target.closest('.switch-btn');
    if (!b) return;
    audio();
    clack(1.25, 0.16);
    setMode(b.dataset.mode);
  });

  el.panelToggle.addEventListener('click', function () {
    var open = el.panelToggle.getAttribute('aria-expanded') === 'true';
    el.panelToggle.setAttribute('aria-expanded', open ? 'false' : 'true');
    el.panel.classList.toggle('open', !open);
  });

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      audio();
      roll();
    } else if (e.key === '1' || e.key === '2') {
      setMode(e.key === '1' ? 'one' : 'two');
      clack(1.25, 0.16);
    }
  });

  window.addEventListener('online', paintNet);
  window.addEventListener('offline', paintNet);

  document.addEventListener('pointerdown', function unlock() {
    if (state.sound) audio();
    document.removeEventListener('pointerdown', unlock);
  }, { once: true });

  /* ---------- boot ---------- */
  load();
  var q = new URLSearchParams(location.search).get('m');
  if (q === 'one' || q === 'two') state.mode = q;
  setTheme(state.theme);
  setSound(state.sound);
  applyMode();
  paintNet();

  if (location.protocol === 'file:') {
    el.hint.hidden = false;
    el.hint.innerHTML = 'Abre esta carpeta con un servidor local (por ejemplo <b>python -m http.server</b> o <b>npx serve .</b>) para activar la instalación y el modo sin conexión.';
  } else if (!standalone() && !deferred) {
    setTimeout(function () {
      if (!deferred) iOSHint();
    }, 3500);
  }

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { });
    });
  }
})();
