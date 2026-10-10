/* DevOfCodes — WebGPU covers built with the open-source `shaders` library
   (https://github.com/shader-effects-inc/shaders, MIT).
   Every surface has a CSS fallback underneath, so the page is complete without this file. */

const CDN = 'https://cdn.jsdelivr.net/npm/shaders@4.0.4/dist/js/bundle.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = navigator.connection && navigator.connection.saveData;

const PRESETS = {
  /* Hero: a slow mesh in the site palette, grain, a twinkling dot grid, cursor paint. */
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
            { color: '#00C8FF', position: 0.93 },
            { color: '#F59E0B', position: 1 }
          ],
          colorSpace: 'oklab', count: 6, smoothness: 2.8, variation: 0.35,
          swirl: 0.18, drift: 0.4, speed: 0.22, seed: 11
        }
      },
      { type: 'SimplexNoise', props: { colorA: '#ffffff', colorB: '#000000', scale: -0.8, speed: 0.25, opacity: 0.09, blendMode: 'softLight' } },
      { type: 'DotGrid', props: { color: '#BFEAF7', density: 26, dotSize: 0.07, twinkle: 0.45, opacity: 0.32 } },
      { type: 'CursorTrail', props: { colorA: '#00C8FF', colorB: '#F59E0B', radius: 0.6, length: 0.7, shrink: 1, softness: 0.7, opacity: 0.35, blendMode: 'screen' } },
      { type: 'Vignette', props: { color: '#080A0F', center: { x: 0.5, y: 0.45 }, radius: 0.55, falloff: 1.0, intensity: 0.95 } }
    ]
  },

  /* BBI: a slowly turning voxel cube, lit like a tabletop model. */
  bbi: {
    components: [
      {
        type: 'Voxels', id: 'bbiCube',
        props: {
          shape: {
            type: 'cube3D', sizeX: 0.27, sizeY: 0.27, sizeZ: 0.27, rounding: 0,
            rotX: -30, rotZ: 12,
            rotY: { type: 'auto-animate', mode: 'loop', outputMin: -180, outputMax: 180, speed: 0.1 }
          },
          voxelSize: 0.045, voxelScale: 0.96, bevel: 0.1, seams: 0.4,
          colorA: '#F59E0B', colorB: '#4A2E06', colorMode: 'height', colorVariation: 0.35, colorSpace: 'oklab',
          lightAngle: 215, lightElevation: 48, lightColor: '#FFF2DF', lightIntensity: 1.15,
          ambientColor: '#28506B', ambient: 0.6, shadows: 0.8, shadowSoftness: 0.4, ao: 1.1,
          glossiness: 0.3, specular: 0.5, scale: 0.85
        }
      }
    ]
  },

  /* Open editor plan: a flowing gradient rendered as text, the way an editor would see it. */
  editor: {
    components: [
      { type: 'FlowingGradient', props: { colorA: '#080A0F', colorB: '#0D3446', colorC: '#00C8FF', colorD: '#F59E0B', colorSpace: 'oklch', speed: 0.35, distortion: 0.8, seed: 3 } },
      { type: 'Ascii', props: { characters: '@%#*+=-:. ', cellSize: 15, fontFamily: 'JetBrains Mono', spacing: 0.9, gamma: 1.15 } }
    ]
  },

  /* Platform: a hex lattice with light coming in from one corner. */
  platform: {
    components: [
      { type: 'HexGrid', props: { colorA: '#0B0F16', colorB: '#1B5E73', cells: 11, thickness: 0.6, variation: 0.4, softness: 0.08 } },
      { type: 'Godrays', props: { center: { x: 0.9, y: 0.05 }, rayColor: '#00C8FF', density: 0.25, intensity: 0.55, spotty: 0.5, speed: 0.25, opacity: 0.55, blendMode: 'screen' } },
      { type: 'Vignette', props: { color: '#080A0F', radius: 0.5, falloff: 0.85, intensity: 0.85 } }
    ]
  },

  /* Contact: a quiet aurora. */
  contact: {
    components: [
      { type: 'Aurora', props: { colorA: '#0A3A4D', colorB: '#00C8FF', colorC: '#F59E0B', intensity: 55, curtainCount: 3, speed: 2.5, waviness: 60, rayDensity: 18, height: 110, center: { x: 0.5, y: 0.05 }, seed: 4, opacity: 0.6 } },
      { type: 'Vignette', props: { color: '#080A0F', radius: 0.45, falloff: 0.9, intensity: 0.9 } }
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
