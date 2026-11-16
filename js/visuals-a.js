/* Visuels par projet (lot A) : ticket-tout, saas-internes, my-pgp (aws-microservices est dans visuals-d.js).
   Contrat : voir VISUALS.md. Chaque fabrique prépare ses constantes ; draw() ne fait que dessiner. */
(function () {
  var R = (window.PROJECT_VIZ = window.PROJECT_VIZ || {});
  var FONT = "500 11px 'Martian Mono', ui-monospace, monospace";
  var FONT_S = "500 10px 'Martian Mono', ui-monospace, monospace";

  /* point d'une courbe de Bézier quadratique / cubique, écrit dans o */
  function qpt(o, x0, y0, cx, cy, x1, y1, u) {
    var v = 1 - u;
    o.x = v * v * x0 + 2 * v * u * cx + u * u * x1;
    o.y = v * v * y0 + 2 * v * u * cy + u * u * y1;
    return o;
  }
  function cpt(o, C, b, u) {
    var v = 1 - u, a0 = v * v * v, a1 = 3 * v * v * u, a2 = 3 * v * u * u, a3 = u * u * u;
    o.x = a0 * C[b] + a1 * C[b + 2] + a2 * C[b + 4] + a3 * C[b + 6];
    o.y = a0 * C[b + 1] + a1 * C[b + 3] + a2 * C[b + 5] + a3 * C[b + 7];
    return o;
  }
  function hex2(n) { return (n < 16 ? "0" : "") + n.toString(16).toUpperCase(); }

  /* ------------------------------------------------------------------
     1. Ticket Tout : carte prépayée, QR à usage unique (5 min), terminal,
        solde poussé en temps réel.
     ------------------------------------------------------------------ */
  R["ticket-tout"] = function (r, K) {
    var c = K.c, IR = K.IR, PK = K.PK, WH = K.WH, PI2 = K.PI2, ss = K.sstep, lerp = K.lerp, clamp = K.clamp;
    var N = 11, ND = 2 * N - 1, P = 10, i, j, s, d;
    function finder(a, b) { return (a < 4 && b < 4) || (a >= N - 4 && b < 4) || (a < 4 && b >= N - 4); }
    /* trois QR différents, modules regroupés par diagonale pour tracer en lots */
    var sets = [];
    for (s = 0; s < 3; s++) {
      var diag = [];
      for (d = 0; d < ND; d++) diag.push([]);
      for (i = 0; i < N; i++) for (j = 0; j < N; j++) {
        if (finder(i, j)) continue;
        if (r() < 0.5) diag[i + j].push(i * N + j);
      }
      for (d = 0; d < ND; d++) diag[d] = Int16Array.from(diag[d]);
      sets.push(diag);
    }
    var TIME = [];
    for (i = 0; i <= 300; i++) TIME.push(((i / 60) | 0) + ":" + (i % 60 < 10 ? "0" : "") + (i % 60));
    var EUR = [];
    for (i = 0; i <= 120; i++) EUR.push(i + " €");
    var BAL = [88, 74, 61, 47], DELTA = [];
    for (i = 0; i < 4; i++) { var dv = BAL[(i + 1) % 4] - BAL[i]; DELTA.push((dv < 0 ? "−" : "+") + Math.abs(dv)); }
    var o = { x: 0, y: 0 };

    function trail(x, x0, y0, cx, cy, x1, y1, u0, u1) {
      x.beginPath();
      for (var q = 0; q <= 10; q++) {
        qpt(o, x0, y0, cx, cy, x1, y1, lerp(u0, u1, q / 10));
        if (q === 0) x.moveTo(o.x, o.y); else x.lineTo(o.x, o.y);
      }
      x.stroke();
    }

    return function draw(x, w, h, t, g) {
      var p = K.frac(t / P), k = Math.floor(t / P), kk = ((k % 4) + 4) % 4, diag = sets[((k % 3) + 3) % 3];
      var tall = h > w * 0.8, m = Math.min(w, h);
      /* mise en page */
      var cw, ch, ccx, ccy, qx, qy, RR, tx, ty, tw, th;
      if (tall) {
        RR = Math.min(0.23 * w, 0.2 * h); qx = w * 0.5; qy = h * 0.55;
        cw = Math.min(0.5 * w, 0.24 * h * 1.586); ch = cw / 1.586; ccx = w * 0.06 + cw / 2; ccy = h * 0.05 + ch / 2;
        tw = m * 0.12; th = tw * 1.4; tx = w * 0.84; ty = h * 0.86;
      } else {
        RR = Math.min(0.31 * h, 0.165 * w); qx = w * 0.54; qy = h * 0.52;
        cw = Math.min(0.3 * w, 0.55 * h * 1.586); ch = cw / 1.586; ccx = w * 0.04 + cw / 2; ccy = h * 0.5;
        tw = m * 0.17; th = tw * 1.38; tx = w * 0.88; ty = h * 0.52;
      }
      ccy += Math.sin(t * 0.9) * 2;
      var qs = RR * 1.12, cell = qs / N, q0x = qx - qs / 2, q0y = qy - qs / 2;

      /* temps forts de la boucle */
      var appear = ss(0.0, 0.13, p) * (ND + 3);
      var gone = ss(0.6, 0.74, p) * (ND + 3);
      var scan = ss(0.34, 0.37, p) * (1 - ss(0.47, 0.5, p));
      var valid = clamp((p - 0.47) / 0.1, 0, 1);
      var push = clamp((p - 0.6) / 0.1, 0, 1);
      var upd = ss(0.68, 0.8, p);
      var ok = ss(0.55, 0.62, p) * (1 - ss(0.86, 0.96, p));
      var ringV = ss(0.01, 0.12, p) * lerp(1, 0.58, clamp((p - 0.12) / 0.4, 0, 1)) * (1 - ss(0.58, 0.68, p));
      var remain = Math.round(300 * lerp(1, 0.58, clamp((p - 0.12) / 0.4, 0, 1)));
      var lab = ss(0.06, 0.12, p) * (1 - ss(0.56, 0.62, p));

      /* carte prépayée */
      var cx0 = ccx - cw / 2, cy0 = ccy - ch / 2;
      K.halo(x, ccx, ccy, cw * 0.75, IR, 0.08 + 0.06 * g + 0.12 * push * (1 - upd));
      K.rr(x, cx0, cy0, cw, ch, Math.max(6, cw * 0.06));
      x.fillStyle = c(WH, 0.05); x.fill();
      x.lineWidth = 1.2; x.strokeStyle = K.grad(x, cx0, cy0, cx0 + cw, cy0 + ch, 0.7 + 0.25 * g); x.stroke();
      K.rr(x, cx0 + cw * 0.09, cy0 + ch * 0.22, cw * 0.15, ch * 0.2, 3);
      x.fillStyle = c(WH, 0.12); x.fill(); x.strokeStyle = c(WH, 0.45); x.lineWidth = 1; x.stroke();
      x.beginPath();
      x.moveTo(cx0 + cw * 0.09, cy0 + ch * 0.32); x.lineTo(cx0 + cw * 0.24, cy0 + ch * 0.32);
      x.moveTo(cx0 + cw * 0.165, cy0 + ch * 0.22); x.lineTo(cx0 + cw * 0.165, cy0 + ch * 0.42);
      x.stroke();
      x.beginPath();
      for (i = 1; i <= 3; i++) x.arc(cx0 + cw * 0.3, cy0 + ch * 0.32, ch * 0.055 * i, -0.7, 0.7);
      x.strokeStyle = c(WH, 0.35); x.stroke();
      x.beginPath();
      var dw = Math.max(1.6, cw * 0.016);
      for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) x.rect(cx0 + cw * (0.09 + i * 0.205 + j * 0.035), cy0 + ch * 0.58, dw, dw);
      x.fillStyle = c(WH, 0.4); x.fill();
      /* solde */
      var bal = lerp(BAL[kk], BAL[(kk + 1) % 4], upd), bx = cx0 + cw * 0.09, by = cy0 + ch * 0.78, bw = cw * 0.62, up = BAL[(kk + 1) % 4] > BAL[kk];
      K.rr(x, bx, by, bw, 4, 2); x.fillStyle = c(WH, 0.12); x.fill();
      K.rr(x, bx, by, Math.max(4, bw * bal / 100), 4, 2); x.fillStyle = K.grad(x, bx, 0, bx + bw, 0, 0.9); x.fill();
      x.save();
      x.font = cw > 150 ? FONT : FONT_S; x.textAlign = "right"; x.textBaseline = "middle";
      x.fillStyle = c(WH, 0.75 + 0.25 * upd * (1 - upd) * 4);
      x.fillText(EUR[Math.round(bal)], cx0 + cw * 0.92, by + 2);
      var da = ss(0.68, 0.74, p) * (1 - ss(0.84, 0.94, p));
      if (da > 0.01) {
        x.fillStyle = c(up ? IR : PK, da);
        x.fillText(DELTA[kk], cx0 + cw * 0.92, cy0 + ch * 0.28 - 8 * ss(0.68, 0.94, p));
      }
      x.restore();

      /* QR : contour, modules, repères */
      K.rr(x, q0x - cell * 0.6, q0y - cell * 0.6, qs + cell * 1.2, qs + cell * 1.2, cell);
      x.fillStyle = c(WH, 0.03); x.fill(); x.strokeStyle = c(WH, 0.1 + 0.06 * g); x.lineWidth = 1; x.stroke();
      var fa = clamp(appear / 4, 0, 1) * (1 - clamp((gone - 2) / 4, 0, 1));
      if (fa > 0.01) {
        x.lineWidth = Math.max(1.2, cell * 0.55);
        for (s = 0; s < 3; s++) {
          var fx = q0x + (s === 1 ? (N - 3) * cell : 0), fy = q0y + (s === 2 ? (N - 3) * cell : 0);
          K.rr(x, fx + cell * 0.25, fy + cell * 0.25, cell * 2.5, cell * 2.5, cell * 0.5);
          x.strokeStyle = c(WH, 0.85 * fa); x.stroke();
          x.fillStyle = c(PK, 0.9 * fa); x.fillRect(fx + cell, fy + cell, cell, cell);
        }
        x.lineWidth = 1;
      }
      for (d = 0; d < ND; d++) {
        var on = clamp(appear - d, 0, 1) * (1 - clamp(gone - d, 0, 1));
        if (on <= 0.01) continue;
        var edge = clamp(appear - d, 0, 1) < 1 || clamp(gone - d, 0, 1) > 0;
        var L = diag[d], pad = cell * (0.12 + 0.3 * (1 - on));
        x.beginPath();
        for (j = 0; j < L.length; j++) {
          var ci = L[j], mi = (ci / N) | 0, mj = ci % N;
          x.rect(q0x + mj * cell + pad, q0y + mi * cell + pad, cell - 2 * pad, cell - 2 * pad);
        }
        x.fillStyle = edge ? c(PK, 0.95 * on) : c(WH, 0.78 + 0.12 * g);
        x.fill();
      }

      /* anneau de compte à rebours */
      x.lineWidth = 1;
      x.beginPath();
      for (i = 0; i < 30; i++) {
        var an = i / 30 * PI2, r0 = RR + 5, r1 = RR + (i % 5 ? 8 : 11);
        x.moveTo(qx + Math.cos(an) * r0, qy + Math.sin(an) * r0); x.lineTo(qx + Math.cos(an) * r1, qy + Math.sin(an) * r1);
      }
      x.strokeStyle = c(WH, 0.12 + 0.06 * g); x.stroke();
      x.beginPath(); x.arc(qx, qy, RR, 0, PI2); x.strokeStyle = c(WH, 0.08); x.lineWidth = 3; x.stroke();
      if (ringV > 0.005) {
        var a0 = -Math.PI / 2, a1 = a0 + ringV * PI2;
        x.lineCap = "round"; x.lineWidth = 3;
        x.beginPath(); x.arc(qx, qy, RR, a0, a1);
        x.strokeStyle = K.grad(x, qx - RR, qy - RR, qx + RR, qy + RR, 0.95); x.stroke();
        x.lineCap = "butt";
        var hx = qx + Math.cos(a1) * RR, hy = qy + Math.sin(a1) * RR;
        K.halo(x, hx, hy, 12, PK, 0.5 + 0.2 * g);
        x.fillStyle = c(WH, 0.95); x.beginPath(); x.arc(hx, hy, 2.4, 0, PI2); x.fill();
      }
      if (lab > 0.01) {
        x.save(); x.font = FONT_S; x.textAlign = "center"; x.textBaseline = "middle";
        x.fillStyle = c(WH, 0.7 * lab);
        x.fillText(TIME[remain], qx, tall ? qy + RR + 22 : qy - RR - 18);
        x.restore();
      }

      /* terminal de paiement */
      var t0x = tx - tw / 2, t0y = ty - th / 2;
      K.halo(x, tx, ty, tw * 1.4, ok > 0.01 ? PK : IR, 0.07 + 0.25 * ok + 0.05 * g);
      K.rr(x, t0x, t0y, tw, th, Math.max(4, tw * 0.14));
      x.fillStyle = c(WH, 0.05); x.fill(); x.lineWidth = 1.2; x.strokeStyle = c(WH, 0.3 + 0.2 * g + 0.3 * ok); x.stroke();
      K.rr(x, t0x + tw * 0.15, t0y + th * 0.12, tw * 0.7, th * 0.36, 3);
      x.fillStyle = ok > 0.01 ? c(PK, 0.12 + 0.2 * ok) : c(IR, 0.1 + 0.15 * scan); x.fill();
      x.beginPath();
      for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) x.rect(t0x + tw * (0.24 + i * 0.22), t0y + th * (0.6 + j * 0.11), tw * 0.1, tw * 0.07);
      x.fillStyle = c(WH, 0.28); x.fill();
      if (ok > 0.01) {
        var ck = clamp((p - 0.55) / 0.06, 0, 1), sx0 = t0x + tw * 0.34, sy0 = t0y + th * 0.3;
        x.beginPath(); x.moveTo(sx0, sy0);
        var mx1 = t0x + tw * 0.46, my1 = t0y + th * 0.38, mx2 = t0x + tw * 0.68, my2 = t0y + th * 0.19;
        if (ck < 0.4) x.lineTo(lerp(sx0, mx1, ck / 0.4), lerp(sy0, my1, ck / 0.4));
        else { x.lineTo(mx1, my1); x.lineTo(lerp(mx1, mx2, (ck - 0.4) / 0.6), lerp(my1, my2, (ck - 0.4) / 0.6)); }
        x.lineWidth = 2; x.lineCap = "round"; x.strokeStyle = c(WH, ok); x.stroke(); x.lineCap = "butt";
      }

      /* lecture : faisceau du terminal vers le QR et ligne de scan */
      var dx = qx - tx, dy = qy - ty, dist = Math.hypot(dx, dy), ux = dx / dist, uy = dy / dist;
      var ex = tall ? tx - tw * 0.1 : t0x, ey = tall ? t0y : ty - th * 0.2;
      if (scan > 0.01) {
        x.beginPath(); x.moveTo(ex, ey);
        x.lineTo(qx - uy * qs * 0.6, qy + ux * qs * 0.6); x.lineTo(qx + uy * qs * 0.6, qy - ux * qs * 0.6); x.closePath();
        x.fillStyle = K.grad(x, ex, ey, qx, qy, 0.1 * scan); x.fill();
        var sl = q0y + qs * K.frac((p - 0.34) / 0.065);
        x.beginPath(); x.moveTo(q0x - cell, sl); x.lineTo(q0x + qs + cell, sl);
        x.lineWidth = 1.5; x.strokeStyle = c(PK, 0.9 * scan); x.stroke();
      }
      /* validation : QR -> terminal */
      var vx0 = qx - ux * (RR + 12), vy0 = qy - uy * (RR + 12);
      var vx1 = tx + ux * tw * 0.65, vy1 = ty + uy * th * 0.5;
      var vcx = (vx0 + vx1) / 2 + uy * dist * 0.18, vcy = (vy0 + vy1) / 2 - ux * dist * 0.18;
      x.lineWidth = 1; x.strokeStyle = c(WH, 0.08 + 0.06 * g); trail(x, vx0, vy0, vcx, vcy, vx1, vy1, 0, 1);
      if (valid > 0 && valid < 1) {
        x.lineWidth = 2; x.strokeStyle = c(PK, 0.9); trail(x, vx0, vy0, vcx, vcy, vx1, vy1, Math.max(0, valid - 0.35), valid);
        qpt(o, vx0, vy0, vcx, vcy, vx1, vy1, valid); K.halo(x, o.x, o.y, 14, PK, 0.7);
      }
      /* solde poussé en temps réel : terminal -> carte */
      var px0 = tall ? t0x : tx, py0 = tall ? ty : t0y + th;
      var px1 = bx + bw, py1 = by + 2, pcx, pcy;
      if (tall) { pcx = w * 0.06; pcy = h * 0.98; } else { pcx = (px0 + px1) / 2; pcy = h * 1.22; }
      x.lineWidth = 1; x.strokeStyle = c(WH, 0.06 + 0.06 * g);
      trail(x, px0, py0, pcx, pcy, px1, py1, 0, 1);
      if (push > 0 && push < 1) {
        x.lineWidth = 2; x.strokeStyle = c(IR, 0.95); trail(x, px0, py0, pcx, pcy, px1, py1, Math.max(0, push - 0.3), push);
        qpt(o, px0, py0, pcx, pcy, px1, py1, push); K.halo(x, o.x, o.y, 14, IR, 0.8);
        x.fillStyle = c(WH, 1); x.beginPath(); x.arc(o.x, o.y, 2.2, 0, PI2); x.fill();
      }
      x.lineWidth = 1;
    };
  };

  /* ------------------------------------------------------------------
     2. Deux SaaS : flux d'automatisation n8n qui alimente deux applications.
     ------------------------------------------------------------------ */
  R["saas-internes"] = function (r, K) {
    var c = K.c, IR = K.IR, PK = K.PK, WH = K.WH, PI2 = K.PI2, ss = K.sstep, lerp = K.lerp, clamp = K.clamp;
    var P = 9, M = 7, i, j;
    var ROWS = new Float32Array(M), BARS = new Float32Array(M);
    for (i = 0; i < M; i++) { ROWS[i] = 0.35 + r() * 0.55; BARS[i] = 0.25 + r() * 0.7; }
    var C = new Float64Array(32), LW = 0, LH = 0, tall = false;
    var nd = new Float64Array(6), ns = 0, win = new Float64Array(8);
    var o = { x: 0, y: 0 };
    function curve(b, x0, y0, dx0, dy0, x1, y1, dx1, dy1, kf) {
      C[b] = x0; C[b + 1] = y0; C[b + 2] = x0 + dx0 * kf; C[b + 3] = y0 + dy0 * kf;
      C[b + 4] = x1 - dx1 * kf; C[b + 5] = y1 - dy1 * kf; C[b + 6] = x1; C[b + 7] = y1;
    }
    function layout(w, h) {
      LW = w; LH = h; tall = h > w * 0.8;
      if (!tall) {
        ns = Math.min(0.2 * h, 0.1 * w);
        nd[0] = 0.09 * w; nd[1] = 0.5 * h; nd[2] = 0.27 * w; nd[3] = 0.5 * h; nd[4] = 0.45 * w; nd[5] = 0.5 * h;
        win[0] = 0.6 * w; win[1] = 0.07 * h; win[2] = 0.36 * w; win[3] = 0.4 * h;
        win[4] = 0.6 * w; win[5] = 0.53 * h; win[6] = 0.36 * w; win[7] = 0.4 * h;
      } else {
        ns = Math.min(0.13 * w, 0.12 * h);
        nd[0] = 0.16 * w; nd[1] = 0.2 * h; nd[2] = 0.5 * w; nd[3] = 0.2 * h; nd[4] = 0.84 * w; nd[5] = 0.2 * h;
        win[0] = 0.05 * w; win[1] = 0.5 * h; win[2] = 0.42 * w; win[3] = 0.42 * h;
        win[4] = 0.53 * w; win[5] = 0.5 * h; win[6] = 0.42 * w; win[7] = 0.42 * h;
      }
      var hs = ns / 2, d01 = nd[2] - nd[0] - ns;
      curve(0, nd[0] + hs, nd[1], 1, 0, nd[2] - hs, nd[3], 1, 0, d01 * 0.5);
      curve(8, nd[2] + hs, nd[3], 1, 0, nd[4] - hs, nd[5], 1, 0, d01 * 0.5);
      if (!tall) {
        var kf = (win[0] - nd[4]) * 0.45;
        curve(16, nd[4] + hs, nd[5] - hs * 0.4, 1, 0, win[0], win[1] + win[3] / 2, 1, 0, kf);
        curve(24, nd[4] + hs, nd[5] + hs * 0.4, 1, 0, win[4], win[5] + win[7] / 2, 1, 0, kf);
      } else {
        var kv = (win[1] - nd[5]) * 0.6;
        curve(16, nd[4] - hs * 0.4, nd[5] + hs, 0, 1, win[0] + win[2] / 2, win[1], 0, 1, kv);
        curve(24, nd[4] + hs * 0.4, nd[5] + hs, 0, 1, win[4] + win[6] / 2, win[5], 0, 1, kv);
      }
    }
    function edge(x, b, u, col, g) {
      x.beginPath(); x.moveTo(C[b], C[b + 1]);
      x.bezierCurveTo(C[b + 2], C[b + 3], C[b + 4], C[b + 5], C[b + 6], C[b + 7]);
      x.lineWidth = 1.3; x.strokeStyle = c(WH, 0.16 + 0.08 * g); x.stroke();
      if (u <= 0 || u >= 1) return;
      x.beginPath();
      for (var q = 0; q <= 8; q++) { cpt(o, C, b, Math.max(0, u - 0.3 + q * 0.0375)); if (q === 0) x.moveTo(o.x, o.y); else x.lineTo(o.x, o.y); }
      x.lineWidth = 2.2; x.strokeStyle = c(col, 0.85); x.stroke();
      cpt(o, C, b, u);
      K.halo(x, o.x, o.y, 13, col, 0.65 + 0.2 * g);
      x.fillStyle = c(WH, 1); x.beginPath(); x.arc(o.x, o.y, 2.6, 0, PI2); x.fill();
    }
    function node(x, n, act, done, kind, t, g) {
      var cx = nd[n * 2], cy = nd[n * 2 + 1], hs = ns / 2, rad = ns * 0.22;
      if (act > 0.01) K.halo(x, cx, cy, ns * 1.1, kind === 0 ? PK : IR, 0.25 * act);
      K.rr(x, cx - hs, cy - hs, ns, ns, rad);
      x.fillStyle = c(WH, 0.05 + 0.05 * act); x.fill();
      x.lineWidth = 1.2; x.strokeStyle = act > 0.01 ? K.grad(x, cx - hs, cy - hs, cx + hs, cy + hs, 0.4 + 0.6 * act) : c(WH, 0.28 + 0.12 * g); x.stroke();
      x.beginPath(); x.arc(cx - hs, cy, 2.6, 0, PI2); x.arc(cx + hs, cy, 2.6, 0, PI2);
      if (n === 0) { x.beginPath(); x.arc(cx + hs, cy, 2.6, 0, PI2); }
      x.fillStyle = c(WH, 0.5); x.fill();
      var s = ns * 0.24;
      x.lineWidth = 1.4;
      if (kind === 0) {
        x.beginPath(); x.moveTo(cx + s * 0.25, cy - s * 1.2); x.lineTo(cx - s * 0.6, cy + s * 0.15); x.lineTo(cx - s * 0.02, cy + s * 0.15);
        x.lineTo(cx - s * 0.3, cy + s * 1.2); x.lineTo(cx + s * 0.6, cy - s * 0.2); x.lineTo(cx + s * 0.02, cy - s * 0.2); x.closePath();
        x.fillStyle = c(PK, 0.55 + 0.45 * act); x.fill();
      } else if (kind === 1) {
        x.beginPath(); x.arc(cx, cy, s, 0, PI2); x.moveTo(cx, cy - s); x.ellipse(cx, cy, s * 0.42, s, 0, -Math.PI / 2, Math.PI * 1.5);
        x.moveTo(cx - s, cy); x.lineTo(cx + s, cy);
        x.strokeStyle = c(IR, 0.65 + 0.35 * act); x.stroke();
      } else {
        x.beginPath(); x.moveTo(cx - s, cy); x.lineTo(cx - s * 0.1, cy);
        x.bezierCurveTo(cx + s * 0.3, cy, cx + s * 0.3, cy - s * 0.8, cx + s, cy - s * 0.8);
        x.moveTo(cx - s * 0.1, cy); x.bezierCurveTo(cx + s * 0.3, cy, cx + s * 0.3, cy + s * 0.8, cx + s, cy + s * 0.8);
        x.strokeStyle = c(WH, 0.6 + 0.4 * act); x.stroke();
      }
      if (act > 0.01 && done < 0.5) {
        var a = t * 6;
        x.beginPath(); x.arc(cx, cy, hs + 5, a, a + 1.6);
        x.lineWidth = 2; x.lineCap = "round"; x.strokeStyle = c(kind === 0 ? PK : IR, 0.9 * act); x.stroke(); x.lineCap = "butt";
      }
      if (done > 0.01) {
        var bx = cx + hs - 1, by = cy - hs + 1, br = Math.max(5, ns * 0.13);
        x.beginPath(); x.arc(bx, by, br, 0, PI2); x.fillStyle = c(IR, 0.9 * done); x.fill();
        x.beginPath(); x.moveTo(bx - br * 0.45, by); x.lineTo(bx - br * 0.1, by + br * 0.38); x.lineTo(bx + br * 0.5, by - br * 0.35);
        x.lineWidth = 1.4; x.strokeStyle = c(WH, done); x.stroke();
      }
      x.lineWidth = 1;
    }
    function frame(x, b, flash, g) {
      var wx = win[b], wy = win[b + 1], ww = win[b + 2], wh = win[b + 3], tb = Math.max(12, wh * 0.16);
      if (flash > 0.01) K.halo(x, wx + ww / 2, wy + wh / 2, Math.max(ww, wh) * 0.7, b ? PK : IR, 0.2 * flash);
      K.rr(x, wx, wy, ww, wh, 8); x.fillStyle = c(WH, 0.04); x.fill();
      x.lineWidth = 1.1; x.strokeStyle = flash > 0.01 ? c(b ? PK : IR, 0.35 + 0.6 * flash) : c(WH, 0.2 + 0.1 * g); x.stroke();
      x.beginPath(); x.moveTo(wx, wy + tb); x.lineTo(wx + ww, wy + tb); x.strokeStyle = c(WH, 0.1); x.stroke();
      x.beginPath();
      for (var q = 0; q < 3; q++) { x.moveTo(wx + 9 + q * 7 + 2.2, wy + tb / 2); x.arc(wx + 9 + q * 7, wy + tb / 2, 2.2, 0, PI2); }
      x.fillStyle = c(WH, 0.25); x.fill();
      return tb;
    }
    return function draw(x, w, h, t, g) {
      if (w !== LW || h !== LH) layout(w, h);
      var p = K.frac(t / P), k = Math.floor(t / P);
      /* fond pointillé du canevas n8n */
      var sp = Math.max(16, w / 24);
      x.beginPath();
      for (var gx = sp / 2; gx < w; gx += sp) for (var gy = sp / 2; gy < h; gy += sp) x.rect(gx - 0.6, gy - 0.6, 1.2, 1.2);
      x.fillStyle = c(WH, 0.1 + 0.04 * g); x.fill();

      var fade = 1 - ss(0.84, 0.96, p);
      var e0 = (p - 0.07) / 0.13, e1 = (p - 0.31) / 0.11, e2 = (p - 0.5) / 0.13;
      edge(x, 0, e0, PK, g); edge(x, 8, e1, IR, g); edge(x, 16, e2, PK, g); edge(x, 24, e2 - 0.06, IR, g);

      var trig = ss(0.0, 0.04, p) * (1 - ss(0.1, 0.2, p));
      var pr = K.frac(p / 0.12);
      if (p < 0.12) {
        x.beginPath(); x.arc(nd[0], nd[1], ns * (0.6 + 0.9 * pr), 0, PI2);
        x.lineWidth = 1.5; x.strokeStyle = c(PK, 0.7 * (1 - pr)); x.stroke(); x.lineWidth = 1;
      }
      node(x, 0, trig, ss(0.08, 0.12, p) * fade, 0, t, g);
      node(x, 1, ss(0.18, 0.21, p) * (1 - ss(0.3, 0.34, p)), ss(0.29, 0.32, p) * fade, 1, t, g);
      node(x, 2, ss(0.41, 0.44, p) * (1 - ss(0.49, 0.53, p)), ss(0.48, 0.51, p) * fade, 2, t, g);

      /* application 1 : liste qui reçoit une nouvelle ligne */
      var s1 = ss(0.62, 0.74, p), f1 = ss(0.6, 0.64, p) * (1 - ss(0.72, 0.84, p));
      var tb = frame(x, 0, f1, g), wx = win[0], wy = win[1], ww = win[2], wh = win[3];
      var cy0 = wy + tb + 6, chh = wh - tb - 10, rh = chh / 4;
      x.save(); x.beginPath(); x.rect(wx + 1, wy + tb + 1, ww - 2, wh - tb - 2); x.clip();
      for (i = -1; i < 4; i++) {
        var idx = (((i - k) % M) + M) % M, ry = cy0 + (i + s1) * rh, al = i === -1 ? s1 : (i === 3 ? 1 - s1 : 1);
        if (al <= 0.01) continue;
        var hl = i === -1 ? 1 - ss(0.76, 0.96, p) : 0;
        x.beginPath(); x.arc(wx + 12, ry + rh * 0.45, Math.min(4, rh * 0.25), 0, PI2);
        x.fillStyle = hl > 0 ? c(PK, 0.9 * al) : c(IR, 0.6 * al); x.fill();
        K.rr(x, wx + 21, ry + rh * 0.45 - 2.5, (ww - 50) * ROWS[idx], 5, 2.5);
        x.fillStyle = hl > 0 ? c(PK, (0.25 + 0.55 * hl) * al) : c(WH, 0.2 * al); x.fill();
        K.rr(x, wx + ww - 22, ry + rh * 0.45 - 2.5, 12, 5, 2.5); x.fillStyle = c(WH, 0.12 * al); x.fill();
      }
      x.restore();

      /* application 2 : tableau de bord dont les barres défilent */
      var s2 = ss(0.64, 0.78, p), f2 = ss(0.62, 0.66, p) * (1 - ss(0.74, 0.86, p));
      tb = frame(x, 4, f2, g); wx = win[4]; wy = win[5]; ww = win[6]; wh = win[7];
      var nb = 6, gx0 = wx + 10, gw = ww - 20, base = wy + wh - 9, top = wy + tb + 8, bwid = gw / nb;
      x.save(); x.beginPath(); x.rect(wx + 4, wy + tb + 1, ww - 8, wh - tb - 2); x.clip();
      for (j = 0; j <= nb; j++) {
        var vi = (((j + k) % M) + M) % M, bxp = gx0 + (j - s2) * bwid, v = BARS[vi];
        if (j === nb) v *= s2;
        var bh = (base - top) * v;
        if (bh < 1) continue;
        K.rr(x, bxp + bwid * 0.18, base - bh, bwid * 0.64, bh, 2);
        x.fillStyle = j === nb ? K.grad(x, 0, base - bh, 0, base, 0.95) : c(WH, 0.16 + 0.06 * g); x.fill();
      }
      x.restore();
      x.beginPath(); x.moveTo(gx0, base + 0.5); x.lineTo(gx0 + gw, base + 0.5); x.strokeStyle = c(WH, 0.2); x.lineWidth = 1; x.stroke();
    };
  };

  /* ------------------------------------------------------------------
     3. my_pgp : deux clés qui tournent et s'emboîtent, une porte de
        chiffrement, des octets clairs qui ressortent brouillés.
     ------------------------------------------------------------------ */
  R["my-pgp"] = function (r, K) {
    var c = K.c, IR = K.IR, PK = K.PK, WH = K.WH, PI2 = K.PI2, ss = K.sstep, lerp = K.lerp, clamp = K.clamp;
    var P = 12, NB = 6, i, j;
    var MSG = ["Hello!", "secret", "my_pgp", "RSA:ok"], MODE = ["XOR", "AES", "RSA", "PGP"];
    var PLAIN = [], CIPH = [];
    for (i = 0; i < MSG.length; i++) {
      var pl = [], ci = [];
      for (j = 0; j < NB; j++) { pl.push(hex2(MSG[i].charCodeAt(j))); ci.push(hex2((r() * 256) | 0)); }
      PLAIN.push(pl); CIPH.push(ci);
    }
    var SCR = [];
    for (i = 0; i < 23; i++) SCR.push(hex2((r() * 256) | 0));

    function key(x, bx, by, kr, L, flip, rgb, a, g) {
      /* clé orientée vers +x ; flip = cos de la rotation autour de la tige */
      x.save(); x.translate(bx, by); x.scale(1, flip);
      x.beginPath(); x.arc(0, 0, kr, 0, PI2); x.moveTo(kr * 0.45, 0); x.arc(0, 0, kr * 0.45, 0, PI2);
      x.lineWidth = 2; x.strokeStyle = c(rgb, a); x.stroke();
      x.beginPath(); x.moveTo(kr, 0); x.lineTo(kr + L, 0);
      x.moveTo(kr + L * 0.62, 0); x.lineTo(kr + L * 0.62, kr * 0.85);
      x.moveTo(kr + L * 0.82, 0); x.lineTo(kr + L * 0.82, kr * 0.6);
      x.moveTo(kr + L, 0); x.lineTo(kr + L, kr * 0.9);
      x.lineWidth = 2.4; x.lineCap = "round"; x.stroke();
      x.restore();
      K.halo(x, bx, by, kr * 2.2, rgb, 0.12 + 0.12 * g);
    }

    return function draw(x, w, h, t, g) {
      var p = K.frac(t / P), k = Math.floor(t / P), kk = ((k % 4) + 4) % 4;
      /* format haut : la scène s'étire sur toute la hauteur (clés en haut, porte et octets plus bas) au lieu de rester dans une bande */
      var tall = h > w * 0.8;
      var bh = tall ? h * 0.9 : Math.min(h, w * 0.62), oy = (h - bh) / 2;
      var gx = w * 0.5, rowY = oy + bh * (tall ? 0.64 : 0.68), sp = Math.min(0.07 * w, 40), cwid = sp * 0.82, chg = Math.min(22, bh * 0.13, sp * 1.1);
      var kr = tall ? Math.min(0.05 * w, 18) : Math.min(0.065 * bh, 0.035 * w, 16), L = kr * 3.6, keyY = oy + bh * (tall ? 0.16 : 0.24);
      var gh = tall ? Math.min(bh * 0.16, w * 0.22) : bh * 0.2, gTop = rowY - gh, gBot = rowY + gh;

      var meet = ss(0.04, 0.3, p) - ss(0.84, 0.98, p);
      var phi = PI2 * 2 * (ss(0.04, 0.3, p) + ss(0.84, 0.98, p));
      var ga = ss(0.28, 0.34, p) * (1 - ss(0.8, 0.86, p));
      var lockF = ss(0.28, 0.31, p) * (1 - ss(0.31, 0.42, p));

      /* clés : la pervenche (publique) et la rose (privée) */
      var tip = L * 0.2, off = kr * 0.45;
      var lbx = lerp(w * 0.1 + kr, gx - kr - L + tip, meet), rbx = lerp(w * 0.9 - kr, gx + kr + L - tip, meet);
      var bob = Math.sin(t * 1.3) * 2 * (1 - meet);
      key(x, lbx, keyY - off + bob, kr, L, Math.cos(phi), IR, 0.9, g);
      x.save(); x.translate(rbx, keyY + off - bob); x.scale(-1, 1); x.translate(-rbx, -(keyY + off - bob));
      key(x, rbx, keyY + off - bob, kr, L, -Math.cos(phi + Math.PI * 0.5 * (1 - meet)), PK, 0.9, g);
      x.restore();
      if (lockF > 0.01) {
        K.halo(x, gx, keyY, kr * 3.5, WH, 0.3 * lockF);
        x.beginPath(); x.arc(gx, keyY, kr * (1 + 2.5 * (1 - lockF)), 0, PI2); x.lineWidth = 1.2; x.strokeStyle = c(WH, 0.8 * lockF); x.stroke();
      }
      /* faisceau des clés vers la porte */
      x.beginPath(); x.moveTo(gx, keyY + kr + 4); x.lineTo(gx, gTop - 2);
      x.lineWidth = 1; x.strokeStyle = c(WH, 0.08 + 0.06 * g); x.stroke();
      if (ga > 0.01) {
        var fl = K.frac(t * 1.2);
        x.beginPath(); x.moveTo(gx, lerp(keyY + kr + 4, gTop - 2, Math.max(0, fl - 0.3))); x.lineTo(gx, lerp(keyY + kr + 4, gTop - 2, fl));
        x.lineWidth = 2; x.strokeStyle = K.grad(x, gx, keyY, gx, gTop, 0.9 * ga); x.stroke();
      }

      /* porte de chiffrement */
      K.halo(x, gx, rowY, gh * 1.5, PK, 0.06 + 0.22 * ga + 0.06 * g);
      K.rr(x, gx - 6, gTop, 12, gBot - gTop, 6);
      x.fillStyle = c(WH, 0.04 + 0.05 * ga); x.fill();
      x.lineWidth = 1.4; x.strokeStyle = K.grad(x, gx, gTop, gx, gBot, 0.35 + 0.6 * ga); x.stroke();
      if (ga > 0.01) {
        x.beginPath();
        for (i = 0; i < 4; i++) { var fy = gTop + 6 + K.frac(t * 0.8 + i * 0.25) * (gBot - gTop - 12); x.moveTo(gx - 3, fy); x.lineTo(gx + 3, fy); }
        x.lineWidth = 1.2; x.strokeStyle = c(WH, 0.7 * ga); x.stroke();
        x.save(); x.font = FONT_S; x.textAlign = "center"; x.textBaseline = "top";
        x.fillStyle = c(WH, 0.65 * ga); x.fillText(MODE[kk], gx, gBot + 6);
        x.restore();
      }

      /* rangée d'octets */
      var total = NB * sp + sp * 0.8, shift, alpha, m, drift = 0;
      if (p < 0.86) { shift = ss(0.34, 0.8, p) * total; alpha = 1 - ss(0.8, 0.86, p); drift = sp * 0.6 * ss(0.8, 0.86, p); m = kk; }
      else { shift = 0; alpha = ss(0.88, 1, p); m = (kk + 1) % 4; drift = -sp * 0.6 * (1 - alpha); }
      if (alpha < 0.01) { x.lineWidth = 1; return; }
      x.save();
      x.font = sp > 24 ? FONT : FONT_S; x.textAlign = "center"; x.textBaseline = "middle";
      var scr = Math.floor(t * 22);
      for (i = 0; i < NB; i++) {
        var cx = gx - sp * (NB - i) - sp * 0.4 + sp * 0.5 + shift + drift, d = cx - gx, st;
        if (d < -sp * 0.55) st = 0; else if (d > sp * 0.55) st = 2; else st = 1;
        var bx = cx - cwid / 2, by = rowY - chg / 2;
        if (st === 1) K.halo(x, cx, rowY, sp * 1.1, PK, 0.45 * alpha);
        K.rr(x, bx, by, cwid, chg, 4);
        x.fillStyle = st === 2 ? c(PK, 0.1 * alpha) : c(WH, 0.05 * alpha); x.fill();
        x.lineWidth = 1; x.strokeStyle = st === 0 ? c(WH, (0.3 + 0.1 * g) * alpha) : c(PK, (st === 1 ? 1 : 0.6) * alpha); x.stroke();
        x.fillStyle = st === 0 ? c(WH, 0.85 * alpha) : st === 1 ? c(WH, alpha) : c(PK, 0.95 * alpha);
        x.fillText(st === 0 ? PLAIN[m][i] : st === 1 ? SCR[(scr + i * 7) % SCR.length] : CIPH[m][i], cx, rowY + 0.5);
      }
      x.restore();
      x.lineWidth = 1;
    };
  };
})();
