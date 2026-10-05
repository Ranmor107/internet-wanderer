import { expect, test } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';

let server: ViteDevServer;
let origin: string;
test.beforeAll(async () => {
  server = await createServer({ root: resolve('.'), server: { host: '127.0.0.1', port: 0, strictPort: true } });
  await server.listen();
  origin = `http://127.0.0.1:${(server.httpServer!.address() as AddressInfo).port}`;
});
test.afterAll(async () => { await server?.close(); });
test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
});

test('provider failure and retry keep unsaved favorites while validating replacement content', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('Unavailable storage'); } }));
  await page.goto(`${origin}/tests/fixtures/provider.html#/wander?mode=elsewhere`);
  const card = page.getByTestId('wander-card');
  const title = await card.getByRole('heading').innerText();
  await page.getByRole('button', { name: `收藏：${title}`, exact: true }).click();
  await page.getByRole('button', { name: 'Switch retry source', exact: true }).click();
  await expect(page.getByRole('heading', { name: '稍等，链接有点绕。' })).toBeVisible();
  await page.getByRole('button', { name: '再试一次', exact: true }).click();
  await expect(card.getByRole('heading')).toHaveText('Changed source sample');
  await page.getByRole('button', { name: '打开收藏', exact: true }).click();
  await expect(page.getByTestId('bookmark-entry')).toHaveCount(1);
  await expect(page.getByTestId('bookmark-entry')).toContainText(title);
  expect(errors).toEqual([]);
});

test('late results from a replaced provider cannot overwrite the active source', async ({ page }) => {
  await page.goto(`${origin}/tests/fixtures/provider.html#/wander?mode=elsewhere`);
  await expect(page.getByTestId('wander-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Switch slow source', exact: true }).click();
  await expect(page.getByRole('heading', { name: '正在打开一扇窗。' })).toBeVisible();
  await page.getByRole('button', { name: 'Switch static source', exact: true }).click();
  await expect(page.getByTestId('wander-card').getByRole('heading')).toHaveText('Changed source sample');
  await page.getByRole('button', { name: 'Resolve obsolete source', exact: true }).click();
  await expect(page.getByText('Obsolete source resolved', { exact: true })).toBeVisible();
  await expect(page.getByTestId('wander-card').getByRole('heading')).toHaveText('Changed source sample');
});
