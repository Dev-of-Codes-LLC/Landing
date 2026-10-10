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

  /* Mobile nav */
  var mobileNav = document.getElementById('mobileNav');
  window.toggleMobileNav = function () {
    if (!mobileNav) return;
    var open = mobileNav.classList.toggle('active');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mobileNav && mobileNav.classList.contains('active')) toggleMobileNav();
  });

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
  if (form) {
    var startedAt = Date.now();

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
      var valid = true;

      [nameEl, emailEl, messageEl].forEach(function (el) {
        el.classList.remove('error');
        if (!el.value.trim()) { el.classList.add('error'); valid = false; }
      });
      if (!valid) return;

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
