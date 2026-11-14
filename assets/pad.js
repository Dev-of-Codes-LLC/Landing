/* DevOfCodes — the VC Pad, opened inside the home page.
 *
 * Without this script a link marked data-pad is a plain link: it takes the visitor to
 * pad.devofcodes.com in this tab, where the pad starts on arrival and its Leave comes
 * back here (the pad's lib/embed.ts, "from-site").
 *
 * With it, the pad opens over this page, in a frame that fills the window, and the page
 * never unloads:
 *
 *   warm     pointing at the link, focusing it or touching it adds the frame, hidden,
 *            and asks the pad to start loading the hall and the pitch
 *   launch   the click asks the pad to start its lead-in. When the pad says it has, the
 *            frame fades in over the page, and every visible piece of this page (a
 *            heading, a button, a card) is lifted above it and carried into the pad's
 *            vortex, along the same spiral the pad draws (the pad's lib/leadIn.ts)
 *   leave    when the pad says the visitor has left, the frame fades away and the page
 *            is there as it was: same scroll, focus back on the link. The browser's
 *            Back button leaves the pad the same way
 *
 * If the frame can't be used (this page's policy or the pad's refuses it, or the pad
 * does not answer in time), the click falls back to the plain link.
 *
 * Messages, checked by origin on both sides:
 *   to the pad    { source: 'devofcodes', type: 'warm' | 'launch' | 'leave' }
 *   from the pad  { source: 'vc-pad', type: 'ready' | 'launched' | 'left' }
 */
(function () {
  'use strict';

  var links = document.querySelectorAll('a[data-pad]');
  if (!links.length || !window.history || !history.pushState) return;

  /* The pad's origin, from the link itself. */
  var PAD = new URL(links[0].href).origin;
  /* Seconds the pad's vortex turns before it throws out the pitch: LEAD_IN.spin in the pad's lib/leadIn.ts. */
  var SPIN = 3.6;
  /* How long the click waits for the pad before it gives up on the frame, in milliseconds. */
  var PATIENCE = 6000;
  /* How long a frame that has loaded may stay silent before it is taken as refused. */
  var SILENCE = 2500;

  var stage = null, frame = null, pieces = null;
  var ready = false, wantWarm = false, pending = false, open = false, blocked = false;
  var opener = null, patience = 0, spiral = 0, lockTimer = 0, closeTimer = 0, lifted = [];
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function tell(type) {
    if (frame && frame.contentWindow) frame.contentWindow.postMessage({ source: 'devofcodes', type: type }, PAD);
  }

  function addFrame() {
    if (frame || blocked) return;
    clearTimeout(closeTimer);
    if (!stage) {
      stage = document.createElement('div');
      stage.className = 'pad-stage';
      pieces = document.createElement('div');
      pieces.className = 'pad-pieces';
      pieces.setAttribute('aria-hidden', 'true');
      document.body.appendChild(stage);
      document.body.appendChild(pieces);
    }
    stage.inert = true;
    frame = document.createElement('iframe');
    frame.title = 'VC Pad: the pitch, then a library hall in 3D';
    /* The click is on this page, so the frame needs this page's leave to play the pitch with sound. */
    frame.allow = 'autoplay; fullscreen';
    frame.src = PAD + '/?embed=1';
    /* A pad that refuses to be framed still "loads" (an empty page), and never says it is ready. */
    var added = frame;
    frame.addEventListener('load', function () {
      setTimeout(function () { if (frame === added && !ready) giveUp(); }, SILENCE);
    });
    stage.appendChild(frame);
  }

  function removeFrame() {
    if (frame) frame.remove();
    frame = null;
    ready = false;
    wantWarm = false;
  }

  function warm() {
    addFrame();
    wantWarm = true;
    if (ready) tell('warm');
  }

  /* The plain link, in this tab. */
  function giveUp() {
    clearTimeout(patience);
    blocked = true;
    setBusy(false);
    removeFrame();
    if (pending && opener) {
      pending = false;
      location.assign(opener.href);
    }
  }

  function setBusy(on) {
    for (var i = 0; i < links.length; i++) {
      links[i].classList.toggle('is-opening', on);
      if (on) links[i].setAttribute('aria-busy', 'true');
      else links[i].removeAttribute('aria-busy');
    }
  }

  function onClick(e) {
    /* A new tab or window, when that is what was asked for: the link as it is. */
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (blocked) return;
    e.preventDefault();
    if (open || pending) return;
    opener = e.currentTarget;
    pending = true;
    setBusy(true);
    addFrame();
    if (ready) tell('launch');
    patience = setTimeout(giveUp, PATIENCE);
  }

  /* ── The spiral, as the pad's lib/leadIn.ts has it ── */

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function smoothstep(a, b, x) { var t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function wrapAngle(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
  function vortexFor(w, h) { return { cx: w / 2, cy: h / 2, outer: Math.hypot(w, h) * 0.55, arms: 3, turns: 2.4, depth: 4.6, band: 0.3 }; }
  function vortexSpin(t) { return Math.PI * 2 * 1.4 * Math.pow(clamp01(t), 2.4); }

  function slotFor(p, v) {
    var angle = Math.atan2(p.y - v.cy, p.x - v.cx);
    var radius = Math.hypot(p.x - v.cx, p.y - v.cy);
    var winding = v.turns * Math.PI * 2;
    var best = { arm: 0, u: 0 }, bestD = Infinity;
    for (var arm = 0; arm < v.arms; arm++) {
      var offset = (arm / v.arms) * Math.PI * 2;
      for (var n = -1; n <= Math.ceil(v.turns) + 1; n++) {
        var u = (angle - offset + Math.PI * 2 * n) / winding;
        if (u < 0 || u > 0.8) continue;
        var d = Math.abs(Math.log((v.outer * Math.exp(-v.depth * u)) / Math.max(radius, 1)));
        if (d < bestD) { bestD = d; best = { arm: arm, u: u }; }
      }
    }
    var relative = angle + Math.atan2(winding, -v.depth);
    var flip = Math.cos(relative) < 0 ? Math.PI : 0;
    return { arm: best.arm, u: best.u, angle: angle, radius: radius, align: wrapAngle(relative + flip) };
  }

  function spiralPose(p, v, slot, t) {
    var winding = v.turns * Math.PI * 2;
    var slide = smoothstep(0.02, 0.5, t);
    var du = (0.96 - slot.u) * Math.pow(smoothstep(0.3, 1, t), 1.5);
    var spin = vortexSpin(t);
    var onArm = v.outer * Math.exp(-v.depth * slot.u);
    var angle = slot.angle + spin + du * winding;
    var shrink = Math.exp(-v.depth * du);
    var radius = lerp(slot.radius, onArm, slide) * shrink;
    var width = onArm * v.band;
    var fit = Math.min((width * 0.78) / p.height, (width * 2.6) / p.width, 1);
    return {
      dx: v.cx + radius * Math.cos(angle) - p.x,
      dy: v.cy + radius * Math.sin(angle) - p.y,
      rotation: spin + slot.align * slide + du * winding,
      scale: lerp(1, fit, slide) * shrink,
      blur: 1.2 * smoothstep(0.7, 1, t),
      opacity: 1 - smoothstep(0.8, 0.95, slot.u + du)
    };
  }

  /* ── The page's pieces ── */

  var UNITS = { H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, P: 1, A: 1, BUTTON: 1, IMG: 1, PICTURE: 1, KBD: 1, LABEL: 1, INPUT: 1, TEXTAREA: 1, SELECT: 1, BLOCKQUOTE: 1, FIGURE: 1, PRE: 1, CODE: 1, SUMMARY: 1, LI: 1 };

  /* What a clone needs to look the same once it has left its ancestors and the rules that named them. */
  var KEPT = [
    'color', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'text-transform',
    'text-align', 'white-space', 'word-spacing', 'font-feature-settings', 'text-decoration-line', 'text-decoration-color',
    'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat', 'background-clip', 'background-origin',
    'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
    'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
    'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
    'box-shadow', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'display', 'opacity', 'visibility', 'box-sizing', 'vertical-align',
    'flex-direction', 'flex-wrap', 'align-items', 'justify-content', 'column-gap', 'row-gap', 'flex-grow', 'flex-shrink',
    'grid-template-columns', 'grid-template-rows', 'object-fit'
  ];
  var KEPT_INSIDE = ['margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'width', 'height', 'position', 'top', 'right', 'bottom', 'left'];

  function paintsBox(style) {
    var bg = style.backgroundColor.match(/[\d.]+/g);
    var hasBg = (bg && (bg.length < 4 || +bg[3] > 0.04)) || style.backgroundImage !== 'none';
    var hasBorder = parseFloat(style.borderTopWidth) + parseFloat(style.borderLeftWidth) > 0;
    return hasBg || hasBorder || style.boxShadow !== 'none';
  }

  function textBox(el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    var box = range.getBoundingClientRect();
    return box.width > 0 && box.height > 0 ? box : el.getBoundingClientRect();
  }

  /* The visible pieces, each the largest thing that reads as one object. Wide bands (the nav bar, a section) are
     background: they stay, and the frame fades in over them. */
  function findPieces(vw, vh) {
    var out = [];
    function visit(el) {
      if (!(el instanceof HTMLElement) || el === stage || el === pieces) return;
      var rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) return;
      var style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none' || +style.opacity === 0) return;
      var leafText = el.childElementCount === 0 && !!(el.textContent && el.textContent.trim());
      var textual = UNITS[el.tagName] === 1 || leafText;
      var box = paintsBox(style);
      var focus = textual && !box ? textBox(el) : rect;
      var small = focus.width < vw * 0.85 && focus.height < vh * 0.6;
      if (small && (textual || box)) { out.push({ el: el, focus: focus }); return; }
      for (var i = 0; i < el.children.length; i++) visit(el.children[i]);
    }
    for (var i = 0; i < document.body.children.length; i++) visit(document.body.children[i]);
    return out;
  }

  function keep(from, to, inside) {
    var style = getComputedStyle(from);
    var i;
    for (i = 0; i < KEPT.length; i++) to.style.setProperty(KEPT[i], style.getPropertyValue(KEPT[i]));
    if (inside) for (i = 0; i < KEPT_INSIDE.length; i++) to.style.setProperty(KEPT_INSIDE[i], style.getPropertyValue(KEPT_INSIDE[i]));
    /* A clone starts its entrance again otherwise, from transparent. */
    to.style.animation = 'none';
    to.style.transition = 'none';
  }

  function lift(found) {
    return found.map(function (piece) {
      var original = piece.el, focus = piece.focus;
      var rect = original.getBoundingClientRect();
      var fx = focus.left + focus.width / 2, fy = focus.top + focus.height / 2;
      var wrap = document.createElement('div');
      wrap.style.cssText = 'position:absolute;left:' + rect.left + 'px;top:' + rect.top + 'px;width:' + rect.width + 'px;height:' + rect.height +
        'px;transform-origin:' + (fx - rect.left) + 'px ' + (fy - rect.top) + 'px;will-change:transform,opacity;';
      var clone = original.cloneNode(true);
      keep(original, clone, false);
      var from = original.querySelectorAll('*'), to = clone.querySelectorAll('*');
      for (var i = 0; i < from.length && i < to.length; i++) {
        if (from[i] instanceof HTMLElement) keep(from[i], to[i], true);
        to[i].removeAttribute('id');
      }
      clone.removeAttribute('id');
      clone.style.margin = '0';
      clone.style.position = 'static';
      clone.style.width = rect.width + 'px';
      clone.style.height = rect.height + 'px';
      wrap.appendChild(clone);
      pieces.appendChild(wrap);
      var visibility = original.style.visibility;
      original.style.visibility = 'hidden';
      return { original: original, wrap: wrap, visibility: visibility, particle: { x: fx, y: fy, width: focus.width, height: focus.height } };
    });
  }

  function dropPieces() {
    cancelAnimationFrame(spiral);
    for (var i = 0; i < lifted.length; i++) {
      lifted[i].wrap.remove();
      lifted[i].original.style.visibility = lifted[i].visibility;
    }
    lifted = [];
  }

  function runSpiral() {
    var vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    var vortex = vortexFor(vw, vh);
    lifted = lift(findPieces(vw, vh));
    var slots = lifted.map(function (l) { return slotFor(l.particle, vortex); });
    var start = performance.now();
    function draw(now) {
      var t = (now - start) / 1000 / SPIN;
      if (t >= 1) { dropPieces(); return; }
      for (var i = 0; i < lifted.length; i++) {
        var p = spiralPose(lifted[i].particle, vortex, slots[i], t);
        var s = lifted[i].wrap.style;
        s.transform = 'translate3d(' + p.dx + 'px,' + p.dy + 'px,0) rotate(' + p.rotation + 'rad) scale(' + p.scale + ')';
        s.filter = p.blur > 0.3 ? 'blur(' + p.blur.toFixed(1) + 'px)' : '';
        s.opacity = String(p.opacity);
      }
      spiral = requestAnimationFrame(draw);
    }
    spiral = requestAnimationFrame(draw);
  }

  /* ── Opening and closing ── */

  function setPageInert(on) {
    for (var i = 0; i < document.body.children.length; i++) {
      var el = document.body.children[i];
      if (el !== stage && el !== pieces && 'inert' in el) el.inert = on;
    }
  }

  function begin() {
    clearTimeout(patience);
    pending = false;
    setBusy(false);
    if (open) return;
    open = true;
    history.pushState({ vcPad: true }, '');
    if (!reducedMotion.matches) runSpiral();
    stage.inert = false;
    stage.classList.add('is-open');
    setPageInert(true);
    /* Once the frame covers the page: the scrollbar can go without anything being seen to move. */
    lockTimer = setTimeout(function () { document.documentElement.classList.add('pad-open'); }, 320);
    frame.focus({ preventScroll: true });
  }

  function close() {
    if (!open) return;
    open = false;
    clearTimeout(lockTimer);
    dropPieces();
    document.documentElement.classList.remove('pad-open');
    setPageInert(false);
    stage.inert = true;
    stage.classList.remove('is-open');
    if (history.state && history.state.vcPad) history.back();
    if (opener && opener.offsetParent) opener.focus({ preventScroll: true });
    else if (links[0].offsetParent) links[0].focus({ preventScroll: true });
    /* The frame goes once it has faded: a hall nobody is looking at should not keep drawing. */
    closeTimer = setTimeout(removeFrame, 1200);
  }

  window.addEventListener('message', function (e) {
    if (!frame || e.origin !== PAD || e.source !== frame.contentWindow) return;
    var data = e.data;
    if (!data || data.source !== 'vc-pad') return;
    if (data.type === 'ready') {
      ready = true;
      if (wantWarm) tell('warm');
      if (pending) tell('launch');
    } else if (data.type === 'launched') begin();
    else if (data.type === 'left') close();
  });

  /* The browser's Back button, while the pad is open: leave the pad. */
  window.addEventListener('popstate', function () {
    if (!open) return;
    tell('leave');
    /* If the pad does not answer, close anyway. */
    setTimeout(close, 400);
  });

  /* While the pad is open the keyboard belongs to it. The pad wraps Tab round its own controls; if focus
     comes back to this page all the same, where everything is inert and Esc would go nowhere, a key press
     here hands it straight back to the frame. */
  window.addEventListener('keydown', function (e) {
    if (!open || !frame || document.activeElement === frame) return;
    if (e.key === 'Tab') e.preventDefault();
    frame.focus({ preventScroll: true });
  }, true);

  /* This page's own policy refused the frame: the plain link from here on. */
  document.addEventListener('securitypolicyviolation', function (e) {
    var directive = e.effectiveDirective || e.violatedDirective || '';
    if (/^(frame-src|child-src)/.test(directive) && String(e.blockedURI).indexOf(PAD) === 0) giveUp();
  });

  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener('click', onClick);
    links[i].addEventListener('pointerenter', warm);
    links[i].addEventListener('focus', warm);
    links[i].addEventListener('touchstart', warm, { passive: true });
  }
})();
