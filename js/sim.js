(function () {
  "use strict";

  var canvas = document.getElementById("sim");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;
  var host = canvas.parentElement || canvas;

  var toggleBtn = document.getElementById("sim-toggle");
  var resetBtn = document.getElementById("sim-reset");
  var countOut = document.getElementById("sim-count");

  var G = 1;
  var STEP = 1 / 60;
  var MAX_STEPS = 5;
  var SOFT2 = 6 * 6;
  var CENTRAL_MASS = 520000;
  var RADIUS_K = 0.16;
  var BIG_MASS = 1800;
  var TRAIL_EVERY = 4;
  var TRAIL_POINTS = 40;
  var FLARE_LIFE = 54;
  var MAX_BODIES = 150;
  var MIN_BODIES = 36;
  var REFILL_TO = 48;
  var REFILL_EVERY = 16;
  var STATIC_STEPS = 400;
  var STAR_COUNT = 70;

  var FALLBACK = { ink: "#E6EAF7", cobalt: "#7C8FFF", flare: "#FF6B98", line: "#2A3566" };
  var colors = { ink: FALLBACK.ink, cobalt: FALLBACK.cobalt, flare: FALLBACK.flare, line: FALLBACK.line };

  var motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  var W = 0;
  var H = 0;
  var dpr = 1;
  var narrow = false;
  var bodies = [];
  var flares = [];
  var stars = [];
  var stepCount = 0;
  var refilling = false;
  var refillClock = 0;
  var lastCount = -1;

  var userPaused = false;
  var heroVisible = true;
  var extHidden = false;

  /* Caméra pilotable de l'extérieur (plongée du hero) : zoom autour du corps central,
     recentrage vers un point cible, force du masque de texte, halo du corps central. */
  var cam = { k: 1, rec: 0, mask: 1, glow: 0, tx: -1, ty: -1 };
  var view = { k: 1, cx: 0, cy: 0, fx: 0, fy: 0 };

  function updateView() {
    var c = heaviest();
    var cx = c ? c.x : lay.ax;
    var cy = c ? c.y : lay.ay;
    var tx = cam.tx < 0 ? W * 0.5 : cam.tx;
    var ty = cam.ty < 0 ? H * 0.5 : cam.ty;
    view.k = cam.k;
    view.cx = cx;
    view.cy = cy;
    view.fx = cx + (tx - cx) * cam.rec;
    view.fy = cy + (ty - cy) * cam.rec;
  }

  function toWorld(x, y) {
    return { x: view.cx + (x - view.fx) / view.k, y: view.cy + (y - view.fy) / view.k };
  }
  var tabVisible = !document.hidden;
  var reduced = !!(motionQuery && motionQuery.matches);
  var rafId = 0;
  var lastTime = 0;
  var accumulator = 0;

  var aim = null;

  var FADE_LEN = 220;
  var NAME_PAD = 24;
  var NAME_FEATHER = 24;
  /* dens : densité relative au rayon disponible (1 sur grand écran) ; vers 1024 px la zone libre se resserre,
     on y place moins de corps pour garder des orbites lisibles au lieu d'un amas et d'une pluie de fusions. */
  var lay = { edge: 0, fade: FADE_LEN, name: null, ax: 0, ay: 0, rad: 100, dens: 1 };

  function unionRects(list, acc) {
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (!r || r.width < 1 || r.height < 1) continue;
      if (!acc) acc = { l: r.left, t: r.top, r: r.right, b: r.bottom };
      else {
        acc.l = Math.min(acc.l, r.left);
        acc.t = Math.min(acc.t, r.top);
        acc.r = Math.max(acc.r, r.right);
        acc.b = Math.max(acc.b, r.bottom);
      }
    }
    return acc;
  }

  function textRects(el) {
    var out = [];
    if (!el) return out;
    try {
      var rg = document.createRange();
      rg.selectNodeContents(el);
      var rs = rg.getClientRects();
      for (var i = 0; i < rs.length; i++) out.push(rs[i]);
    } catch (err) {
      out.push(el.getBoundingClientRect());
    }
    return out;
  }

  function measureLayout() {
    if (narrow) {
      lay.edge = 0;
      lay.fade = 0;
      lay.name = null;
      lay.ax = W * 0.5;
      lay.ay = H * 0.5;
      lay.rad = Math.max(80, Math.min(Math.min(lay.ax, W - lay.ax) * 0.92, H * 0.46));
      lay.dens = 1;
      return;
    }
    var hr = host.getBoundingClientRect();
    var right = 0;
    var els = document.querySelectorAll(".hero-pitch, .hero-role .role, .hero-role .school, .hero-status, .hero .actions .btn");
    var k;
    for (k = 0; k < els.length; k++) {
      var el = els[k];
      var rr = el.classList.contains("hero-pitch") ? textRects(el) : [el.getBoundingClientRect()];
      for (var q = 0; q < rr.length; q++) {
        if (rr[q].width > 1) right = Math.max(right, rr[q].right - hr.left);
      }
    }
    var edge = right > 0 ? right : W * 0.55;
    edge = Math.min(edge, W * 0.8);
    lay.edge = edge;
    var zone = Math.max(1, W - edge);
    lay.fade = Math.min(FADE_LEN, zone * 0.45);
    lay.ax = edge + zone / 2;
    lay.ay = H * 0.5;
    lay.rad = Math.max(60, Math.min(zone * 0.46, H * 0.42));
    lay.dens = Math.max(0.6, Math.min(1, lay.rad / 280));

    lay.name = null;
    var h1 = document.querySelector(".hero .name");
    if (h1) {
      var tr = [];
      var parts = h1.querySelectorAll(".name-text");
      for (k = 0; k < parts.length; k++) tr = tr.concat(textRects(parts[k]));
      var u = unionRects(tr, null);
      var hb = h1.getBoundingClientRect();
      if (u && hb.height > 1) {
        lay.name = {
          x0: u.l - hr.left - NAME_PAD,
          x1: u.r - hr.left + NAME_PAD,
          y0: hb.top - hr.top - NAME_PAD,
          y1: hb.bottom - hr.top + NAME_PAD
        };
      }
    }
  }

  function visibleAt(x, y) {
    if (narrow || cam.mask < 0.5) return true;
    var n = lay.name;
    if (n && x > n.x0 - NAME_FEATHER * 0.5 && x < n.x1 + NAME_FEATHER * 0.5 && y > n.y0 - NAME_FEATHER * 0.5 && y < n.y1 + NAME_FEATHER * 0.5) return false;
    return x > lay.edge + lay.fade * 0.35;
  }

  function applyMask() {
    if (narrow || cam.mask <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = cam.mask;
    ctx.globalCompositeOperation = "destination-out";
    var e = lay.edge;
    var f = lay.fade;
    var g = ctx.createLinearGradient(e, 0, e + f, 0);
    var stops = 8;
    for (var i = 0; i <= stops; i++) {
      var t = i / stops;
      var sm = t * t * (3 - 2 * t);
      g.addColorStop(t, "rgba(0,0,0," + (1 - sm).toFixed(3) + ")");
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, e + f, H);
    var n = lay.name;
    if (n) {
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      var layers = 8;
      for (var j = layers; j >= 1; j--) {
        var d = (NAME_FEATHER * j) / layers;
        ctx.fillRect(n.x0 - d, n.y0 - d, n.x1 - n.x0 + 2 * d, n.y1 - n.y0 + 2 * d);
      }
      ctx.fillStyle = "#000";
      ctx.fillRect(n.x0, n.y0, n.x1 - n.x0, n.y1 - n.y0);
    }
    ctx.restore();
  }

  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    ["ink", "cobalt", "flare", "line"].forEach(function (name) {
      var v = cs.getPropertyValue("--" + name).trim();
      colors[name] = v || FALLBACK[name];
    });
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function radiusOf(m) {
    return Math.max(1.5, RADIUS_K * Math.cbrt(m));
  }

  function makeBody(x, y, vx, vy, m) {
    return { x: x, y: y, vx: vx, vy: vy, m: m, r: radiusOf(m), trail: [] };
  }

  function heaviest() {
    var best = null;
    for (var i = 0; i < bodies.length; i++) {
      if (!best || bodies[i].m > best.m) best = bodies[i];
    }
    return best;
  }

  function anchor() {
    return { x: lay.ax, y: lay.ay };
  }

  function sceneRadius() {
    return lay.rad;
  }

  function circularSpeed(central, dx, dy) {
    var d2 = dx * dx + dy * dy;
    var acc = (G * central.m * Math.sqrt(d2)) / Math.pow(d2 + SOFT2, 1.5);
    return Math.sqrt(acc * Math.sqrt(d2));
  }

  function spawnInOrbit(central, dist, angle, spread) {
    var dx = Math.cos(angle) * dist;
    var dy = Math.sin(angle) * dist;
    var v = circularSpeed(central, dx, dy) * rand(1 - spread, 1 + spread);
    var radial = rand(-0.02, 0.02) * v;
    var nx = dx / dist;
    var ny = dy / dist;
    var u = Math.random();
    var m = 160 + 3600 * Math.pow(u, 5);
    return makeBody(
      central.x + dx,
      central.y + dy,
      central.vx - ny * v + nx * radial,
      central.vy + nx * v + ny * radial,
      m
    );
  }

  function makeStars() {
    stars = [];
    for (var i = 0; i < STAR_COUNT; i++) {
      stars.push({ x: Math.random(), y: Math.random(), s: rand(0.6, 1.3), a: rand(0.5, 0.95) });
    }
  }

  function initScene() {
    bodies = [];
    flares = [];
    stepCount = 0;
    refilling = false;
    refillClock = 0;
    var a = anchor();
    var rmax = sceneRadius();
    var rmin = Math.min(64, rmax * 0.25);
    var central = makeBody(a.x, a.y, 0, 0, CENTRAL_MASS);
    bodies.push(central);
    var count = W < 600 ? 35 : Math.round(rand(64, 86) * lay.dens);
    var px = 0;
    var py = 0;
    for (var i = 0; i < count; i++) {
      var t = (i + rand(0.15, 0.85)) / count;
      var b = spawnInOrbit(central, rmin + (rmax - rmin) * t, rand(0, Math.PI * 2), 0.03);
      bodies.push(b);
      px += b.m * b.vx;
      py += b.m * b.vy;
    }
    central.vx = -px / central.m;
    central.vy = -py / central.m;
    updateCount();
  }

  function addFlare(x, y, r) {
    flares.push({ x: x, y: y, r0: r, age: 0 });
  }

  function merge(i, j) {
    var a = bodies[i];
    var b = bodies[j];
    var keep = a.m >= b.m ? a : b;
    var m = a.m + b.m;
    keep.x = (a.x * a.m + b.x * b.m) / m;
    keep.y = (a.y * a.m + b.y * b.m) / m;
    keep.vx = (a.vx * a.m + b.vx * b.m) / m;
    keep.vy = (a.vy * a.m + b.vy * b.m) / m;
    keep.m = m;
    keep.r = radiusOf(m);
    addFlare(keep.x, keep.y, keep.r);
    bodies[i] = keep;
    bodies.splice(j, 1);
  }

  function step() {
    var n = bodies.length;
    var i;
    var j;
    for (i = 0; i < n; i++) {
      var a = bodies[i];
      for (j = i + 1; j < n; j++) {
        var b = bodies[j];
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var d2 = dx * dx + dy * dy + SOFT2;
        var inv = G / (d2 * Math.sqrt(d2));
        var fa = b.m * inv * STEP;
        var fb = a.m * inv * STEP;
        a.vx += dx * fa;
        a.vy += dy * fa;
        b.vx -= dx * fb;
        b.vy -= dy * fb;
      }
    }
    for (i = 0; i < n; i++) {
      var p = bodies[i];
      p.x += p.vx * STEP;
      p.y += p.vy * STEP;
    }

    for (i = 0; i < bodies.length; i++) {
      for (j = i + 1; j < bodies.length; j++) {
        var c = bodies[i];
        var d = bodies[j];
        var ex = d.x - c.x;
        var ey = d.y - c.y;
        var reach = (c.r + d.r) * 0.7;
        if (ex * ex + ey * ey < reach * reach) {
          merge(i, j);
          j = i;
        }
      }
    }

    stepCount++;
    if (stepCount % TRAIL_EVERY === 0) {
      for (i = 0; i < bodies.length; i++) {
        var t = bodies[i].trail;
        t.push(bodies[i].x, bodies[i].y);
        if (t.length > TRAIL_POINTS * 2) t.splice(0, 2);
      }
    }

    var margin = 220;
    for (i = bodies.length - 1; i >= 0; i--) {
      var q = bodies[i];
      if (q.x < -margin || q.x > W + margin || q.y < -margin || q.y > H + margin) bodies.splice(i, 1);
    }

    for (i = flares.length - 1; i >= 0; i--) {
      flares[i].age++;
      if (flares[i].age > FLARE_LIFE) flares.splice(i, 1);
    }

    refill();
    updateCount();
  }

  function refill() {
    var central = heaviest();
    if (!central) {
      initScene();
      return;
    }
    if (bodies.length < (narrow ? 20 : Math.round(MIN_BODIES * lay.dens))) refilling = true;
    if (!refilling) return;
    if (bodies.length >= (narrow ? 28 : Math.round(REFILL_TO * lay.dens))) {
      refilling = false;
      return;
    }
    refillClock++;
    if (refillClock < REFILL_EVERY) return;
    refillClock = 0;
    var edge = sceneRadius() * rand(0.92, 1.05);
    bodies.push(spawnInOrbit(central, edge, rand(0, Math.PI * 2), 0.03));
  }

  function updateCount() {
    var n = bodies.length;
    if (n === lastCount) return;
    lastCount = n;
    if (countOut) countOut.textContent = n + " corps";
  }

  function drawTrail(b, alpha, lw) {
    var t = b.trail;
    var n = t.length / 2;
    if (n < 1) return;
    var chunks = 4;
    var total = n;
    ctx.lineWidth = lw || 1;
    for (var c = 0; c < chunks; c++) {
      var from = Math.floor((c * total) / chunks);
      var to = Math.floor(((c + 1) * total) / chunks);
      if (c === chunks - 1) to = n;
      ctx.globalAlpha = alpha * (0.07 + 0.5 * ((c + 1) / chunks));
      ctx.beginPath();
      if (from === 0) ctx.moveTo(t[0], t[1]);
      else ctx.moveTo(t[(from - 1) * 2], t[(from - 1) * 2 + 1]);
      for (var k = from; k < to; k++) ctx.lineTo(t[k * 2], t[k * 2 + 1]);
      if (c === chunks - 1) ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  function render() {
    if (!W || !H) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var g = narrow ? 0.4 : 1;
    var i;
    updateView();
    var k = view.k;
    var zoomed = k !== 1 || cam.rec !== 0;

    if (zoomed) {
      /* Les étoiles sont loin : elles ne suivent la caméra que faiblement. */
      var ks = 1 + (k - 1) * 0.12;
      ctx.setTransform(dpr * ks, 0, 0, dpr * ks, dpr * (view.fx - ks * view.fx) + dpr * (view.fx - view.cx) * 0.25, dpr * (view.fy - ks * view.fy) + dpr * (view.fy - view.cy) * 0.25);
    }
    ctx.fillStyle = colors.ink;
    for (i = 0; i < stars.length; i++) {
      var s = stars[i];
      ctx.globalAlpha = s.a * g * 0.4;
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.s, 0, Math.PI * 2);
      ctx.fill();
    }

    if (zoomed) ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * (view.fx - k * view.cx), dpr * (view.fy - k * view.cy));
    var lw = zoomed ? 1 / Math.pow(k, 0.65) : 1;

    ctx.strokeStyle = colors.cobalt;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    for (i = 0; i < bodies.length; i++) drawTrail(bodies[i], g, lw);

    for (i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      ctx.globalAlpha = g;
      var big = b.m >= BIG_MASS;
      ctx.fillStyle = big ? colors.cobalt : colors.ink;
      if (big) { ctx.shadowColor = colors.cobalt; ctx.shadowBlur = 14; }
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      if (big) ctx.shadowBlur = 0;
    }

    ctx.strokeStyle = colors.flare;
    for (i = 0; i < flares.length; i++) {
      var f = flares[i];
      var fk = f.age / FLARE_LIFE;
      var ease = 1 - Math.pow(1 - fk, 3);
      ctx.globalAlpha = (1 - fk) * 0.9 * g;
      ctx.lineWidth = 1.5 * lw;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r0 + 4 + ease * 34, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    if (zoomed) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    applyMask();

    if (cam.glow > 0.01) {
      /* Halo du corps central : il s'embrase à mesure que la caméra plonge. */
      var gr = Math.max(40, lay.rad * (0.35 + 0.5 * cam.glow) * Math.sqrt(k));
      var gg = ctx.createRadialGradient(view.fx, view.fy, 0, view.fx, view.fy, gr);
      gg.addColorStop(0, "rgba(230,234,247," + (0.85 * cam.glow).toFixed(3) + ")");
      gg.addColorStop(0.12, "rgba(124,143,255," + (0.55 * cam.glow).toFixed(3) + ")");
      gg.addColorStop(0.5, "rgba(255,107,152," + (0.16 * cam.glow).toFixed(3) + ")");
      gg.addColorStop(1, "rgba(255,107,152,0)");
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.arc(view.fx, view.fy, gr, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }

    if (aim) {
      ctx.globalAlpha = Math.max(g, 0.8);
      ctx.strokeStyle = colors.cobalt;
      ctx.fillStyle = colors.cobalt;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(aim.x0, aim.y0);
      ctx.lineTo(aim.x1, aim.y1);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(aim.x0, aim.y0, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function shouldRun() {
    return !reduced && !userPaused && heroVisible && tabVisible && !extHidden;
  }

  function frame(now) {
    rafId = 0;
    if (!shouldRun()) return;
    var dt = lastTime ? (now - lastTime) / 1000 : STEP;
    lastTime = now;
    if (dt > 0.1) dt = 0.1;
    if (Math.abs(dt - STEP) < STEP * 0.15) dt = STEP;
    accumulator += dt;
    var steps = 0;
    while (accumulator >= STEP && steps < MAX_STEPS) {
      step();
      accumulator -= STEP;
      steps++;
    }
    if (steps === MAX_STEPS) accumulator = 0;
    render();
    rafId = requestAnimationFrame(frame);
  }

  function syncLoop() {
    if (shouldRun()) {
      if (!rafId) {
        lastTime = 0;
        accumulator = 0;
        rafId = requestAnimationFrame(frame);
      }
    } else if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function syncToggle() {
    if (!toggleBtn) return;
    toggleBtn.textContent = userPaused ? "Reprendre" : "Mettre en pause";
    toggleBtn.setAttribute("aria-pressed", userPaused ? "true" : "false");
    toggleBtn.disabled = reduced;
  }

  function pause() {
    if (reduced) return;
    userPaused = true;
    syncToggle();
    syncLoop();
  }

  function resume() {
    if (reduced) return;
    userPaused = false;
    syncToggle();
    syncLoop();
  }

  function renderStatic() {
    for (var i = 0; i < STATIC_STEPS; i++) step();
    flares = [];
    render();
  }

  function reset() {
    initScene();
    aim = null;
    if (reduced) renderStatic();
    else render();
    syncLoop();
  }

  function relayout(first, rebuild) {
    var oldAnchor = anchor();
    var oldRad = lay.rad;
    measureLayout();
    if (first) return;
    if (rebuild || Math.abs(lay.rad - oldRad) > oldRad * 0.3) {
      initScene();
      if (reduced) renderStatic();
      return;
    }
    var dx = lay.ax - oldAnchor.x;
    var dy = lay.ay - oldAnchor.y;
    if (!dx && !dy) return;
    for (var i = 0; i < bodies.length; i++) {
      bodies[i].x += dx;
      bodies[i].y += dy;
      var t = bodies[i].trail;
      for (var k = 0; k < t.length; k += 2) {
        t[k] += dx;
        t[k + 1] += dy;
      }
    }
  }

  function resize() {
    var rect = host.getBoundingClientRect();
    var w = Math.round(rect.width);
    var h = Math.round(rect.height);
    if (w < 2 || h < 2) return;
    var ndpr = Math.min(window.devicePixelRatio || 1, 2);
    var first = !W;
    var wasNarrow = narrow;
    if (w !== W || h !== H || ndpr !== dpr) {
      W = w;
      H = h;
      dpr = ndpr;
      narrow = W < 800;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
    }
    if (first) {
      makeStars();
      measureLayout();
      initScene();
      if (reduced) renderStatic();
    } else {
      relayout(false, wasNarrow !== narrow);
    }
    render();
  }

  function localPoint(e) {
    var rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function addBodyAt(x, y, vx, vy) {
    var central = heaviest();
    if (bodies.length >= MAX_BODIES) {
      var idx = -1;
      for (var i = 0; i < bodies.length; i++) {
        if (bodies[i] !== central && (idx < 0 || bodies[i].m < bodies[idx].m)) idx = i;
      }
      if (idx >= 0) bodies.splice(idx, 1);
    }
    var b = makeBody(x, y, vx, vy, rand(900, 2600));
    bodies.push(b);
    updateCount();
    if (!rafId) render();
  }

  function orbitalVelocity(x, y) {
    var central = heaviest();
    if (!central) return { vx: 0, vy: 0 };
    var dx = x - central.x;
    var dy = y - central.y;
    var d = Math.sqrt(dx * dx + dy * dy) || 1;
    var v = circularSpeed(central, dx, dy);
    return { vx: central.vx - (dy / d) * v, vy: central.vy + (dx / d) * v };
  }

  var DRAG_GAIN = 1.4;
  var DRAG_MIN = 6;

  canvas.addEventListener("pointerdown", function (e) {
    if (e.button !== undefined && e.button > 0) return;
    var p = localPoint(e);
    if (!visibleAt(p.x, p.y)) return;
    aim = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, id: e.pointerId };
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (err) {
      aim.id = e.pointerId;
    }
    if (!rafId) render();
  });

  canvas.addEventListener("pointermove", function (e) {
    if (!aim || e.pointerId !== aim.id) return;
    var p = localPoint(e);
    aim.x1 = p.x;
    aim.y1 = p.y;
    if (!rafId) render();
  });

  function endAim(e, cancelled) {
    if (!aim || e.pointerId !== aim.id) return;
    var a = aim;
    aim = null;
    if (!cancelled) {
      var dx = a.x1 - a.x0;
      var dy = a.y1 - a.y0;
      updateView();
      var w0 = toWorld(a.x0, a.y0);
      if (Math.sqrt(dx * dx + dy * dy) < DRAG_MIN) {
        var o = orbitalVelocity(w0.x, w0.y);
        addBodyAt(w0.x, w0.y, o.vx, o.vy);
      } else {
        addBodyAt(w0.x, w0.y, (dx / view.k) * DRAG_GAIN, (dy / view.k) * DRAG_GAIN);
      }
    }
    if (!rafId) render();
  }

  canvas.addEventListener("pointerup", function (e) {
    endAim(e, false);
  });
  canvas.addEventListener("pointercancel", function (e) {
    endAim(e, true);
  });

  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      if (userPaused) resume();
      else pause();
    });
  }
  if (resetBtn) resetBtn.addEventListener("click", reset);

  function onColorChange() {
    readColors();
    if (!rafId) render();
  }
  document.addEventListener("themechange", onColorChange);
  if (darkQuery) {
    if (darkQuery.addEventListener) darkQuery.addEventListener("change", onColorChange);
    else if (darkQuery.addListener) darkQuery.addListener(onColorChange);
  }

  function onMotionChange() {
    reduced = !!motionQuery.matches;
    syncToggle();
    if (reduced) {
      reset();
    } else {
      syncLoop();
    }
  }
  if (motionQuery) {
    if (motionQuery.addEventListener) motionQuery.addEventListener("change", onMotionChange);
    else if (motionQuery.addListener) motionQuery.addListener(onMotionChange);
  }

  document.addEventListener("visibilitychange", function () {
    tabVisible = !document.hidden;
    syncLoop();
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      var last = entries[entries.length - 1];
      heroVisible = last.isIntersecting;
      syncLoop();
    }).observe(host);
  }

  if ("ResizeObserver" in window) {
    var ro = new ResizeObserver(resize);
    ro.observe(host);
    var inner = document.querySelector(".hero-inner");
    if (inner) ro.observe(inner);
  } else {
    window.addEventListener("resize", resize);
  }

  readColors();
  syncToggle();
  resize();
  syncLoop();

  window.addEventListener("load", resize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);

  /* zoom : facteur d'échelle ; rec : 0 à 1, recentrage du corps central vers (tx, ty) en px du canvas
     (négatif : centre du canvas) ; mask : force du masque de texte ; glow : halo du corps central. */
  function setCamera(zoom, rec, mask, glow, tx, ty) {
    cam.k = zoom > 0 ? zoom : 1;
    cam.rec = rec || 0;
    cam.mask = mask === undefined ? 1 : mask;
    cam.glow = glow || 0;
    cam.tx = tx === undefined ? -1 : tx;
    cam.ty = ty === undefined ? -1 : ty;
    if (!rafId && !extHidden) render();
  }

  /* Position écran (px du canvas) du corps central, caméra comprise. */
  function focus() {
    updateView();
    return { x: view.fx, y: view.fy, w: W, h: H };
  }

  /* Mise en veille demandée de l'extérieur quand le hero épinglé est entièrement masqué. */
  function setHidden(on) {
    extHidden = !!on;
    syncLoop();
  }

  window.SIM = {
    pause: pause,
    resume: resume,
    reset: reset,
    setCamera: setCamera,
    focus: focus,
    setHidden: setHidden,
    get running() {
      return !reduced && !userPaused;
    }
  };
})();
