/* Visuels par projet (lot B) : myftp, zappy, minishell, libc, arcade.
   Contrat : voir VISUALS.md. Tout est préparé dans les fabriques ; draw() n'alloue rien de notable. */
(function () {
  "use strict";
  var R = (window.PROJECT_VIZ = window.PROJECT_VIZ || {});
  var MONO = "'Martian Mono', ui-monospace, monospace";
  var NODASH = [];

  /* Police mono mise en cache : la chaîne et la largeur d'un caractère ne sont recalculées qu'au changement de taille. */
  function monoFont() {
    var o = { px: -1, str: "", cw: 6 };
    o.use = function (x, px) {
      px = Math.round(px);
      if (px !== o.px) { o.px = px; o.str = "500 " + px + "px " + MONO; x.font = o.str; o.cw = x.measureText("M").width; }
      else x.font = o.str;
      return o.cw;
    };
    return o;
  }

  /* ------------------------------------------------------------------ */
  /* myftp : canal de contrôle (codes de réponse) + canal de données (fichier en blocs), clients tour à tour */
  R.myftp = function (r, K) {
    var c = K.c, IR = K.IR, PK = K.PK, WH = K.WH, ss = K.sstep, lerp = K.lerp, clamp = K.clamp, rr = K.rr, halo = K.halo, PI2 = K.PI2;
    var P = 9, NC = 3, first = (r() * NC) | 0;
    var CMD = ["USER", "PASS", "RETR"], CMDT = [1.15, 1.95, 2.75];
    var REP = ["220", "331", "230", "150", "226"], REPT = [0.55, 1.5, 2.3, 3.1, 7.05];
    var TR = 0.5, NB = 8, B0 = 3.9, BD = 0.34, BT = 0.62;
    var fnt = monoFont(), fsm = monoFont();
    var LC = [0, 0, 0, 0, 0, 0, 0, 0], LD = [0, 0, 0, 0, 0, 0, 0, 0], DASH = [3, 4];
    var Q = { x: 0, y: 0 };
    var blink = []; for (var i = 0; i < 4; i++) blink.push(1.5 + r() * 2.5);
    function bz(L, u, o) {
      var v = 1 - u, a = v * v * v, b = 3 * v * v * u, d3 = 3 * v * u * u, d = u * u * u;
      o.x = a * L[0] + b * L[2] + d3 * L[4] + d * L[6]; o.y = a * L[1] + b * L[3] + d3 * L[5] + d * L[7];
    }
    function setLane(L, x0, y0, x3, y3) { var m = lerp(x0, x3, 0.5); L[0] = x0; L[1] = y0; L[2] = m; L[3] = y0; L[4] = m; L[5] = y3; L[6] = x3; L[7] = y3; }
    function lanePath(x, L, upto) {
      x.beginPath();
      for (var s = 0; s <= 22; s++) { bz(L, upto * s / 22, Q); if (s) x.lineTo(Q.x, Q.y); else x.moveTo(Q.x, Q.y); }
    }
    return function (x, w, h, t, g) {
      var S = Math.min(w / 330, h / 185), cyc = Math.floor(t / P), u = t - cyc * P, k = (cyc + first) % NC;
      var env = ss(0, 0.6, u) * (1 - ss(8.2, 8.9, u)), i, j, f, a;
      var cx = w * 0.12, sx = w * 0.86, yC = h * 0.34, yD = h * 0.66;
      var cbw = 40 * S, cbh = 27 * S, cy = h * (0.2 + 0.3 * k);
      var x0 = cx + cbw / 2 + 3 * S, x3 = sx - 24 * S;
      setLane(LC, x0, cy - 5 * S, x3, yC);
      setLane(LD, x0, cy + 5 * S, x3, yD);
      var px = Math.max(9, 10.5 * S), cw = fnt.use(x, px);

      /* clients */
      for (i = 0; i < NC; i++) {
        var yy = h * (0.2 + 0.3 * i), on = i === k ? env : 0;
        if (on > 0.02) halo(x, cx, yy, 34 * S, IR, (0.22 + 0.12 * g) * on);
        rr(x, cx - cbw / 2, yy - cbh / 2, cbw, cbh, 4 * S); x.fillStyle = c(WH, 0.05 + 0.04 * on); x.fill();
        x.lineWidth = 1; x.strokeStyle = on > 0.02 ? c(IR, 0.25 + 0.65 * on) : c(WH, 0.22 + 0.08 * g); x.stroke();
        x.beginPath(); x.moveTo(cx - cbw / 2 - 4 * S, yy + cbh / 2 + 3 * S); x.lineTo(cx + cbw / 2 + 4 * S, yy + cbh / 2 + 3 * S); x.stroke();
        if (i !== k) { x.fillStyle = c(WH, 0.18); x.fillRect(cx - cbw / 2 + 6 * S, yy - 2 * S, 10 * S, 2.5 * S); }
      }
      /* fichier reconstitué dans le client actif : 4 x 2 blocs */
      var got = 0;
      for (i = 0; i < NB; i++) got += ss(B0 + i * BD + BT - 0.06, B0 + i * BD + BT, u);
      var cell = (cbw - 12 * S) / 4, chh = (cbh - 10 * S) / 2;
      for (i = 0; i < NB; i++) {
        a = clamp(got - i, 0, 1) * env;
        x.fillStyle = a > 0.01 ? c(PK, 0.15 + 0.75 * a) : c(WH, 0.07 * env);
        x.fillRect(cx - cbw / 2 + 6 * S + (i % 4) * cell, cy - cbh / 2 + 5 * S + ((i / 4) | 0) * chh, cell - 1.5 * S, chh - 1.5 * S);
      }

      /* canal de contrôle (pointillés qui défilent) */
      var ctlOpen = ss(0, 0.6, u);
      if (env > 0.01) {
        DASH[0] = 3 * S; DASH[1] = 4 * S;
        x.setLineDash(DASH); x.lineDashOffset = -t * 14 * S;
        x.lineWidth = 1.2; x.strokeStyle = c(WH, (0.38 + 0.2 * g) * env);
        lanePath(x, LC, ctlOpen); x.stroke();
        x.setLineDash(NODASH); x.lineDashOffset = 0;
      }
      /* canal de données */
      var dOpen = ss(3.35, 3.85, u), dA = (1 - ss(7.45, 7.95, u)) * env;
      if (dOpen > 0.01 && dA > 0.01) {
        x.lineWidth = 9 * S; x.strokeStyle = c(IR, 0.08 * dA); lanePath(x, LD, dOpen); x.stroke();
        x.lineWidth = 2; x.strokeStyle = c(IR, (0.55 + 0.25 * g) * dA); x.stroke();
      }
      /* numéros de port */
      var ps = Math.max(8, 9 * S); fsm.use(x, ps);
      x.textAlign = "right"; x.textBaseline = "bottom";
      x.fillStyle = c(WH, 0.42 * env); x.fillText(":21", x3 - 3 * S, yC - 4 * S);
      x.fillStyle = c(IR, 0.75 * dA * dOpen); x.fillText(":20", x3 - 3 * S, yD - 5 * S);

      /* commandes client -> serveur et réponses serveur -> client */
      fnt.use(x, px); x.textAlign = "center"; x.textBaseline = "middle";
      var th = px + 6 * S, last = -1;
      for (i = 0; i < CMD.length + REP.length; i++) {
        var isCmd = i < CMD.length, t0 = isCmd ? CMDT[i] : REPT[i - CMD.length];
        f = (u - t0) / TR;
        if (!isCmd && f >= 1) last = i - CMD.length;
        if (f <= 0 || f >= 1) continue;
        bz(LC, isCmd ? f : 1 - f, Q);
        var lab = isCmd ? CMD[i] : REP[i - CMD.length], tw = lab.length * cw + 9 * S;
        a = ss(0, 0.12, f) * (1 - ss(0.88, 1, f)) * env;
        if (!isCmd) halo(x, Q.x, Q.y, 22 * S, PK, (0.3 + 0.15 * g) * a);
        rr(x, Q.x - tw / 2, Q.y - th / 2, tw, th, th / 2);
        x.fillStyle = isCmd ? c(WH, 0.1 * a) : c(PK, 0.9 * a); x.fill();
        x.lineWidth = 1; x.strokeStyle = isCmd ? c(WH, 0.55 * a) : c(PK, a); x.stroke();
        x.fillStyle = isCmd ? c(WH, 0.85 * a) : c(WH, a); x.fillText(lab, Q.x, Q.y + 0.5);
      }
      /* dernier code reçu, affiché au-dessus du client actif */
      if (last >= 0) {
        var la = env * (0.55 + 0.45 * (1 - ss(0, 0.6, u - REPT[last] - TR)));
        x.fillStyle = c(last === 4 ? PK : WH, 0.85 * la); x.fillText(REP[last], cx, cy - cbh / 2 - 9 * S);
      }

      /* blocs du fichier sur le canal de données */
      for (i = 0; i < NB; i++) {
        f = (u - (B0 + i * BD)) / BT;
        if (f <= 0 || f >= 1) continue;
        a = ss(0, 0.1, f) * (1 - ss(0.92, 1, f)) * env;
        for (j = 2; j >= 0; j--) {
          bz(LD, clamp(1 - f + j * 0.035, 0, 1), Q);
          var bs = (8 - j * 2) * S;
          x.fillStyle = c(j ? IR : PK, a * (0.95 - j * 0.3)); x.fillRect(Q.x - bs / 2, Q.y - bs / 2, bs, bs);
        }
      }
      /* barre de progression */
      var bx = w * 0.33, bw = w * 0.34, by = h * 0.9 - 2 * S, prog = got / NB, pa = env * ss(3.4, 3.9, u);
      if (pa > 0.01) {
        rr(x, bx, by, bw, 4 * S, 2 * S); x.fillStyle = c(WH, 0.1 * pa); x.fill();
        if (prog > 0.005) { rr(x, bx, by, bw * prog, 4 * S, 2 * S); x.fillStyle = K.grad(x, bx, 0, bx + bw, 0, 0.9 * pa); x.fill(); }
        if (prog > 0.995) halo(x, bx + bw, by + 2 * S, 16 * S, PK, 0.5 * pa * (1 - ss(7.1, 7.9, u)));
      }

      /* serveur */
      var rw = 44 * S, rh = (yD - yC) + 46 * S, ry = (yC + yD) / 2 - rh / 2;
      halo(x, sx, (yC + yD) / 2, rh * 0.75, IR, 0.12 + 0.12 * g);
      rr(x, sx - rw / 2, ry, rw, rh, 6 * S); x.fillStyle = c(WH, 0.06); x.fill();
      x.lineWidth = 1; x.strokeStyle = c(WH, 0.32 + 0.15 * g); x.stroke();
      var uh = (rh - 10 * S) / 4;
      for (i = 0; i < 4; i++) {
        var uy = ry + 5 * S + i * uh;
        rr(x, sx - rw / 2 + 5 * S, uy + 1.5 * S, rw - 10 * S, uh - 3 * S, 2.5 * S); x.strokeStyle = c(WH, 0.16); x.stroke();
        var busy = (i === 0 && u > 0.4 && u < 7.6) || (i === 3 && u > 3.8 && u < 7.2);
        var ledOn = busy ? Math.sin(t * 11 + i) > -0.2 : Math.sin(t * blink[i] + i * 2) > 0.6;
        x.fillStyle = ledOn ? c(busy ? PK : IR, 0.95) : c(WH, 0.18);
        x.beginPath(); x.arc(sx + rw / 2 - 10 * S, uy + uh / 2, 2 * S, 0, PI2); x.fill();
        x.fillStyle = c(WH, 0.14); x.fillRect(sx - rw / 2 + 9 * S, uy + uh / 2 - 1 * S, rw * 0.38, 2 * S);
      }
      x.textAlign = "start"; x.textBaseline = "alphabetic"; x.lineWidth = 1;
    };
  };

  /* ------------------------------------------------------------------ */
  /* zappy : plateau isométrique, ressources, deux équipes, rassemblement et élévation */
  R.zappy = function (r, K) {
    var c = K.c, IR = K.IR, PK = K.PK, WH = K.WH, ss = K.sstep, lerp = K.lerp, clamp = K.clamp, rr = K.rr, halo = K.halo, PI2 = K.PI2;
    var N = 6, P = 10, GI = 3, GJ = 2, RIT = 5.1;
    var pawns = [], res = [], deco = [];
    function mk(team, i, j, ox, oy) { var p = { team: team, kt: [0], ki: [i], kj: [j], ox: ox, oy: oy, X: 0, Y: 0, hop: 0, d: 0, ci: i, cj: j, carry: -1, carryA: 0 }; pawns.push(p); return p; }
    function key(p, t, i, j) { p.kt.push(t); p.ki.push(i); p.kj.push(j); }
    function route(i, j, bi, bj, yFirst) {
      var out = [];
      function sx() { while (i !== bi) { i += i < bi ? 1 : -1; out.push([i, j]); } }
      function sy() { while (j !== bj) { j += j < bj ? 1 : -1; out.push([i, j]); } }
      if (yFirst) { sy(); sx(); } else { sx(); sy(); }
      return out;
    }
    /* marche case par case : chaque pas = 60 % déplacement, 40 % arrêt ; pickAt = index de la case où ramasser */
    function walk(p, tiles, t0, t1, pickAt) {
      var n = tiles.length, d = (t1 - t0) / n, li = p.ki.length - 1, pi = p.ki[li], pj = p.kj[li];
      for (var s = 0; s < n; s++) {
        key(p, t0 + d * s, pi, pj);
        pi = tiles[s][0]; pj = tiles[s][1];
        key(p, t0 + d * s + d * 0.6, pi, pj);
        if (s === pickAt) res.push({ i: pi, j: pj, t: t0 + d * s + d * 0.6, p: p, kind: res.length % 3 });
      }
    }
    var A1 = mk(0, 0, 0, -0.13, -0.05), A2 = mk(0, 5, 0, 0.14, -0.06), A3 = mk(0, 1, 5, 0.0, 0.14);
    walk(A1, route(0, 0, GI, GJ, false), 0.3, 4.4, 1);
    walk(A2, route(5, 0, GI, GJ, true), 0.7, 4.0, 1);
    walk(A3, route(1, 5, GI, GJ, true), 0.2, 4.8, 1);
    walk(A1, route(GI, GJ, 0, 0, true), 8.3, 9.85, -1);
    walk(A2, route(GI, GJ, 5, 0, false), 8.45, 9.9, -1);
    walk(A3, route(GI, GJ, 1, 5, false), 8.2, 9.8, -1);
    var B1 = mk(1, 5, 5, 0, 0), B2 = mk(1, 0, 2, 0, 0);
    var loop1 = [[4, 5], [3, 5], [3, 4], [4, 4], [5, 4], [5, 5]], loop2 = [[0, 3], [0, 4], [1, 4], [1, 3], [1, 2], [0, 2]];
    walk(B1, loop1, 0.0, 9.9, 2);
    walk(B2, loop2, 0.4, 9.95, 3);
    var occ = {}, i2;
    for (i2 = 0; i2 < res.length; i2++) occ[res[i2].i + "," + res[i2].j] = 1;
    occ[GI + "," + GJ] = 1;
    while (deco.length < 6) {
      var di = (r() * N) | 0, dj = (r() * N) | 0;
      if (occ[di + "," + dj]) continue;
      occ[di + "," + dj] = 1; deco.push({ i: di, j: dj, kind: deco.length % 3, ph: r() * PI2 });
    }
    var order = []; for (i2 = 0; i2 < pawns.length; i2++) order.push(i2);
    var V = { x: 0, y: 0 };
    var COL = [IR, PK, WH];

    function locate(p, u) {
      var kt = p.kt, n = kt.length, k = 0;
      while (k < n - 1 && kt[k + 1] <= u) k++;
      if (k >= n - 1) { p.ci = p.ki[n - 1]; p.cj = p.kj[n - 1]; p.hop = 0; return; }
      var f = clamp((u - kt[k]) / (kt[k + 1] - kt[k]), 0, 1), moving = p.ki[k] !== p.ki[k + 1] || p.kj[k] !== p.kj[k + 1];
      var e = ss(0, 1, f);
      p.ci = lerp(p.ki[k], p.ki[k + 1], e); p.cj = lerp(p.kj[k], p.kj[k + 1], e);
      p.hop = moving ? Math.sin(Math.PI * f) : 0;
    }
    function gem(x, px, py, s, rgb, a) {
      x.beginPath(); x.moveTo(px, py - s); x.lineTo(px + s * 0.7, py); x.lineTo(px, py + s * 0.8); x.lineTo(px - s * 0.7, py); x.closePath();
      x.fillStyle = c(rgb, 0.85 * a); x.fill();
      x.fillStyle = c(WH, 0.7 * a); x.beginPath(); x.moveTo(px, py - s); x.lineTo(px + s * 0.35, py - s * 0.3); x.lineTo(px, py); x.closePath(); x.fill();
    }
    return function (x, w, h, t, g) {
      var u = t - Math.floor(t / P) * P, i, j, p, a;
      var tw = Math.min(w * 0.86 / N, h * 0.72 / (N * 0.5)), th = tw / 2, S = tw / 52;
      var topX = w / 2, topY = h * 0.56 - N * th / 2 + 4 * S, dep = th * 0.42;
      function P2(ci, cj) { V.x = topX + (ci - cj) * tw / 2; V.y = topY + (ci + cj) * th / 2; }
      /* dalle : faces latérales puis dessus */
      P2(0, N); var lx = V.x, ly = V.y; P2(N, N); var bx = V.x, by = V.y; P2(N, 0); var rx = V.x, ry = V.y;
      x.beginPath(); x.moveTo(lx, ly); x.lineTo(bx, by); x.lineTo(bx, by + dep); x.lineTo(lx, ly + dep); x.closePath(); x.fillStyle = c(IR, 0.1); x.fill();
      x.beginPath(); x.moveTo(bx, by); x.lineTo(rx, ry); x.lineTo(rx, ry + dep); x.lineTo(bx, by + dep); x.closePath(); x.fillStyle = c(PK, 0.07); x.fill();
      x.beginPath(); x.moveTo(topX, topY); x.lineTo(rx, ry); x.lineTo(bx, by); x.lineTo(lx, ly); x.closePath();
      x.fillStyle = c(WH, 0.035); x.fill(); x.lineWidth = 1; x.strokeStyle = c(WH, 0.3 + 0.12 * g); x.stroke();
      x.beginPath();
      for (i = 1; i < N; i++) {
        P2(i, 0); x.moveTo(V.x, V.y); P2(i, N); x.lineTo(V.x, V.y);
        P2(0, i); x.moveTo(V.x, V.y); P2(N, i); x.lineTo(V.x, V.y);
      }
      x.strokeStyle = c(WH, 0.11 + 0.08 * g); x.stroke();

      /* case de rassemblement */
      var rit = ss(RIT - 0.3, RIT + 0.3, u) * (1 - ss(7.9, 8.4, u));
      P2(GI, GJ); var gx0 = V.x, gy0 = V.y; P2(GI + 1, GJ); var gx1 = V.x, gy1 = V.y; P2(GI + 1, GJ + 1); var gx2 = V.x, gy2 = V.y; P2(GI, GJ + 1);
      x.beginPath(); x.moveTo(gx0, gy0); x.lineTo(gx1, gy1); x.lineTo(gx2, gy2); x.lineTo(V.x, V.y); x.closePath();
      x.fillStyle = c(PK, 0.06 + 0.3 * rit); x.fill(); x.strokeStyle = c(PK, 0.3 + 0.6 * rit); x.stroke();
      P2(GI + 0.5, GJ + 0.5); var gcx = V.x, gcy = V.y;

      /* anneaux d'élévation au sol */
      if (rit > 0.01) {
        halo(x, gcx, gcy, tw * 1.3, PK, 0.25 * rit + 0.1 * g * rit);
        for (i = 0; i < 3; i++) {
          var f = (u - RIT - 0.4 - i * 0.55) / 1.6;
          if (f <= 0 || f >= 1) continue;
          var rx2 = tw * (0.35 + 1.5 * f);
          x.beginPath(); x.ellipse(gcx, gcy, rx2, rx2 / 2, 0, 0, PI2);
          x.lineWidth = 1.6; x.strokeStyle = c(i % 2 ? IR : PK, 0.85 * (1 - f) * rit); x.stroke();
        }
        x.lineWidth = 1;
      }

      /* ressources : décor (flottent) puis ressources ramassables */
      var respawn = ss(9.0, 9.7, u);
      for (i = 0; i < deco.length; i++) {
        var d = deco[i]; P2(d.i + 0.5, d.j + 0.5);
        gem(x, V.x, V.y - 5 * S - 1.5 * S * Math.sin(t * 2 + d.ph), 4.5 * S, COL[d.kind], 0.8);
      }
      for (i = 0; i < res.length; i++) {
        var q = res[i]; P2(q.i + 0.5, q.j + 0.5);
        var pick = ss(q.t - 0.05, q.t + 0.35, u);
        a = Math.max(1 - pick, respawn);
        if (a < 0.02) continue;
        var lift = u < 9 ? pick * 10 * S : 0, sc = u < 9 ? 1 - 0.5 * pick : respawn;
        gem(x, V.x, V.y - 5 * S - lift, 4.5 * S * sc, COL[q.kind], a);
      }

      /* pions triés par profondeur */
      for (i = 0; i < pawns.length; i++) {
        p = pawns[i]; locate(p, u);
        P2(p.ci + 0.5 + p.ox, p.cj + 0.5 + p.oy); p.X = V.x; p.Y = V.y; p.d = p.ci + p.cj + p.ox + p.oy;
        p.carry = -1; p.carryA = 0;
        for (j = 0; j < res.length; j++) if (res[j].p === p) {
          var ca = ss(res[j].t + 0.2, res[j].t + 0.45, u) * (1 - (p.team === 0 ? ss(RIT - 0.1, RIT + 0.15, u) : ss(res[j].t + 1.4, res[j].t + 1.8, u)));
          if (ca > 0.01) { p.carry = j; p.carryA = ca; }
        }
      }
      for (i = 1; i < order.length; i++) {
        var v = order[i]; j = i - 1;
        while (j >= 0 && pawns[order[j]].d > pawns[v].d) { order[j + 1] = order[j]; j--; }
        order[j + 1] = v;
      }
      var lev = ss(RIT + 0.9, RIT + 1.5, u) * (1 - ss(7.3, 7.9, u));
      for (i = 0; i < order.length; i++) {
        p = pawns[order[i]];
        var up = p.team === 0 ? lev * 8 * S : 0, hy = p.hop * 6 * S + up, Z = 1.3 * S;
        x.beginPath(); x.ellipse(p.X, p.Y, 5.5 * Z, 2.6 * Z, 0, 0, PI2); x.fillStyle = c(WH, 0.12); x.fill();
        if (p.team === 0 && lev > 0.02) halo(x, p.X, p.Y - 10 * Z - hy, 15 * Z, WH, 0.35 * lev);
        rr(x, p.X - 3.4 * Z, p.Y - 12 * Z - hy, 6.8 * Z, 10 * Z, 3.4 * Z);
        x.fillStyle = c(p.team ? PK : IR, 0.95); x.fill();
        x.beginPath(); x.arc(p.X, p.Y - 15 * Z - hy, 3.1 * Z, 0, PI2); x.fillStyle = c(WH, 0.95); x.fill();
        /* pierre portée au-dessus de la tête entre ramassage et dépôt */
        if (p.carry >= 0) gem(x, p.X, p.Y - 22 * Z - hy - Math.sin(t * 5) * Z, 3.2 * Z, COL[res[p.carry].kind], p.carryA);
      }

      /* pierres déposées sur la case puis aspirées par l'incantation */
      for (i = 0; i < res.length; i++) {
        var q2 = res[i];
        if (q2.p.team !== 0) continue;
        var drop = ss(RIT, RIT + 0.5, u), rise = ss(RIT + 1.1, RIT + 2.1, u);
        if (drop < 0.01 || rise > 0.99) continue;
        var an = i * 2.1 + u * 1.5 * rise;
        var gx = gcx + Math.cos(an) * tw * 0.18 * (1 - rise), gy = gcy - 4 * S - rise * h * 0.22;
        gem(x, lerp(q2.p.X, gx, drop), lerp(q2.p.Y - 28 * S, gy, drop), 3.6 * S, COL[q2.kind], drop * (1 - rise));
      }
      /* colonne de lumière */
      var beam = ss(RIT + 0.8, RIT + 1.4, u) * (1 - ss(7.4, 8.1, u));
      if (beam > 0.01) {
        var bh = h * 0.42, bw = tw * 0.32;
        var lg = x.createLinearGradient(0, gcy - bh, 0, gcy);
        lg.addColorStop(0, c(PK, 0)); lg.addColorStop(0.7, c(PK, 0.18 * beam)); lg.addColorStop(1, c(WH, 0.35 * beam));
        x.fillStyle = lg; x.fillRect(gcx - bw / 2, gcy - bh, bw, bh);
        x.fillStyle = c(WH, 0.5 * beam); x.fillRect(gcx - 0.75, gcy - bh * 0.85, 1.5, bh * 0.85);
        halo(x, gcx, gcy - bh * 0.55, tw * 0.6, PK, 0.35 * beam);
        /* niveau gagné : chevrons qui montent */
        for (i = 0; i < 2; i++) {
          var cf = (u - RIT - 1.3 - i * 0.35) / 1.2;
          if (cf <= 0 || cf >= 1) continue;
          var cyv = gcy - bh * (0.45 + 0.4 * cf), ca = Math.sin(Math.PI * cf) * beam;
          x.beginPath(); x.moveTo(gcx - 6 * S, cyv + 4 * S); x.lineTo(gcx, cyv - 2 * S); x.lineTo(gcx + 6 * S, cyv + 4 * S);
          x.lineWidth = 2; x.strokeStyle = c(WH, 0.9 * ca); x.stroke();
        }
        x.lineWidth = 1;
      }
    };
  };

  /* ------------------------------------------------------------------ */
  /* minishell : frappe -> jetons -> processus reliés par des tuyaux -> fichier / sortie */
  R.minishell = function (r, K) {
    var c = K.c, IR = K.IR, PK = K.PK, WH = K.WH, ss = K.sstep, lerp = K.lerp, clamp = K.clamp, rr = K.rr, halo = K.halo, PI2 = K.PI2, frac = K.frac;
    var P = 9, T0 = 0.45, CH = 0.08;
    function cmd(str, toks, nodes, edges, out) {
      var pre = [], i;
      for (i = 0; i <= str.length; i++) pre.push(str.slice(0, i));
      for (i = 0; i < toks.length; i++) toks[i].txt = str.substr(toks[i].s, toks[i].l);
      return { str: str, pre: pre, toks: toks, nodes: nodes, edges: edges, out: out, tEnd: T0 + str.length * CH };
    }
    var CMDS = [
      cmd("ls | grep c > out",
        [{ s: 0, l: 2, k: 0 }, { s: 3, l: 1, k: 1 }, { s: 5, l: 6, k: 0 }, { s: 12, l: 1, k: 1 }, { s: 14, l: 3, k: 2 }],
        [{ tok: 0, f: 0 }, { tok: 2, f: 0 }, { tok: 4, f: 2 }],
        [{ tok: 1, a: 0, b: 1, n: 6, pipe: 1 }, { tok: 3, a: 1, b: 2, n: 2, pipe: 0 }], ""),
      cmd("sort < in | wc -l",
        [{ s: 0, l: 4, k: 0 }, { s: 5, l: 1, k: 1 }, { s: 7, l: 2, k: 2 }, { s: 10, l: 1, k: 1 }, { s: 12, l: 5, k: 0 }],
        [{ tok: 2, f: 1 }, { tok: 0, f: 0 }, { tok: 4, f: 0 }],
        [{ tok: 1, a: 0, b: 1, n: 4, pipe: 0 }, { tok: 3, a: 1, b: 2, n: 5, pipe: 1 }], "3")
    ];
    if (r() < 0.5) CMDS.reverse();
    var fnt = monoFont();
    var NX = [0, 0, 0], NY = [0, 0, 0], NW = [0, 0, 0], NH = [0, 0, 0];
    return function (x, w, h, t, g) {
      var cyc = Math.floor(t / P), u = t - cyc * P, C = CMDS[cyc % 2], i, e, a, f;
      var S = Math.min(w / 380, h / 210), fs = clamp(12.5 * S, 10, 16), cw = fnt.use(x, fs);
      var px0 = w * 0.05, py0 = h * 0.07, pw = w * 0.9, ph = fs * 3.5;
      var tx = px0 + 12 * S, l1 = py0 + fs * 1.45, l2 = py0 + fs * 2.85, cx0 = tx + cw * 2;
      var txtA = 1 - ss(7.7, 8.2, u);
      /* terminal */
      rr(x, px0, py0, pw, ph, 7 * S); x.fillStyle = c(WH, 0.045); x.fill();
      x.lineWidth = 1; x.strokeStyle = c(WH, 0.2 + 0.12 * g); x.stroke();
      x.fillStyle = grad2(x, px0, py0, ph); x.fillRect(px0, py0 + 5 * S, 2 * S, ph - 10 * S);
      x.textBaseline = "alphabetic"; x.textAlign = "start";
      x.fillStyle = c(PK, 0.95); x.fillText("$", tx, l1);
      var typed = clamp(Math.floor((u - T0) / CH) + 1, 0, C.str.length), enter = C.tEnd + 0.35;
      var lex = ss(enter, enter + 0.4, u);
      if (u < 8.2) {
        if (lex < 0.01) { x.fillStyle = c(WH, 0.92 * txtA); x.fillText(C.pre[typed], cx0, l1); }
        else {
          for (i = 0; i < C.toks.length; i++) {
            var tk = C.toks[i], la = ss(enter + i * 0.1, enter + i * 0.1 + 0.25, u);
            var col = tk.k === 1 ? PK : tk.k === 2 ? WH : IR;
            x.fillStyle = c(WH, 0.92 * txtA * (1 - la)); x.fillText(tk.txt, cx0 + tk.s * cw, l1);
            if (la > 0.01) {
              x.fillStyle = c(col, (tk.k === 2 ? 0.8 : 1) * la * txtA); x.fillText(tk.txt, cx0 + tk.s * cw, l1);
              x.fillStyle = c(col, 0.75 * la * txtA); x.fillRect(cx0 + tk.s * cw, l1 + fs * 0.3, tk.l * cw * la, 1.5 * S);
            }
          }
        }
      }
      /* curseur */
      var cpos = u < 8.2 ? typed : 0, typing = u > T0 && u < C.tEnd;
      var cOn = typing || ((u < enter || u > 8.2) && frac(t * 1.7) < 0.55);
      if (cOn) { x.fillStyle = c(WH, 0.85); x.fillRect(cx0 + cpos * cw + 1, l1 - fs * 0.82, cw * 0.62, fs * 1.0); }
      if (u > enter - 0.05 && u < enter + 0.5) halo(x, cx0 + C.str.length * cw * 0.5, l1 - fs * 0.3, C.str.length * cw * 0.6, IR, 0.18 * (1 - ss(enter, enter + 0.5, u)));

      /* processus et fichiers */
      var rowY = py0 + ph + (h - py0 - ph) * 0.5, n = C.nodes.length;
      var down = 1 - ss(7.5, 8.0, u);
      for (i = 0; i < n; i++) {
        var nd = C.nodes[i], tk2 = C.toks[nd.tok];
        var fw = nd.f ? Math.max(fs * 2.1, 24 * S) : tk2.l * cw + 18 * S, fh = nd.f ? fs * 2.6 : fs * 2.2;
        var fx = lerp(w * 0.17, w * 0.83, i / (n - 1));
        var t1 = enter + 0.75 + i * 0.16;
        e = ss(t1, t1 + 0.6, u);
        NX[i] = lerp(cx0 + (tk2.s + tk2.l / 2) * cw, fx, e);
        NY[i] = lerp(l1 - fs * 0.35, rowY, e);
        NW[i] = lerp(tk2.l * cw + 4 * S, fw, e); NH[i] = lerp(fs * 1.2, fh, e);
        nd.a = ss(t1 - 0.05, t1 + 0.15, u) * down;
      }
      /* liaisons */
      var flow = ss(enter + 1.9, enter + 2.2, u) * (1 - ss(7.2, 7.6, u));
      for (i = 0; i < C.edges.length; i++) {
        var ed = C.edges[i], ea = ss(enter + 1.55 + i * 0.15, enter + 1.95 + i * 0.15, u) * down;
        if (ea < 0.01) continue;
        var ax = NX[ed.a] + NW[ed.a] / 2, bx2 = NX[ed.b] - NW[ed.b] / 2, len = (bx2 - ax) * ea, gap = 3.2 * S;
        x.lineWidth = 1.1;
        if (ed.pipe) {
          x.strokeStyle = c(IR, 0.75 * ea);
          x.beginPath(); x.moveTo(ax, rowY - gap); x.lineTo(ax + len, rowY - gap); x.moveTo(ax, rowY + gap); x.lineTo(ax + len, rowY + gap); x.stroke();
          x.fillStyle = c(IR, 0.08 * ea); x.fillRect(ax, rowY - gap, len, gap * 2);
        } else {
          x.strokeStyle = c(PK, 0.75 * ea);
          x.beginPath(); x.moveTo(ax, rowY); x.lineTo(ax + len - 2 * S, rowY); x.stroke();
          x.beginPath(); x.moveTo(ax + len, rowY); x.lineTo(ax + len - 6 * S, rowY - 3.5 * S); x.lineTo(ax + len - 6 * S, rowY + 3.5 * S); x.closePath();
          x.fillStyle = c(PK, 0.85 * ea); x.fill();
        }
        x.textAlign = "center"; x.fillStyle = c(PK, 0.95 * ea); x.fillText(C.toks[ed.tok].txt, (ax + bx2) / 2, rowY - fs * 0.75);
        x.textAlign = "start";
        if (flow > 0.01) {
          for (var dI = 0; dI < ed.n; dI++) {
            f = frac(u * (ed.n > 3 ? 0.75 : 0.45) + dI / ed.n);
            var dx = lerp(ax + 3 * S, bx2 - 4 * S, f), da = flow * Math.sin(Math.PI * f);
            x.fillStyle = c(ed.pipe ? WH : PK, 0.95 * da); x.fillRect(dx - 2 * S, rowY - 1.2 * S, 4 * S, 2.4 * S);
          }
        }
      }
      var outDone = ss(enter + 3.4, enter + 3.6, u);
      for (i = 0; i < n; i++) {
        var nd2 = C.nodes[i];
        if (nd2.a < 0.01) continue;
        var X = NX[i], Y = NY[i], W = NW[i], H = NH[i], A2 = nd2.a, landed = ss(enter + 0.95 + i * 0.16, enter + 1.4 + i * 0.16, u);
        if (nd2.f) {
          var fold = Math.min(W, H) * 0.3;
          x.beginPath(); x.moveTo(X - W / 2, Y - H / 2); x.lineTo(X + W / 2 - fold, Y - H / 2); x.lineTo(X + W / 2, Y - H / 2 + fold);
          x.lineTo(X + W / 2, Y + H / 2); x.lineTo(X - W / 2, Y + H / 2); x.closePath();
          x.fillStyle = c(WH, 0.07 * A2); x.fill(); x.strokeStyle = c(WH, 0.6 * A2); x.stroke();
          for (var rI = 0; rI < 4; rI++) {
            var rl = nd2.f === 2 ? clamp(flow > 0.01 || u > 7 ? (u - enter - 2.3) / 0.6 - rI : 0, 0, 1) : 1;
            var scan = nd2.f === 1 && flow > 0.01 && ((u * 2.2) | 0) % 4 === rI;
            if (rl <= 0) continue;
            x.fillStyle = scan ? c(IR, 0.95 * A2) : c(nd2.f === 2 ? PK : WH, (nd2.f === 2 ? 0.75 : 0.35) * A2 * landed);
            x.fillRect(X - W / 2 + W * 0.18, Y - H / 2 + H * (0.3 + rI * 0.15), W * (rI === 3 ? 0.4 : 0.62) * rl, Math.max(1.5, 1.6 * S));
          }
          x.textAlign = "center"; x.fillStyle = c(WH, 0.8 * A2 * landed); x.fillText(C.toks[nd2.tok].txt, X, Y + H / 2 + fs * 1.1); x.textAlign = "start";
        } else {
          if (flow > 0.01) halo(x, X, Y, W * 0.75, IR, 0.18 * flow + 0.08 * g);
          rr(x, X - W / 2, Y - H / 2, W, H, 5 * S); x.fillStyle = c(WH, 0.06 * A2 + 0.05 * flow); x.fill();
          x.strokeStyle = c(IR, (0.4 + 0.5 * landed) * A2); x.stroke();
          x.textAlign = "center"; x.fillStyle = c(WH, 0.92 * A2); x.fillText(C.toks[nd2.tok].txt, X, Y + fs * 0.35); x.textAlign = "start";
          if (flow > 0.01) {
            x.beginPath(); x.arc(X + W / 2 - 1, Y - H / 2 + 1, 2.6 * S, t * 6 + i, t * 6 + i + 4.2);
            x.strokeStyle = c(PK, 0.9 * flow); x.lineWidth = 1.2; x.stroke(); x.lineWidth = 1.1;
          }
        }
      }
      /* sortie standard qui remonte dans le terminal */
      if (C.out) {
        var lx = NX[n - 1], ly = NY[n - 1] - NH[n - 1] / 2, ta = ss(enter + 1.8, enter + 2.1, u) * down;
        if (ta > 0.01) {
          var ox = lx - (lx - cx0) * 0.35, oy = py0 + ph;
          x.strokeStyle = c(WH, 0.3 * ta); x.lineWidth = 1;
          x.beginPath(); x.moveTo(lx, ly); x.bezierCurveTo(lx, ly - (ly - oy) * 0.6, ox, oy + (ly - oy) * 0.6, ox, oy); x.stroke();
          if (flow > 0.01) for (i = 0; i < 3; i++) {
            f = frac(u * 0.6 + i / 3);
            var mf = 1 - f, bxp = mf * mf * mf * lx + 3 * mf * mf * f * lx + 3 * mf * f * f * ox + f * f * f * ox;
            var byp = mf * mf * mf * ly + 3 * mf * mf * f * (ly - (ly - oy) * 0.6) + 3 * mf * f * f * (oy + (ly - oy) * 0.6) + f * f * f * oy;
            x.fillStyle = c(WH, 0.9 * flow * Math.sin(Math.PI * f)); x.fillRect(bxp - 1.5 * S, byp - 1.5 * S, 3 * S, 3 * S);
          }
        }
        if (outDone > 0.01) { x.fillStyle = c(WH, 0.9 * outDone * txtA); x.fillText(C.out, cx0, l2); }
      }
      x.lineWidth = 1; x.textAlign = "start";
    };
    function grad2(x, px0, py0, ph) { return K.grad(x, 0, py0, 0, py0 + ph, 0.9); }
  };

  /* ------------------------------------------------------------------ */
  /* libc : tas en bandes (malloc/free/fusion) + pile d'appels ; un pointeur saute du cadre courant au bloc alloué */
  R.libc = function (r, K) {
    var c = K.c, IR = K.IR, PK = K.PK, WH = K.WH, ss = K.sstep, lerp = K.lerp, clamp = K.clamp, rr = K.rr, halo = K.halo;
    var P = 10, U = 10, ROWS = 3;
    /* blocs : début (unités), taille, malloc, free */
    var BL = [
      { s: 0, l: 3, ta: 0.35, tf: 5.0 }, { s: 3, l: 4, ta: 1.05, tf: 4.25 }, { s: 10, l: 5, ta: 1.75, tf: 6.9 },
      { s: 7, l: 3, ta: 2.45, tf: 8.1 }, { s: 20, l: 6, ta: 3.15, tf: 7.6 }, { s: 15, l: 4, ta: 3.85, tf: 8.35 },
      { s: 26, l: 3, ta: 4.6, tf: 8.6 }, { s: 0, l: 5, ta: 6.0, tf: 8.8 }
    ];
    /* zones libres explicites et fusion (A+B -> trou de 7, réutilisé par malloc(5)) */
    var FR = [
      { s: 3, l: 4, t0: 4.25, t1: 5.45, m: 0 }, { s: 0, l: 3, t0: 5.0, t1: 5.45, m: 0 },
      { s: 0, l: 7, t0: 5.45, t1: 6.0, m: 1 }, { s: 5, l: 2, t0: 6.0, t1: 8.8, m: 0 }
    ];
    var MERGE = 9.0;
    var FRM = [
      { n: "main", d: 0, a: -1, b: 99, s: 0 }, { n: "printf", d: 1, a: 0.2, b: 4.3, s: 0 }, { n: "vfmt", d: 2, a: 0.8, b: 3.9, s: 0 },
      { n: "putnbr", d: 3, a: 1.4, b: 3.5, s: 0 }, { n: "write", d: 4, a: 2.05, b: 2.95, s: 1 },
      { n: "ls", d: 1, a: 4.6, b: 9.0, s: 0 }, { n: "stat", d: 2, a: 5.1, b: 5.95, s: 1 }, { n: "qsort", d: 2, a: 6.3, b: 7.9, s: 0 },
      { n: "cmp", d: 3, a: 6.8, b: 7.5, s: 0 }
    ];
    var ORD = [0, 1, 2, 3, 4, 5, 6, 7];
    var fnt = monoFont(), fsm = monoFont(), DASH = [2, 2];
    function unitX(s, hx, uw) { return hx + (s % U) * uw; }
    function rowOf(s) { return (s / U) | 0; }
    return function (x, w, h, t, g) {
      var u = t - Math.floor(t / P) * P, S = Math.min(w / 380, h / 210), i, b, a, e;
      var fs = Math.max(8, 9.5 * S), cw = fnt.use(x, fs);
      var H2 = Math.min(h * 0.4, 112 * S), bTop = h / 2 - H2 + fs * 1.6, bBot = h / 2 + H2;
      var hx = w * 0.06, hw = w * 0.56, uw = hw / U, bh = Math.min(h * 0.14, 30 * S), rg = Math.min((bBot - bTop - bh) / (ROWS - 1), bh * 2.4);
      var hTop = bTop + 2;
      x.textBaseline = "middle"; x.textAlign = "start";
      x.fillStyle = c(WH, 0.45); x.fillText("heap", hx, hTop - fs * 1.2);
      /* rails du tas */
      x.lineWidth = 1;
      for (i = 0; i < ROWS; i++) {
        var ry = hTop + i * rg;
        rr(x, hx - 2, ry - 2, hw + 4, bh + 4, 4 * S); x.strokeStyle = c(WH, 0.14 + 0.08 * g); x.stroke();
      }
      x.beginPath();
      for (i = 0; i < ROWS; i++) for (b = 1; b < U; b++) { var tx0 = hx + b * uw, ty0 = hTop + i * rg + bh; x.moveTo(tx0, ty0 + 2); x.lineTo(tx0, ty0 + 5); }
      x.strokeStyle = c(WH, 0.16); x.stroke();
      var endFade = 1 - ss(9.3, 9.8, u);
      /* zones libres */
      DASH[0] = 3 * S; DASH[1] = 2.5 * S; x.setLineDash(DASH);
      for (i = 0; i < FR.length; i++) {
        var fz = FR[i];
        a = ss(fz.t0, fz.t0 + 0.2, u) * (1 - ss(fz.t1 - 0.05, fz.t1 + 0.05, u));
        if (a < 0.01) continue;
        var fy = hTop + rowOf(fz.s) * rg, fx = unitX(fz.s, hx, uw);
        rr(x, fx + 1, fy, fz.l * uw - 2, bh, 3 * S); x.strokeStyle = c(fz.m ? PK : WH, (fz.m ? 0.9 : 0.4) * a); x.stroke();
      }
      x.setLineDash(NODASH);
      /* blocs */
      for (i = 0; i < BL.length; i++) {
        b = BL[i];
        var fill = ss(b.ta, b.ta + 0.45, u), freed = ss(b.tf, b.tf + 0.3, u), gone = ss(b.tf + 0.5, b.tf + 0.9, u);
        if (b.s === 0 && b.l === 3) gone = ss(5.4, 5.5, u);
        if (b.s === 3) gone = ss(5.4, 5.5, u);
        if (b.s === 0 && b.l === 5) gone = ss(MERGE, MERGE + 0.3, u);
        if (fill < 0.01 || gone > 0.99) continue;
        var by = hTop + rowOf(b.s) * rg, bx = unitX(b.s, hx, uw) + 1, bw = b.l * uw - 2;
        a = 1 - gone;
        if (freed < 0.99) {
          rr(x, bx, by, bw * fill, bh, 3 * S); x.fillStyle = K.grad(x, bx, by, bx + bw, by + bh, (0.5 + 0.2 * g) * (1 - freed) * a); x.fill();
          x.fillStyle = c(WH, 0.85 * (1 - freed) * a); x.fillRect(bx + 2 * S, by + 3 * S, 2.5 * S, bh - 6 * S);
        }
        if (fill < 0.99 && fill > 0.01) halo(x, bx + bw * fill, by + bh / 2, bh * 1.1, PK, 0.5 * (1 - fill));
        if (freed > 0.01) {
          x.setLineDash(DASH); rr(x, bx, by, bw, bh, 3 * S); x.strokeStyle = c(WH, 0.45 * freed * a); x.stroke(); x.setLineDash(NODASH);
        }
      }
      /* fusion finale : chaque bande redevient un seul bloc libre */
      var mg = ss(MERGE - 0.1, MERGE + 0.2, u) * endFade;
      if (mg > 0.01) for (i = 0; i < ROWS; i++) {
        var my = hTop + i * rg;
        rr(x, hx + 1, my, hw - 2, bh, 3 * S); x.strokeStyle = c(PK, 0.8 * mg); x.stroke();
        halo(x, hx + hw / 2, my + bh / 2, hw * 0.45, PK, 0.12 * mg);
      }
      var mgx = ss(5.4, 5.5, u) * (1 - ss(5.6, 6.1, u));
      if (mgx > 0.01) halo(x, hx + 3.5 * uw, hTop + bh / 2, Math.min(uw * 4, bh * 2.5), PK, 0.45 * mgx);

      /* pile */
      var sx = w * 0.7, sw = w * 0.25, sTop = bTop, ky = bBot;
      var fh = Math.min((ky - 8 * S - sTop) / (5 * 1.12), 24 * S), fg = fh * 1.12;
      x.fillStyle = c(WH, 0.45); x.fillText("stack", sx, sTop - fs * 1.2);
      var topY = sTop, topD = -1, sysOn = 0;
      fsm.use(x, Math.max(7.5, 8.5 * S));
      for (i = 0; i < FRM.length; i++) {
        var F = FRM[i], push = F.a < 0 ? 1 : ss(F.a, F.a + 0.3, u), pop = ss(F.b, F.b + 0.3, u);
        a = push * (1 - pop);
        if (a < 0.01) continue;
        var fy2 = sTop + F.d * fg, fxo = sx + ((1 - push) * 0.35 + pop * 0.25) * sw;
        rr(x, fxo, fy2, sw, fh, 3.5 * S);
        x.fillStyle = F.s ? c(PK, 0.16 * a) : c(WH, (0.05 + 0.03 * F.d) * a); x.fill();
        x.strokeStyle = F.s ? c(PK, 0.8 * a) : c(IR, (0.35 + 0.12 * F.d) * a); x.lineWidth = 1; x.stroke();
        x.fillStyle = c(WH, 0.85 * a); x.fillText(F.n, fxo + 6 * S, fy2 + fh / 2 + 0.5);
        if (F.d >= topD) { topD = F.d; topY = fy2; }
        if (F.s) sysOn = Math.max(sysOn, a);
      }
      fnt.use(x, fs);
      /* pointeur de pile */
      x.fillStyle = c(IR, 0.9);
      x.beginPath(); x.moveTo(sx - 3 * S, topY + fh / 2); x.lineTo(sx - 9 * S, topY + fh / 2 - 4 * S); x.lineTo(sx - 9 * S, topY + fh / 2 + 4 * S); x.closePath(); x.fill();
      /* appel système : la pile parle au noyau */
      var kA = 0.25 + 0.7 * sysOn;
      rr(x, sx, ky - 3 * S, sw, 6 * S, 3 * S); x.fillStyle = c(PK, 0.12 + 0.5 * sysOn); x.fill();
      if (sysOn > 0.01) {
        halo(x, sx + sw / 2, ky, sw * 0.6, PK, 0.35 * sysOn);
        var sy0 = topY + fh, sf = K.frac(t * 1.6);
        x.strokeStyle = c(PK, 0.6 * sysOn); x.setLineDash(DASH); x.beginPath(); x.moveTo(sx + sw * 0.82, sy0); x.lineTo(sx + sw * 0.82, ky - 3 * S); x.stroke(); x.setLineDash(NODASH);
        x.fillStyle = c(WH, sysOn); x.beginPath(); x.arc(sx + sw * 0.82, lerp(sy0, ky - 3 * S, sf), 2 * S, 0, 6.2832); x.fill();
      }
      x.fillStyle = c(sysOn > 0.3 ? PK : WH, 0.3 * kA + 0.25); x.textAlign = "right"; x.fillText("sys", sx - 5 * S, ky); x.textAlign = "start";

      /* pointeur : du cadre courant vers le dernier bloc alloué, saut en arc */
      var cur = -1, prev = -1;
      for (i = 0; i < ORD.length; i++) { if (BL[ORD[i]].ta <= u) { prev = cur; cur = ORD[i]; } }
      var pA = ss(0.35, 0.6, u) * (1 - ss(8.6, 9.0, u));
      if (cur >= 0 && pA > 0.01) {
        b = BL[cur];
        e = ss(b.ta, b.ta + 0.4, u);
        var tx1 = unitX(b.s, hx, uw) + b.l * uw / 2, ty1 = hTop + rowOf(b.s) * rg;
        var tx2 = tx1, ty2 = ty1;
        if (prev >= 0) { var pb = BL[prev]; tx2 = unitX(pb.s, hx, uw) + pb.l * uw / 2; ty2 = hTop + rowOf(pb.s) * rg; }
        var ex = lerp(tx2, tx1, e), ey = lerp(ty2, ty1, e) - Math.sin(Math.PI * e) * bh * 0.6;
        var dangling = ss(b.tf, b.tf + 0.3, u);
        var ox = sx - 11 * S, oy = topY + fh / 2;
        x.lineWidth = 1.4; x.strokeStyle = c(dangling > 0.5 ? WH : PK, (0.85 - 0.45 * dangling) * pA);
        if (dangling > 0.5) x.setLineDash(DASH);
        x.beginPath(); x.moveTo(ox, oy); x.bezierCurveTo(ox - sw * 0.5, oy, ex, ey - bh * 0.9, ex, ey - 4 * S); x.stroke();
        x.setLineDash(NODASH);
        x.fillStyle = c(dangling > 0.5 ? WH : PK, (0.95 - 0.5 * dangling) * pA);
        x.beginPath(); x.moveTo(ex, ey - 1 * S); x.lineTo(ex - 4 * S, ey - 7 * S); x.lineTo(ex + 4 * S, ey - 7 * S); x.closePath(); x.fill();
        x.beginPath(); x.arc(ox, oy, 2.4 * S, 0, 6.2832); x.fill();
        if (e < 0.99) halo(x, ex, ey, 14 * S, PK, 0.6 * (1 - e) * pA);
      }
      x.lineWidth = 1; x.textBaseline = "alphabetic";
    };
  };

  /* ------------------------------------------------------------------ */
  /* arcade : un serpent sur une grille ; le rendu bascule nCurses -> SDL2 -> SFML quand la cartouche change */
  R.arcade = function (r, K) {
    var c = K.c, IR = K.IR, PK = K.PK, WH = K.WH, ss = K.sstep, lerp = K.lerp, clamp = K.clamp, rr = K.rr, halo = K.halo, PI2 = K.PI2, frac = K.frac;
    var GW = 16, GH = 9, P = 12, SEG = 4, LEN = 8;
    var WP = [[2, 1], [13, 1], [13, 4], [9, 4], [9, 7], [2, 7], [2, 1]];
    if (r() < 0.5) for (var m = 0; m < WP.length; m++) WP[m][0] = GW - 1 - WP[m][0];
    var PX = [], PY = [], i;
    for (i = 0; i < WP.length - 1; i++) {
      var ax = WP[i][0], ay = WP[i][1], bx = WP[i + 1][0], by = WP[i + 1][1], n = Math.abs(bx - ax) + Math.abs(by - ay);
      for (var s = 0; s < n; s++) { PX.push(ax + Math.sign(bx - ax) * s); PY.push(ay + Math.sign(by - ay) * s); }
    }
    var L = PX.length, FOOD = [Math.round(L * 0.22), Math.round(L * 0.55), Math.round(L * 0.86)];
    var NAMES = ["ncurses", "sdl2", "sfml"], TAGS = ["nc", "sdl", "sf"], TC = [WH, IR, PK];
    var HB = "+" + new Array(GW + 1).join("-") + "+";
    var fnt = monoFont(), fsm = monoFont();
    var Q = { x: 0, y: 0 };
    function at(sv, o) {
      var a = ((Math.floor(sv) % L) + L) % L, b = (a + 1) % L, f = sv - Math.floor(sv);
      o.x = lerp(PX[a], PX[b], f); o.y = lerp(PY[a], PY[b], f);
    }
    return function (x, w, h, t, g) {
      var u = t - Math.floor(t / P) * P, seg = Math.floor(u / SEG), tau = u - seg * SEG, cur = seg % 3, prv = (seg + 2) % 3;
      var S = Math.min(w / 380, h / 210), port = h > w * 0.8;
      /* écran */
      var sW = port ? w * 0.84 : w * 0.7, sH = port ? h * 0.56 : h * 0.82;
      var cs = Math.floor(Math.min((sW - 16 * S) / (GW + 2), (sH - 26 * S) / (GH + 2)) * 2) / 2;
      var gw = cs * GW, gh = cs * GH, fw = gw + cs * 2 + 14 * S, fh = gh + cs * 2 + 26 * S;
      var fx = port ? (w - fw) / 2 : w * 0.04 + (sW - fw) / 2, fy = port ? h * 0.06 + (sH - fh) / 2 : (h - fh) / 2;
      var gx = fx + (fw - gw) / 2, gy = fy + 18 * S + cs;
      /* fondu de rendu : prv -> cur entre tau 1.0 et 1.6 */
      var mix = ss(1.0, 1.6, tau), al = [0, 0, 0];
      al[cur] += mix; al[prv] += 1 - mix;
      halo(x, fx + fw / 2, fy + fh / 2, Math.max(fw, fh) * 0.6, TC[cur] === WH ? IR : TC[cur], 0.1 + 0.08 * g + 0.15 * (ss(1.0, 1.15, tau) - ss(1.15, 1.8, tau)));
      rr(x, fx, fy, fw, fh, 9 * S); x.fillStyle = c(WH, 0.045); x.fill(); x.lineWidth = 1.2; x.strokeStyle = c(WH, 0.28 + 0.12 * g); x.stroke();
      rr(x, gx - cs, gy - cs, gw + cs * 2, gh + cs * 2, 4 * S); x.fillStyle = c(IR, 0.05); x.fill();
      /* nom de la bibliothèque chargée */
      var lfs = Math.max(7.5, 8.5 * S); fsm.use(x, lfs); x.textBaseline = "middle";
      for (i = 0; i < 3; i++) if (al[i] > 0.01) { x.fillStyle = c(TC[i], 0.85 * al[i]); x.fillText(NAMES[i], fx + 9 * S, fy + 10 * S); }
      x.fillStyle = c(PK, 0.5 + 0.4 * Math.sin(t * 3)); x.beginPath(); x.arc(fx + fw - 10 * S, fy + 10 * S, 2.2 * S, 0, PI2); x.fill();

      var head = u / P * L, hi = Math.floor(head), k, cxp, cyp;
      /* nourriture : chaque pomme vit jusqu'au passage de la tête */
      for (k = 0; k < FOOD.length; k++) if (FOOD[k] > hi) break;
      var food = FOOD[k % FOOD.length], prevF = k === 0 ? FOOD[FOOD.length - 1] - L : FOOD[k - 1];
      var fa = ss(prevF + 0.5, prevF + 1.5, head), eat = 1 - ss(0, 0.8, head - prevF);

      /* style 0 : terminal (caractères) */
      if (al[0] > 0.01) {
        var A0 = al[0], cw = fnt.use(x, cs * 1.05);
        x.textAlign = "center"; x.fillStyle = c(WH, 0.45 * A0);
        x.save(); x.beginPath(); x.rect(gx - cs, gy - cs, gw + cs * 2, gh + cs * 2); x.clip();
        var sxs = (gw + cs * 2) / (HB.length * cw);
        x.save(); x.translate(gx - cs, 0); x.scale(sxs, 1); x.textAlign = "start";
        x.fillText(HB, 0, gy - cs / 2); x.fillText(HB, 0, gy + gh + cs / 2); x.restore();
        for (k = 0; k < GH; k++) { x.fillText("|", gx - cs / 2, gy + k * cs + cs / 2); x.fillText("|", gx + gw + cs / 2, gy + k * cs + cs / 2); }
        x.fillStyle = c(PK, 0.95 * A0 * fa); x.fillText("*", gx + PX[food] * cs + cs / 2, gy + PY[food] * cs + cs * 0.62);
        for (k = LEN - 1; k >= 0; k--) {
          var ci = ((hi - k) % L + L) % L;
          x.fillStyle = c(WH, (k === 0 ? 1 : 0.85 - k * 0.07) * A0);
          x.fillText(k === 0 ? "@" : "o", gx + PX[ci] * cs + cs / 2, gy + PY[ci] * cs + cs * 0.55);
        }
        x.restore(); x.textAlign = "start";
      }
      /* style 1 : pixels pleins */
      if (al[1] > 0.01) {
        var A1 = al[1];
        x.beginPath();
        for (k = 1; k < GW; k++) { x.moveTo(gx + k * cs, gy); x.lineTo(gx + k * cs, gy + gh); }
        for (k = 1; k < GH; k++) { x.moveTo(gx, gy + k * cs); x.lineTo(gx + gw, gy + k * cs); }
        x.strokeStyle = c(IR, 0.1 * A1); x.lineWidth = 1; x.stroke();
        x.strokeStyle = c(IR, 0.7 * A1); x.strokeRect(gx - 0.5, gy - 0.5, gw + 1, gh + 1);
        var pz = Math.max(1, cs * 0.12);
        x.fillStyle = c(PK, 0.95 * A1 * fa);
        x.fillRect(gx + PX[food] * cs + cs * 0.25, gy + PY[food] * cs + cs * 0.25, cs * 0.5, cs * 0.5);
        for (k = LEN - 1; k >= 0; k--) {
          var cj = ((hi - k) % L + L) % L;
          x.fillStyle = k === 0 ? c(WH, A1) : c(IR, (0.95 - k * 0.06) * A1);
          x.fillRect(gx + PX[cj] * cs + pz, gy + PY[cj] * cs + pz, cs - pz * 2, cs - pz * 2);
        }
      }
      /* style 2 : formes lisses avec lueur */
      if (al[2] > 0.01) {
        var A2 = al[2];
        x.strokeStyle = c(PK, 0.35 * A2); x.lineWidth = 1; rr(x, gx, gy, gw, gh, cs * 0.5); x.stroke();
        cxp = gx + PX[food] * cs + cs / 2; cyp = gy + PY[food] * cs + cs / 2;
        halo(x, cxp, cyp, cs * 1.6, PK, 0.45 * A2 * fa);
        x.fillStyle = c(PK, A2 * fa); x.beginPath(); x.arc(cxp, cyp, cs * 0.28 * (0.9 + 0.1 * Math.sin(t * 6)), 0, PI2); x.fill();
        x.beginPath();
        for (k = 0; k <= LEN - 1; k++) {
          at(head - k, Q);
          if (k) x.lineTo(gx + Q.x * cs + cs / 2, gy + Q.y * cs + cs / 2); else x.moveTo(gx + Q.x * cs + cs / 2, gy + Q.y * cs + cs / 2);
        }
        x.lineCap = "round"; x.lineJoin = "round";
        x.lineWidth = cs * 0.95; x.strokeStyle = c(IR, 0.14 * A2); x.stroke();
        at(head, Q); var hx = gx + Q.x * cs + cs / 2, hy = gy + Q.y * cs + cs / 2;
        at(head - LEN + 1, Q);
        x.lineWidth = cs * 0.55; x.strokeStyle = K.grad(x, gx + Q.x * cs, gy + Q.y * cs, hx, hy, 0.95 * A2); x.stroke();
        x.lineCap = "butt"; x.lineJoin = "miter"; x.lineWidth = 1;
        halo(x, hx, hy, cs * 1.4, WH, 0.35 * A2 + 0.15 * g * A2);
        x.fillStyle = c(WH, A2); x.beginPath(); x.arc(hx, hy, cs * 0.3, 0, PI2); x.fill();
      }
      /* bouchée */
      if (eat > 0.01) {
        var pf = (prevF + L) % L;
        halo(x, gx + PX[pf] * cs + cs / 2, gy + PY[pf] * cs + cs / 2, cs * (3 - 2 * eat), PK, 0.4 * eat);
      }

      /* fente et cartouches */
      var cw2 = port ? 56 * S : 44 * S, ch2 = port ? 34 * S : 58 * S;
      var slotX = port ? w / 2 : Math.min((fx + fw + w) / 2 - cw2 * 0.15, w - cw2 * 1.15), slotY = port ? fy + fh + 10 * S : h / 2;
      /* bus permanent entre l'écran et la fente */
      x.beginPath();
      if (port) { x.moveTo(slotX, fy + fh); x.lineTo(slotX, slotY - 3 * S); } else { x.moveTo(fx + fw, slotY); x.lineTo(slotX - cw2 / 2 - 4 * S, slotY); }
      x.strokeStyle = c(WH, 0.18 + 0.1 * g); x.lineWidth = 1; x.stroke();
      x.lineWidth = 1;
      if (port) { rr(x, slotX - cw2 * 0.6, slotY - 3 * S, cw2 * 1.2, 6 * S, 3 * S); } else { rr(x, slotX - cw2 / 2 - 4 * S, slotY - ch2 * 0.6, 6 * S, ch2 * 1.2, 3 * S); }
      var plug = ss(1.0, 1.1, tau) * (1 - ss(1.1, 1.7, tau));
      x.fillStyle = c(WH, 0.08 + 0.3 * plug); x.fill(); x.strokeStyle = c(WH, 0.3 + 0.5 * plug); x.stroke();
      if (plug > 0.01) halo(x, port ? slotX : slotX - cw2 / 2, slotY, 24 * S, TC[cur] === WH ? IR : TC[cur], 0.6 * plug);
      /* liaison dlopen entre fente et écran */
      var link = ss(1.0, 1.2, tau) * (1 - ss(1.2, 1.9, tau));
      if (link > 0.01) {
        var lf = ss(1.0, 1.5, tau);
        var lx0 = port ? slotX : slotX - cw2 / 2 - 4 * S, ly0 = port ? slotY - 3 * S : slotY, lx1 = port ? slotX : fx + fw, ly1 = port ? fy + fh : slotY;
        x.fillStyle = c(WH, link); x.beginPath(); x.arc(lerp(lx0, lx1, lf), lerp(ly0, ly1, lf), 2.4 * S, 0, PI2); x.fill();
      }
      for (i = 0; i < 2; i++) {
        var id = i === 0 ? prv : cur, out = i === 0 ? ss(0.0, 0.5, tau) : 0, inn = i === 1 ? ss(0.45, 1.05, tau) : 1;
        if (i === 0 && out > 0.99) continue;
        var off = i === 0 ? out : 1 - inn, ca = i === 0 ? 1 - out : clamp(inn * 2, 0, 1);
        var crx, cry;
        if (port) { crx = slotX - cw2 / 2; cry = slotY + 2 * S + off * ch2 * 1.6; }
        else { crx = slotX - cw2 / 2 + off * cw2 * 1.4; cry = slotY - ch2 / 2; }
        x.save(); x.beginPath();
        if (port) x.rect(0, slotY, w, h - slotY); else x.rect(slotX - cw2 / 2, 0, w - (slotX - cw2 / 2), h);
        x.clip();
        rr(x, crx, cry, cw2, ch2, 4 * S); x.fillStyle = c(WH, 0.08 * ca); x.fill(); x.strokeStyle = c(TC[id] === WH ? WH : TC[id], 0.75 * ca); x.stroke();
        x.fillStyle = c(TC[id], 0.6 * ca);
        if (port) x.fillRect(crx + 4 * S, cry + 4 * S, cw2 - 8 * S, 4 * S); else x.fillRect(crx + cw2 - 9 * S, cry + 5 * S, 4 * S, ch2 - 10 * S);
        x.fillStyle = c(WH, 0.12 * ca);
        for (k = 0; k < 3; k++) {
          if (port) x.fillRect(crx + 6 * S + k * (cw2 - 12 * S) / 3, cry + ch2 - 6 * S, (cw2 - 12 * S) / 3 - 2 * S, 3 * S);
          else x.fillRect(crx + 2 * S, cry + 6 * S + k * (ch2 - 12 * S) / 3, 3 * S, (ch2 - 12 * S) / 3 - 2 * S);
        }
        x.fillStyle = c(WH, 0.85 * ca); x.textAlign = "center";
        x.fillText(TAGS[id], port ? crx + cw2 / 2 : crx + (cw2 - 8 * S) / 2 + 1 * S, port ? cry + ch2 * 0.58 : cry + ch2 / 2);
        x.textAlign = "start";
        x.restore();
      }
      x.textBaseline = "alphabetic"; x.lineWidth = 1;
    };
  };
})();
