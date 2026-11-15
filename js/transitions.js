/* Transitions au défilement.
   Un seul système : GSAP ScrollTrigger pilote toutes les animations liées au défilement (transform, opacity,
   clip-path) ainsi que la barre de progression, la section courante et la frise. Lenis (bureau uniquement)
   lisse le défilement, cadencé par le ticker GSAP. Aucun état caché n'est posé tant que GSAP n'est pas prêt :
   si un script ne se charge pas, la page reste entièrement visible en défilement natif.
   Modes : mouvement réduit (rien, page simple) ; tactile ou étroit (révélations légères, pas de Lenis,
   pas d'épinglage) ; bureau (Lenis, plongée du hero épinglé, parallaxes). */
(function () {
  "use strict";

  var root = document.documentElement;
  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  var LenisCtor = window.Lenis;
  var App = window.PortfolioApp || {};
  var SIM = window.SIM || null;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  var IDS = ["haut", "projets", "competences", "parcours", "contact"];
  var LABELS = { haut: "Accueil", projets: "Projets", competences: "Compétences", parcours: "Parcours", contact: "Contact" };
  var stage = $("#stage");
  var pin = $("#stage-pin");
  var els = { haut: stage, projets: $("#projets"), competences: $("#competences"), parcours: $("#parcours"), contact: $("#contact") };
  if (!stage || !pin || !els.projets) return;

  var mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var dialogs = $$("dialog");
  var lenis = null;
  var diveOn = false;
  var current = null;
  var starts = [];
  var userMoved = false;

  /* Position dans le document, insensible aux transforms (offsetTop), donc stable pendant les animations */
  function docTop(el) {
    var y = 0;
    while (el) { y += el.offsetTop; el = el.offsetParent; }
    return y;
  }
  function vh() { return window.innerHeight; }
  function maxScroll() { return Math.max(0, root.scrollHeight - window.innerHeight); }

  /* ---------- Colonne de points ---------- */
  var railLinks = {};
  (function buildRail() {
    var rail = document.createElement("nav");
    rail.className = "rail";
    rail.setAttribute("aria-label", "Sections de la page");
    var ul = document.createElement("ul");
    IDS.forEach(function (id) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + id;
      var dot = document.createElement("span");
      dot.className = "rail-dot";
      dot.setAttribute("aria-hidden", "true");
      var tip = document.createElement("span");
      tip.className = "rail-tip";
      tip.textContent = LABELS[id];
      a.appendChild(dot);
      a.appendChild(tip);
      li.appendChild(a);
      ul.appendChild(li);
      railLinks[id] = a;
    });
    rail.appendChild(ul);
    document.body.appendChild(rail);
  })();

  function setCurrent(id) {
    if (id === current) return;
    current = id;
    IDS.forEach(function (k) {
      if (k === id) railLinks[k].setAttribute("aria-current", "true");
      else railLinks[k].removeAttribute("aria-current");
    });
    if (App.setSection) App.setSection(id === "haut" ? null : id);
  }

  /* ---------- Repli : GSAP ou ScrollTrigger absent (CDN bloqué) ---------- */
  if (!gsap || !ST) {
    /* Défilement natif, ancres natives, tout visible. Seuls la barre de progression et le lien courant restent inactifs. */
    window.PortfolioScroll = { go: function () { return false; }, refresh: function () {} };
    return;
  }

  /* À poser avant que ScrollTrigger ne mesure la page : il mémorise le scroll-behavior calculé et le réécrit
     en ligne après chaque refresh. Avec « smooth », chaque position écrite par Lenis relancerait une animation
     native et le défilement prendrait du retard. Les ancres passent de toute façon par go(). */
  root.classList.add("has-st");
  gsap.registerPlugin(ST);
  ST.config({ ignoreMobileResize: true });

  /* ---------- Verrou pendant les dialogues ---------- */
  function syncLock() {
    if (!lenis) return;
    var open = dialogs.some(function (d) { return d.open; });
    if (open) lenis.stop(); else lenis.start();
  }
  if (typeof MutationObserver === "function") {
    var mo = new MutationObserver(syncLock);
    dialogs.forEach(function (d) { mo.observe(d, { attributes: true, attributeFilter: ["open"] }); });
  }
  dialogs.forEach(function (d) { d.addEventListener("close", syncLock); });

  /* ---------- Aller à une section ---------- */
  function targetY(id) {
    if (id === "haut") return 0;
    if (!els[id]) return null;
    return Math.min(Math.round(docTop(els[id])), maxScroll());
  }
  function easeTravel(t) { return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2; }

  function go(id, instant) {
    var y = targetY(id);
    if (y === null) return false;
    syncLock();
    if (lenis) {
      if (instant) lenis.scrollTo(y, { immediate: true, force: true });
      else {
        var dist = Math.abs(y - window.pageYOffset);
        lenis.scrollTo(y, { duration: clamp(0.75 + dist / 3200, 0.9, 2.1), easing: easeTravel, force: true });
      }
    } else {
      window.scrollTo({ top: y, left: 0, behavior: instant || mqReduce.matches ? "instant" : "smooth" });
    }
    return true;
  }

  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var id = a.getAttribute("href").slice(1);
    if (IDS.indexOf(id) < 0) return;
    e.preventDefault();
    userMoved = true;
    go(id, false);
    try { if (location.hash !== "#" + id) history.pushState(null, "", "#" + id); } catch (err) {}
    if (a.classList.contains("skip-link") && els[id]) {
      els[id].setAttribute("tabindex", "-1");
      els[id].focus({ preventScroll: true });
    }
  });
  window.addEventListener("hashchange", function () {
    var id = location.hash.slice(1);
    if (IDS.indexOf(id) >= 0) go(id, true);
  });
  ["wheel", "touchstart", "keydown", "pointerdown"].forEach(function (t) {
    window.addEventListener(t, function () { userMoved = true; }, { passive: true, once: true });
  });
  /* Chargement direct avec un hash : on se cale sur la section tant que la mise en page bouge encore (polices) */
  function applyHash() {
    if (userMoved) return;
    var id = location.hash.slice(1);
    if (id && IDS.indexOf(id) >= 0) go(id, true);
  }

  /* ---------- Navigation : progression et section courante (tous modes, y compris mouvement réduit) ---------- */
  var setProgress = gsap.quickSetter($("#progress"), "scaleX");
  function computeStarts() {
    var h = vh(), mx = maxScroll();
    starts = IDS.map(function (id) {
      if (id === "haut") return -1;
      var s = docTop(els[id]) - h * (id === "projets" && diveOn ? 0.3 : 0.5);
      return Math.min(s, mx - 2);
    });
  }
  function spy(self) {
    var y = self.scroll();
    var idx = 0;
    for (var i = 1; i < starts.length; i++) if (y >= starts[i]) idx = i;
    setCurrent(IDS[idx]);
    setProgress(self.progress);
  }
  ST.create({
    start: 0, end: "max",
    onRefresh: function (self) { computeStarts(); spy(self); },
    onUpdate: spy
  });

  /* ---------- Découpe d'un titre en lettres (le dégradé est réparti lettre par lettre) ---------- */
  function splitLetters(inner) {
    var text = inner.textContent;
    var mix = gsap.utils.interpolate(["#E6EAF7", "#E6EAF7", "#B4BEFB", "#7C8FFF", "#FF6B98"]);
    var holder = inner.closest("h2");
    inner.textContent = "";
    inner.classList.add("is-split");
    var chars = text.split("").map(function (c, i, arr) {
      var s = document.createElement("span");
      s.className = "ch";
      s.setAttribute("aria-hidden", "true");
      s.textContent = c;
      var col = mix(arr.length > 1 ? i / (arr.length - 1) : 0);
      s.style.color = col;
      s.style.webkitTextFillColor = col;
      inner.appendChild(s);
      return s;
    });
    if (holder) holder.setAttribute("aria-label", text);
    return {
      chars: chars,
      revert: function () {
        inner.textContent = text;
        inner.classList.remove("is-split");
        if (holder) holder.removeAttribute("aria-label");
      }
    };
  }

  /* Bornes de déclenchement numériques, recalculées à chaque refresh et plafonnées au défilement maximal */
  function at(el, frac, extra) {
    return function () { return Math.max(0, Math.min(docTop(el) + (extra || 0) - vh() * frac, maxScroll())); };
  }
  function after(startFn, minGap, endFn) {
    return function () { return Math.max(startFn() + (minGap || 1), endFn()); };
  }
  function span(el, a, b, scrub, extra) {
    var s = at(el, a, extra);
    return { start: s, end: after(s, 40, at(el, b, extra)), scrub: scrub, invalidateOnRefresh: true };
  }

  /* ---------- Mise en scène ---------- */
  var mm = gsap.matchMedia();
  mm.add({
    reduce: "(prefers-reduced-motion: reduce)",
    desk: "(min-width: 760px) and (pointer: fine)",
    tall: "(min-height: 600px)"
  }, function (ctx) {
    var c = ctx.conditions;
    if (c.reduce) { computeStarts(); return; }

    var desk = !!c.desk;
    var dive = desk && !!c.tall;
    var undo = [];
    root.classList.add("has-motion");
    undo.push(function () { root.classList.remove("has-motion"); });

    /* ----- Lenis : défilement lissé, bureau uniquement ----- */
    var tick = null;
    if (desk && typeof LenisCtor === "function") {
      try {
        lenis = new LenisCtor({ lerp: 0.105, smoothWheel: true, wheelMultiplier: 1, syncTouch: false });
        lenis.on("scroll", ST.update);
        tick = function (time) { lenis.raf(time * 1000); };
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);
        syncLock();
      } catch (err) { lenis = null; tick = null; }
    }
    undo.push(function () {
      if (tick) { gsap.ticker.remove(tick); gsap.ticker.lagSmoothing(500, 33); }
      if (lenis) { lenis.destroy(); lenis = null; }
    });
    var S = lenis ? 0.35 : 0.6;   /* léger lissage du scrub ; Lenis lisse déjà la position */

    /* ===== 1. Hero vers Projets : plongée dans la simulation ===== */
    if (dive) {
      diveOn = true;
      root.classList.add("has-dive");
      var hero = $("#haut");
      var lines = $$(".name-line", hero);
      var glow = $(".dive-glow", pin);
      var ring = $("#iris-ring");
      var cam = { zoom: 1, rec: 0, mask: 1, glow: 0 };
      var iris = { r: 0 };
      var geo = { w: 0, h: 0, cx: 0, cy: 0, R: 1, gs: 4 };
      var BASE = 480;   /* diamètre de base des calques de lueur et d'anneau (voir transitions.css) */
      var canHole = !!(window.CSS && CSS.supports && CSS.supports("clip-path", 'path(evenodd, "M0 0H1V1Z")'));
      var state = { gone: false, diving: false, held: null, clip: "" };

      var measure = function () {
        geo.w = pin.offsetWidth;
        geo.h = pin.offsetHeight;
        geo.cx = geo.w / 2;
        geo.cy = hero.offsetHeight / 2;
        geo.R = Math.ceil(Math.hypot(Math.max(geo.cx, geo.w - geo.cx), Math.max(geo.cy, geo.h - geo.cy))) + 12;
        gsap.set(glow, { x: geo.cx, y: geo.cy });
        gsap.set(ring, { x: geo.cx, y: geo.cy });
        geo.gs = Math.max(geo.w, geo.h) * 1.5 / BASE;
      };

      /* L'iris : un trou circulaire dans le calque du hero (clip-path pair-impair), centré sur le corps central.
         La section Projets, dessous, continue de monter pendant qu'il s'ouvre. */
      var apply = function () {
        if (SIM && SIM.setCamera) SIM.setCamera(cam.zoom, cam.rec, cam.mask, cam.glow, geo.cx, geo.cy);
        var r = iris.r * geo.R;
        var clip = "";
        if (r > 0.5) {
          if (canHole) {
            var rr = r.toFixed(1), d = (r * 2).toFixed(1);
            clip = 'path(evenodd, "M0 0H' + geo.w + "V" + geo.h + "H0Z M" + (geo.cx - r).toFixed(1) + " " + geo.cy.toFixed(1) +
              "a" + rr + " " + rr + " 0 1 0 " + d + " 0a" + rr + " " + rr + " 0 1 0 -" + d + ' 0Z")';
          }
        }
        if (clip !== state.clip) {
          state.clip = clip;
          pin.style.clipPath = clip;
          pin.style.webkitClipPath = clip;
        }
        if (!canHole) pin.style.opacity = String(1 - iris.r);
        gsap.set(ring, { scale: Math.max(0.0001, (r * 2) / BASE) });
      };

      var onProgress = function (p) {
        var gone = p >= 0.999;
        if (gone !== state.gone) {
          state.gone = gone;
          pin.classList.toggle("is-gone", gone);
          if (SIM && SIM.setHidden) SIM.setHidden(gone);
        }
        var diving = p > 0.12;
        if (diving !== state.diving) { state.diving = diving; pin.classList.toggle("is-diving", diving); }
        /* Les visuels des cartes restent en veille tant que le hero les recouvre */
        var held = p < 0.42;
        if (held !== state.held) { state.held = held; if (App.holdVisuals) App.holdVisuals(held); }
      };

      measure();
      var tl = gsap.timeline({
        defaults: { ease: "none" },
        onUpdate: function () { apply(); onProgress(tl.progress()); },
        scrollTrigger: {
          start: 0,
          end: function () { return stage.offsetHeight; },
          scrub: lenis ? 0.3 : 0.5,
          invalidateOnRefresh: true,
          onRefresh: function () { measure(); apply(); onProgress(tl.progress()); }
        }
      });
      /* Le nom s'envole ligne par ligne (parallaxe), le texte suit */
      tl.to(lines[0], { yPercent: -165, duration: 0.36, ease: "power1.in" }, 0)
        .to(lines[0], { opacity: 0, duration: 0.24, ease: "power1.out" }, 0.02)
        .to(lines[1], { yPercent: -120, duration: 0.38, ease: "power1.in" }, 0.035)
        .to(lines[1], { opacity: 0, duration: 0.27, ease: "power1.out" }, 0.07)
        .to($(".hero-copy", hero), { y: -110, opacity: 0, duration: 0.34, ease: "power1.in" }, 0.05)
        .to($(".hero-cta", hero), { y: -70, opacity: 0, duration: 0.32, ease: "power1.in" }, 0.08)
        .to([$(".sim-controls", hero), $(".marquee", pin)], { y: 36, opacity: 0, duration: 0.2 }, 0)
        .to($(".hero-shade-l", hero), { opacity: 0, duration: 0.3 }, 0.08)
        /* La caméra se recentre sur le corps central puis plonge */
        .to(cam, { rec: 1, duration: 0.5, ease: "power2.inOut" }, 0.02)
        .to(cam, { mask: 0, duration: 0.26 }, 0.08)
        .to(cam, { zoom: 2.2, duration: 0.54, ease: "power1.in" }, 0)
        .to(cam, { zoom: 9, duration: 0.46, ease: "power2.in" }, 0.54)
        .to(cam, { glow: 1, duration: 0.42, ease: "power1.out" }, 0.18)
        .fromTo(glow, { scale: 0.7, opacity: 0 }, { scale: function () { return geo.gs; }, opacity: 1, duration: 0.6, ease: "power1.in" }, 0.22)
        /* L'iris s'ouvre depuis le corps central */
        .to(iris, { r: 1, duration: 0.5, ease: "power2.in" }, 0.5)
        .fromTo(ring, { opacity: 0 }, { opacity: 1, duration: 0.06 }, 0.5)
        .to(ring, { opacity: 0, duration: 0.22, ease: "power1.in" }, 0.78);
      apply();
      onProgress(0);

      undo.push(function () {
        diveOn = false;
        root.classList.remove("has-dive");
        pin.classList.remove("is-gone", "is-diving");
        pin.style.clipPath = ""; pin.style.webkitClipPath = ""; pin.style.opacity = "";
        if (SIM) { if (SIM.setHidden) SIM.setHidden(false); if (SIM.setCamera) SIM.setCamera(1, 0, 1, 0); }
        if (App.holdVisuals) App.holdVisuals(false);
      });
    }

    /* ===== 2. Projets ===== */
    var projets = els.projets;
    var titre = $("#projets-titre");
    var split = splitLetters($(".ln-in", titre));
    undo.push(split.revert);
    var head = dive
      ? { start: function () { return docTop(projets) - vh() * 0.46; }, end: function () { return docTop(projets); }, scrub: S, invalidateOnRefresh: true }
      : span(projets, 0.82, 0.3, S);
    var tlp = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: head });
    tlp.fromTo(titre, { scale: desk ? 2.1 : 1.35 }, { scale: 1, duration: 0.8, ease: "power2.out" }, 0)
      .fromTo(split.chars, { yPercent: 115, rotation: 9, opacity: 0 }, { yPercent: 0, rotation: 0, opacity: 1, duration: 0.42, stagger: 0.075, ease: "power3.out" }, 0)
      .fromTo($$("#stats .stat"), { y: 46, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: "power2.out" }, 0.3)
      .fromTo($("#filters"), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.34, ease: "power2.out" }, 0.48);
    if (App.count) {
      ST.create({
        start: function () { return Math.max(0, docTop(projets) - vh() * (dive ? 0.18 : 0.55)); },
        once: true,
        onEnter: function () { App.count($("#stats")); }
      });
    }

    /* Cartes : entrée rangée par rangée, puis dérive des colonnes à des vitesses légèrement différentes.
       La cellule porte ces mouvements ; l'article garde le survol et le FLIP du filtre. */
    var grid = $("#project-grid");
    var cells = $$(".cell", grid);
    var layout = function () {
      var shown = cells.filter(function (c) { return !c.hidden; });
      var lefts = [];
      shown.forEach(function (c) { if (lefts.indexOf(c.offsetLeft) < 0) lefts.push(c.offsetLeft); });
      lefts.sort(function (a, b) { return a - b; });
      var colW = shown.length ? Math.min.apply(null, shown.map(function (c) { return c.offsetWidth; })) : 0;
      var firstTop = shown.length ? shown[0].offsetTop : 0;
      var wideTop = shown.some(function (c) { return c.offsetTop === firstTop && c.offsetWidth > colW * 1.4; });
      var drift = lefts.length >= 3 ? [0, 46, 92] : lefts.length === 2 ? [0, 52] : [0];
      cells.forEach(function (c) {
        var col = Math.max(0, lefts.indexOf(c.offsetLeft));
        var fixed = c.hidden || !desk || (wideTop && c.offsetTop === firstTop) || c.offsetWidth > colW * 1.4;
        c._col = col;
        /* La rangée de la carte large reste fixe ; les autres colonnes partent plus bas et rattrapent la première
           sans jamais remonter de plus de 10 px (aucun chevauchement possible avec la rangée du dessus). */
        c._from = fixed ? 0 : drift[col] || 0;
        c._to = fixed || !col ? 0 : -10;
      });
    };
    layout();
    ST.addEventListener("refreshInit", layout);
    undo.push(function () { ST.removeEventListener("refreshInit", layout); });

    cells.forEach(function (c) {
      var s0 = function () { return Math.max(0, Math.min(docTop(c) - vh() * 0.99 + (c._col || 0) * 46, maxScroll())); };
      gsap.fromTo(c,
        { yPercent: desk ? 16 : 10, rotationX: desk ? -16 : 0, opacity: 0, transformPerspective: 1100 },
        {
          yPercent: 0, rotationX: 0, opacity: 1, ease: "power2.out",
          scrollTrigger: { start: s0, end: function () { return s0() + vh() * 0.26; }, scrub: S, invalidateOnRefresh: true }
        });
    });
    if (desk) {
      gsap.fromTo(cells,
        { y: function (i, el) { return el._from || 0; } },
        {
          y: function (i, el) { return el._to || 0; }, ease: "none",
          scrollTrigger: {
            start: function () { return Math.max(0, docTop(grid) - vh()); },
            end: function () { return docTop(grid) + grid.offsetHeight; },
            scrub: S, invalidateOnRefresh: true
          }
        });
    }

    /* ===== 3. Bandeaux typographiques cinétiques ===== */
    var bands = $$(".kband").map(function (band, i) {
      var track = $(".kband-track", band), inner = $(".kband-inner", band);
      var dir = i % 2 ? 1 : -1;
      var b = {
        dir: dir, on: false,
        skew: gsap.quickTo(inner, "skewX", { duration: 0.55, ease: "power3.out" }),
        push: gsap.quickTo(inner, "x", { duration: 0.75, ease: "power3.out" })
      };
      gsap.fromTo(track, { xPercent: dir < 0 ? -3 : -36 }, {
        xPercent: dir < 0 ? -36 : -3, ease: "none",
        scrollTrigger: {
          trigger: band, start: "top bottom", end: "bottom top", scrub: S,
          onToggle: function (self) { b.on = self.isActive; if (!b.on) { b.skew(0); b.push(0); } }
        }
      });
      return b;
    });
    /* Vitesse et inclinaison suivent la vélocité du défilement, puis se détendent à l'arrêt */
    var relax = function () { bands.forEach(function (b) { b.skew(0); b.push(0); }); };
    ST.create({
      start: 0, end: "max",
      onUpdate: function (self) {
        var v = self.getVelocity();
        var k = clamp(v / 2600, -1, 1);
        for (var i = 0; i < bands.length; i++) {
          var b = bands[i];
          if (!b.on) continue;
          b.skew(-13 * k * -b.dir);
          b.push(170 * k * b.dir);
        }
      }
    });
    ST.addEventListener("scrollEnd", relax);
    undo.push(function () { ST.removeEventListener("scrollEnd", relax); });

    /* ===== Titres de section : la ligne monte derrière son masque ===== */
    ["#competences-titre", "#parcours-titre"].forEach(function (sel) {
      var t = $(sel);
      gsap.fromTo($(".ln-in", t), { yPercent: 118 }, { yPercent: 0, ease: "power2.out", scrollTrigger: span(t, 0.94, 0.62, S) });
    });

    /* ===== 4. Compétences : volets qui s'ouvrent depuis le bas, pilules en cascade ===== */
    var lead = $("#competences .section-lead");
    gsap.fromTo(lead, { y: 26, opacity: 0 }, { y: 0, opacity: 1, ease: "power1.out", scrollTrigger: span(lead, 0.95, 0.7, S) });
    $$(".skill-group").forEach(function (g) {
      gsap.fromTo(g,
        { clipPath: "inset(100% -60px -60px -60px round 20px)", y: 54 },
        { clipPath: "inset(0% -60px -60px -60px round 20px)", y: 0, ease: "power2.out", scrollTrigger: span(g, 0.97, 0.66, S) });
      gsap.from($$(".pills > li", g), {
        opacity: 0, y: 16, scale: 0.9, duration: 0.34, stagger: 0.022, ease: "power2.out",
        scrollTrigger: { start: at(g, 0.8), toggleActions: "play none none reverse", invalidateOnRefresh: true }
      });
    });
    var aside = $(".skills-index");
    if (aside) {
      var skills = $(".skills");
      gsap.fromTo(aside, { y: 60, opacity: 0 }, { y: 0, opacity: 1, ease: "power2.out", scrollTrigger: span(skills, 0.9, 0.55, S) });
    }

    /* ===== 5. Parcours : la ligne se trace, chaque étape glisse quand elle l'atteint ===== */
    var line = $("#tl-line");
    var railEl = line ? line.parentNode : null;
    var items = $$(".tl-item");
    var TIP = 0.62;   /* la pointe de la ligne reste à 62 % de la hauteur de l'écran */
    if (line) {
      var l0 = at(railEl, TIP);
      gsap.fromTo(line, { scaleY: 0 }, {
        scaleY: 1, ease: "none",
        scrollTrigger: {
          start: l0,
          end: after(l0, 60, function () { return Math.min(docTop(railEl) + railEl.offsetHeight - vh() * TIP, maxScroll()); }),
          scrub: S, invalidateOnRefresh: true
        }
      });
    }
    items.forEach(function (li) {
      var card = $(".tl-card", li);
      var hit = at(li, TIP, 31);
      li.classList.remove("is-lit");
      ST.create({
        start: hit,
        onEnter: function () { li.classList.add("is-lit"); },
        onLeaveBack: function () { li.classList.remove("is-lit"); }
      });
      var c0 = function () { return Math.max(0, hit() - 50); };
      gsap.fromTo(card, { x: desk ? 90 : 36, opacity: 0 }, {
        x: 0, opacity: 1, ease: "power2.out",
        scrollTrigger: { start: c0, end: function () { return c0() + vh() * 0.2; }, scrub: S, invalidateOnRefresh: true }
      });
    });
    undo.push(function () { items.forEach(function (li) { li.classList.add("is-lit"); }); });

    /* ===== 6. Contact : le titre part de très grand et se pose ===== */
    var contact = els.contact;
    var cl = $$(".contact-title .ln-in", contact);
    var big = desk ? 3.3 : 1.9;
    var tlc = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: span(contact, 0.92, 0.1, S) });
    tlc.fromTo(cl[0], { scale: big, xPercent: -14, yPercent: -30, opacity: 0 }, { scale: 1, xPercent: 0, yPercent: 0, opacity: 1, duration: 0.82, ease: "power3.out" }, 0)
      .fromTo(cl[1], { scale: big, xPercent: 22, yPercent: 45, opacity: 0 }, { scale: 1, xPercent: 0, yPercent: 0, opacity: 1, duration: 0.82, ease: "power3.out" }, 0.1)
      .fromTo($(".contact-halo", contact), { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "power1.out" }, 0.1)
      .fromTo($("#contact-status"), { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "power2.out" }, 0.52)
      .fromTo($$(".contact-item", contact), { y: 64, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.07, ease: "power2.out" }, 0.58);

    computeStarts();

    return function () {
      undo.forEach(function (fn) { try { fn(); } catch (err) {} });
    };
  });

  /* ---------- Recalcul (filtres, polices, chargement) ---------- */
  function refresh() { ST.refresh(); }
  window.PortfolioScroll = { go: function (id) { return go(id, false); }, refresh: refresh };

  ST.refresh();
  applyHash();
  window.addEventListener("load", function () { ST.refresh(); applyHash(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); applyHash(); });
})();
