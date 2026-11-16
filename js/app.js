/* Rendu du portfolio depuis window.PORTFOLIO : visuels génératifs, filtres, panneau projet, compétences, palette.
   Tout ce qui dépend du défilement (révélations, progression, section courante, frise) vit dans transitions.js. */
(function () {
  "use strict";

  var D = window.PORTFOLIO;
  if (!D) return;

  var mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var mqFine = window.matchMedia("(hover: hover) and (pointer: fine)");
  var EASE = "cubic-bezier(.2,.7,.2,1)";

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function reduced() { return mqReduce.matches; }
  function canVT() { return typeof document.startViewTransition === "function" && !reduced(); }

  function h(tag, props, kids) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k];
        if (v === null || v === undefined || v === false) return;
        if (k === "class") node.className = v;
        else if (k === "text") node.textContent = v;
        else node.setAttribute(k, v === true ? "" : v);
      });
    }
    (kids || []).forEach(function (kid) {
      if (kid) node.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid);
    });
    return node;
  }

  function norm(s) { return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function plural(n, one, many) { return n + " " + (n > 1 ? many : one); }

  var domainLabel = {};
  D.domains.forEach(function (d) { domainLabel[d.id] = d.label; });
  var byId = {};
  D.projects.forEach(function (p) { byId[p.id] = p; });

  /* Compteur animé */
  function countTo(el, to, dur) {
    if (reduced()) { el.textContent = String(to); return; }
    var start = null;
    dur = dur || 900;
    var from = parseInt(el.getAttribute("data-from") || "0", 10) || 0;
    if (el._raf) cancelAnimationFrame(el._raf);
    function tick(now) {
      if (start === null) start = now;
      var k = Math.min(1, (now - start) / dur);
      var e = 1 - Math.pow(1 - k, 3);
      el.textContent = String(Math.round(from + (to - from) * e));
      if (k < 1) el._raf = requestAnimationFrame(tick); else el._raf = 0;
    }
    el._raf = requestAnimationFrame(tick);
  }
  function startCounters(root) {
    var list = $$("[data-count]", root);
    if (root.hasAttribute && root.hasAttribute("data-count")) list.push(root);
    list.forEach(function (el) { el.setAttribute("data-from", "0"); countTo(el, parseInt(el.getAttribute("data-count"), 10), 900); });
  }

  /* ---------- Visuels génératifs (canvas) ---------- */
  var Viz = (function () {
    var PI2 = Math.PI * 2;
    var IR = "124,143,255", PK = "255,107,152", WH = "230,234,247";
    var all = [];
    var raf = 0;
    var last = 0;
    var modalOnly = false;
    var held = false;

    function hash(s) { var x = 2166136261; for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
    function rng(seed) {
      var a = seed >>> 0;
      return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        var t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    function c(rgb, a) { return "rgba(" + rgb + "," + Math.max(0, Math.min(1, a)).toFixed(3) + ")"; }
    function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
    function sstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
    function frac(x) { return x - Math.floor(x); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function rr(x, px, py, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r);
      x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath();
    }
    function halo(x, px, py, r, rgb, a) {
      var g = x.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, c(rgb, a)); g.addColorStop(1, c(rgb, 0));
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, PI2); x.fill();
    }
    function grad(x, x0, y0, x1, y1, a) {
      var g = x.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, c(IR, a)); g.addColorStop(1, c(PK, a));
      return g;
    }

    /* web : fenêtre d'interface dont les blocs se remplissent et pulsent */
    function makeWeb(r) {
      var cols = r() < 0.5 ? 2 : 3;
      var sideRight = r() < 0.5;
      var n = cols === 2 ? 4 : 5;
      var cells = [], col = 0, row = 0, i;
      for (i = 0; i < n; i++) {
        var span = (i === 0 && r() < 0.6) ? 2 : 1;
        if (col + span > cols) { col = 0; row++; }
        cells.push({ col: col, row: row, span: span, type: (r() * 3) | 0, ph: r() * 6.28, sp: 0.5 + r() * 0.6, bars: 4 + ((r() * 3) | 0) });
        col += span;
        if (col >= cols) { col = 0; row++; }
      }
      var rows = row + (col > 0 ? 1 : 0);
      return function (x, w, h, t, g) {
        var wx = w * 0.08, wy = h * 0.12, ww = w * 0.84, wh = h * 0.78;
        rr(x, wx, wy, ww, wh, 12); x.fillStyle = c(WH, 0.04); x.fill();
        x.strokeStyle = c(WH, 0.16 + 0.12 * g); x.lineWidth = 1; x.stroke();
        var tb = Math.max(20, wh * 0.12);
        for (var d = 0; d < 3; d++) { x.beginPath(); x.arc(wx + 14 + d * 12, wy + tb / 2, 3, 0, PI2); x.fillStyle = c(d === 0 ? PK : WH, d === 0 ? 0.7 : 0.18); x.fill(); }
        rr(x, wx + ww * 0.3, wy + tb * 0.25, ww * 0.4, tb * 0.5, tb * 0.25); x.fillStyle = c(WH, 0.07); x.fill();
        x.beginPath(); x.moveTo(wx, wy + tb); x.lineTo(wx + ww, wy + tb); x.strokeStyle = c(WH, 0.09); x.stroke();
        var sw = ww * 0.17, by = wy + tb, bh = wh - tb, bw = ww - sw;
        var sx = sideRight ? wx + ww - sw : wx, bx = sideRight ? wx : wx + sw;
        var act = Math.floor(t * 0.55) % cells.length;
        for (var k = 0; k < 5; k++) {
          var on = k === act % 5;
          rr(x, sx + sw * 0.18, by + bh * (0.12 + k * 0.14), sw * 0.64, 6, 3);
          x.fillStyle = on ? grad(x, sx, 0, sx + sw, 0, 0.8) : c(WH, 0.1); x.fill();
        }
        var pad = 10, gap = 8;
        var cw = (bw - 2 * pad - gap * (cols - 1)) / cols;
        var ch = (bh - 2 * pad - gap * (rows - 1)) / rows;
        var centers = [];
        for (i = 0; i < cells.length; i++) {
          var q = cells[i];
          var qx = bx + pad + q.col * (cw + gap), qy = by + pad + q.row * (ch + gap);
          var qw = cw * q.span + gap * (q.span - 1), qh = ch;
          centers.push([qx + qw / 2, qy + qh / 2]);
          var isAct = i === act;
          var pulse = 0.5 + 0.5 * Math.sin(t * q.sp * 2 + q.ph);
          rr(x, qx, qy, qw, qh, 8);
          x.fillStyle = c(WH, 0.03 + (isAct ? 0.04 : 0)); x.fill();
          x.strokeStyle = isAct ? c(IR, 0.8) : c(WH, 0.08 + 0.1 * pulse * (0.4 + g));
          x.stroke();
          if (isAct) halo(x, qx + qw / 2, qy + qh / 2, Math.max(qw, qh) * 0.8, IR, 0.12 + 0.1 * g);
          var ix = qx + 10, iy = qy + 10, iw = qw - 20, ih = qh - 20;
          if (q.type === 0) {
            var bwid = iw / (q.bars * 1.6);
            for (var b = 0; b < q.bars; b++) {
              var hh = ih * (0.2 + 0.8 * (0.5 + 0.5 * Math.sin(t * q.sp * 1.7 + q.ph + b * 0.9)));
              rr(x, ix + b * bwid * 1.6, iy + ih - hh, bwid, hh, 3);
              x.fillStyle = grad(x, 0, iy + ih - hh, 0, iy + ih, 0.55 + 0.3 * g); x.fill();
            }
          } else if (q.type === 1) {
            var sh = frac(t * 0.3 * q.sp + q.ph) * 1.6 - 0.3;
            for (var l = 0; l < 3; l++) {
              var lw = iw * (l === 2 ? 0.55 : 0.95 - l * 0.12), ly = iy + l * (ih / 3.2);
              rr(x, ix, ly, lw, 5, 2.5); x.fillStyle = c(WH, 0.13); x.fill();
              var hx = ix + sh * iw;
              if (hx > ix - 30 && hx < ix + lw) {
                x.save(); rr(x, ix, ly, lw, 5, 2.5); x.clip();
                x.fillStyle = grad(x, hx - 24, 0, hx + 24, 0, 0.9); x.fillRect(hx - 24, ly, 48, 5); x.restore();
              }
            }
          } else {
            var rad = Math.min(ih, iw) * 0.42, cx = ix + rad + 2, cy = iy + ih / 2;
            x.lineWidth = 4; x.lineCap = "round";
            x.strokeStyle = c(WH, 0.1); x.beginPath(); x.arc(cx, cy, rad, 0, PI2); x.stroke();
            x.strokeStyle = grad(x, cx - rad, cy, cx + rad, cy, 0.95);
            x.beginPath(); x.arc(cx, cy, rad, -Math.PI / 2, -Math.PI / 2 + PI2 * (0.15 + 0.85 * pulse)); x.stroke();
            x.lineWidth = 1;
            rr(x, cx + rad + 10, cy - 4, Math.max(8, iw - rad * 2 - 14), 5, 2.5); x.fillStyle = c(WH, 0.14); x.fill();
          }
        }
        var fr = (t * 0.55) % 1, p0 = centers[(act + centers.length - 1) % centers.length], p1 = centers[act];
        var e = sstep(0, 0.45, fr), mx = lerp(p0[0], p1[0], e) + 8, my = lerp(p0[1], p1[1], e) + 8;
        x.beginPath(); x.moveTo(mx, my); x.lineTo(mx + 9, my + 20); x.lineTo(mx + 13, my + 12); x.lineTo(mx + 21, my + 9); x.closePath();
        x.fillStyle = c(WH, 0.92); x.fill(); x.strokeStyle = c(IR, 0.9); x.stroke();
      };
    }

    /* sys : paquets entre un serveur et des clients */
    function makeSys(r) {
      var nCl = 3 + ((r() * 3) | 0);
      var router = r() < 0.55;
      var srvX = 0.15 + r() * 0.06, srvY = 0.38 + r() * 0.24, mirror = r() < 0.35;
      var cl = [];
      for (var i = 0; i < nCl; i++) cl.push({ y: (i + 0.5) / nCl + (r() - 0.5) * 0.04, x: 0.8 + r() * 0.1, ph: r(), sp: 0.16 + r() * 0.1 });
      function pt(path, u) {
        var L = 0, i2, segs = [];
        for (i2 = 1; i2 < path.length; i2++) { var d = Math.hypot(path[i2][0] - path[i2 - 1][0], path[i2][1] - path[i2 - 1][1]); segs.push(d); L += d; }
        var tgt = u * L;
        for (i2 = 0; i2 < segs.length; i2++) {
          if (tgt <= segs[i2] || i2 === segs.length - 1) { var f = clamp(tgt / segs[i2], 0, 1); return [lerp(path[i2][0], path[i2 + 1][0], f), lerp(path[i2][1], path[i2 + 1][1], f)]; }
          tgt -= segs[i2];
        }
        return path[path.length - 1];
      }
      return function (x, w, h, t, g) {
        var sx = w * (mirror ? 1 - srvX : srvX), sy = h * srvY, rx = w * 0.5, ry = h * (0.3 + srvY * 0.4), i3;
        var paths = [];
        for (i3 = 0; i3 < cl.length; i3++) {
          var cx = w * (mirror ? 1 - cl[i3].x : cl[i3].x), cy = h * (0.12 + 0.76 * cl[i3].y);
          paths.push(router ? [[sx, sy], [rx, ry], [cx, cy]] : [[sx, sy], [lerp(sx, cx, 0.5), cy], [cx, cy]]);
        }
        x.lineWidth = 1.2;
        for (i3 = 0; i3 < paths.length; i3++) {
          var p = paths[i3];
          x.strokeStyle = c(WH, 0.12 + 0.1 * g); x.beginPath(); x.moveTo(p[0][0], p[0][1]);
          for (var j = 1; j < p.length; j++) x.lineTo(p[j][0], p[j][1]);
          x.stroke();
        }
        for (i3 = 0; i3 < cl.length; i3++) {
          var P = paths[i3], cc = P[P.length - 1], flash = 0;
          for (var k = 0; k < 2; k++) {
            var u = frac(t * cl[i3].sp + cl[i3].ph + k * 0.5), out = k === 0;
            var pos = pt(P, out ? u : 1 - u);
            if (out) flash = Math.max(flash, sstep(0.88, 1, u) * (1 - sstep(0.97, 1.0, u) * 0.0));
            for (var tr = 3; tr >= 0; tr--) {
              var uu = clamp(u - tr * 0.018, 0, 1), pp = pt(P, out ? uu : 1 - uu);
              x.fillStyle = c(out ? PK : IR, (0.9 - tr * 0.22) * (0.8 + 0.2 * g));
              x.beginPath(); x.arc(pp[0], pp[1], 3.2 - tr * 0.5, 0, PI2); x.fill();
            }
            halo(x, pos[0], pos[1], 14, out ? PK : IR, 0.35 + 0.2 * g);
          }
          halo(x, cc[0], cc[1], 26, IR, 0.1 + 0.4 * flash);
          rr(x, cc[0] - 11, cc[1] - 8, 22, 15, 3); x.fillStyle = c(WH, 0.07); x.fill();
          x.strokeStyle = c(WH, 0.3 + 0.5 * flash); x.stroke();
          x.beginPath(); x.moveTo(cc[0] - 14, cc[1] + 11); x.lineTo(cc[0] + 14, cc[1] + 11); x.stroke();
        }
        if (router) {
          x.save(); x.translate(rx, ry); x.rotate(Math.PI / 4);
          rr(x, -9, -9, 18, 18, 4); x.fillStyle = c(WH, 0.08); x.fill(); x.strokeStyle = c(PK, 0.8); x.stroke(); x.restore();
          halo(x, rx, ry, 30, PK, 0.12 + 0.12 * g);
        }
        halo(x, sx, sy, 50, IR, 0.2 + 0.15 * g);
        for (i3 = 0; i3 < 3; i3++) {
          var yy = sy - 27 + i3 * 19;
          rr(x, sx - 22, yy, 44, 15, 4); x.fillStyle = c(WH, 0.08); x.fill(); x.strokeStyle = c(WH, 0.35); x.stroke();
          for (var l = 0; l < 2; l++) { x.beginPath(); x.arc(sx - 14 + l * 9, yy + 7.5, 2, 0, PI2); x.fillStyle = Math.sin(t * 4 + i3 * 2 + l) > 0 ? c(PK, 0.95) : c(WH, 0.2); x.fill(); }
        }
      };
    }

    /* cyber : graphe avec un chemin d'attaque qui s'illumine */
    function makeCyber(r) {
      var cols = 5, rows = 3, nodes = [], i, j;
      for (i = 0; i < cols; i++) for (j = 0; j < rows; j++) nodes.push({ c: i, r: j, x: 0.1 + 0.8 * i / (cols - 1) + (r() - 0.5) * 0.07, y: 0.2 + 0.6 * j / (rows - 1) + (r() - 0.5) * 0.12, sq: r() < 0.3 });
      function nid(ci, ri) { return ci * rows + ri; }
      var edges = {}, list = [];
      function addE(a, b) { var k = Math.min(a, b) + "-" + Math.max(a, b); if (!edges[k]) { edges[k] = 1; list.push([a, b]); } }
      var rowAt = (r() * rows) | 0, path = [nid(0, rowAt)];
      for (i = 1; i < cols; i++) { rowAt = clamp(rowAt + ((r() * 3) | 0) - 1, 0, rows - 1); path.push(nid(i, rowAt)); addE(path[i - 1], path[i]); }
      for (i = 0; i < cols; i++) for (j = 0; j < rows; j++) {
        if (i < cols - 1 && r() < 0.6) addE(nid(i, j), nid(i + 1, (r() * rows) | 0));
        if (j < rows - 1 && r() < 0.4) addE(nid(i, j), nid(i, j + 1));
      }
      var seg = path.length - 1;
      return function (x, w, h, t, g) {
        var head = (t * 0.7) % (seg + 3.2), fade = 1 - sstep(seg + 1.6, seg + 3.1, head);
        var k, n, a, b;
        x.lineWidth = 1;
        for (k = 0; k < list.length; k++) {
          a = nodes[list[k][0]]; b = nodes[list[k][1]];
          x.strokeStyle = c(WH, 0.11 + 0.08 * g); x.beginPath(); x.moveTo(a.x * w, a.y * h); x.lineTo(b.x * w, b.y * h); x.stroke();
        }
        for (k = 0; k < seg; k++) {
          var f = clamp(head - k, 0, 1) * fade;
          if (f <= 0) continue;
          a = nodes[path[k]]; b = nodes[path[k + 1]];
          var ex = lerp(a.x, b.x, clamp(head - k, 0, 1)) * w, ey = lerp(a.y, b.y, clamp(head - k, 0, 1)) * h;
          x.lineWidth = 2.4; x.strokeStyle = grad(x, a.x * w, a.y * h, b.x * w, b.y * h, Math.min(1, fade + 0.1)); x.beginPath(); x.moveTo(a.x * w, a.y * h); x.lineTo(ex, ey); x.stroke();
          x.lineWidth = 7; x.strokeStyle = c(IR, 0.12 * fade); x.stroke();
        }
        for (k = 0; k < nodes.length; k++) {
          n = nodes[k];
          var pi = path.indexOf(k), lit = pi >= 0 ? clamp(head - pi + 0.15, 0, 1) * fade : 0;
          var px = n.x * w, py = n.y * h, last = pi === path.length - 1;
          if (lit > 0) halo(x, px, py, last ? 40 : 24, last ? PK : IR, 0.45 * lit);
          x.fillStyle = c(WH, 0.08 + 0.1 * lit); x.strokeStyle = lit > 0 ? c(last ? PK : IR, 0.5 + 0.5 * lit) : c(WH, 0.3 + 0.1 * g);
          x.lineWidth = 1.4;
          if (last) { x.save(); x.translate(px, py); x.rotate(Math.PI / 4 + (lit > 0.9 ? Math.sin(t * 3) * 0.08 : 0)); rr(x, -9, -9, 18, 18, 3); x.fill(); x.stroke(); x.restore(); }
          else if (n.sq) { rr(x, px - 6, py - 6, 12, 12, 3); x.fill(); x.stroke(); }
          else { x.beginPath(); x.arc(px, py, 6.5, 0, PI2); x.fill(); x.stroke(); }
        }
      };
    }

    /* ia : grille de points balayée par une ligne de scan */
    function makeIa(r) {
      var vertical = r() < 0.4, boxes = [], K = 3 + ((r() * 3) | 0), i;
      for (i = 0; i < K; i++) boxes.push({ x: 0.12 + r() * 0.62, y: 0.16 + r() * 0.5, w: 0.13 + r() * 0.13, h: 0.16 + r() * 0.16, tag: 0.4 + r() * 0.5 });
      return function (x, w, h, t, g) {
        var s = Math.max(15, Math.min(w, h) / 9), cols = Math.floor(w / s), rows = Math.floor(h / s);
        var ox = (w - (cols - 1) * s) / 2, oy = (h - (rows - 1) * s) / 2;
        var cyc = (t * 0.2) % 1.25, pos = clamp(cyc / 1.1, 0, 1.05), fade = 1 - sstep(1.0, 1.25, cyc);
        var len = vertical ? h : w;
        var sp = pos * len;
        var wash = x.createLinearGradient(vertical ? 0 : sp - 90, vertical ? sp - 90 : 0, vertical ? 0 : sp, vertical ? sp : 0);
        wash.addColorStop(0, c(IR, 0)); wash.addColorStop(1, c(IR, 0.16 * fade));
        x.fillStyle = wash;
        if (vertical) x.fillRect(0, sp - 90, w, 90); else x.fillRect(sp - 90, 0, 90, h);
        var a, b, j, bx;
        for (a = 0; a < cols; a++) for (b = 0; b < rows; b++) {
          var px = ox + a * s, py = oy + b * s, d = Math.abs((vertical ? py : px) - sp);
          var near = Math.exp(-d * d / 1400) * fade, inBox = 0;
          for (j = 0; j < boxes.length; j++) {
            bx = boxes[j];
            if (px / w > bx.x && px / w < bx.x + bx.w && py / h > bx.y && py / h < bx.y + bx.h) {
              var started = (vertical ? bx.y : bx.x) * len + (vertical ? bx.h : bx.w) * len * 0.5;
              inBox = Math.max(inBox, sstep(0, 40, sp - started + 40) * fade);
            }
          }
          var al = 0.16 + 0.55 * near + 0.7 * inBox + 0.12 * g;
          x.fillStyle = inBox > 0.1 ? c(PK, al) : c(near > 0.2 ? IR : WH, al * (near > 0.2 ? 1 : 0.9));
          var sz = 1.6 + 1.6 * near + 1.2 * inBox;
          x.fillRect(px - sz / 2, py - sz / 2, sz, sz);
        }
        x.lineWidth = 1.5;
        var lg = vertical ? x.createLinearGradient(0, 0, w, 0) : x.createLinearGradient(0, 0, 0, h);
        lg.addColorStop(0, c(IR, 0)); lg.addColorStop(0.5, c(WH, 0.9 * fade)); lg.addColorStop(1, c(PK, 0));
        x.strokeStyle = lg; x.beginPath();
        if (vertical) { x.moveTo(0, sp); x.lineTo(w, sp); } else { x.moveTo(sp, 0); x.lineTo(sp, h); }
        x.stroke();
        for (j = 0; j < boxes.length; j++) {
          bx = boxes[j];
          var started2 = (vertical ? bx.y : bx.x) * len + (vertical ? bx.h : bx.w) * len * 0.5, k2 = sstep(0, 40, sp - started2 + 40) * fade;
          if (k2 <= 0.02) continue;
          rr(x, bx.x * w, bx.y * h, bx.w * w, bx.h * h, 6); x.strokeStyle = c(PK, 0.9 * k2); x.lineWidth = 1.5; x.stroke();
          rr(x, bx.x * w, bx.y * h - 14, bx.w * w * bx.tag, 9, 4.5); x.fillStyle = c(PK, 0.85 * k2); x.fill();
        }
      };
    }

    /* math : orbites ou rayons rebondissant sur une sphère */
    function makeMath(r, id) {
      var variant = id === "raytracer" ? 1 : id === "interstonar" ? 0 : (r() < 0.5 ? 0 : 1);
      var orbits = [], i;
      for (i = 0; i < 4; i++) orbits.push({ k: 2.1 + i * 0.95 + r() * 0.3, e: 0.34 + r() * 0.25, rot: r() * Math.PI, sp: (0.5 - i * 0.08) * (r() < 0.2 ? -1 : 1), ph: r() * PI2 });
      var nr = 8 + ((r() * 4) | 0), sweep = 0.2 + r() * 0.25, srcY = 0.3 + r() * 0.4;
      function sphere(x, cx, cy, R, g) {
        halo(x, cx, cy, R * 2.8, IR, 0.2 + 0.12 * g);
        var gr = x.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
        gr.addColorStop(0, c(WH, 0.95)); gr.addColorStop(0.35, c(IR, 0.85)); gr.addColorStop(1, c(PK, 0.55));
        x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, R, 0, PI2); x.fill();
      }
      return function (x, w, h, t, g) {
        var R = Math.min(w, h) * 0.12;
        if (variant === 0) {
          var cx = w * 0.5, cy = h * 0.5;
          for (i = 0; i < orbits.length; i++) {
            var o = orbits[i], rx = R * o.k, ry = rx * o.e * 1.6;
            x.save(); x.translate(cx, cy); x.rotate(o.rot);
            x.strokeStyle = c(WH, 0.12 + 0.1 * g); x.lineWidth = 1; x.beginPath(); x.ellipse(0, 0, rx, ry, 0, 0, PI2); x.stroke();
            for (var tr = 12; tr >= 0; tr--) {
              var an = o.ph + (t * o.sp - tr * 0.045 * Math.sign(o.sp)), bx2 = Math.cos(an) * rx, by2 = Math.sin(an) * ry;
              x.fillStyle = c(i % 2 ? PK : IR, (1 - tr / 13) * 0.9); x.beginPath(); x.arc(bx2, by2, tr === 0 ? 4 : 2.4 * (1 - tr / 16), 0, PI2); x.fill();
              if (tr === 0) halo(x, bx2, by2, 16, i % 2 ? PK : IR, 0.4 + 0.2 * g);
            }
            x.restore();
          }
          sphere(x, cx, cy, R, g);
        } else {
          var sx = w * 0.64, sy = h * 0.52, S = R * 1.35, ox = w * 0.06, oy = h * srcY;
          x.strokeStyle = c(WH, 0.14); x.beginPath(); x.moveTo(0, h * 0.86); x.lineTo(w, h * 0.86); x.stroke();
          for (i = 0; i < nr; i++) {
            var ang = Math.atan2(sy - oy, sx - ox) + (i / (nr - 1) - 0.5) * 0.9 + Math.sin(t * sweep + i * 0.3) * 0.08;
            var dx = Math.cos(ang), dy = Math.sin(ang), fx = ox - sx, fy = oy - sy;
            var bq = fx * dx + fy * dy, cq = fx * fx + fy * fy - S * S, disc = bq * bq - cq, pts = [[ox, oy]];
            if (disc > 0) {
              var th = -bq - Math.sqrt(disc), hx = ox + dx * th, hy = oy + dy * th, nx = (hx - sx) / S, ny = (hy - sy) / S, dd = dx * nx + dy * ny;
              pts.push([hx, hy]); var rx2 = dx - 2 * dd * nx, ry2 = dy - 2 * dd * ny, tl = 600;
              pts.push([hx + rx2 * tl, hy + ry2 * tl]);
            } else pts.push([ox + dx * 900, oy + dy * 900]);
            x.strokeStyle = c(IR, 0.2 + 0.15 * g); x.lineWidth = 1; x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (var m = 1; m < pts.length; m++) x.lineTo(pts[m][0], pts[m][1]); x.stroke();
            var u = frac(t * 0.35 + i / nr), d1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), d2 = pts.length > 2 ? 380 : 0, tot = d1 + d2, s0 = u * tot, s1 = Math.max(0, s0 - 46);
            function at(s2) { if (s2 <= d1) return [lerp(pts[0][0], pts[1][0], s2 / d1), lerp(pts[0][1], pts[1][1], s2 / d1)]; var f = (s2 - d1) / 600; return [lerp(pts[1][0], pts[2][0], f), lerp(pts[1][1], pts[2][1], f)]; }
            var A = at(s1), B = at(s0);
            x.strokeStyle = grad(x, A[0], A[1], B[0], B[1], 0.95); x.lineWidth = 2.4; x.beginPath(); x.moveTo(A[0], A[1]); x.lineTo(B[0], B[1]); x.stroke();
            if (pts.length > 2 && Math.abs(s0 - d1) < 20) halo(x, pts[1][0], pts[1][1], 22, PK, 0.7);
          }
          sphere(x, sx, sy, S, g);
          halo(x, ox, oy, 26, PK, 0.6 + 0.2 * g);
          x.fillStyle = c(WH, 1); x.beginPath(); x.arc(ox, oy, 3.5, 0, PI2); x.fill();
        }
      };
    }

    /* cloud : un bloc qui se scinde en conteneurs reliés */
    function makeCloud(r) {
      var N = 4 + ((r() * 3) | 0), ring = r() < 0.5, off = r() * PI2, tg = [], i;
      for (i = 0; i < N; i++) {
        if (ring) { var a = off + i / N * PI2; tg.push([0.5 + Math.cos(a) * 0.34, 0.5 + Math.sin(a) * 0.32]); }
        else tg.push([0.15 + 0.7 * i / (N - 1), i % 2 ? 0.25 : 0.75]);
      }
      return function (x, w, h, t, g) {
        var p = (t * 0.14) % 1, s = sstep(0.12, 0.42, p) - sstep(0.76, 0.96, p), cx = w * 0.5, cy = h * 0.5;
        var bw = Math.min(w, h) * 0.5, bh = bw * 0.7, cs = Math.min(w, h) * 0.17, k;
        var pulseT = sstep(0.45, 0.6, p) * (1 - sstep(0.76, 0.9, p));
        for (k = 0; k < N; k++) {
          var tx = tg[k][0] * w, ty = tg[k][1] * h, px = lerp(cx, tx, s), py = lerp(cy, ty, s);
          if (s > 0.05) {
            x.strokeStyle = c(IR, 0.4 * s + 0.15 * g); x.lineWidth = 1.2; x.beginPath(); x.moveTo(cx, cy); x.lineTo(px, py); x.stroke();
            if (pulseT > 0) { var u = frac(t * 0.5 + k * 0.23); halo(x, lerp(cx, tx, u), lerp(cy, ty, u), 12, PK, 0.8 * pulseT); x.fillStyle = c(WH, 0.9 * pulseT); x.beginPath(); x.arc(lerp(cx, tx, u), lerp(cy, ty, u), 2.4, 0, PI2); x.fill(); }
          }
          var sc = lerp(0.35, 1, s), a2 = clamp(s * 1.4, 0, 1);
          if (a2 > 0) {
            halo(x, px, py, cs * 1.4, IR, 0.18 * a2 + 0.1 * g);
            rr(x, px - cs * sc / 2, py - cs * sc * 0.36, cs * sc, cs * sc * 0.72, 5 * sc); x.fillStyle = c(WH, 0.08 * a2); x.fill(); x.strokeStyle = c(k % 2 ? PK : IR, 0.9 * a2); x.lineWidth = 1.4; x.stroke();
            x.fillStyle = c(WH, 0.5 * a2); x.fillRect(px - cs * sc * 0.36, py - cs * sc * 0.14, cs * sc * 0.72, 2 * sc); x.fillRect(px - cs * sc * 0.36, py + cs * sc * 0.06, cs * sc * 0.45, 2 * sc);
          }
        }
        var ba = 1 - clamp(s * 1.6, 0, 1), bs = lerp(1, 0.6, s);
        if (ba > 0.01) {
          halo(x, cx, cy, bw, IR, 0.3 * ba + 0.1 * g);
          rr(x, cx - bw * bs / 2, cy - bh * bs / 2, bw * bs, bh * bs, 12); x.fillStyle = c(WH, 0.07 * ba); x.fill(); x.strokeStyle = grad(x, cx - bw / 2, cy, cx + bw / 2, cy, 0.95 * ba); x.lineWidth = 1.8; x.stroke();
          for (k = 0; k < 4; k++) { rr(x, cx - bw * bs * 0.38, cy - bh * bs * 0.3 + k * bh * bs * 0.19, bw * bs * (k % 2 ? 0.45 : 0.76), 4, 2); x.fillStyle = c(WH, 0.25 * ba); x.fill(); }
        }
      };
    }

    var MAKERS = { web: makeWeb, sys: makeSys, cyber: makeCyber, ia: makeIa, math: makeMath, cloud: makeCloud };
    var KIT = { PI2: PI2, IR: IR, PK: PK, WH: WH, c: c, clamp: clamp, sstep: sstep, frac: frac, lerp: lerp, rr: rr, halo: halo, grad: grad };
    function pick(p, rd) {
      var own = window.PROJECT_VIZ && window.PROJECT_VIZ[p.id];
      if (typeof own === "function") {
        try { var d = own(rd, KIT); if (typeof d === "function") return d; } catch (e) {}
      }
      return (MAKERS[p.domain] || MAKERS.web)(rd, p.id);
    }

    function size(v) {
      var box = v.canvas.parentNode.getBoundingClientRect();
      var w = Math.round(box.width), h = Math.round(box.height);
      if (w < 2 || h < 2) return false;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (w === v.w && h === v.h && dpr === v.dpr) return false;
      v.w = w; v.h = h; v.dpr = dpr;
      v.canvas.width = Math.round(w * dpr); v.canvas.height = Math.round(h * dpr);
      return true;
    }
    function paint(v) {
      if (!v.w) return;
      v.ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
      v.ctx.clearRect(0, 0, v.w, v.h);
      v.ctx.lineCap = "butt";
      v.draw(v.ctx, v.w, v.h, v.t, v.g);
    }
    function setProject(v, p) {
      var rd = rng(hash(p.id));
      v.id = p.id;
      v.t = 4 + rd() * 20;
      v.draw = pick(p, rd);
      paint(v);
    }
    function create(canvas, p, isModal) {
      var v = { canvas: canvas, ctx: canvas.getContext("2d"), w: 0, h: 0, dpr: 1, t: 0, g: 0, target: 0, visible: false, modal: !!isModal, draw: null };
      all.push(v);
      size(v);
      setProject(v, p);
      if (typeof ResizeObserver === "function") {
        new ResizeObserver(function () { if (size(v)) paint(v); }).observe(canvas.parentNode);
      }
      return v;
    }
    function active(v) { return v.visible && (v.modal || (!modalOnly && !held)); }
    function loop(now) {
      raf = 0;
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      var any = false;
      for (var i = 0; i < all.length; i++) {
        var v = all[i];
        if (!active(v)) continue;
        any = true;
        v.g += (v.target - v.g) * Math.min(1, dt * 7);
        v.t += dt * (1 + 1.6 * v.g);
        paint(v);
      }
      if (any) raf = requestAnimationFrame(loop); else last = 0;
    }
    function kick() { if (!raf && !mqReduce.matches) raf = requestAnimationFrame(loop); }
    return {
      create: create, setProject: setProject, kick: kick, paint: paint, size: size,
      setVisible: function (v, on) { v.visible = on; if (on) { size(v); kick(); } },
      setModal: function (on) { modalOnly = on; if (!on) kick(); },
      hold: function (on) { on = !!on; if (on === held) return; held = on; if (!on) kick(); },
      hot: function (v, on) { v.target = on ? 1 : 0; if (on) kick(); }
    };
  })();

  /* ---------- Bandeau de technologies et chiffres ---------- */
  var techs = [];
  D.projects.forEach(function (p) { p.stack.forEach(function (s) { if (techs.indexOf(s) === -1) techs.push(s); }); });

  function renderMarquee() {
    var track = $("#marquee-track");
    for (var k = 0; k < 2; k++) {
      var set = h("ul", { class: "marquee-set", "aria-hidden": k ? "true" : null }, techs.map(function (t) { return h("li", { class: "tech", text: t }); }));
      track.appendChild(set);
    }
    var fit = function () {
      var w = track.firstChild.offsetWidth;
      if (w) track.style.setProperty("--dur", Math.round(w / 55) + "s");
    };
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  }

  function renderStats() {
    var el = $("#stats");
    [[D.projects.length, "projets"], [D.domains.length, "domaines"], [techs.length, "technologies"]].forEach(function (s) {
      el.appendChild(h("li", { class: "stat" }, [
        h("span", { class: "stat-n", "data-count": String(s[0]), text: String(s[0]) }),
        h("span", { class: "stat-l", text: s[1] })
      ]));
    });
  }

  /* ---------- Projets : filtres et grille ---------- */
  var filtersEl = $("#filters");
  var filterInd = $("#filter-ind");
  var gridEl = $("#project-grid");
  var filtersLive = $("#filters-live");
  var tiles = {};
  var vizs = {};
  var currentFilter = "all";
  var WIDE = { "ticket-tout": "is-wide" };
  if ((D.projects.length + 2) % 3 === 0) WIDE.houndlabs = "is-wide-lg";

  function tileTitle(id) { return tiles[id] ? $(".project-title", tiles[id]) : null; }

  function renderProjects() {
    var vio = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { Viz.setVisible(en.target._viz, en.isIntersecting); });
    }, { rootMargin: "60px" }) : null;

    D.projects.forEach(function (p) {
      var metaKids = [h("span", { class: "dom", text: domainLabel[p.domain] || p.domain })];
      if (p.date) metaKids.push(h("span", { class: "date", text: p.date }));
      var canvas = h("canvas");
      var pv = h("span", { class: "pv", "aria-hidden": "true" }, [canvas]);
      var stack = h("span", { class: "project-stack" }, p.stack.slice(0, 4).map(function (s) { return h("span", { class: "chip", text: s }); }));
      var body = h("span", { class: "project-body" }, [
        h("span", { class: "project-meta" }, metaKids),
        h("span", { class: "project-title", text: p.title }),
        h("span", { class: "project-summary", text: p.summary }),
        stack
      ]);
      var btn = h("button", { class: "project-open", type: "button", "data-id": p.id, "aria-haspopup": "dialog" }, [pv, body]);
      var art = h("article", { class: "project", "data-id": p.id, "data-spot": "", "data-tilt": "" }, [btn]);
      /* La cellule porte le placement dans la grille, l'attribut hidden et les mouvements liés au défilement ;
         l'article garde l'inclinaison au survol et l'animation FLIP du filtre. */
      var cell = h("div", { class: "cell " + (WIDE[p.id] || ""), "data-domain": p.domain }, [art]);
      btn.addEventListener("click", function () { openProject(p.id, btn); });
      tiles[p.id] = art;
      gridEl.appendChild(cell);
      var v = Viz.create(canvas, p, false);
      vizs[p.id] = v;
      art._viz = v;
      pv._viz = v;
      if (vio) vio.observe(pv); else Viz.setVisible(v, true);
    });
  }

  function renderFilters() {
    var defs = [{ id: "all", label: "Tout", n: D.projects.length }].concat(D.domains.map(function (d) {
      return { id: d.id, label: d.label, n: D.projects.filter(function (p) { return p.domain === d.id; }).length };
    }));
    defs.forEach(function (d) {
      var b = h("button", { class: "filter", type: "button", "aria-pressed": d.id === "all" ? "true" : "false", "data-filter": d.id }, [
        d.label,
        h("span", { class: "filter-count" }, ["(", h("span", { "data-count": String(d.n), text: String(d.n) }), ")"])
      ]);
      b.addEventListener("click", function () { applyFilter(d.id); });
      filtersEl.appendChild(b);
    });
  }

  function placeInd(ind, el, instant) {
    if (!ind || !el || !el.offsetWidth) return;
    if (instant) ind.style.transition = "none";
    ind.style.width = el.offsetWidth + "px";
    ind.style.height = el.offsetHeight + "px";
    ind.style.transform = "translate(" + el.offsetLeft + "px," + el.offsetTop + "px)";
    ind.style.opacity = "1";
    if (instant) { void ind.offsetWidth; ind.style.transition = ""; }
  }
  function placeFilterInd(instant) { placeInd(filterInd, $('.filter[aria-pressed="true"]', filtersEl), instant); }

  function applyFilter(domain) {
    if (domain === currentFilter) return;
    currentFilter = domain;
    $$(".filter", filtersEl).forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-filter") === domain ? "true" : "false");
    });
    placeFilterInd(false);
    var cells = $$(".cell", gridEl);
    var animate = !reduced() && typeof Element.prototype.animate === "function";
    var before = new Map();
    if (animate) cells.forEach(function (c) { if (!c.hidden) before.set(c.firstChild, c.firstChild.getBoundingClientRect()); });
    cells.forEach(function (c) { c.hidden = domain !== "all" && c.getAttribute("data-domain") !== domain; });
    var shown = cells.filter(function (c) { return !c.hidden; }).map(function (c) { return c.firstChild; });
    /* La hauteur de la section vient de changer : ScrollTrigger recalcule tout avant la mesure d'arrivée. */
    if (window.PortfolioScroll && window.PortfolioScroll.refresh) window.PortfolioScroll.refresh();
    if (animate) {
      shown.forEach(function (t) {
        var after = t.getBoundingClientRect();
        var first = before.get(t);
        if (first) {
          var dx = first.left - after.left;
          var dy = first.top - after.top;
          if (dx || dy) t.animate([{ transform: "translate(" + dx + "px," + dy + "px)" }, { transform: "none" }], { duration: 350, easing: EASE });
        } else {
          t.animate([{ opacity: 0, transform: "scale(.96)" }, { opacity: 1, transform: "none" }], { duration: 350, easing: EASE });
        }
      });
    }
    filtersLive.textContent = plural(shown.length, "projet affiché", "projets affichés") + ".";
  }

  /* ---------- Panneau projet ---------- */
  var panel = $("#project-panel");
  var ppTitle = $("#pp-title");
  var ppViz = null;
  var currentId = null;
  var returnEl = null;
  var order = D.projects.map(function (p) { return p.id; });

  function fillPanel(id) {
    var p = byId[id];
    currentId = id;
    $("#pp-domain").textContent = domainLabel[p.domain] || p.domain;
    ppTitle.textContent = p.title;
    $("#pp-context").textContent = p.context;
    $("#pp-date").textContent = p.date;
    $("#pp-summary").textContent = p.summary;
    var pts = $("#pp-points");
    pts.textContent = "";
    p.points.forEach(function (t) { pts.appendChild(h("li", { text: t })); });
    var tags = $("#pp-stack");
    tags.textContent = "";
    p.stack.forEach(function (t) { tags.appendChild(h("li", { text: t })); });
    $("#pp-count").textContent = (order.indexOf(id) + 1) + " sur " + order.length;
    $(".panel-body", panel).scrollTop = 0;
    if (!ppViz) ppViz = Viz.create($("#pp-canvas"), p, true);
    else Viz.setProject(ppViz, p);
  }

  function openProject(id, opener) {
    if (!byId[id]) return;
    if (panel.open) { fillPanel(id); return; }
    returnEl = opener || document.activeElement;
    var tt = opener && opener.classList && opener.classList.contains("project-open") ? $(".project-title", opener) : null;
    var show = function () {
      fillPanel(id);
      panel.showModal();
      Viz.setModal(true);
      Viz.size(ppViz);
      Viz.paint(ppViz);
      Viz.setVisible(ppViz, true);
    };
    if (canVT()) {
      panel.setAttribute("data-vt", "1");
      if (tt) tt.style.viewTransitionName = "project-title";
      var t = document.startViewTransition(function () {
        if (tt) tt.style.viewTransitionName = "";
        show();
        if (tt) ppTitle.style.viewTransitionName = "project-title";
      });
      var clear = function () { ppTitle.style.viewTransitionName = ""; if (tt) tt.style.viewTransitionName = ""; };
      t.finished.then(clear, clear);
      if (t.ready && t.ready.catch) t.ready.catch(function () {});
    } else {
      panel.removeAttribute("data-vt");
      show();
    }
  }

  function closePanel() {
    if (!panel.open) return;
    var tile = tiles[currentId];
    var tt = tileTitle(currentId);
    var visible = false;
    if (tile && !tile.closest("[hidden]") && tt) {
      var r = tt.getBoundingClientRect();
      visible = r.bottom > 0 && r.top < window.innerHeight && r.height > 0;
    }
    if (canVT() && visible) {
      ppTitle.style.viewTransitionName = "project-title";
      var t = document.startViewTransition(function () {
        ppTitle.style.viewTransitionName = "";
        tt.style.viewTransitionName = "project-title";
        panel.close();
      });
      var clear = function () { tt.style.viewTransitionName = ""; ppTitle.style.viewTransitionName = ""; };
      t.finished.then(clear, clear);
      if (t.ready && t.ready.catch) t.ready.catch(function () {});
    } else {
      panel.close();
    }
  }

  function step(delta) {
    var i = order.indexOf(currentId);
    fillPanel(order[(i + delta + order.length) % order.length]);
  }

  panel.addEventListener("cancel", function (e) { e.preventDefault(); closePanel(); });
  panel.addEventListener("click", function (e) { if (e.target === panel) closePanel(); });
  panel.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
  });
  panel.addEventListener("close", function () {
    ppTitle.style.viewTransitionName = "";
    Viz.setModal(false);
    if (ppViz) Viz.setVisible(ppViz, false);
    var target = returnEl;
    if (returnEl && returnEl.classList && returnEl.classList.contains("project-open")) {
      var tile = tiles[currentId];
      if (tile && !tile.closest("[hidden]")) target = $(".project-open", tile);
    }
    if (target && document.contains(target) && !target.closest("[hidden]")) target.focus();
  });
  $("#pp-close").addEventListener("click", closePanel);
  $("#pp-prev").addEventListener("click", function () { step(-1); });
  $("#pp-next").addEventListener("click", function () { step(1); });

  /* ---------- Compétences ---------- */
  var skillsEl = $("#skills-groups");
  var indexEl = $("#proj-index");
  var skillsLive = $("#skills-live");
  var roName = $("#ro-name");
  var roNum = $("#ro-num");
  var roUnit = $("#ro-unit");
  var idxBtns = {};
  var skillItems = [];
  var groupLinks = [];
  var sel = { hover: null, focus: null, lock: null };

  function renderSkills() {
    D.projects.forEach(function (p) {
      var b = h("button", { class: "proj-btn", type: "button", text: p.title, "data-id": p.id, "aria-haspopup": "dialog" });
      b.addEventListener("click", function () { openProject(p.id, b); });
      idxBtns[p.id] = b;
      indexEl.appendChild(h("li", null, [b]));
    });

    D.skills.forEach(function (g) {
      var list = h("ul", { class: "pills" });
      var links = h("div", { class: "group-links" });
      g.items.forEach(function (it) {
        var n = it.projects.length;
        var kids = [h("span", { text: it.name })];
        if (n) kids.push(h("span", { class: "pill-n", "aria-hidden": "true", text: String(n) }));
        kids.push(h("span", { class: "sr-only", text: n ? ", " + plural(n, "projet", "projets") : ", Pratique courante" }));
        var btn = h("button", { class: "skill-pill", type: "button", "aria-pressed": "false" }, kids);
        var rec = { item: it, btn: btn, links: links };
        skillItems.push(rec);
        btn.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") { sel.hover = rec; refreshSkills(); } });
        btn.addEventListener("pointerleave", function () { if (sel.hover === rec) { sel.hover = null; refreshSkills(); } });
        btn.addEventListener("focus", function () { sel.focus = rec; refreshSkills(); });
        btn.addEventListener("blur", function () { if (sel.focus === rec) { sel.focus = null; refreshSkills(); } });
        btn.addEventListener("click", function () {
          sel.lock = sel.lock === rec ? null : rec;
          refreshSkills();
          skillsLive.textContent = sel.lock
            ? it.name + " : " + (n ? plural(n, "projet", "projets") : "Pratique courante") + "."
            : "Sélection libérée.";
        });
        list.appendChild(h("li", null, [btn]));
      });
      groupLinks.push(links);
      skillsEl.appendChild(h("div", { class: "skill-group", "data-spot": "" }, [h("h3", { class: "skill-group-title", text: g.group }), list, links]));
    });
    refreshSkills();
  }

  var roState = null;
  function setReadout(name, n, none) {
    var key = name + "|" + n + "|" + none;
    if (key === roState) return;
    roState = key;
    roName.textContent = name;
    if (none) { roNum.textContent = ""; roUnit.textContent = "Pratique courante"; return; }
    roUnit.textContent = n > 1 ? "projets" : "projet";
    roNum.setAttribute("data-from", roNum.textContent || "0");
    countTo(roNum, n, 600);
  }

  function refreshSkills() {
    var act = sel.hover || sel.focus || sel.lock;
    var ids = act ? act.item.projects : [];
    var dimming = !!act && ids.length > 0;
    var rank = 0;
    D.projects.forEach(function (p) {
      var lit = dimming && ids.indexOf(p.id) !== -1;
      var b = idxBtns[p.id];
      if (lit) b.style.setProperty("--k", String(rank++));
      b.classList.toggle("is-lit", lit);
      b.classList.toggle("is-dim", dimming && !lit);
    });
    skillItems.forEach(function (r) {
      r.btn.classList.toggle("is-active", r === act);
      r.btn.setAttribute("aria-pressed", r === sel.lock ? "true" : "false");
    });
    groupLinks.forEach(function (l) { l.textContent = ""; });
    if (sel.lock && sel.lock.item.projects.length) {
      sel.lock.item.projects.forEach(function (id) {
        var b = h("button", { type: "button", text: byId[id].title, "aria-haspopup": "dialog" });
        b.addEventListener("click", function () { openProject(id, b); });
        sel.lock.links.appendChild(b);
      });
    }
    if (act) setReadout(act.item.name, ids.length, ids.length === 0);
    else setReadout("Tous les projets", D.projects.length, false);
  }

  /* ---------- Parcours ---------- */
  var tlEl = $("#timeline");

  function renderTimeline() {
    D.timeline.forEach(function (t) {
      var li = h("li", { class: "tl-item is-lit" }, [
        h("div", { class: "tl-card", "data-spot": "" }, [
          h("span", { class: "tl-period", text: t.period }),
          h("h3", { class: "tl-title", text: t.title }),
          h("p", { class: "tl-place", text: t.place }),
          h("p", { class: "tl-text", text: t.text })
        ])
      ]);
      tlEl.appendChild(li);
    });
  }

  /* ---------- Contact ---------- */
  function renderContact() {
    $("#contact-status").textContent = D.identity.status;
    var list = $("#contact-list");
    D.contact.forEach(function (c) {
      var kids;
      if (!c.href) {
        kids = [h("span", { class: "contact-todo" }, [h("span", { class: "contact-label", text: c.label }), h("span", { class: "contact-value", text: "à renseigner" })])];
      } else {
        var shown = c.value || c.href.replace(/^mailto:/, "");
        var external = /^https?:/.test(c.href);
        kids = [h("a", { class: "contact-link", href: c.href, rel: external ? "noopener noreferrer" : null }, [
          h("span", { class: "contact-label", text: c.label }),
          h("span", { class: "contact-value", text: shown })
        ])];
        if (/^mailto:/.test(c.href) || /mail/i.test(c.label)) {
          var copy = h("button", { class: "btn btn-glass btn-small", type: "button", text: "Copier l'adresse", "data-magnetic": "", "aria-live": "polite" });
          var timer = null;
          /* Retour visible pendant 2 s : succès (teinte du site) ou échec (presse-papiers refusé) */
          var flash = function (ok) {
            copy.textContent = ok ? "Adresse copiée" : "Copie impossible";
            copy.classList.toggle("is-done", ok);
            copy.classList.toggle("is-fail", !ok);
            clearTimeout(timer);
            timer = setTimeout(function () {
              copy.textContent = "Copier l'adresse";
              copy.classList.remove("is-done", "is-fail");
            }, 2000);
          };
          copy.addEventListener("click", function () {
            try {
              var res = navigator.clipboard.writeText(c.value || c.href.replace(/^mailto:/, ""));
              if (res && res.then) res.then(function () { flash(true); }, function () { flash(false); }); else flash(true);
            } catch (e) { flash(false); }
          });
          kids.push(copy);
        }
      }
      list.appendChild(h("li", { class: "contact-item", "data-spot": "" }, kids));
    });
    $("#contact-status").textContent = D.identity.status;
  }

  /* ---------- Navigation : lien courant et indicateur (la section courante est fournie par transitions.js via ScrollTrigger) ---------- */
  var navInd = $("#nav-ind");
  var navLinks = $$(".nav-links a");
  var currentSection = null;
  var navPlaced = false;

  function placeNav() {
    var a = currentSection ? navLinks.filter(function (l) { return l.getAttribute("data-section") === currentSection; })[0] : null;
    if (!a || !a.offsetWidth) { navInd.style.opacity = "0"; return; }
    if (!navPlaced) navInd.style.transition = "none";
    navInd.style.width = a.offsetWidth + "px";
    navInd.style.transform = "translateX(" + a.offsetLeft + "px)";
    navInd.style.opacity = "1";
    if (!navPlaced) { void navInd.offsetWidth; navInd.style.transition = ""; }
    navPlaced = true;
  }

  function setSection(id) {
    id = id || null;
    if (id === currentSection) return;
    currentSection = id;
    navLinks.forEach(function (a) {
      if (a.getAttribute("data-section") === currentSection) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    placeNav();
  }

  window.addEventListener("resize", function () { placeFilterInd(true); placeNav(); });

  /* ---------- Pointeur : projecteur, inclinaison, effet magnétique (un seul écouteur) ---------- */
  var ptr = { x: 0, y: 0, target: null, raf: 0, inside: false };
  var spotCur = null;
  var magnets = [];

  function spotLeave(el) {
    el.classList.remove("is-hot");
    el.style.transform = "";
    if (el._viz) Viz.hot(el._viz, false);
  }
  function spotEnter(el) {
    el.classList.add("is-hot");
    if (el._viz) Viz.hot(el._viz, true);
  }

  function pointerFrame() {
    ptr.raf = 0;
    var t = ptr.target;
    var el = t && t.closest ? t.closest("[data-spot]") : null;
    if (el !== spotCur) {
      if (spotCur) spotLeave(spotCur);
      spotCur = el;
      if (el) spotEnter(el);
    }
    if (el) {
      var r = el.getBoundingClientRect();
      var px = (ptr.x - r.left) / (r.width || 1);
      var py = (ptr.y - r.top) / (r.height || 1);
      el.style.setProperty("--mx", (ptr.x - r.left).toFixed(0) + "px");
      el.style.setProperty("--my", (ptr.y - r.top).toFixed(0) + "px");
      if (el.hasAttribute("data-tilt") && !reduced()) {
        var rx = (0.5 - Math.max(0, Math.min(1, py))) * 10;
        var ry = (Math.max(0, Math.min(1, px)) - 0.5) * 10;
        el.style.transform = "perspective(900px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg)";
      }
    }
    if (!reduced()) {
      magnets.forEach(function (m) {
        var b = m.getBoundingClientRect();
        var cx = b.left + b.width / 2, cy = b.top + b.height / 2;
        var near = ptr.x > b.left - 48 && ptr.x < b.right + 48 && ptr.y > b.top - 48 && ptr.y < b.bottom + 48;
        if (near) {
          var dx = Math.max(-7, Math.min(7, (ptr.x - cx) * 0.22));
          var dy = Math.max(-7, Math.min(7, (ptr.y - cy) * 0.28));
          m.classList.add("is-mag");
          m.style.transform = "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px)";
        } else if (m.classList.contains("is-mag")) {
          m.classList.remove("is-mag");
          m.style.transform = "";
        }
      });
    }
  }

  function initPointer() {
    if (!mqFine.matches) return;
    magnets = $$("[data-magnetic]");
    document.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      ptr.x = e.clientX; ptr.y = e.clientY; ptr.target = e.target; ptr.inside = true;
      if (!ptr.raf) ptr.raf = requestAnimationFrame(pointerFrame);
    }, { passive: true });
    /* Molette sans bouger la souris : la page glisse sous le pointeur, on retrouve l'élément survolé
       (un seul test par image) pour qu'aucune carte ne reste inclinée ou allumée. */
    window.addEventListener("scroll", function () {
      if (!ptr.inside || ptr.raf) return;
      ptr.raf = requestAnimationFrame(function () {
        ptr.target = document.elementFromPoint(ptr.x, ptr.y);
        pointerFrame();
      });
    }, { passive: true });
    document.documentElement.addEventListener("pointerleave", function () {
      ptr.inside = false;
      ptr.target = null;
      if (!ptr.raf) ptr.raf = requestAnimationFrame(pointerFrame);
      magnets.forEach(function (m) { m.classList.remove("is-mag"); m.style.transform = ""; });
    });
  }

  /* Clavier : le visuel s'illumine aussi au focus */
  document.addEventListener("focusin", function (e) {
    var art = e.target.closest && e.target.closest(".project");
    if (art && art._viz) Viz.hot(art._viz, true);
  });
  document.addEventListener("focusout", function (e) {
    var art = e.target.closest && e.target.closest(".project");
    if (art && art._viz && art !== spotCur) Viz.hot(art._viz, false);
  });

  /* ---------- Palette de commandes ---------- */
  var pal = $("#palette");
  var palInput = $("#palette-input");
  var palList = $("#palette-list");
  var palEmpty = $("#palette-empty");
  var cmds = [];
  var shownCmds = [];
  var selIdx = 0;

  function closeModalsForNav() { if (panel.open) panel.close(); }

  function buildCommands() {
    cmds = [];
    [["projets", "Projets"], ["competences", "Compétences"], ["parcours", "Parcours"], ["contact", "Contact"]].forEach(function (s) {
      cmds.push({
        label: s[1], kind: "Section", hay: norm(s[1] + " section"),
        run: function () { closeModalsForNav(); if (!(window.PortfolioScroll && window.PortfolioScroll.go(s[0]))) window.location.hash = s[0]; }
      });
    });
    var simBtn = $("#sim-toggle");
    if (simBtn && !reduced()) {
      var paused = simBtn.getAttribute("aria-pressed") === "true";
      cmds.push({
        label: paused ? "Relancer la simulation" : "Mettre la simulation en pause",
        kind: "Action", hay: norm("simulation pause relancer reprendre corps"),
        run: function () { simBtn.click(); }
      });
    }
    D.projects.forEach(function (p) {
      cmds.push({
        label: p.title, kind: "Projet",
        hay: norm(p.title + " " + (domainLabel[p.domain] || "") + " " + p.stack.join(" ")),
        run: function () { openProject(p.id, document.getElementById("palette-open")); }
      });
    });
  }

  function renderPalette(q) {
    var words = norm(q).split(/\s+/).filter(Boolean);
    shownCmds = cmds.filter(function (c) { return words.every(function (w) { return c.hay.indexOf(w) !== -1; }); });
    palList.textContent = "";
    shownCmds.forEach(function (c, i) {
      var li = h("li", { class: "palette-item", role: "option", id: "pal-opt-" + i, "aria-selected": "false" }, [
        h("span", { text: c.label }),
        h("span", { class: "palette-kind", text: c.kind })
      ]);
      li.addEventListener("click", function () { runCommand(i); });
      li.addEventListener("pointermove", function () { if (selIdx !== i) setSel(i, false); });
      palList.appendChild(li);
    });
    palEmpty.hidden = shownCmds.length > 0;
    if (!shownCmds.length) {
      /* Message utile : rappelle la saisie et ce que l'on peut chercher */
      palEmpty.textContent = "";
      palEmpty.appendChild(document.createTextNode("Aucun résultat pour "));
      palEmpty.appendChild(h("strong", { text: "«\u00A0" + q.trim() + "\u00A0»" }));
      palEmpty.appendChild(document.createTextNode(". Essayez un nom de projet, une technologie (C, React, AWS) ou une section."));
    }
    setSel(0, true);
  }

  function setSel(i, scroll) {
    var items = palList.children;
    if (!items.length) { palInput.removeAttribute("aria-activedescendant"); return; }
    selIdx = (i + items.length) % items.length;
    for (var k = 0; k < items.length; k++) items[k].setAttribute("aria-selected", k === selIdx ? "true" : "false");
    palInput.setAttribute("aria-activedescendant", items[selIdx].id);
    if (scroll) items[selIdx].scrollIntoView({ block: "nearest" });
  }

  function runCommand(i) {
    var c = shownCmds[i];
    if (!c) return;
    pal.close();
    c.run();
  }

  function openPalette() {
    if (pal.open) return;
    buildCommands();
    palInput.value = "";
    renderPalette("");
    pal.showModal();
    palInput.focus();
  }

  palInput.addEventListener("input", function () { renderPalette(palInput.value); });
  palInput.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel(selIdx + 1, true); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel(selIdx - 1, true); }
    else if (e.key === "Enter") { e.preventDefault(); runCommand(selIdx); }
  });
  pal.addEventListener("click", function (e) { if (e.target === pal) pal.close(); });
  $("#palette-open").addEventListener("click", openPalette);

  document.addEventListener("keydown", function (e) {
    var k = e.key;
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && k && k.toLowerCase() === "k") {
      e.preventDefault();
      openPalette();
      return;
    }
    if (k === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      var t = e.target;
      var typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (!typing) { e.preventDefault(); openPalette(); }
    }
  });

  /* ---------- Démarrage ---------- */
  renderMarquee();
  renderStats();
  renderFilters();
  renderProjects();
  renderSkills();
  renderTimeline();
  renderContact();
  initPointer();
  placeFilterInd(true);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { placeFilterInd(true); placeNav(); });
  mqReduce.addEventListener && mqReduce.addEventListener("change", function () { Viz.kick(); });

  /* Points d'entrée pour transitions.js */
  window.PortfolioApp = { setSection: setSection, count: startCounters, holdVisuals: Viz.hold };
})();
