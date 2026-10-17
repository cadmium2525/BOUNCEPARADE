// 開発用：Playwright でスクリーンショットを撮る
//   node tools/shot.mjs map <stage> out.png
//   node tools/shot.mjs play <url-query> out.png [ms] [keys]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || 'playwright');
const [mode, arg, out, ms = '1500', keys = ''] = process.argv.slice(2);
const base = process.env.BASE || 'http://localhost:8123/';
const browser = await chromium.launch();
const mobile = !!process.env.MOBILE;
const page = await browser.newPage({ viewport: mode === 'map' ? { width: 3200, height: 400 } : { width: 844, height: 390 }, deviceScaleFactor: mobile ? 2 : 1, hasTouch: mobile, isMobile: mobile });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
if (mode === 'map') {
  await page.goto(`${base}?map=${arg}&scale=${process.env.SCALE || 0.5}`);
  await page.waitForFunction(() => window.__mapDone, null, { timeout: 15000 });
  const el = await page.$('canvas');
  await el.screenshot({ path: out });
} else {
  await page.goto(`${base}?${arg}`);
  await page.waitForFunction(() => window.__app && window.__app.scene, null, { timeout: 30000 });
  await page.waitForTimeout(600);
  for (const step of keys.split(',').filter(Boolean)) {
    const [k, d] = step.split(':');
    if (k === 'wait') { await page.waitForTimeout(Number(d)); continue; }
    if (k === 'tp') { await page.evaluate((tx) => { const g = window.__app.scene.game; g.player.x = Number(tx) * 16; g.player.y = 100; g.snapCamera(); }, d); continue; }
    if (k === 'click') { const [x, y] = d.split('/').map(Number); await page.mouse.click(x, y); continue; }
    await page.keyboard.down(k); await page.waitForTimeout(Number(d || 100)); await page.keyboard.up(k);
  }
  await page.waitForTimeout(Number(ms));
  await page.screenshot({ path: out });
}
if (errs.length) console.log('ERRORS:\n' + errs.join('\n'));
await browser.close();
