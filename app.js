/*
 * Slop Bowl Spinner - UI, wheel, sound and effects.
 * Everything runs in the browser. Nothing is sent anywhere; the only thing
 * stored is your settings, in this browser's localStorage.
 */
(function () {
  'use strict';

  var D = window.SLOP_DATA;
  var L = window.SlopLogic;
  var N = window.SlopNutrition;
  var CATS = D.CATEGORIES;
  var ALL = D.INGREDIENTS;

  var STORE_KEY = 'slopbowl.v1';
  var MAX_RESPINS = 3;
  var ADVANCE_MS = 1500;
  var AUTO_ADVANCE_MS = 400;
  var FRICTION = 0.975;      // per-frame-at-60fps speed retention for a normal spin
  var AUTO_FRICTION = 0.94;  // much stronger drag so auto spins stop quickly
  var SIZE = 720;
  var TAU = Math.PI * 2;
  var FONT = '"Comic Sans MS","Comic Sans","Comic Neue","Chalkboard SE",cursive';
  var COLORS = ['#ff2b2b', '#ff8c00', '#ffee00', '#22dd22', '#00d5ff', '#2a4bff', '#b030ff', '#ff30c0'];
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var byId = {};
  var catById = {};
  ALL.forEach(function (i) { byId[i.id] = i; });
  CATS.forEach(function (c) { catById[c.id] = c; });

  // ---------------------------------------------------------------- helpers
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function rand(lo, hi) { return lo + Math.random() * (hi - lo); }

  // ------------------------------------------------------------------ state
  var settings = { counts: {}, off: {}, mode: 'none', muted: false };
  var bowl = { picks: {}, rejected: new Set(), respins: MAX_RESPINS, forceCat: null, done: false, autoRun: false };
  var wheel = {
    items: [], angles: [0], labels: [], colors: [], cat: null, total: 0, msg: '',
    rot: Math.random() * TAU, omega: 0, fric: FRICTION,
    spinning: false, dragging: false, landed: false,
    lastIdx: -1, hilite: -1, hiliteUntil: 0, flap: 0,
    running: false, lastT: 0
  };
  var advanceTimer = null;
  var drag = null;
  var ui = { ranges: {}, outputs: {}, checks: {}, summaries: {} };

  function resetDefaults() {
    CATS.forEach(function (c) { settings.counts[c.id] = c.defaultCount; });
    settings.off = {};
    settings.mode = 'none';
  }
  function resetBowl() {
    CATS.forEach(function (c) { bowl.picks[c.id] = []; });
    bowl.rejected = new Set();
    bowl.respins = MAX_RESPINS;
    bowl.forceCat = null;
    bowl.done = false;
    bowl.autoRun = false;
  }
  resetDefaults();
  resetBowl();

  // ------------------------------------------------------------ persistence
  function load() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (d.counts) {
        CATS.forEach(function (c) {
          var n = Number(d.counts[c.id]);
          if (isFinite(n)) settings.counts[c.id] = clamp(Math.round(n), 0, c.max);
        });
      }
      if (Array.isArray(d.off)) {
        d.off.forEach(function (id) { if (byId[id]) settings.off[id] = true; });
      }
      if (d.mode && L.MODES[d.mode]) settings.mode = d.mode;
      settings.muted = d.muted === true;
    } catch (e) { /* storage unavailable or corrupt: use defaults */ }
  }
  function save() {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({
        counts: settings.counts,
        off: Object.keys(settings.off),
        mode: settings.mode,
        muted: settings.muted
      }));
    } catch (e) { /* ignore */ }
  }
  function clearSaved() {
    try { window.localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
  }

  // ------------------------------------------------------------------ sound
  var Sound = (function () {
    var ac = null;
    var master = null;
    var lastTick = 0;

    function ensure() {
      if (!ac) {
        try {
          var AC = window.AudioContext || window.webkitAudioContext;
          if (AC) {
            ac = new AC();
            master = ac.createGain();
            master.gain.value = 1.6;
            var comp = ac.createDynamicsCompressor();
            master.connect(comp);
            comp.connect(ac.destination);
          }
        } catch (e) { ac = null; }
      }
      if (ac && ac.state === 'suspended') { try { ac.resume(); } catch (e) { /* ignore */ } }
      return ac;
    }
    function tone(freq, delay, dur, type, vol, slideTo) {
      if (settings.muted || !ac) return;
      var t0 = ac.currentTime + delay;
      var osc = ac.createOscillator();
      var g = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    }
    return {
      ensure: ensure,
      tick: function () {
        var now = performance.now();
        if (now - lastTick < 35) return;
        lastTick = now;
        tone(rand(850, 1150), 0, 0.045, 'square', 0.16);
      },
      plop: function () { tone(520, 0, 0.18, 'sine', 0.6, 110); },
      chime: function () {
        tone(523.25, 0, 0.22, 'triangle', 0.45);
        tone(659.25, 0.09, 0.22, 'triangle', 0.45);
        tone(783.99, 0.18, 0.34, 'triangle', 0.45);
      },
      fanfare: function () {
        var notes = [523.25, 523.25, 523.25, 783.99, 659.25, 783.99, 1046.5];
        var starts = [0, 0.12, 0.24, 0.36, 0.6, 0.72, 0.9];
        notes.forEach(function (f, i) { tone(f, starts[i], i === 6 ? 0.6 : 0.16, 'square', 0.28); });
      },
      nope: function () { tone(220, 0, 0.18, 'sawtooth', 0.22, 110); }
    };
  })();

  // --------------------------------------------------------------- toast/ui
  var toastTimer = null;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  function setBanner(text) {
    var b = $('banner');
    b.textContent = text;
    if (reduceMotion) return;
    b.classList.remove('pop');
    void b.offsetWidth; // restart the animation
    b.classList.add('pop');
  }
  function setWordArt(node, text) {
    node.setAttribute('aria-label', text);
    node.textContent = '';
    for (var i = 0; i < text.length; i++) {
      var s = el('span', null, text[i]);
      s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--i', String(i));
      s.style.setProperty('--c', COLORS[i % COLORS.length]);
      node.appendChild(s);
    }
  }

  // ------------------------------------------------------- selection helpers
  function totalPicks() {
    return CATS.reduce(function (n, c) { return n + bowl.picks[c.id].length; }, 0);
  }
  function need(cat) { return settings.counts[cat] - bowl.picks[cat].length; }
  function eligCtx(cat) {
    var exclude = new Set(bowl.rejected);
    bowl.picks[cat].forEach(function (i) { exclude.add(i.id); });
    return { off: settings.off, mode: settings.mode, exclude: exclude };
  }
  function candidatesFor(cat) { return L.candidates(ALL, cat, eligCtx(cat)); }
  function currentCat() {
    var f = bowl.forceCat;
    if (f && need(f) > 0 && candidatesFor(f).length) return f;
    for (var i = 0; i < CATS.length; i++) {
      var id = CATS[i].id;
      if (need(id) > 0 && candidatesFor(id).length) return id;
    }
    return null;
  }
  function syncDone() {
    var pending = currentCat();
    if (pending && bowl.done) bowl.done = false;
    else if (!pending && totalPicks() > 0 && !bowl.done) bowl.done = true;
  }

  // ------------------------------------------------------------------ wheel
  var canvas = $('wheel');
  var ctx = canvas.getContext('2d');
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.tabIndex = 0;

  function buildWheel() {
    var cat = currentCat();
    wheel.cat = cat;
    wheel.landed = false;
    wheel.hilite = -1;
    wheel.msg = '';
    wheel.total = 0;
    if (!cat) {
      wheel.items = [];
      wheel.angles = [0];
      wheel.labels = [];
      wheel.colors = [];
      wheel.msg = bowl.done ? 'DONE!' : 'EMPTY';
    } else {
      var cands = candidatesFor(cat);
      wheel.total = cands.length;
      wheel.items = L.sampleWheel(cands, settings.mode, cands.length, Math.random);
      wheel.angles = L.sliceAngles(wheel.items);
      wheel.colors = wheel.items.map(function (_, i) { return COLORS[i % COLORS.length]; });
      var n = wheel.items.length;
      if (n > 1 && wheel.colors[n - 1] === wheel.colors[0]) wheel.colors[n - 1] = COLORS[(n + 3) % COLORS.length];
      layoutLabels();
      wheel.rot = Math.random() * TAU;
    }
    wheel.lastIdx = wheel.items.length ? L.sliceAt(wheel.angles, wheel.rot) : -1;
    updateStageUI();
    updateButtons();
    requestLoop();
  }

  function layoutLabels() {
    var R = SIZE / 2 - 46;
    var TEXT_END = R - 16;          // outer end of the label
    var MIN_R = 62;                 // keep labels off the hub
    wheel.labels = wheel.items.map(function (it, i) {
      var arc = wheel.angles[i + 1] - wheel.angles[i];
      var text = it.ing.name;
      var fs = clamp(arc * R * 0.45, 8, 26);
      var w;
      // Shrink until the label is short enough to reach only as far in as the
      // slice is still wide enough to hold the text height.
      for (var n = 0; n < 40; n++) {
        ctx.font = 'bold ' + fs + 'px ' + FONT;
        w = ctx.measureText(text).width;
        var inner = TEXT_END - w;
        var room = arc * Math.max(inner, 1) * 0.9;
        if (inner >= MIN_R && fs * 1.05 <= room) break;
        if (fs > 11) fs *= 0.93;
        else if (text.length > 5) text = text.slice(0, -1);
        else break;
      }
      if (text !== it.ing.name) text = text.replace(/\s+$/, '') + '...';
      return { text: text, fs: fs };
    });
  }

  function draw(t) {
    var cx = SIZE / 2;
    var cy = SIZE / 2 + 8;
    var R = SIZE / 2 - 46;
    ctx.clearRect(0, 0, SIZE, SIZE);

    ctx.save();
    ctx.translate(cx, cy);

    // rim + bulbs
    ctx.beginPath();
    ctx.arc(0, 0, R + 22, 0, TAU);
    ctx.fillStyle = '#111';
    ctx.fill();
    var phase = wheel.spinning && !reduceMotion ? Math.floor(t / 110) % 2 : 0;
    for (var b = 0; b < 28; b++) {
      var a = (b / 28) * TAU;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * (R + 12), Math.sin(a) * (R + 12), 5.5, 0, TAU);
      ctx.fillStyle = (b + phase) % 2 ? '#fff' : '#ffd800';
      ctx.fill();
    }

    ctx.rotate(wheel.rot);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000';

    if (wheel.items.length) {
      var pulse = t < wheel.hiliteUntil ? 0.3 + 0.3 * Math.sin(t / 70) : 0;
      for (var i = 0; i < wheel.items.length; i++) {
        var a0 = wheel.angles[i];
        var a1 = wheel.angles[i + 1];
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, R, a0, a1);
        ctx.closePath();
        ctx.fillStyle = wheel.colors[i];
        ctx.fill();
        if (i === wheel.hilite && pulse > 0) {
          ctx.fillStyle = 'rgba(255,255,255,' + pulse + ')';
          ctx.fill();
        }
        ctx.stroke();

        var lab = wheel.labels[i];
        ctx.save();
        ctx.rotate((a0 + a1) / 2);
        ctx.font = 'bold ' + lab.fs + 'px ' + FONT;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = Math.max(3, lab.fs / 4);
        ctx.strokeStyle = '#000';
        ctx.strokeText(lab.text, R - 16, 0);
        ctx.fillStyle = '#fff';
        ctx.fillText(lab.text, R - 16, 0);
        ctx.restore();
      }
    } else {
      // idle / finished wheel
      for (var k = 0; k < COLORS.length; k++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, R, (k / COLORS.length) * TAU, ((k + 1) / COLORS.length) * TAU);
        ctx.closePath();
        ctx.fillStyle = COLORS[k];
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();

    // hub
    ctx.save();
    ctx.translate(cx, cy);
    var grad = ctx.createLinearGradient(-30, -30, 30, 30);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.5, '#ffd800');
    grad.addColorStop(1, '#ff30c0');
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, TAU);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#000';
    ctx.stroke();
    ctx.restore();

    if (!wheel.items.length && wheel.msg) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.font = 'bold 84px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 12;
      ctx.strokeStyle = '#000';
      ctx.strokeText(wheel.msg, 0, 0);
      ctx.fillStyle = '#fff';
      ctx.fillText(wheel.msg, 0, 0);
      ctx.restore();
    }

    // pointer (wiggles when it flicks a slice)
    ctx.save();
    ctx.translate(cx, cy - R - 32);
    ctx.rotate(-wheel.flap * 0.5);
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.lineTo(22, 0);
    ctx.lineTo(0, 58);
    ctx.closePath();
    ctx.fillStyle = '#ff1493';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#000';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 4, 6, 0, TAU);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.restore();
  }

  function requestLoop() {
    if (wheel.running) return;
    wheel.running = true;
    wheel.lastT = performance.now();
    window.requestAnimationFrame(frame);
  }

  function frame(t) {
    var dt = Math.min(0.05, (t - wheel.lastT) / 1000);
    wheel.lastT = t;

    if (wheel.spinning && !wheel.dragging) {
      wheel.rot += wheel.omega * dt;
      wheel.omega *= Math.pow(wheel.fric, dt * 60);
      var sign = wheel.omega >= 0 ? 1 : -1;
      wheel.omega -= sign * 0.35 * dt;
      if (wheel.omega * sign <= 0.12) land();
    }

    if (wheel.items.length) {
      var idx = L.sliceAt(wheel.angles, wheel.rot);
      if (idx !== wheel.lastIdx) {
        wheel.lastIdx = idx;
        if (wheel.spinning || wheel.dragging) {
          Sound.tick();
          wheel.flap = 1;
        }
      }
    }
    wheel.flap *= Math.pow(0.85, dt * 60);
    if (wheel.flap < 0.02) wheel.flap = 0;

    draw(t);

    if (wheel.spinning || wheel.dragging || wheel.flap > 0 || t < wheel.hiliteUntil) {
      window.requestAnimationFrame(frame);
    } else {
      wheel.running = false;
    }
  }

  function startSpin(omega) {
    if (wheel.spinning) return;
    Sound.ensure();
    if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; }
    if (wheel.landed) buildWheel();
    if (!wheel.items.length) return;
    var base = bowl.autoRun ? rand(30, 40) : rand(26, 40);
    wheel.omega = omega || base * (reduceMotion ? 0.6 : 1);
    wheel.fric = bowl.autoRun ? AUTO_FRICTION : FRICTION;
    wheel.spinning = true;
    wheel.hilite = -1;
    setBanner('Spinning...');
    updateButtons();
    requestLoop();
  }

  function land() {
    wheel.spinning = false;
    wheel.omega = 0;
    if (!wheel.items.length) return;
    var idx = L.sliceAt(wheel.angles, wheel.rot);
    wheel.landed = true;
    wheel.hilite = idx;
    wheel.hiliteUntil = performance.now() + 1800;
    onLand(wheel.items[idx].ing);
  }

  function onLand(ing) {
    bowl.picks[ing.cat].push(ing);
    if (bowl.forceCat === ing.cat) bowl.forceCat = null;
    Sound.plop();
    setTimeout(Sound.chime, 90);
    setBanner('You got: ' + ing.name.toUpperCase() + '!!!');

    if (currentCat()) {
      advanceTimer = setTimeout(advance, bowl.autoRun ? AUTO_ADVANCE_MS : ADVANCE_MS);
    } else {
      finish();
    }
    renderBowl();
    renderTracker();
    updateButtons();
  }

  function advance() {
    advanceTimer = null;
    if (wheel.spinning || wheel.dragging) return;
    buildWheel();
    if (wheel.cat) setBanner('Next up: ' + catById[wheel.cat].label.toUpperCase() + '!');
    if (bowl.autoRun && wheel.items.length) startSpin();
  }

  function finish() {
    bowl.done = true;
    bowl.autoRun = false;
    Sound.fanfare();
    confetti();
    setBanner('BOWL READY!!!');
    advanceTimer = setTimeout(function () {
      advanceTimer = null;
      buildWheel();
      var r = $('result');
      if (r.scrollIntoView) r.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    }, ADVANCE_MS);
  }

  // ------------------------------------------------------- drag / click spin
  function pointerAngle(e) {
    var r = canvas.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
  }
  function normDelta(d) {
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    return d;
  }

  canvas.addEventListener('pointerdown', function (e) {
    if (e.button !== undefined && e.button > 0) return;
    if (advanceTimer && !bowl.done) { clearTimeout(advanceTimer); advanceTimer = null; }
    if (wheel.landed && !wheel.spinning) buildWheel();
    if (!wheel.items.length) return;
    Sound.ensure();
    var now = performance.now();
    drag = { id: e.pointerId, last: pointerAngle(e), lastT: now, vel: 0, moved: 0, t0: now };
    wheel.dragging = true;
    wheel.omega = 0;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    requestLoop();
    e.preventDefault();
  });

  canvas.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var now = performance.now();
    var a = pointerAngle(e);
    var d = normDelta(a - drag.last);
    drag.last = a;
    drag.moved += Math.abs(d);
    wheel.rot += d;
    var dt = Math.max(0.008, (now - drag.lastT) / 1000);
    drag.vel = drag.vel * 0.5 + clamp(d / dt, -60, 60) * 0.5;
    drag.lastT = now;
  });

  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag;
    drag = null;
    wheel.dragging = false;
    var now = performance.now();
    if (now - d.lastT > 90) d.vel = 0;
    if (Math.abs(d.vel) > 3) {
      wheel.omega = clamp(d.vel, -45, 45);
      wheel.fric = FRICTION;
      if (!wheel.spinning) {
        wheel.spinning = true;
        wheel.hilite = -1;
        setBanner('Spinning...');
        updateButtons();
      }
    } else if (d.moved < 0.12 && now - d.t0 < 500) {
      if (!wheel.spinning) startSpin();   // a plain click spins
      // (clicking a spinning wheel just stops it: omega was zeroed on press)
    } else if (wheel.spinning) {
      wheel.omega = d.vel;
    }
    requestLoop();
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startSpin(); }
  });

  // ---------------------------------------------------------------- respins
  function respin(cat, idx) {
    if (wheel.spinning || wheel.dragging) return;
    if (bowl.respins <= 0) { Sound.nope(); toast('No respins left this bowl!'); return; }
    var item = bowl.picks[cat][idx];
    if (!item) return;
    var ctxCheck = eligCtx(cat);
    ctxCheck.exclude.add(item.id);
    if (!L.candidates(ALL, cat, ctxCheck).length) {
      Sound.nope();
      toast('Nothing else to swap in for ' + item.name + '.');
      return;
    }
    bowl.respins--;
    bowl.rejected.add(item.id);
    bowl.picks[cat].splice(idx, 1);
    bowl.forceCat = cat;
    bowl.done = false;
    bowl.autoRun = false;
    if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; }
    buildWheel();
    setBanner('RESPIN! Spin for a new ' + catById[cat].label.toUpperCase() + '.');
    renderBowl();
    renderTracker();
  }

  // ---------------------------------------------------------------- results
  function renderBowl() {
    var list = $('bowlList');
    list.textContent = '';
    var any = false;

    CATS.forEach(function (c) {
      var count = settings.counts[c.id];
      if (count <= 0) return;
      any = true;
      var row = el('div', 'bowl-row');
      row.appendChild(el('div', 'bowl-cat', c.label));
      var items = el('div', 'bowl-items');

      bowl.picks[c.id].forEach(function (ing, idx) {
        var chip = el('div', 'pick');
        var main = el('div', 'pick-main');
        main.appendChild(el('span', 'pick-name', ing.name));
        var btn = el('button', 'btn tiny rebtn', 'nope, respin');
        btn.type = 'button';
        btn.disabled = bowl.respins <= 0 || wheel.spinning;
        btn.addEventListener('click', function () { respin(c.id, idx); });
        main.appendChild(btn);
        chip.appendChild(main);
        if (ing.hint) chip.appendChild(el('div', 'pick-hint', ing.hint));
        items.appendChild(chip);
      });

      var missing = need(c.id);
      if (missing > 0) {
        var avail = candidatesFor(c.id).length;
        for (var m = 0; m < missing; m++) {
          items.appendChild(el('div', 'pick ghost', avail ? '???' : 'nothing available (tick some boxes)'));
          if (!avail) break;
        }
      }
      row.appendChild(items);
      list.appendChild(row);
    });

    if (!any) list.appendChild(el('p', 'note', 'All the sliders are on 0. Turn one up to get started.'));

    var left = bowl.respins;
    $('respinInfo').textContent = 'Respins left: ' + left + ' of ' + MAX_RESPINS + '  ' +
      '★'.repeat(left) + '☆'.repeat(MAX_RESPINS - left);

    var rt = $('resultTitle');
    var want = bowl.done ? 'BOWL READY!!!' : 'YOUR BOWL';
    if (rt.getAttribute('aria-label') !== want) setWordArt(rt, want);
    $('result').classList.toggle('done', bowl.done);
    renderNutrition();
  }

  // -------------------------------------------------------------- nutrition
  function fmt(n, dp) {
    return String(Number(n.toFixed(dp || 0)));
  }
  function tens(n) { return String(Math.round(n / 10) * 10); }
  function pctOf(v, ref) { return ref > 0 ? Math.round(v / ref * 100) : 0; }

  function makeBar(pct, cls) {
    var bar = el('div', 'bar' + (cls ? ' ' + cls : ''));
    var fill = el('div', 'bar-fill');
    fill.style.width = clamp(pct, 0, 100) + '%';
    bar.appendChild(fill);
    return bar;
  }

  function meterRow(label, valueText, pct, cls) {
    var row = el('div', 'meter');
    row.appendChild(el('span', 'meter-label', label));
    row.appendChild(makeBar(pct, cls));
    row.appendChild(el('span', 'meter-val', valueText));
    return row;
  }

  function renderNutrition() {
    var det = $('nutri');
    var body = $('nutriBody');
    var picks = [];
    CATS.forEach(function (c) { picks = picks.concat(bowl.picks[c.id]); });
    det.hidden = picks.length === 0;
    if (!picks.length) return;

    var tot = N.total(picks);
    var D = N.DAILY;
    body.textContent = '';

    var wanted = CATS.reduce(function (n, c) { return n + settings.counts[c.id]; }, 0);
    if (picks.length < wanted) {
      body.appendChild(el('p', 'nutri-warn', 'Bowl not finished yet: ' + picks.length + ' of ' + wanted +
        ' ingredients so far, so these totals will grow.'));
    }

    // per-ingredient table
    var wrap = el('div', 'table-wrap');
    var table = el('table', 'ntable');
    var thead = el('thead');
    var head = el('tr');
    ['Ingredient', 'Typical portion', 'kcal', 'Protein g', 'Carbs g', 'Fat g', 'Fibre g', 'Sodium mg'].forEach(function (h, i) {
      head.appendChild(el('th', i > 1 ? 'num' : null, h));
    });
    thead.appendChild(head);
    table.appendChild(thead);
    var tb = el('tbody');
    picks.forEach(function (ing) {
      var n = N.get(ing.name);
      var tr = el('tr');
      tr.appendChild(el('td', null, ing.name));
      if (!n) {
        var td = el('td', null, 'no data');
        td.colSpan = 7;
        tr.appendChild(td);
      } else {
        tr.appendChild(el('td', null, n.portion));
        [fmt(n.kcal), fmt(n.protein, 1), fmt(n.carbs, 1), fmt(n.fat, 1), fmt(n.fibre, 1), tens(n.sodium)].forEach(function (v) {
          tr.appendChild(el('td', 'num', v));
        });
      }
      tb.appendChild(tr);
    });
    var foot = el('tr', 'total');
    foot.appendChild(el('td', null, 'TOTAL'));
    foot.appendChild(el('td', null, '~' + fmt(tot.grams) + ' g'));
    [fmt(tot.kcal), fmt(tot.protein, 1), fmt(tot.carbs, 1), fmt(tot.fat, 1), fmt(tot.fibre, 1), tens(tot.sodium)].forEach(function (v) {
      foot.appendChild(el('td', 'num', v));
    });
    tb.appendChild(foot);
    table.appendChild(tb);
    wrap.appendChild(table);
    body.appendChild(wrap);

    // share of a day
    body.appendChild(el('h3', 'nutri-h', 'Share of a day (reference: ' + D.kcal + ' kcal)'));
    var m = el('div', 'meters');
    function macroRow(label, amount, unit, ref, cls) {
      var pct = pctOf(amount, ref);
      m.appendChild(meterRow(label, fmt(amount) + ' ' + unit + ' \u2022 ' + pct + '%', pct, cls));
    }
    macroRow('Energy', tot.kcal, 'kcal', D.kcal);
    macroRow('Protein', tot.protein, 'g', D.protein);
    macroRow('Carbs', tot.carbs, 'g', D.carbs);
    macroRow('Fat', tot.fat, 'g', D.fat);
    macroRow('Fibre', tot.fibre, 'g', D.fibre);
    var naPct = pctOf(tot.sodium, D.sodium);
    m.appendChild(meterRow('Sodium', tens(tot.sodium) + ' mg \u2022 ' + naPct + '%', naPct, naPct >= 50 ? 'warn' : ''));
    body.appendChild(m);

    // where the energy comes from
    var split = N.energySplit(tot);
    body.appendChild(el('h3', 'nutri-h', 'Where the energy comes from'));
    var sb = el('div', 'splitbar');
    [['protein', 'Protein'], ['carbs', 'Carbs'], ['fat', 'Fat']].forEach(function (p) {
      var pct = Math.round(split[p[0]] * 100);
      var seg = el('div', 'seg seg-' + p[0], pct + '% ' + p[1]);
      seg.style.width = (split[p[0]] * 100) + '%';
      sb.appendChild(seg);
    });
    body.appendChild(sb);

    // micronutrients
    body.appendChild(el('h3', 'nutri-h', 'Vitamins & minerals (% of daily reference)'));
    var high = [], good = [];
    var mm = el('div', 'meters');
    N.MICROS.forEach(function (mi) {
      var pct = Math.round(tot.micros[mi.key] || 0);
      if (pct >= N.HIGH) high.push(mi.label);
      else if (pct >= N.GOOD) good.push(mi.label);
      mm.appendChild(meterRow(mi.label, pct + '%', pct, pct >= N.HIGH ? 'hi' : ''));
    });
    var hi = el('p', 'nutri-high');
    hi.appendChild(el('b', null, 'HIGH IN: '));
    hi.appendChild(document.createTextNode(high.length ? high.join(', ') : 'nothing in particular'));
    if (good.length) {
      hi.appendChild(el('br'));
      hi.appendChild(el('b', null, 'GOOD SOURCE OF: '));
      hi.appendChild(document.createTextNode(good.join(', ')));
    }
    body.appendChild(hi);
    body.appendChild(mm);

    if (tot.missing.length) {
      body.appendChild(el('p', 'nutri-warn', 'No data for: ' + tot.missing.join(', ')));
    }
    body.appendChild(el('p', 'nutri-fine',
      'Ballpark numbers for typical cooked/prepared portions, based on a ' + D.kcal + ' kcal day. ' +
      'Brands (especially sauces and sodium) vary. Not medical or dietary advice. ' +
      'Edit portions in nutrition.js.'));
  }

  function bowlText() {
    var lines = [];
    CATS.forEach(function (c) {
      var names = bowl.picks[c.id].map(function (i) { return i.name; });
      if (names.length) lines.push(c.label + ': ' + names.join(', '));
    });
    return lines.join('\n');
  }

  function copyBowl() {
    var text = bowlText();
    if (!text) { toast('Nothing in the bowl yet!'); return; }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      toast(ok ? 'Copied!' : 'Could not copy. Select the text yourself.');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('Copied!'); }, fallback);
    } else {
      fallback();
    }
  }

  // ---------------------------------------------------------- stage / tracker
  function renderTracker() {
    var t = $('tracker');
    t.textContent = '';
    CATS.forEach(function (c) {
      if (settings.counts[c.id] <= 0) return;
      var have = bowl.picks[c.id].length;
      var total = settings.counts[c.id];
      var cls = 'step';
      if (wheel.cat === c.id) cls += ' current';
      if (have >= total) cls += ' complete';
      t.appendChild(el('span', cls, c.label + ' ' + have + '/' + total));
    });
  }

  function updateStageUI() {
    var lab = $('stageLabel');
    lab.textContent = '';
    if (wheel.cat) {
      var c = catById[wheel.cat];
      var n = bowl.picks[wheel.cat].length + 1;
      var prefix = bowl.forceCat === wheel.cat ? 'RESPIN: ' : 'Now spinning: ';
      lab.appendChild(document.createTextNode(prefix + c.label + ' (' + n + ' of ' + settings.counts[wheel.cat] + ')'));
      if (wheel.total > wheel.items.length) {
        lab.appendChild(el('small', null, 'wheel shows ' + wheel.items.length + ' of ' + wheel.total + ' options'));
      }
    } else if (bowl.done) {
      lab.textContent = 'Bowl complete!';
    } else {
      lab.textContent = 'Nothing to spin';
      var anyWanted = CATS.some(function (c) { return settings.counts[c.id] > 0; });
      setBanner(anyWanted ? 'Everything is unticked. Tick some ingredients in the settings!' : 'Turn a slider up to get started.');
    }
    renderTracker();
  }

  function updateButtons() {
    var spin = $('spinBtn');
    var auto = $('autoBtn');
    if (bowl.done && !wheel.items.length) {
      spin.textContent = 'NEW BOWL';
      spin.disabled = false;
      auto.disabled = true;
      auto.textContent = 'SPIN ALL';
    } else {
      spin.textContent = wheel.spinning ? 'SPINNING...' : 'SPIN!';
      spin.disabled = wheel.spinning || !wheel.items.length;
      auto.disabled = !wheel.items.length && !bowl.autoRun;
      auto.textContent = bowl.autoRun ? 'STOP AUTO' : 'SPIN ALL';
    }
    var btns = document.querySelectorAll('.rebtn');
    for (var i = 0; i < btns.length; i++) btns[i].disabled = wheel.spinning || bowl.respins <= 0;
    $('soundBtn').textContent = settings.muted ? 'SOUND: OFF' : 'SOUND: ON';
  }

  // --------------------------------------------------------------- sidebar
  function buildSidebar() {
    var chips = $('modeChips');
    Object.keys(L.MODES).forEach(function (key) {
      var label = el('label', 'chip');
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = 'mode';
      input.value = key;
      input.checked = settings.mode === key;
      input.addEventListener('change', function () {
        settings.mode = key;
        updateModeNote();
        onSettingsChange();
      });
      label.appendChild(input);
      label.appendChild(el('span', null, L.MODES[key].label));
      chips.appendChild(label);
    });
    updateModeNote();

    var host = $('catList');
    CATS.forEach(function (cat) {
      var block = el('div', 'cat-block');

      var head = el('div', 'cat-head');
      head.appendChild(el('span', 'cat-name', cat.label));
      var out = el('output', 'count-badge', String(settings.counts[cat.id]));
      head.appendChild(out);
      block.appendChild(head);

      var range = document.createElement('input');
      range.type = 'range';
      range.min = '0';
      range.max = String(cat.max);
      range.step = '1';
      range.value = String(settings.counts[cat.id]);
      range.setAttribute('aria-label', 'How many ' + cat.label + ' picks');
      range.addEventListener('input', function () {
        var n = Number(range.value);
        settings.counts[cat.id] = n;
        out.textContent = String(n);
        if (bowl.picks[cat.id].length > n) bowl.picks[cat.id] = bowl.picks[cat.id].slice(0, n);
        onSettingsChange();
      });
      block.appendChild(range);
      ui.ranges[cat.id] = range;
      ui.outputs[cat.id] = out;

      var det = document.createElement('details');
      var sum = document.createElement('summary');
      det.appendChild(sum);
      ui.summaries[cat.id] = sum;

      var tools = el('div', 'tools');
      var allBtn = el('button', 'btn tiny', 'all');
      var noneBtn = el('button', 'btn tiny', 'none');
      allBtn.type = 'button';
      noneBtn.type = 'button';
      allBtn.addEventListener('click', function () { setAll(cat.id, true); });
      noneBtn.addEventListener('click', function () { setAll(cat.id, false); });
      tools.appendChild(allBtn);
      tools.appendChild(noneBtn);
      det.appendChild(tools);

      var list = el('div', 'ing-list');
      ALL.filter(function (i) { return i.cat === cat.id; }).forEach(function (ing) {
        var lab = el('label', 'ing');
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !settings.off[ing.id];
        cb.addEventListener('change', function () {
          if (cb.checked) delete settings.off[ing.id]; else settings.off[ing.id] = true;
          onSettingsChange();
        });
        lab.appendChild(cb);
        lab.appendChild(el('span', null, ing.name));
        list.appendChild(lab);
        ui.checks[ing.id] = cb;
      });
      det.appendChild(list);
      block.appendChild(det);
      host.appendChild(block);
    });
    updateSummaries();
  }

  function setAll(cat, on) {
    ALL.forEach(function (i) {
      if (i.cat !== cat) return;
      if (on) delete settings.off[i.id]; else settings.off[i.id] = true;
      ui.checks[i.id].checked = on;
    });
    onSettingsChange();
  }

  function updateModeNote() {
    $('modeNote').textContent = L.MODES[settings.mode].note;
  }

  function updateSummaries() {
    CATS.forEach(function (c) {
      var all = ALL.filter(function (i) { return i.cat === c.id; });
      var have = all.filter(function (i) { return !settings.off[i.id]; }).length;
      ui.summaries[c.id].textContent = 'I have: ' + have + ' of ' + all.length;
    });
  }

  function syncControls() {
    CATS.forEach(function (c) {
      ui.ranges[c.id].value = String(settings.counts[c.id]);
      ui.outputs[c.id].textContent = String(settings.counts[c.id]);
    });
    ALL.forEach(function (i) { ui.checks[i.id].checked = !settings.off[i.id]; });
    var radios = document.querySelectorAll('#modeChips input');
    for (var r = 0; r < radios.length; r++) radios[r].checked = radios[r].value === settings.mode;
    updateModeNote();
    updateSummaries();
  }

  function onSettingsChange() {
    save();
    updateSummaries();
    syncDone();
    if (!wheel.spinning && !wheel.dragging && !advanceTimer) buildWheel();
    renderBowl();
    renderTracker();
    updateButtons();
  }

  // --------------------------------------------------------------- restart
  function startOver() {
    if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; }
    wheel.spinning = false;
    wheel.dragging = false;
    wheel.omega = 0;
    drag = null;
    resetBowl();
    buildWheel();
    setBanner('Click the wheel or drag it to spin!');
    renderBowl();
    renderTracker();
    updateButtons();
  }

  // --------------------------------------------------------------- confetti
  function confetti() {
    if (reduceMotion) return;
    var c = $('confetti');
    var w = window.innerWidth;
    var h = window.innerHeight;
    c.width = w;
    c.height = h;
    c.style.display = 'block';
    var g = c.getContext('2d');
    var parts = [];
    for (var i = 0; i < 80; i++) {
      parts.push({
        x: w / 2 + rand(-w * 0.25, w * 0.25),
        y: h * 0.4,
        vx: rand(-6, 6),
        vy: rand(-14, -4),
        s: rand(6, 12),
        r: rand(0, TAU),
        vr: rand(-0.3, 0.3),
        c: COLORS[i % COLORS.length]
      });
    }
    var start = performance.now();
    (function step(now) {
      var elapsed = now - start;
      g.clearRect(0, 0, w, h);
      parts.forEach(function (p) {
        p.vy += 0.35;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.r);
        g.fillStyle = p.c;
        g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        g.restore();
      });
      if (elapsed < 2600) {
        window.requestAnimationFrame(step);
      } else {
        g.clearRect(0, 0, w, h);
        c.style.display = 'none';
      }
    })(start);
  }

  // ------------------------------------------------------------------- init
  function init() {
    load();
    setWordArt($('title'), 'Slop Bowl Spinner!!!');
    buildSidebar();

    $('spinBtn').addEventListener('click', function () {
      if (bowl.done && !wheel.items.length) startOver(); else startSpin();
    });
    $('autoBtn').addEventListener('click', function () {
      Sound.ensure();
      if (bowl.autoRun) { bowl.autoRun = false; updateButtons(); return; }
      bowl.autoRun = true;
      if (!wheel.spinning) startSpin();
      updateButtons();
    });
    $('restartBtn').addEventListener('click', startOver);
    $('copyBtn').addEventListener('click', copyBowl);
    $('soundBtn').addEventListener('click', function () {
      settings.muted = !settings.muted;
      save();
      if (!settings.muted) { Sound.ensure(); Sound.plop(); }
      updateButtons();
    });
    $('resetBtn').addEventListener('click', function () {
      if (!window.confirm('Reset all settings (sliders, ticked ingredients, global option)?')) return;
      clearSaved();
      resetDefaults();
      syncControls();
      startOver();
    });

    buildWheel();
    renderBowl();
    updateButtons();
    draw(performance.now());
  }

  init();
})();
