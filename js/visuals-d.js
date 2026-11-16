/* Visuel par projet (lot D) : aws-microservices, formation AWS (architecture en microservices) et hackathon AWS.
   Contrat : voir VISUALS.md. */
(function () {
  var R = (window.PROJECT_VIZ = window.PROJECT_VIZ || {});

  R["aws-microservices"] = function (r, K) {
    var PI = Math.PI;
    var LOOP = 11;
    var CX = 128, CY = 44;
    var boxes = [
      { x: 58, y: 96, from: 0.06 },
      { x: 110, y: 96, from: 0.15 },
      { x: 162, y: 96, from: 0.24 }
    ];
    var BOXW = 36, BOXH = 26;
    var DBX = 128, DBY = 168, DBFROM = 0.34;
    var phase = [r(), r(), r()];
    var RX = 300, RY = 78, RR = 34;
    var BARS = 6;
    var FONT = "500 10px 'Martian Mono', ui-monospace, monospace";
    var FONTBIG = "600 13px 'Martian Mono', ui-monospace, monospace";

    function cloud(x) {
      x.beginPath();
      x.arc(CX - 22, CY + 8, 11, PI * 0.5, PI * 1.5);
      x.arc(CX - 6, CY - 4, 14, PI, PI * 1.75);
      x.arc(CX + 14, CY - 1, 12, PI * 1.25, PI * 0.1);
      x.arc(CX + 22, CY + 9, 10, PI * 1.5, PI * 0.5);
      x.closePath();
    }

    function packet(x, x0, y0, x1, y1, p, rgb, a) {
      var px = K.lerp(x0, x1, p), py = K.lerp(y0, y1, p);
      K.halo(x, px, py, 7, rgb, 0.35 * a);
      x.fillStyle = K.c(rgb, a);
      x.beginPath();
      x.arc(px, py, 2, 0, K.PI2);
      x.fill();
    }

    /* deux scènes indépendantes, chacune dans sa boîte de référence (unités de la carte 380x210) :
       formation à gauche ou en haut, hackathon à droite ou en bas ; l'ensemble occupe le cadre quel que soit son format */
    var FB = { x: 30, y: 16, w: 196, h: 194 }, HB = { x: 246, y: 16, w: 108, h: 194 };
    var PCT = [];
    for (var q = 0; q <= 100; q++) PCT.push(q + " %");

    function formation(x, p, t, g, fade) {
      var i, b, a, k;
      K.halo(x, CX, CY + 4, 46, K.IR, (0.1 + 0.12 * g) * fade);
      cloud(x);
      x.fillStyle = K.c(K.IR, 0.08 * fade);
      x.fill();
      x.strokeStyle = K.c(K.IR, (0.75 + 0.25 * g) * fade);
      x.stroke();

      for (i = 0; i < boxes.length; i++) {
        b = boxes[i];
        a = K.sstep(b.from, b.from + 0.07, p) * fade;
        if (a <= 0) continue;
        var bx = b.x, by = b.y + (1 - a) * 8;
        var top = by, midx = bx + BOXW / 2;

        x.strokeStyle = K.c(K.WH, 0.22 * a);
        x.beginPath();
        x.moveTo(CX + (i - 1) * 14, CY + 20);
        x.lineTo(midx, top);
        x.stroke();

        K.rr(x, bx, by, BOXW, BOXH, 5);
        x.fillStyle = K.c(K.IR, 0.1 * a);
        x.fill();
        x.strokeStyle = K.c(K.IR, (0.6 + 0.3 * g) * a);
        x.stroke();
        x.fillStyle = K.c(K.WH, 0.55 * a);
        x.fillRect(bx + 6, by + 7, BOXW - 12, 2);
        x.fillRect(bx + 6, by + 12, BOXW - 20, 2);
        x.fillStyle = K.c(K.PK, 0.9 * a);
        x.beginPath();
        x.arc(bx + BOXW - 8, by + BOXH - 7, 1.8, 0, K.PI2);
        x.fill();

        k = K.frac(t * 0.55 + phase[i]);
        packet(x, CX + (i - 1) * 14, CY + 20, midx, top, k, K.IR, a);
      }

      a = K.sstep(DBFROM, DBFROM + 0.08, p) * fade;
      if (a > 0) {
        for (i = 0; i < boxes.length; i++) {
          b = boxes[i];
          x.strokeStyle = K.c(K.WH, 0.2 * a);
          x.beginPath();
          x.moveTo(b.x + BOXW / 2, b.y + BOXH);
          x.lineTo(DBX + (i - 1) * 10, DBY - 10);
          x.stroke();
          k = K.frac(t * 0.45 + phase[i] + 0.4);
          packet(x, b.x + BOXW / 2, b.y + BOXH, DBX + (i - 1) * 10, DBY - 10, k, K.PK, a);
        }
        x.strokeStyle = K.c(K.PK, (0.7 + 0.3 * g) * a);
        x.fillStyle = K.c(K.PK, 0.1 * a);
        x.beginPath();
        x.ellipse(DBX, DBY - 8, 22, 6, 0, 0, K.PI2);
        x.fill();
        x.stroke();
        x.beginPath();
        x.moveTo(DBX - 22, DBY - 8);
        x.lineTo(DBX - 22, DBY + 10);
        x.ellipse(DBX, DBY + 10, 22, 6, 0, PI, 0, true);
        x.lineTo(DBX + 22, DBY - 8);
        x.stroke();
        x.strokeStyle = K.c(K.PK, 0.35 * a);
        x.beginPath();
        x.ellipse(DBX, DBY + 1, 22, 6, 0, PI, 0, true);
        x.stroke();
      }

      x.font = FONT;
      x.fillStyle = K.c(K.WH, 0.5 * fade);
      x.fillText("formation", CX, 200);
    }

    /* hackathon : un anneau d'avancement et des étapes qui se valident (aucune durée affichée) */
    function hackathon(x, p, g, fade) {
      var i;
      var done = K.sstep(0.08, 0.86, p);
      K.halo(x, RX, RY, RR + 18, K.PK, (0.08 + 0.1 * g) * fade);
      x.strokeStyle = K.c(K.WH, 0.14 * fade);
      x.lineWidth = 4;
      x.beginPath();
      x.arc(RX, RY, RR, 0, K.PI2);
      x.stroke();
      if (done > 0.002) {
        x.strokeStyle = K.grad(x, RX - RR, RY, RX + RR, RY, (0.85 + 0.15 * g) * fade);
        x.lineCap = "round";
        x.beginPath();
        x.arc(RX, RY, RR, -PI / 2, -PI / 2 + K.PI2 * done);
        x.stroke();
        x.lineCap = "butt";
      }
      x.lineWidth = 1.2;

      var win = K.sstep(0.86, 0.9, p) * fade;
      x.font = FONTBIG;
      x.fillStyle = K.c(K.WH, 0.92 * fade * (1 - win));
      if (win < 0.99) x.fillText(PCT[Math.round(done * 100)], RX, RY + 1);

      var bw = 13, gap = 4, x0 = RX - (BARS * bw + (BARS - 1) * gap) / 2;
      for (i = 0; i < BARS; i++) {
        var fill = K.clamp(done * BARS - i, 0, 1);
        K.rr(x, x0 + i * (bw + gap), 136, bw, 20, 3);
        x.fillStyle = K.c(K.WH, 0.07 * fade);
        x.fill();
        if (fill > 0) {
          K.rr(x, x0 + i * (bw + gap), 136 + 20 * (1 - fill), bw, 20 * fill, 3);
          x.fillStyle = K.c(i % 2 ? K.PK : K.IR, (0.55 + 0.35 * g) * fade);
          x.fill();
        }
      }

      if (win > 0) {
        K.halo(x, RX, RY, RR + 30 * win, K.PK, 0.22 * win);
        x.strokeStyle = K.c(K.WH, 0.9 * win);
        x.lineWidth = 2.4;
        x.lineCap = "round";
        x.beginPath();
        x.moveTo(RX - 11, RY + 1);
        x.lineTo(RX - 3, RY + 9);
        x.lineTo(RX + 12, RY - 7);
        x.stroke();
        x.lineCap = "butt";
        x.lineWidth = 1.2;
      }

      x.font = FONT;
      x.fillStyle = K.c(K.WH, 0.5 * fade);
      x.fillText("hackathon", RX, 200);
    }

    function place(x, B, ox, oy, s) {
      x.save();
      x.translate(ox - B.w * s / 2, oy - B.h * s / 2);
      x.scale(s, s);
      x.translate(-B.x, -B.y);
    }

    return function draw(x, w, h, t, g) {
      var p = K.frac(t / LOOP);
      var fade = K.sstep(0, 0.05, p) * (1 - K.sstep(0.93, 1, p));
      var wide = w > h * 1.15, s, cut;
      if (wide) {
        cut = w * FB.w / (FB.w + HB.w);
        s = Math.min(cut * 0.94 / FB.w, (w - cut) * 0.9 / HB.w, h * 0.94 / FB.h);
      } else {
        cut = h * 0.56;
        s = Math.min(w * 0.9 / FB.w, cut * 0.96 / FB.h, (h - cut) * 0.96 / HB.h);
      }
      x.lineJoin = "round";
      x.textAlign = "center";
      x.textBaseline = "middle";

      place(x, FB, wide ? cut / 2 : w / 2, wide ? h / 2 : cut / 2, s);
      x.lineWidth = 1.2;
      formation(x, p, t, g, fade);
      x.restore();

      place(x, HB, wide ? (cut + w) / 2 : w / 2, wide ? h / 2 : (cut + h) / 2, s);
      x.lineWidth = 1.2;
      hackathon(x, p, g, fade);
      x.restore();

      /* séparation */
      x.lineWidth = 1;
      x.strokeStyle = K.c(K.WH, 0.1 * fade);
      x.beginPath();
      if (wide) { x.moveTo(cut, h * 0.12); x.lineTo(cut, h * 0.9); }
      else { x.moveTo(w * 0.14, cut); x.lineTo(w * 0.86, cut); }
      x.stroke();
      x.lineJoin = "miter";
      x.textAlign = "start";
      x.textBaseline = "alphabetic";
    };
  };
})();
