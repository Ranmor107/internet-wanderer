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

for (const title of ['Cat Bounce', 'If the Moon Were Only 1 Pixel', 'WindowSwap', 'Sandspiel', 'Nicky Case', "Cameron's World"]) {
  test(`sample window opens ${title} and preserves it on reload`, async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('site-example')).toHaveCount(6);
    await page.getByRole('link', { name: `探索示例：${title}`, exact: true }).click();
    await expect(page.getByTestId('node-map').getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.getByTestId('website-preview')).toHaveAttribute('aria-label', `${title} 的原创视觉示意`);
    await page.reload();
    await expect(page.getByTestId('wander-card').getByRole('heading')).toHaveText(title);
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

test('small screens expose the departure action and scroll website samples without widening the page', async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 640 });
    await page.goto('/');
    const departure = (await page.getByTestId('home-surprise-cta').boundingBox())!;
    expect(departure.y + departure.height).toBeLessThan(570);
    expect(departure.height).toBeGreaterThanOrEqual(78);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('link', { name: "探索示例：Cameron's World", exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('wander-card').getByRole('heading')).toHaveText("Cameron's World");
  }
});
