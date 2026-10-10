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

  /* Contact form (Formspree) */
  var form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nameEl = form.querySelector('[name="name"]');
      var emailEl = form.querySelector('[name="email"]');
      var messageEl = form.querySelector('[name="message"]');
      var errorEl = document.getElementById('contactError');
      var submitBtn = form.querySelector('[type="submit"]');
      var valid = true;

      [nameEl, emailEl, messageEl].forEach(function (el) {
        el.classList.remove('error');
        if (!el.value.trim()) { el.classList.add('error'); valid = false; }
      });
      if (!valid) return;

      var data = {
        name: nameEl.value.trim(),
        email: emailEl.value.trim(),
        message: messageEl.value.trim(),
        _subject: 'Project inquiry — devofcodes.com'
      };
      var kind = form.querySelector('[name="kind"]');
      if (kind && kind.value) data.kind = kind.value;

      var originalLabel = submitBtn.textContent;
      submitBtn.textContent = 'Sending…';
      submitBtn.disabled = true;
      errorEl.style.display = 'none';

      fetch('https://formspree.io/f/maqpqnyk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          if (!res.ok) throw new Error('Submit failed');
          form.style.display = 'none';
          document.getElementById('contactSuccess').style.display = 'block';
        })
        .catch(function () {
          errorEl.textContent = 'Something went wrong. Email me directly at hello@devofcodes.com.';
          errorEl.style.display = 'block';
          submitBtn.textContent = originalLabel;
          submitBtn.disabled = false;
        });
    });
  }

  /* Hero load sequence */
  var staged = document.querySelectorAll('[data-stage]');
  staged.forEach(function (el) {
    var delay = parseInt(el.getAttribute('data-stage'), 10) || 0;
    setTimeout(function () { el.classList.add('anim-in'); }, delay);
  });
})();
