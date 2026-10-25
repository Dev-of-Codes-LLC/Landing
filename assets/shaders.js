/* DevOfCodes — the home page's WebGPU hero background, built with the open-source `shaders` library
   (https://github.com/shader-effects-inc/shaders, MIT).
   Every surface has a CSS fallback underneath, so the page is complete without this file. */

const CDN = 'https://cdn.jsdelivr.net/npm/shaders@4.0.4/dist/js/bundle.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = navigator.connection && navigator.connection.saveData;

const PRESETS = {
  /* Hero: a slow, low-contrast mesh in the site palette, grain and cursor paint. It reads as light,
     not as a pattern: no dot grid, and the brightest stops are dimmed. */
  hero: {
    components: [
      {
        type: 'MeshGradient', id: 'heroMesh',
        props: {
          stops: [
            { color: '#080A0F', position: 0 },
            { color: '#0A1522', position: 0.3 },
            { color: '#0D3446', position: 0.58 },
            { color: '#0A7A9C', position: 0.8 },
            { color: '#11617A', position: 0.93 },
            { color: '#6E4A14', position: 1 }
          ],
          colorSpace: 'oklab', count: 6, smoothness: 2.8, variation: 0.35,
          swirl: 0.18, drift: 0.4, speed: 0.22, seed: 11
        }
      },
      { type: 'SimplexNoise', props: { colorA: '#ffffff', colorB: '#000000', scale: -0.8, speed: 0.25, opacity: 0.09, blendMode: 'softLight' } },
      { type: 'CursorTrail', props: { colorA: '#00C8FF', colorB: '#F59E0B', radius: 0.6, length: 0.7, shrink: 1, softness: 0.7, opacity: 0.2, blendMode: 'screen' } },
      { type: 'Vignette', props: { color: '#080A0F', center: { x: 0.5, y: 0.45 }, radius: 0.55, falloff: 1.0, intensity: 0.95 } }
    ]
  }
};

let libPromise = null;
function loadLib() {
  if (!libPromise) {
    libPromise = import(CDN).catch((err) => {
      console.info('[devofcodes] shaders library did not load; CSS fallbacks stay.', err);
      return null;
    });
  }
  return libPromise;
}

/* Mount one surface. Surfaces mount one at a time so pipeline compilation never piles up. */
let queue = Promise.resolve();
function mount(surface) {
  if (surface.dataset.mounted) return;
  surface.dataset.mounted = '1';
  queue = queue.then(async () => {
    const lib = await loadLib();
    const preset = PRESETS[surface.getAttribute('data-shader')];
    if (!lib || !preset) return;

    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    surface.appendChild(canvas);

    try {
      await lib.createShader(canvas, preset, {
        disableTelemetry: true,
        onReady: () => surface.classList.add('shader-ready'),
        onError: (reason) => {
          surface.classList.remove('shader-ready');
          surface.classList.add('shader-failed');
          console.info('[devofcodes] shader "' + surface.getAttribute('data-shader') + '" stopped: ' + reason);
        }
      });
    } catch (err) {
      surface.classList.add('shader-failed');
      canvas.remove();
      console.info('[devofcodes] shader "' + surface.getAttribute('data-shader') + '" failed to start.', err);
    }
    /* give the main thread a breath before the next surface compiles */
    await new Promise((r) => setTimeout(r, 250));
  });
}

/* The hero mounts as soon as the page is idle; every other surface waits until it is near the viewport. */
function mountAll() {
  const surfaces = Array.from(document.querySelectorAll('[data-shader]'));
  if (!surfaces.length) return;

  const hero = surfaces.find((s) => s.getAttribute('data-shader') === 'hero');
  if (hero) mount(hero);

  const rest = surfaces.filter((s) => s !== hero);
  if (!('IntersectionObserver' in window)) { rest.forEach(mount); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { io.unobserve(entry.target); mount(entry.target); }
    });
  }, { rootMargin: '400px 0px' });
  rest.forEach((s) => io.observe(s));
}

if (!reducedMotion && !saveData) {
  const start = () => ('requestIdleCallback' in window ? requestIdleCallback(mountAll, { timeout: 1500 }) : setTimeout(mountAll, 200));
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}
