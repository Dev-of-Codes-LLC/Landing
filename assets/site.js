/* DevOfCodes — shared page behaviour */
(function () {
  'use strict';

  /* Sticky nav */
  var nav = document.getElementById('nav');
  function onScroll() {
    if (!nav) return;
    if (window.scrollY > 24) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Motion tokens are read from CSS, so the timers match the stylesheet. */
  function tokenMs(name, fallback) {
    var v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
    return isFinite(v) ? v : fallback;
  }

  /* Mobile nav: opens and closes like a modal (see .mobile-nav-overlay in site.css).
     Close swaps .is-open for .is-closing, then clears .is-closing once the
     quicker close transition has run. */
  var mobileNav = document.getElementById('mobileNav');
  var mobileNavTimer = null;
  var hamburger = document.querySelector('.nav-hamburger');
  var mobileNavClose = mobileNav && mobileNav.querySelector('.mobile-nav-close');
  if (hamburger && mobileNav) {
    hamburger.setAttribute('aria-controls', 'mobileNav');
    hamburger.setAttribute('aria-expanded', 'false');
  }
  window.toggleMobileNav = function () {
    if (!mobileNav) return;
    clearTimeout(mobileNavTimer);
    if (mobileNav.classList.contains('is-open')) {
      mobileNav.classList.remove('is-open');
      mobileNav.classList.add('is-closing');
      mobileNavTimer = setTimeout(function () { mobileNav.classList.remove('is-closing'); }, tokenMs('--duration-quick', 150));
      document.body.style.overflow = '';
      if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
    } else {
      mobileNav.classList.remove('is-closing');
      mobileNav.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      if (hamburger) hamburger.setAttribute('aria-expanded', 'true');
      if (mobileNavClose) mobileNavClose.focus();
    }
  };
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mobileNav && mobileNav.classList.contains('is-open')) {
      toggleMobileNav();
      if (hamburger) hamburger.focus();
    }
  });
  /* Runs after the button's inline onclick has closed the menu. */
  if (mobileNavClose) mobileNavClose.addEventListener('click', function () { if (hamburger) hamburger.focus(); });

  /* Scroll reveals */
  var fadeEls = document.querySelectorAll('.fade-up');
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    fadeEls.forEach(function (el) { observer.observe(el); });
  } else {
    fadeEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* Contact form.
     Posts JSON to /api/contact on this host. CloudFront relays it to a
     small function in the site's own AWS account, which mails it to the
     owner. The function URL only accepts requests CloudFront has signed,
     and a signed POST must carry the SHA-256 of its body in
     x-amz-content-sha256, so the hash is computed here before sending. */
  var form = document.getElementById('contactForm');
  var contactCheck = document.getElementById('contactCheck');
  if (form) {
    var startedAt = Date.now();

    /* Error state shake: replay from a clean start on every failed check. */
    function shake(el) {
      el.classList.remove('is-shaking');
      void el.offsetWidth;
      el.classList.add('is-shaking');
      var ms = tokenMs('--shake-dur-a', 80) * 2 + tokenMs('--shake-dur-b', 60) * 2;
      setTimeout(function () { el.classList.remove('is-shaking'); }, ms + 20);
    }

    /* A field's own message sits under it (#<id>-error) and is linked with aria-describedby
       only while it says something, so a screen reader hears why the field is invalid. */
    function setFieldError(el, message) {
      var slot = document.getElementById(el.id + '-error');
      el.classList.toggle('error', !!message);
      if (message) {
        el.setAttribute('aria-invalid', 'true');
        if (slot) { slot.textContent = message; el.setAttribute('aria-describedby', slot.id); }
      } else {
        el.removeAttribute('aria-invalid');
        el.removeAttribute('aria-describedby');
        if (slot) slot.textContent = '';
      }
    }

    /* Typing into a flagged field clears its error. */
    form.querySelectorAll('.t-input').forEach(function (el) {
      el.addEventListener('input', function () { setFieldError(el, ''); });
    });

    /* The browser's own email check, plus a dot in the domain: a reply has to reach it. */
    function looksLikeEmail(el) {
      return !el.validity.typeMismatch && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim());
    }

    function sha256Hex(text) {
      var bytes = new TextEncoder().encode(text);
      return crypto.subtle.digest('SHA-256', bytes).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) {
          return ('0' + b.toString(16)).slice(-2);
        }).join('');
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nameEl = form.querySelector('[name="name"]');
      var emailEl = form.querySelector('[name="email"]');
      var messageEl = form.querySelector('[name="message"]');
      var kindEl = form.querySelector('[name="kind"]');
      var honeypotEl = form.querySelector('[name="website"]');
      var errorEl = document.getElementById('contactError');
      var submitBtn = form.querySelector('[type="submit"]');
      /* Every problem is shown at once: a message under each field, the fields listed in the
         alert, and focus on the first. Nothing is sent while any field is wrong. */
      var problems = [
        [nameEl, !nameEl.value.trim() ? 'Add your name.' : ''],
        [emailEl, !emailEl.value.trim() ? 'Add an email address so I can reply.'
          : !looksLikeEmail(emailEl) ? 'Check the address: it should look like you@example.com.' : ''],
        [messageEl, !messageEl.value.trim() ? 'Tell me a little about the project.' : '']
      ];
      var wrong = [];
      problems.forEach(function (p) {
        setFieldError(p[0], p[1]);
        if (p[1]) { shake(p[0]); wrong.push(form.querySelector('label[for="' + p[0].id + '"]').textContent); }
      });
      if (wrong.length) {
        errorEl.textContent = (wrong.length === 1 ? 'Check this field: ' : 'Check these fields: ') + wrong.join(', ') + '.';
        errorEl.style.display = 'block';
        form.querySelector('[aria-invalid="true"]').focus();
        return;
      }

      var payload = JSON.stringify({
        name: nameEl.value.trim(),
        email: emailEl.value.trim(),
        kind: kindEl ? kindEl.value : '',
        message: messageEl.value.trim(),
        website: honeypotEl ? honeypotEl.value : '',
        t: startedAt
      });

      var originalLabel = submitBtn.textContent;
      submitBtn.textContent = 'Sending…';
      submitBtn.disabled = true;
      errorEl.style.display = 'none';

      function fail() {
        errorEl.textContent = 'Something went wrong. Email me directly at hello@devofcodes.com.';
        errorEl.style.display = 'block';
        submitBtn.textContent = originalLabel;
        submitBtn.disabled = false;
      }

      if (!window.crypto || !crypto.subtle || !window.TextEncoder) { fail(); return; }

      sha256Hex(payload)
        .then(function (hash) {
          return fetch('/api/contact', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'x-amz-content-sha256': hash
            },
            body: payload
          });
        })
        .then(function (res) {
          if (!res.ok) throw new Error('Submit failed: ' + res.status);
          form.style.display = 'none';
          document.getElementById('contactSuccess').style.display = 'block';
          if (contactCheck) contactCheck.setAttribute('data-state', 'in');
        })
        .catch(fail);
    });
  }

  /* Buttons that open the contact form with a project already chosen */
  document.querySelectorAll('[data-prefill-kind], [data-prefill-message]').forEach(function (link) {
    link.addEventListener('click', function () {
      if (!form) return;
      var kindEl = form.querySelector('[name="kind"]');
      var messageEl = form.querySelector('[name="message"]');
      var kind = link.getAttribute('data-prefill-kind');
      var message = link.getAttribute('data-prefill-message');
      if (kindEl && kind) kindEl.value = kind;
      if (messageEl && message && !messageEl.value.trim()) messageEl.value = message + '\n\n';
      form.style.display = '';
      document.getElementById('contactSuccess').style.display = 'none';
      if (contactCheck) contactCheck.setAttribute('data-state', 'out');
      setTimeout(function () {
        var nameEl = form.querySelector('[name="name"]');
        if (nameEl) nameEl.focus({ preventScroll: true });
      }, 600);
    });
  });

  /* Hero load sequence */
  var staged = document.querySelectorAll('[data-stage]');
  staged.forEach(function (el) {
    var delay = parseInt(el.getAttribute('data-stage'), 10) || 0;
    setTimeout(function () { el.classList.add('anim-in'); }, delay);
  });
})();
