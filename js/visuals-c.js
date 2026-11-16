(function () {
  var R = (window.PROJECT_VIZ = window.PROJECT_VIZ || {});

  /* =========================================================================
     raytracer : une caméra à gauche projette des rayons à travers une grille
     de pixels (le plan image), vers une scène (sphère + sol + lumière).
     Chaque rayon touche la sphère, repart en rayon d'ombre vers la lumière,
     et le pixel correspondant s'allume. L'image se peint ligne par ligne,
     puis l'écran se vide et tout recommence.
     ====================================================================== */
  R["raytracer"] = function (r, K) {
    var GX = 7, GY = 6;               // résolution du plan image (petite grille)
    // couleur pré-calculée de chaque pixel une fois la scène résolue
    var shade = new Array(GX * GY);
    // géométrie de scène en coordonnées normalisées (établie dans la fabrique)
    var sphR = 0.135, sphX = 0.72, sphY = 0.52;
    var lightX = 0.82, lightY = 0.15;
    var floorY = 0.82;
    var camXn = 0.055, camYn = 0.50;
    var planeXn = 0.21, planeMidY = 0.47;
    // ordre de balayage : ligne par ligne, de haut en bas
    var order = new Array(GX * GY);
    for (var yy = 0; yy < GY; yy++) for (var xx = 0; xx < GX; xx++) order[yy * GX + xx] = yy * GX + xx;
    var jx = 0.5 + (r() - 0.5) * 0.1; // léger décalage déterministe (inutilisé hors graine)
    var DASH = [3, 3], NODASH = [];

    return function draw(x, w, h, t, g) {
      var camX = w * camXn, camY = h * camYn;
      var mn0 = Math.min(w, h);
      var cell = K.clamp(mn0 * 0.052, 9, 26); // cellules carrées, taille bornée
      var planeW = cell * GX, planeH = cell * GY;
      var pX = w * planeXn, pTop = h * planeMidY - planeH / 2, pBot = pTop + planeH;
      var cellX = cell, cellW = cell;
      var sx = w * sphX, sy = h * sphY, S = Math.min(w, h) * sphR;
      var lx = w * lightX, ly = h * lightY;
      var fY = h * floorY;

      // --- sol ---
      x.strokeStyle = K.c(K.WH, 0.12 + 0.06 * g);
      x.lineWidth = 1; x.beginPath(); x.moveTo(0, fY); x.lineTo(w, fY); x.stroke();

      // --- sphère (ombrée, discrète pour ne pas écraser les rayons) ---
      var gr = x.createRadialGradient(sx - S * 0.4, sy - S * 0.45, S * 0.1, sx, sy, S);
      gr.addColorStop(0, K.c(K.WH, 0.55)); gr.addColorStop(0.4, K.c(K.IR, 0.5)); gr.addColorStop(1, K.c(K.PK, 0.22));
      x.fillStyle = gr; x.beginPath(); x.arc(sx, sy, S, 0, K.PI2); x.fill();
      x.strokeStyle = K.c(K.IR, 0.3 + 0.2 * g); x.stroke();

      // --- lumière ---
      K.halo(x, lx, ly, 34, K.PK, 0.5 + 0.25 * g);
      x.fillStyle = K.c(K.WH, 1); x.beginPath(); x.arc(lx, ly, 3.6, 0, K.PI2); x.fill();

      // --- caméra (petit boîtier + objectif) ---
      K.halo(x, camX, camY, 26, K.IR, 0.2 + 0.15 * g);
      K.rr(x, camX - 10, camY - 11, 20, 22, 4); x.fillStyle = K.c(K.WH, 0.08); x.fill();
      x.strokeStyle = K.c(K.IR, 0.8); x.lineWidth = 1.4; x.stroke();
      x.beginPath(); x.moveTo(camX + 10, camY - 6); x.lineTo(camX + 18, camY - 11); x.lineTo(camX + 18, camY + 11); x.lineTo(camX + 10, camY + 6); x.closePath();
      x.fillStyle = K.c(K.WH, 0.1); x.fill(); x.stroke();

      // --- plan image : grille de pixels ---
      var i, gxX, gyY, cx, cy, nrows;
      var total = GX * GY;
      var cyc = (t * 0.085) % 1.30;         // boucle ~15 s, puis pause/vidage
      var prog = K.clamp(cyc / 1.0, 0, 1.08);
      var done = prog * total;               // pixels résolus jusqu'ici
      nrows = Math.ceil(done / GX);
      var fade = 1 - K.sstep(1.02, 1.28, cyc); // tout s'efface en fin de boucle

      x.lineWidth = 1;
      x.strokeStyle = K.c(K.WH, 0.09 + 0.05 * g);
      for (i = 0; i <= GX; i++) { var gxp = pX + i * cellX; x.beginPath(); x.moveTo(gxp, pTop); x.lineTo(gxp, pBot); x.stroke(); }
      for (i = 0; i <= GY; i++) { var gyp = pTop + i * cellW; x.beginPath(); x.moveTo(pX, gyp); x.lineTo(pX + planeW, gyp); x.stroke(); }

      // pixels déjà peints
      for (i = 0; i < total; i++) {
        if (i >= done) continue;
        gxX = i % GX; gyY = (i / GX) | 0;
        var app = K.clamp(done - i, 0, 1) * fade;
        var px = pX + gxX * cellX, py = pTop + gyY * cellW;
        // couleur du pixel = intensité selon la position (centre = sphère éclairée)
        var ndx = (gxX + 0.5) / GX - 0.52, ndy = (gyY + 0.5) / GY - 0.46;
        var hit = ndx * ndx * 1.1 + ndy * ndy < 0.11; // pixels couvrant la sphère
        var inten = hit ? 0.35 + 0.55 * Math.exp(-(ndx * ndx + ndy * ndy) * 7) : 0.12;
        x.fillStyle = hit ? K.grad(x, px, py, px + cellX, py + cellW, inten * app)
                          : K.c(K.WH, (0.08 + 0.05 * inten) * app);
        x.fillRect(px + 0.6, py + 0.6, cellX - 1.2, cellW - 1.2);
      }

      // --- rayon en cours : de la caméra, par le pixel courant, vers la sphère,
      //     puis rayon d'ombre vers la lumière ---
      if (done < total && fade > 0.5) {
        var cur = Math.min(total - 1, Math.floor(done));
        gxX = cur % GX; gyY = (cur / GX) | 0;
        var ppx = pX + (gxX + 0.5) * cellX, ppy = pTop + (gyY + 0.5) * cellW;
        // direction caméra -> pixel, prolongée jusqu'à l'intersection sphère
        var dx = ppx - camX, dy = ppy - camY, dl = Math.hypot(dx, dy); dx /= dl; dy /= dl;
        var fx = camX - sx, fy = camY - sy;
        var bq = fx * dx + fy * dy, cq = fx * fx + fy * fy - S * S, disc = bq * bq - cq;
        var hx, hy;
        if (disc > 0) { var th = -bq - Math.sqrt(disc); hx = camX + dx * th; hy = camY + dy * th; }
        else { hx = sx; hy = sy; }
        // rayon primaire
        x.strokeStyle = K.grad(x, camX, camY, hx, hy, 0.85);
        x.lineWidth = 2; x.beginPath(); x.moveTo(camX, camY); x.lineTo(ppx, ppy); x.lineTo(hx, hy); x.stroke();
        // marqueur sur le pixel visé
        K.halo(x, ppx, ppy, 9, K.IR, 0.7);
        // rayon d'ombre vers la lumière
        x.strokeStyle = K.c(K.PK, 0.75); x.lineWidth = 1.4;
        x.beginPath(); x.moveTo(hx, hy);
        x.setLineDash(DASH); x.lineTo(lx, ly); x.stroke(); x.setLineDash(NODASH);
        K.halo(x, hx, hy, 12, K.PK, 0.6);
      }
      x.lineWidth = 1;
    };
  };

  /* =========================================================================
     interstonar : ray marching. Depuis un œil à gauche, un rayon avance par
     sauts ; chaque saut est un cercle dont le rayon vaut la distance à la
     surface la plus proche (sphere tracing). Les cercles rétrécissent jusqu'au
     contact. La cible : deux corps qui se rapprochent et fusionnent (union
     adoucie, smooth-min). Plusieurs rayons se succèdent.
     ====================================================================== */
  R["interstonar"] = function (r, K) {
    var eyeXn = 0.08, eyeYn = 0.5 + (r() - 0.5) * 0.08;
    var bYn = 0.5 + (r() - 0.5) * 0.06;
    var rA = 0.11, rB = 0.085;
    var rays = 5;                      // directions de rayon testées en séquence
    var dirs = new Array(rays);
    for (var i = 0; i < rays; i++) dirs[i] = (i / (rays - 1) - 0.5) * 0.52;
    var MAXS = 9;                      // sauts max par rayon
    var EPS = 0.004;
    var AIM = [2, 5], NODASH2 = [];

    return function draw(x, w, h, t, g) {
      var ex = w * eyeXn, ey = h * eyeYn;
      var mn = Math.min(w, h);
      var RA = mn * rA, RB = mn * rB;
      // deux corps : écartement qui oscille entre séparés et fusionnés
      var cyc = (t * 0.11) % 1;         // boucle ~9 s
      var merge = 0.5 - 0.5 * Math.cos(cyc * K.PI2); // 0 séparés -> 1 fusionnés
      var sep = K.lerp(mn * 0.28, mn * 0.055, merge);
      var cxA = w * 0.66, cyA = h * bYn - sep * 0.5;
      var cxB = w * 0.66, cyB = h * bYn + sep * 0.5;
      var kSmooth = mn * 0.10;          // rayon d'adoucissement de l'union

      // champ de distance signée : smooth-min de deux sphères
      function sdf(px, py) {
        var dA = Math.hypot(px - cxA, py - cyA) - RA;
        var dB = Math.hypot(px - cxB, py - cyB) - RB;
        var hh = K.clamp(0.5 + 0.5 * (dB - dA) / kSmooth, 0, 1);
        return K.lerp(dB, dA, hh) - kSmooth * hh * (1 - hh);
      }

      // --- rendu de la forme fusionnée (contour échantillonné, peu de traits) ---
      // on dessine les deux corps avec un halo + un liant quand ils fusionnent
      K.halo(x, cxA, cyA, RA * 2.4, K.IR, 0.18 + 0.1 * g);
      K.halo(x, cxB, cyB, RB * 2.4, K.PK, 0.16 + 0.1 * g);
      var grA = x.createRadialGradient(cxA - RA * 0.4, cyA - RA * 0.4, RA * 0.1, cxA, cyA, RA);
      grA.addColorStop(0, K.c(K.WH, 0.9)); grA.addColorStop(1, K.c(K.IR, 0.5));
      var grB = x.createRadialGradient(cxB - RB * 0.4, cyB - RB * 0.4, RB * 0.1, cxB, cyB, RB);
      grB.addColorStop(0, K.c(K.WH, 0.9)); grB.addColorStop(1, K.c(K.PK, 0.5));
      // liant : une capsule qui apparaît avec la fusion
      if (merge > 0.25) {
        var ba = K.sstep(0.25, 0.7, merge);
        x.strokeStyle = K.c(K.WH, 0.14 * ba); x.lineWidth = (RA + RB) * (0.5 + 0.9 * merge);
        x.lineCap = "round"; x.beginPath(); x.moveTo(cxA, cyA); x.lineTo(cxB, cyB); x.stroke();
        x.lineCap = "butt"; x.lineWidth = 1;
      }
      x.fillStyle = grA; x.beginPath(); x.arc(cxA, cyA, RA, 0, K.PI2); x.fill();
      x.fillStyle = grB; x.beginPath(); x.arc(cxB, cyB, RB, 0, K.PI2); x.fill();

      // --- œil ---
      K.halo(x, ex, ey, 22, K.IR, 0.25 + 0.15 * g);
      x.fillStyle = K.c(K.WH, 0.95); x.beginPath(); x.arc(ex, ey, 4, 0, K.PI2); x.fill();
      x.strokeStyle = K.c(K.IR, 0.5); x.lineWidth = 1; x.beginPath(); x.arc(ex, ey, 7, 0, K.PI2); x.stroke();

      // --- ray marching : un rayon actif à la fois, qui avance saut par saut ---
      var rayPhase = (t * 0.33);        // avance des sauts
      var active = Math.floor(rayPhase) % rays;
      var stepF = K.frac(rayPhase);     // progression dans la marche courante
      var ang = dirs[active];
      var dx = Math.cos(ang), dy = Math.sin(ang);

      // ligne de visée discrète
      x.strokeStyle = K.c(K.WH, (0.1 + 0.06 * g) * K.sstep(0, 0.08, stepF) * (1 - K.sstep(0.84, 1, stepF))); x.lineWidth = 1;
      x.setLineDash(AIM); x.beginPath(); x.moveTo(ex, ey); x.lineTo(ex + dx * w, ey + dy * w); x.stroke(); x.setLineDash(NODASH2);

      // sphere tracing : positions successives
      var px = ex, py = ey, hit = false, s;
      /* les sauts se révèlent sur 80 % de la marche, puis le rayon s'estompe avant le suivant (aucune coupure) */
      var shown = Math.ceil(Math.min(1, stepF / 0.8) * MAXS); // combien de cercles révélés
      var rayA = 1 - K.sstep(0.84, 1, stepF);
      for (s = 0; s < MAXS; s++) {
        var d = sdf(px, py);
        if (d < EPS) { hit = true; }
        var revealed = s < shown;
        if (revealed && d > 0) {
          var a = (0.7 - s * 0.055) * (0.6 + 0.4 * g);
          // cercle de distance : rayon = distance à la surface
          x.strokeStyle = K.c(K.IR, Math.max(0.12, a) * rayA);
          x.lineWidth = 1; x.beginPath(); x.arc(px, py, Math.max(2, d), 0, K.PI2); x.stroke();
          // point de l'échantillon
          x.fillStyle = K.c(K.WH, (0.8 * a + 0.2) * rayA); x.beginPath(); x.arc(px, py, 2.2, 0, K.PI2); x.fill();
        }
        if (hit) {
          if (revealed) { K.halo(x, px, py, 16, K.PK, 0.7 * rayA); x.fillStyle = K.c(K.WH, rayA); x.beginPath(); x.arc(px, py, 3, 0, K.PI2); x.fill(); }
          break;
        }
        px += dx * d; py += dy * d;
      }
      x.lineWidth = 1;
    };
  };

  /* =========================================================================
     houndlabs : graphe Active Directory (BloodHound). Nœuds typés : utilisateurs
     (cercles), machines (carrés), groupes (hexagones), contrôleur de domaine
     (losange plus grand). Un chemin d'attaque se découvre arête par arête
     depuis un compte de départ jusqu'au DC ; chaque nœud compromis passe au
     rose avec une onde. À la fin le chemin reste allumé, s'éteint, puis un
     autre chemin est exploré.
     ====================================================================== */
  R["houndlabs"] = function (r, K) {
    // disposition en couches de gauche (compte de départ) à droite (DC)
    var TYPES = ["user", "machine", "group", "user", "machine"];
    var layers = 5;
    var nodes = [];
    var perLayer = [1, 3, 3, 3, 1]; // le DC est seul en dernière couche
    var idByLayer = [];
    var k, li, ni;
    for (li = 0; li < layers; li++) {
      idByLayer[li] = [];
      var cnt = perLayer[li];
      for (ni = 0; ni < cnt; ni++) {
        var ty = li === 0 ? "user" : li === layers - 1 ? "dc" : TYPES[(r() * TYPES.length) | 0];
        var yy = cnt === 1 ? 0.5 : 0.22 + 0.56 * ni / (cnt - 1) + (r() - 0.5) * 0.04;
        var id = nodes.length;
        nodes.push({ x: 0.1 + 0.8 * li / (layers - 1), y: yy, type: ty, layer: li });
        idByLayer[li].push(id);
      }
    }
    // arêtes : chaque nœud relié à 1-2 nœuds de la couche suivante
    var edges = [];
    for (li = 0; li < layers - 1; li++) {
      for (var a = 0; a < idByLayer[li].length; a++) {
        var from = idByLayer[li][a];
        var nx = idByLayer[li + 1];
        var links = 1 + (r() < 0.5 ? 1 : 0);
        for (var e = 0; e < links; e++) {
          var to = nx[(r() * nx.length) | 0];
          var kk = from + "-" + to;
          if (!edges.some(function (q) { return q.k === kk; })) edges.push({ k: kk, a: from, b: to });
        }
      }
    }
    // construit 2 chemins d'attaque distincts (départ -> ... -> DC) par BFS glouton
    function buildPath(seed) {
      var rr2 = seed;
      var cur = idByLayer[0][0], path = [cur];
      for (li = 0; li < layers - 1; li++) {
        var outs = edges.filter(function (q) { return q.a === cur; });
        if (!outs.length) break;
        rr2 = (rr2 * 1103515245 + 12345) & 0x7fffffff;
        cur = outs[rr2 % outs.length].b;
        path.push(cur);
      }
      return path;
    }
    var paths = [buildPath((r() * 1e6) | 0), buildPath((r() * 1e6) | 0)];

    /* format haut : les couches s'écartent verticalement pour occuper le cadre */
    var HY = 0, KY = 1;
    function Y(v) { return HY * (0.5 + (v - 0.5) * KY); }

    function drawNode(x, K, n, px, py, sz, lit, g) {
      var col = lit > 0.02 ? K.PK : K.IR;
      if (lit > 0.3) K.halo(x, px, py, sz * (n.type === "dc" ? 3 : 2.2), K.PK, 0.4 * lit);
      x.fillStyle = K.c(K.WH, 0.07 + 0.12 * lit);
      x.strokeStyle = lit > 0.02 ? K.c(K.PK, 0.5 + 0.5 * lit) : K.c(K.WH, 0.3 + 0.1 * g);
      x.lineWidth = 1.4;
      if (n.type === "user") { x.beginPath(); x.arc(px, py, sz, 0, K.PI2); x.fill(); x.stroke(); }
      else if (n.type === "machine") { K.rr(x, px - sz, py - sz, sz * 2, sz * 2, 3); x.fill(); x.stroke(); }
      else if (n.type === "group") {
        x.beginPath();
        for (var s = 0; s < 6; s++) { var an = Math.PI / 6 + s * K.PI2 / 6; var qx = px + Math.cos(an) * sz * 1.15, qy = py + Math.sin(an) * sz * 1.15; if (s === 0) x.moveTo(qx, qy); else x.lineTo(qx, qy); }
        x.closePath(); x.fill(); x.stroke();
      } else { // dc : losange plus grand
        x.save(); x.translate(px, py); x.rotate(Math.PI / 4);
        var d2 = sz * 1.5; K.rr(x, -d2, -d2, d2 * 2, d2 * 2, 3); x.fill(); x.stroke(); x.restore();
      }
    }

    return function draw(x, w, h, t, g) {
      var mn = Math.min(w, h), sz = mn * 0.028;
      HY = h; KY = h > w * 0.8 ? 1.35 : 1;
      // boucle : découverte (par arête) -> maintien -> extinction -> chemin suivant
      var perPath = 6.0;                         // ~6 s par chemin -> 12 s total
      var gt = (t % (perPath * paths.length));
      var pIdx = Math.floor(gt / perPath) % paths.length;
      var local = gt - pIdx * perPath;           // 0..perPath
      var path = paths[pIdx];
      var steps = path.length - 1;
      // phases : reveal (0..steps*rev), hold, fade
      var revTime = 0.75;                        // s par arête
      var head = K.clamp(local / revTime, 0, steps + 0.001);
      var holdEnd = steps * revTime + 1.4;
      var fade = local < holdEnd ? 1 : 1 - K.sstep(holdEnd, perPath - 0.3, local);

      // --- toutes les arêtes (fond) ---
      x.lineWidth = 1;
      for (k = 0; k < edges.length; k++) {
        var A = nodes[edges[k].a], B = nodes[edges[k].b];
        x.strokeStyle = K.c(K.WH, 0.1 + 0.06 * g);
        x.beginPath(); x.moveTo(A.x * w, Y(A.y)); x.lineTo(B.x * w, Y(B.y)); x.stroke();
      }

      // --- arêtes du chemin, révélées une à une ---
      for (k = 0; k < steps; k++) {
        var f = K.clamp(head - k, 0, 1) * fade;
        if (f <= 0) continue;
        var na = nodes[path[k]], nb = nodes[path[k + 1]];
        var ax = na.x * w, ay = Y(na.y), bx2 = nb.x * w, by2 = Y(nb.y);
        var ex2 = K.lerp(ax, bx2, f), ey2 = K.lerp(ay, by2, f);
        x.lineWidth = 2.4; x.strokeStyle = K.grad(x, ax, ay, bx2, by2, fade);
        x.beginPath(); x.moveTo(ax, ay); x.lineTo(ex2, ey2); x.stroke();
        x.lineWidth = 6; x.strokeStyle = K.c(K.PK, 0.1 * fade); x.stroke();
        // onde sur le nœud fraîchement atteint
        if (f > 0.02 && f < 1) {
          var wv = sz * (1 + f * 3);
          x.lineWidth = 1.5; x.strokeStyle = K.c(K.PK, (1 - f) * 0.6 * fade);
          x.beginPath(); x.arc(bx2, by2, wv, 0, K.PI2); x.stroke();
        }
      }
      x.lineWidth = 1;

      // --- nœuds ---
      for (k = 0; k < nodes.length; k++) {
        var n = nodes[k];
        var pi = path.indexOf(k);
        var lit = pi >= 0 ? K.clamp(head - pi + 0.2, 0, 1) * fade : 0;
        drawNode(x, K, n, n.x * w, Y(n.y), sz, lit, g);
      }
      x.lineWidth = 1;
    };
  };

  /* =========================================================================
     juice-shop : CTF web. Un champ de formulaire où se tape une injection
     courte ( ' OR 1=1 -- ), le champ vire au rose, un cadenas s'ouvre, puis
     un JWT à trois segments colorés se déplie et son segment central se décode
     en petites lignes. Un compteur de drapeaux gagne une unité.
     ====================================================================== */
  R["juice-shop"] = function (r, K) {
    var payload = "' OR 1=1 --";
    var MONO = "500 11px 'Martian Mono', ui-monospace, monospace";
    var flagsBase = 2 + ((r() * 3) | 0);
    var COLS = [K.IR, K.PK, K.WH];
    var SUB = [], LABELS = ["hdr", "payload", "sig"], SEGS = [0.26, 0.4, 0.34];
    for (var q = 0; q <= payload.length; q++) SUB.push(payload.slice(0, q));

    return function draw(x, w, h, t, g) {
      var cyc = (t * 0.1) % 1;           // boucle ~10 s
      // phases : frappe (0-0.28) -> validation/champ rose + cadenas (0.28-0.45)
      //          -> JWT se déplie (0.45-0.7) -> décodage (0.7-0.9) -> reset
      var typeP = K.sstep(0, 0.26, cyc);
      var okP = K.sstep(0.28, 0.42, cyc);
      var unlockP = K.sstep(0.3, 0.46, cyc);
      var jwtP = K.sstep(0.46, 0.68, cyc);
      var decodeP = K.sstep(0.7, 0.9, cyc);
      var flagP = K.sstep(0.84, 0.92, cyc) * (1 - K.sstep(0.97, 1, cyc));

      /* fin de boucle : tout s'estompe avant la reprise (pas de saut du champ rose au champ vide) */
      var out = 1 - K.sstep(0.92, 0.99, cyc);
      var okE = okP * out, unE = unlockP * out;
      var mn = Math.min(w, h);
      var fieldW = w * 0.52, fieldH = Math.max(22, mn * 0.12);
      var fieldX = w * 0.1, fieldY = h * 0.2;

      // --- champ de saisie : contour pervenche qui vire au rose ---
      if (okE > 0.01) K.halo(x, fieldX + fieldW / 2, fieldY + fieldH / 2, fieldW * 0.55, K.PK, 0.12 * okE);
      K.rr(x, fieldX, fieldY, fieldW, fieldH, 6);
      x.fillStyle = K.c(K.WH, 0.04 + 0.03 * okE);
      x.fill();
      x.lineWidth = 1.5;
      if (okE < 0.99) { x.strokeStyle = K.c(K.IR, (0.4 + 0.3 * g) * (1 - okE)); x.stroke(); }
      if (okE > 0.01) { x.strokeStyle = K.c(K.PK, 0.5 + 0.5 * okE); x.globalAlpha = okE; x.stroke(); x.globalAlpha = 1; }

      // texte saisi (sous-chaîne selon la progression de frappe)
      var nch = Math.round(payload.length * typeP);
      var shown = SUB[nch];
      x.font = MONO; x.textBaseline = "middle";
      if (okE < 0.99) { x.fillStyle = K.c(K.WH, 0.9 * (1 - okP) * out); x.fillText(shown, fieldX + 10, fieldY + fieldH / 2); }
      if (okE > 0.01) { x.fillStyle = K.c(K.PK, 0.95 * okE); x.fillText(shown, fieldX + 10, fieldY + fieldH / 2); }
      // curseur clignotant pendant la frappe
      if (typeP < 1 && typeP > 0) {
        var cwid = x.measureText(shown).width;
        if (Math.sin(t * 8) > 0) { x.fillStyle = K.c(K.WH, 0.7); x.fillRect(fieldX + 11 + cwid, fieldY + fieldH * 0.25, 2, fieldH * 0.5); }
      }

      // --- cadenas à droite du champ : blanc fermé, rose ouvert (fondu entre les deux) ---
      var lkx = fieldX + fieldW + mn * 0.07, lky = fieldY + fieldH / 2, ls = mn * 0.05;
      if (unE > 0.01) K.halo(x, lkx, lky, ls * 2.4, K.PK, 0.3 * K.sstep(0.3, 1, unE));
      var open = unE;
      x.lineWidth = 1.6;
      for (var pass = 0; pass < 2; pass++) {
        var wgt = pass ? unE : 1 - unE;
        if (wgt < 0.01) continue;
        x.globalAlpha = wgt;
        x.strokeStyle = pass ? K.c(K.PK, 0.9) : K.c(K.WH, 0.4 + 0.2 * g);
        x.fillStyle = K.c(K.WH, 0.06);
        K.rr(x, lkx - ls * 0.75, lky - ls * 0.1, ls * 1.5, ls * 1.3, 3); x.fill(); x.stroke();
        // anse : pivote à l'ouverture
        x.save(); x.translate(lkx - ls * 0.45, lky - ls * 0.1);
        x.rotate(-open * 0.6);
        x.beginPath(); x.arc(ls * 0.45, 0, ls * 0.5, Math.PI, K.PI2); x.stroke();
        x.restore();
        // trou de serrure
        x.fillStyle = pass ? K.c(K.PK, 0.9) : K.c(K.WH, 0.4);
        x.beginPath(); x.arc(lkx, lky + ls * 0.45, ls * 0.14, 0, K.PI2); x.fill();
      }
      x.globalAlpha = 1;

      // emplacement du jeton, discret tant qu'il n'est pas déplié (évite une moitié basse vide)
      var jy = h * 0.58, jh = Math.max(16, mn * 0.09), jx0 = w * 0.1, fullW = w * 0.8;
      K.rr(x, jx0, jy, fullW, jh, 4);
      x.lineWidth = 1; x.strokeStyle = K.c(K.WH, (0.07 + 0.04 * g) * (1 - jwtP * out)); x.stroke();

      // --- JWT à trois segments ---
      if (jwtP > 0.01 && out > 0.01) {
        x.globalAlpha = out;
        var segs = SEGS;   // header / payload / signature
        var cols = COLS;
        var gap = 6;
        var grown = jwtP;
        var cx = jx0;
        x.font = MONO; x.textBaseline = "middle";
        var labels = LABELS;
        for (var si = 0; si < 3; si++) {
          var sw = (fullW - gap * 2) * segs[si] * grown;
          K.rr(x, cx, jy, sw, jh, 4);
          x.fillStyle = K.c(cols[si], 0.14 + (si === 1 ? 0.06 : 0));
          x.fill();
          x.lineWidth = 1.2; x.strokeStyle = K.c(cols[si], 0.6 + 0.3 * g); x.stroke();
          if (sw > 24) {
            x.fillStyle = K.c(cols[si], 0.85);
            x.save(); K.rr(x, cx, jy, sw, jh, 4); x.clip();
            x.fillText(labels[si], cx + 6, jy + jh / 2); x.restore();
          }
          // segment central qui se décode en petites lignes
          if (si === 1 && decodeP > 0.02) {
            var dx0 = cx + 4, dy0 = jy + jh + 8;
            for (var ln = 0; ln < 3; ln++) {
              var la = K.clamp(decodeP * 3 - ln, 0, 1);
              if (la <= 0) continue;
              var lw2 = sw * (ln === 2 ? 0.5 : 0.85) * la;
              K.rr(x, dx0, dy0 + ln * 8, lw2, 3.5, 2);
              x.fillStyle = K.c(K.PK, 0.55 * la); x.fill();
            }
          }
          cx += sw + gap * grown;
        }
        x.globalAlpha = 1;
      }

      // --- compteur de drapeaux ---
      var fcx = w * 0.84, fcy = h * 0.2;
      // petit fanion
      x.strokeStyle = K.c(K.WH, 0.4 + 0.2 * g); x.lineWidth = 1.4;
      x.beginPath(); x.moveTo(fcx, fcy - mn * 0.06); x.lineTo(fcx, fcy + mn * 0.05); x.stroke();
      var flagLit = flagP;
      x.fillStyle = flagLit > 0.1 ? K.c(K.PK, 0.85) : K.c(K.WH, 0.14);
      x.beginPath(); x.moveTo(fcx, fcy - mn * 0.06); x.lineTo(fcx + mn * 0.07, fcy - mn * 0.035); x.lineTo(fcx, fcy - mn * 0.01); x.closePath(); x.fill();
      if (flagLit > 0.2) K.halo(x, fcx, fcy - mn * 0.035, mn * 0.09, K.PK, 0.4 * flagLit);
      // valeur du compteur
      x.font = MONO; x.textBaseline = "middle"; x.textAlign = "center";
      var val = flagsBase + (flagP > 0.3 ? 1 : 0);
      x.fillStyle = flagLit > 0.2 ? K.c(K.PK, 0.95) : K.c(K.WH, 0.6);
      x.fillText(String(val), fcx + mn * 0.035, fcy + mn * 0.05);
      x.textAlign = "left";
      x.lineWidth = 1;
    };
  };
})();
