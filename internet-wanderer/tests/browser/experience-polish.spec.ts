import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

test.beforeEach(async ({ context }) => {
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    const path = resolve('dist', `.${url.pathname === '/' ? '/index.html' : url.pathname}`);
    if (url.hostname !== 'wanderer.test' || !path.startsWith(resolve('dist') + sep)) return route.abort();
    await route.fulfill({ body: await readFile(path), contentType: ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg' } as Record<string, string>)[extname(path)] ?? 'application/octet-stream' });
  });
});

test('zoom buttons ease from the current view, accumulate rapid clicks and yield to direct manipulation', async ({ page }) => {
  await page.goto('/#/wander?mode=news');
  await expect(page.getByTestId('earth-viewport')).toHaveAttribute('data-renderer', 'ready');
  const host = page.locator('.earth-canvas-host');
  const start = Number(await host.getAttribute('data-distance'));
  const samples = await page.evaluate(async () => {
    const button = document.querySelector<HTMLButtonElement>('[aria-label="放大地球"]')!;
    button.click(); button.click();
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    return Number((document.querySelector('.earth-canvas-host') as HTMLElement).dataset.distance);
  });
  expect(samples).toBeLessThan(start);
  expect(samples).toBeGreaterThan(start * .82 ** 2);
  await expect.poll(async () => Number(await host.getAttribute('data-distance'))).toBeCloseTo(start * .82 ** 2, 2);
  await page.getByRole('button', { name: '返回全球视角' }).click();
  await expect(host).toHaveAttribute('data-distance', '3.350');
  const canvas = host.locator('canvas');
  await page.getByRole('button', { name: '放大地球' }).click();
  await canvas.focus();
  await canvas.press('Home');
  await expect(host).toHaveAttribute('data-distance', '3.350');
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(host).toHaveAttribute('data-distance', '3.350');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: '放大地球' }).click();
  await expect(host).toHaveAttribute('data-distance', '2.747');
});

test('regional reading resets its scroll and preserves a usable keyboard focus on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/wander?mode=news');
  await expect(page.getByTestId('earth-viewport')).toHaveAttribute('data-renderer', 'ready');
  const toggle = page.getByRole('button', { name: '地区信号', exact: true });
  await toggle.focus(); await toggle.press('Enter');
  const japan = page.locator('.region-signal-list > div').getByRole('button', { name: /日本/ });
  await japan.focus(); await japan.press('Enter');
  const heading = page.getByTestId('wander-card').getByRole('heading');
  await expect(heading).toBeFocused();
  const panel = page.getByTestId('earth-dispatch');
  const next = panel.locator('.region-stories button').first();
  const title = await next.innerText();
  await next.focus();
  expect(await panel.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  await next.press('Enter');
  await expect(heading).toHaveText(title);
  await expect(heading).toBeFocused();
  await expect.poll(() => panel.evaluate(node => node.scrollTop)).toBe(0);
  await toggle.click();
  await page.locator('.region-signal-list button').first().focus();
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await expect(panel).toBeVisible();
  await toggle.click();
  await page.locator('.earth-topic-filter > span').click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await heading.focus(); await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(page.locator('.earth-canvas-host canvas')).toBeFocused();
});

test('page entrance never displaces the mobile viewport-fixed journey actions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/wander?mode=elsewhere');
  await expect(page.getByTestId('journey-controls')).toBeVisible();
  const measurement = await page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('.page-enter')!;
    main.style.animation = 'none'; void main.offsetWidth; main.style.animation = '';
    const animation = main.getAnimations().find(animation => animation instanceof CSSAnimation && animation.animationName === 'page-arrive')!;
    animation.pause(); animation.currentTime = 120;
    const buttons = document.querySelector('[data-testid="journey-controls"]')!;
    const box = buttons.getBoundingClientRect();
    const transform = getComputedStyle(main).transform;
    animation.cancel();
    return { transform, bottom: box.bottom, top: box.top, viewport: innerHeight };
  });
  expect(measurement.transform).toBe('none');
  expect(measurement.bottom).toBeLessThanOrEqual(measurement.viewport);
  expect(measurement.top).toBeGreaterThan(measurement.viewport - 110);
});

test('arriving at a region never steals focus after the user tabs elsewhere during the flight', async ({ page }) => {
  await page.goto('/#/wander?mode=news');
  await expect(page.getByTestId('earth-viewport')).toHaveAttribute('data-renderer', 'ready');
  const toggle = page.getByRole('button', { name: '地区信号', exact: true });
  await toggle.focus(); await toggle.press('Enter');
  const region = page.locator('.region-signal-list > div').getByRole('button', { name: /巴西/ });
  await region.focus(); await region.press('Enter');
  await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-phase', 'flying');
  await toggle.press('Tab');
  await page.evaluate(() => document.activeElement?.setAttribute('data-user-focused', 'yes'));
  await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-phase', 'ready');
  await expect(page.locator('[data-user-focused="yes"]')).toBeFocused();
});
