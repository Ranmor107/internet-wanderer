import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

test.beforeEach(async ({ context }) => {
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'wanderer.test') return route.abort();
    const path = resolve('dist', `.${url.pathname === '/' ? '/index.html' : url.pathname}`);
    if (!path.startsWith(`${resolve('dist')}${sep}`)) return route.abort();
    const contentType = ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' } as Record<string, string>)[extname(path)] ?? 'application/octet-stream';
    await route.fulfill({ body: await readFile(path), contentType });
  });
});

for (const [title, url] of [
  ['Cat Bounce', 'https://cat-bounce.com/'],
  ['If the Moon Were Only 1 Pixel', 'https://www.joshworth.com/dev/pixelspace/pixelspace_solarsystem.html'],
  ['WindowSwap', 'https://www.window-swap.com/'],
  ['Sandspiel', 'https://sandspiel.club/'],
  ['Nicky Case', 'https://ncase.me/'],
  ["Cameron's World", 'https://www.cameronsworld.net/'],
]) {
  test(`sample window opens ${title} directly in a new tab without changing the journey`, async ({ page, context }) => {
    await page.goto('/');
    await expect(page.getByTestId('site-example')).toHaveCount(6);
    const sample = page.getByRole('link', { name: `打开网站：${title}（新标签页）`, exact: true });
    await expect(sample).toHaveAttribute('href', url);
    await expect(sample).toHaveAttribute('target', '_blank');
    await expect(sample).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(sample.getByTestId('website-preview')).toHaveAttribute('aria-label', `${title} 的原创视觉示意`);
    const journey = await page.evaluate(() => localStorage.getItem('internet-wanderer:journey:v1'));
    // The shared context route aborts external requests; the navigation itself is real.
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      context.waitForEvent('request', request => request.isNavigationRequest() && request.url() === url),
      sample.click(),
    ]);
    await expect(page).toHaveURL('http://wanderer.test/');
    expect(await page.evaluate(() => localStorage.getItem('internet-wanderer:journey:v1'))).toBe(journey);
    await popup.close();
  });
}

test('unknown branches are keyboard actions that grow real footsteps and keep focus', async ({ page }) => {
  await page.goto('/#/wander?mode=elsewhere');
  const heading = page.getByTestId('wander-card').getByRole('heading');
  const first = await heading.innerText();
  const branch = page.getByRole('button', { name: '探索未知分支 3', exact: true });
  await branch.focus();
  await branch.press('Enter');
  await expect(heading).not.toHaveText(first);
  await expect(branch).toBeFocused();
  await expect(page.getByRole('button', { name: `回访：${first}`, exact: true })).toHaveAttribute('aria-pressed', 'false');
  const next = await heading.innerText();
  await expect(page.locator('.current-coordinate').getByRole('button')).toHaveAccessibleName(`回访：${next}`);
  await page.getByRole('button', { name: `回访：${first}`, exact: true }).click();
  await expect(heading).toHaveText(first);
});

test('publisher-only reports identify their geographic basis without pretending to locate the event', async ({ page }) => {
  await page.goto('/#/wander?mode=news');
  await page.getByRole('button', { name: '地区信号', exact: true }).click();
  const select = page.getByRole('combobox', { name: '新闻来源', exact: true });
  for (const [id, code] of [['nasa', 'US'], ['ecb', 'DE']]) {
    await select.selectOption(id);
    await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-phase', 'ready');
    await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-region', code);
    await expect(page.getByTestId('earth-dispatch')).toContainText('发布机构所在地');
    await expect(page.getByTestId('wander-card').locator('.news-context')).toContainText('发表于');
  }
});

test('the era exhibition gives the archive a lead space and restores all three original records', async ({ page }) => {
  await page.goto('/#/wander?mode=time&year=2016');
  const gallery = page.getByTestId('museum-gallery');
  await expect(gallery.locator('.exhibit-lead .kind-archive')).toBeVisible();
  await expect(gallery.locator('.exhibit-side .event-marker')).toBeVisible();
  await expect(gallery.locator('.exhibit-place .website-preview')).toBeVisible();
  const lead = (await gallery.locator('.exhibit-lead').boundingBox())!;
  const side = (await gallery.locator('.exhibit-side').first().boundingBox())!;
  expect(lead.width).toBeGreaterThan(side.width * 1.2);
  await expect(gallery.locator('.archive-artifact')).toHaveAttribute('aria-label', /非原站截图/);
  const titles = await gallery.getByRole('heading').allTextContents();
  await page.reload();
  await expect(gallery.getByRole('heading')).toHaveText(titles);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const selected = (await page.getByRole('link', { name: '2016', exact: true }).boundingBox())!;
  expect(selected.x).toBeGreaterThanOrEqual(0);
  expect(selected.x + selected.width).toBeLessThanOrEqual(390);
  const title = await gallery.locator('.exhibit-lead').getByRole('heading').innerText();
  await page.getByRole('button', { name: '收藏当前站', exact: true }).click();
  await expect(gallery.getByRole('button', { name: `取消收藏：${title}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('small screens expose departure and keyboard-open offscreen samples in a new tab', async ({ page, context }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 640 });
    await page.goto('/');
    const departure = (await page.getByTestId('home-surprise-cta').boundingBox())!;
    expect(departure.y + departure.height).toBeLessThan(570);
    expect(departure.height).toBeGreaterThanOrEqual(78);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const sample = page.getByRole('link', { name: "打开网站：Cameron's World（新标签页）", exact: true });
    const journey = await page.evaluate(() => localStorage.getItem('internet-wanderer:journey:v1'));
    await sample.focus();
    await expect(sample).toBeInViewport();
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      context.waitForEvent('request', request => request.isNavigationRequest() && request.url() === 'https://www.cameronsworld.net/'),
      sample.press('Enter'),
    ]);
    await expect(page).toHaveURL('http://wanderer.test/');
    expect(await page.evaluate(() => localStorage.getItem('internet-wanderer:journey:v1'))).toBe(journey);
    await popup.close();
  }
});

test('sample feedback treats pointer and keyboard alike and respects reduced motion', async ({ page }) => {
  await page.goto('/');
  const sample = page.getByTestId('site-example').nth(1);
  await sample.hover();
  await expect(sample).toHaveCSS('translate', '0px 7px');
  const hoverShadow = await sample.evaluate(element => getComputedStyle(element).boxShadow);
  await page.mouse.move(0, 0);
  await sample.focus();
  await sample.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(sample).toBeFocused();
  await expect(sample).toHaveCSS('translate', '0px 7px');
  await expect(sample).toHaveCSS('box-shadow', hoverShadow);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(sample).toHaveCSS('translate', '0px 14px');
  await page.mouse.move(0, 0);
  await sample.hover();
  await expect(sample).toHaveCSS('translate', '0px 14px');
});
