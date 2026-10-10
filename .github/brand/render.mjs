// Renders the GitHub brand images from the HTML templates in src/.
//
//   npm i --no-save playwright && npx playwright install chromium
//   node .github/brand/render.mjs
//
// Add a repository's social preview by adding a row to IMAGES.

import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (file, params = {}) => {
  const url = pathToFileURL(path.join(here, 'src', file));
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.href;
};

const IMAGES = [
  { out: 'org-profile/banner.png', url: src('banner.html'), width: 1280, height: 320, scale: 2 },
  { out: 'avatar.png', url: src('avatar.html'), width: 512, height: 512, scale: 2 },
  {
    out: 'social-landing.png', width: 1280, height: 640, scale: 1,
    url: src('social.html', {
      repo: 'Landing',
      desc: 'Source for devofcodes.com. Static pages with live WebGPU backgrounds, deployed to S3 and CloudFront on every push to main.',
      stack: 'HTML,CSS,WebGPU,GitHub Actions',
    }),
  },
];

const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '<-loopback>' } : undefined;
const browser = await chromium.launch({ proxy });
for (const img of IMAGES) {
  const page = await browser.newPage({ viewport: { width: img.width, height: img.height }, deviceScaleFactor: img.scale });
  await page.goto(img.url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.card').screenshot({ path: path.join(here, img.out), omitBackground: true });
  await page.close();
  console.log('wrote', img.out);
}
await browser.close();
