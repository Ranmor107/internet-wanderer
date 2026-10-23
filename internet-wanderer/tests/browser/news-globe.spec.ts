import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { NEWS_REGIONS } from '../../src/ui/globe/geography';

test.beforeEach(async ({ context }) => {
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'wanderer.test') return route.abort();
    const path = resolve('dist', `.${url.pathname === '/' ? '/index.html' : url.pathname}`);
    if (!path.startsWith(`${resolve('dist')}${sep}`)) return route.abort();
    const contentType = ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png' } as Record<string, string>)[extname(path)] ?? 'application/octet-stream';
    await route.fulfill({ body: await readFile(path), contentType });
  });
});

async function region(page: import('@playwright/test').Page, name: string) {
  await page.getByRole('button', { name: '地区信号', exact: true }).click();
  await page.locator('.region-signal-list > div').getByRole('button', { name: new RegExp(name) }).click();
  await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-phase', 'ready');
}

test('world entry renders real WebGL, rotates, zooms, resets, and stays free of an initial article', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#/wander?mode=news');
  const globe = page.getByTestId('earth-viewport');
  await expect(globe).toHaveAttribute('data-renderer', 'ready', { timeout: 20000 });
  await expect(globe.locator('.earth-canvas-host')).toHaveAttribute('data-texture-width', '8192', { timeout: 20000 });
  await expect(page.getByTestId('wander-card')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('earth-entry-desktop.png'), animations: 'disabled' });
  const host = globe.locator('.earth-canvas-host');
  const canvas = host.locator('canvas');
  const initial = await host.getAttribute('data-longitude');
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * .6, box.y + box.height * .45);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .78, box.y + box.height * .6, { steps: 15 });
  await page.mouse.up();
  await expect(host).not.toHaveAttribute('data-longitude', initial!);
  const beforeZoom = Number(await host.getAttribute('data-distance'));
  await page.mouse.wheel(0, -350);
  await expect.poll(async () => Number(await host.getAttribute('data-distance'))).toBeLessThan(beforeZoom);
  await page.getByRole('button', { name: '返回全球视角' }).click();
  await expect(host).toHaveAttribute('data-distance', '3.350');
  await expect(page.getByTestId('earth-dispatch')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('earth-explore-desktop.png'), animations: 'disabled' });
  expect(errors).toEqual([]);
});

test('a missing high-resolution image preserves the usable base globe and news', async ({ page }) => {
  await page.route('**/earth/day-8192.jpg', route => route.fulfill({ status: 404, body: '' }));
  await page.goto('/#/wander?mode=news');
  await expect(page.getByTestId('earth-viewport')).toHaveAttribute('data-renderer', 'ready');
  await expect(page.locator('.earth-canvas-host')).toHaveAttribute('data-texture-width', '2048');
  await region(page, '日本');
  await expect(page.getByTestId('wander-card')).toHaveCount(1);
  await expect(page.getByTestId('earth-viewport')).toHaveAttribute('data-renderer', 'ready');
});

test('country selection filters real reports and flying reveals an overlay without replacing the globe', async ({ page }, testInfo) => {
  await page.goto('/#/wander?mode=news');
  await expect(page.getByTestId('earth-viewport')).toHaveAttribute('data-renderer', 'ready', { timeout: 20000 });
  const canvas = page.locator('.earth-canvas-host canvas');
  await canvas.evaluate(node => node.setAttribute('data-same-canvas', 'yes'));
  await region(page, '日本');
  const card = page.getByTestId('wander-card');
  expect(NEWS_REGIONS.find(region => region.id === 'JP')!.items.map(item => item.title)).toContain(await card.getByRole('heading').innerText());
  await expect(page.getByTestId('earth-dispatch')).toContainText('报道关联地区');
  await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-region', 'JP');
  await page.screenshot({ path: testInfo.outputPath('earth-news-desktop.png'), animations: 'disabled' });
  const oldId = await page.evaluate(() => JSON.parse(localStorage.getItem('internet-wanderer:journey:v1')!).currentId);
  await page.getByRole('button', { name: /^下一站/ }).click();
  await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-phase', 'flying');
  await expect(page.getByTestId('earth-dispatch')).toHaveCount(0);
  await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-phase', 'ready');
  await expect(page.getByTestId('signal-tuner')).not.toHaveAttribute('data-region', 'JP');
  await expect(canvas).toHaveAttribute('data-same-canvas', 'yes');
  const nextId = await page.evaluate(() => JSON.parse(localStorage.getItem('internet-wanderer:journey:v1')!).currentId);
  expect(nextId).not.toBe(oldId);
  await page.getByRole('button', { name: '上一站', exact: true }).click();
  await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-region', 'JP');
  await page.reload();
  await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-phase', 'ready');
  await expect(card.getByRole('heading')).toHaveText(NEWS_REGIONS.find(region => region.id === 'JP')!.items.find(item => item.id === oldId)!.title);
});

test('reduced motion, fast retargeting, signal visibility and mobile overlays remain usable', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/wander?mode=news');
  await expect(page.getByTestId('earth-viewport')).toHaveAttribute('data-renderer', 'ready', { timeout: 20000 });
  await page.screenshot({ path: testInfo.outputPath('earth-entry-mobile.png'), animations: 'disabled' });
  await region(page, '巴西');
  await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-region', 'BR');
  await page.getByRole('button', { name: '展开消息与来源' }).click();
  await expect(page.getByTestId('news-sample-note')).toBeVisible();
  await page.getByRole('button', { name: '收藏当前站', exact: true }).click();
  await expect(page.getByRole('button', { name: '取消收藏当前站', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '关闭新闻，继续探索' }).click();
  await expect(page.getByTestId('earth-dispatch')).toHaveCount(0);
  await page.getByRole('button', { name: '显示地区信号' }).click();
  await expect(page.locator('.earth-pin:visible')).toHaveCount(0);
  await page.getByRole('button', { name: '显示地区信号' }).click();
  await region(page, '日本');
  await expect(page.locator('.bookmark-feedback')).not.toHaveClass(/is-visible/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('earth-news-mobile.png'), animations: 'disabled' });
  await page.getByRole('button', { name: '关闭新闻，继续探索' }).click();
  await page.getByRole('button', { name: '返回全球视角' }).click();
  await page.screenshot({ path: testInfo.outputPath('earth-explore-mobile.png'), animations: 'disabled' });
  await page.goto('/');
  const entry = page.locator('.earth-preview-card');
  await entry.scrollIntoViewIfNeeded();
  await expect(entry.getByTestId('earth-viewport')).toHaveAttribute('data-renderer', 'ready', { timeout: 20000 });
  await entry.screenshot({ path: testInfo.outputPath('earth-home-preview.png'), animations: 'disabled' });
  await entry.getByRole('link', { name: 'News Drift · 接收一则远方消息' }).click();
  await expect(page.getByTestId('wander-card')).toHaveCount(0);
});

test('country surface picking and empty-country feedback use the actual globe ray', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/wander?mode=news');
  await expect(page.getByTestId('earth-viewport')).toHaveAttribute('data-renderer', 'ready');
  await region(page, '法国');
  const pin = page.locator('.earth-pin[data-region="FR"]');
  const pinBox = (await pin.boundingBox())!;
  await page.getByRole('button', { name: '关闭新闻，继续探索' }).click();
  await page.getByRole('button', { name: '显示地区信号' }).click();
  await page.mouse.click(pinBox.x + pinBox.width / 2, pinBox.y + pinBox.height / 2);
  await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-region', 'FR');
  await expect(page.getByTestId('wander-card')).toHaveCount(1);
  await page.getByRole('button', { name: '关闭新闻，继续探索' }).click();
  const canvas = page.locator('.earth-canvas-host canvas');
  await canvas.focus();
  await canvas.press('ArrowRight'); await canvas.press('ArrowRight');
  await canvas.press('ArrowDown'); await canvas.press('ArrowDown');
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2 + Math.min(150, box.width * .1), box.y + box.height / 2);
  await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-region', 'EG');
  await expect(page.getByTestId('earth-dispatch')).toContainText('还没有归类的消息');
  await expect(page.getByTestId('wander-card')).toHaveCount(0);
});

test('a drag interrupts flight and a later selection cannot commit a stale article', async ({ page }) => {
  await page.goto('/#/wander?mode=news');
  await expect(page.getByTestId('earth-viewport')).toHaveAttribute('data-renderer', 'ready');
  await page.getByRole('button', { name: '地区信号', exact: true }).click();
  await page.locator('.region-signal-list > div').getByRole('button', { name: /巴西/ }).click();
  const canvas = page.locator('.earth-canvas-host canvas'), box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * .7, box.y + box.height * .5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .8, box.y + box.height * .6, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-phase', 'exploring');
  await expect(page.getByTestId('wander-card')).toHaveCount(0);
  await region(page, '日本');
  const ids = NEWS_REGIONS.find(region => region.id === 'JP')!.items.map(item => item.id);
  expect(ids).toContain(await page.evaluate(() => JSON.parse(localStorage.getItem('internet-wanderer:journey:v1')!).currentId));
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('internet-wanderer:journey:v1')!).entries.length)).toBe(1);
});

test('missing WebGL shows an honest fallback and keeps region news readable', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
      if (kind.startsWith('webgl')) return null;
      return original.apply(this, [kind, ...args] as Parameters<typeof original>);
    } as typeof original;
  });
  await page.goto('/#/wander?mode=news');
  await expect(page.getByTestId('earth-viewport')).toHaveAttribute('data-renderer', 'unavailable');
  await region(page, '肯尼亚');
  await expect(page.getByTestId('wander-card')).toHaveCount(1);
  await expect(page.getByTestId('earth-viewport')).toHaveAttribute('data-renderer', 'unavailable');
});

test('a local dispatch switches stories without another flight and expands its provenance', async ({ page }) => {
  await page.goto('/#/wander?mode=news');
  await expect(page.getByTestId('earth-viewport')).toHaveAttribute('data-renderer', 'ready');
  await region(page, '日本');
  const host = page.locator('.earth-canvas-host');
  const position = await host.getAttribute('data-longitude');
  const next = page.locator('.region-stories button').first();
  const title = await next.innerText();
  await next.click();
  await expect(page.getByTestId('wander-card').getByRole('heading')).toHaveText(title);
  await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-phase', 'ready');
  await expect(host).toHaveAttribute('data-longitude', position!);
  await expect(page.locator('.dispatch-postmark')).toContainText('DISPATCH RECEIVED');
  await expect(page.locator('.dispatch-provenance')).toHaveCount(0);
  await page.getByRole('button', { name: '展开消息与来源' }).click();
  await expect(page.locator('.dispatch-provenance')).toContainText('并非实时新闻');
  await page.getByRole('button', { name: /^下一站/ }).click();
  await expect(page.locator('.earth-passage')).toBeVisible();
  await expect(page.getByTestId('earth-dispatch')).toHaveCount(0);
  await page.getByRole('button', { name: '返回全球视角' }).click();
  await expect(page.locator('.earth-passage')).toHaveCount(0);
  await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-phase', 'exploring');
});

test.describe('touch globe', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('one finger rotates and two fingers zoom without opening a country by accident', async ({ page }) => {
    await page.goto('/#/wander?mode=news');
    await expect(page.getByTestId('earth-viewport')).toHaveAttribute('data-renderer', 'ready');
    const host = page.locator('.earth-canvas-host');
    const initial = await host.getAttribute('data-longitude');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 180, y: 430 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 240, y: 465 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(host).not.toHaveAttribute('data-longitude', initial!);
    // Test gestures on the globe itself, without a moving HTML signal target
    // under either finger after the first rotation.
    await page.getByRole('button', { name: '显示地区信号' }).click();
    const distance = Number(await host.getAttribute('data-distance'));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 140, y: 430 }, { x: 230, y: 430 }] });
    // Sample a gesture across rendered frames; a single immediate move/end can
    // be coalesced away while the GPU uploads a high-resolution texture.
    for (let step = 1; step <= 5; step++) {
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 140 - step * 10, y: 430 - step * 2 }, { x: 230 + step * 10, y: 430 + step * 2 }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(async () => Number(await host.getAttribute('data-distance'))).toBeLessThan(distance);
    await expect(page.getByTestId('wander-card')).toHaveCount(0);
    await cdp.detach();
  });
});
