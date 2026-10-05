import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import newsSnapshot from '../../data/news.snapshot.json' with { type: 'json' };

const STORAGE_KEY = 'internet-wanderer:bookmarks:v1';
type SavedBookmark = {
  id: string;
  savedAt: string;
  item: Record<string, unknown> & { id: string; title: string; url: string };
  source?: Record<string, unknown>;
};
type Backup = {
  app: 'internet-wanderer';
  schemaVersion: 1;
  exportedAt: string;
  bookmarks: SavedBookmark[];
};

// Production assets only. External navigation and network requests are blocked.
test.beforeEach(async ({ context }) => {
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'wanderer.test') return route.abort();
    const path = resolve('dist', `.${url.pathname === '/' ? '/index.html' : url.pathname}`);
    if (!path.startsWith(`${resolve('dist')}${sep}`)) return route.abort();
    try {
      const contentType = ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' } as Record<string, string>)[extname(path)] ?? 'application/octet-stream';
      await route.fulfill({ body: await readFile(path), contentType });
    } catch {
      await route.fulfill({ status: 404, body: 'Not found' });
    }
  });
});

const drawer = (page: Page) => page.getByRole('dialog', { name: '我的收藏', exact: true });
const entries = (page: Page) => drawer(page).getByTestId('bookmark-entry');
const confirmImport = (page: Page) => drawer(page).getByRole('button', { name: /^导入 \d+ 条收藏$/ });

async function saveCurrent(page: Page): Promise<string> {
  const title = await page.getByTestId('wander-card').first().getByRole('heading').innerText();
  await page.getByRole('button', { name: `收藏：${title}`, exact: true }).click();
  await expect(page.getByRole('button', { name: `取消收藏：${title}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
  return title;
}

async function openDrawer(page: Page) {
  await page.getByRole('button', { name: '打开收藏', exact: true }).click();
  await expect(drawer(page)).toBeVisible();
}

async function exportBackup(page: Page): Promise<Backup> {
  const downloaded = page.waitForEvent('download');
  await drawer(page).getByRole('button', { name: '导出收藏', exact: true }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  const path = await download.path();
  expect(path).not.toBeNull();
  const backup = JSON.parse(await readFile(path!, 'utf8')) as Backup;
  expect(backup.app).toBe('internet-wanderer');
  expect(backup.schemaVersion).toBe(1);
  expect(Number.isFinite(Date.parse(backup.exportedAt))).toBe(true);
  return backup;
}

async function selectBackup(page: Page, backup: unknown) {
  await drawer(page).getByLabel('选择收藏备份文件', { exact: true }).setInputFiles({
    name: 'wanderer-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
}

test('saving survives reload and removing updates both the drawer and card', async ({ page }) => {
  await page.goto('/#/wander?mode=elsewhere');
  const title = await saveCurrent(page);
  await page.reload();
  await expect(page.getByRole('button', { name: `取消收藏：${title}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await openDrawer(page);
  await expect(entries(page)).toHaveCount(1);
  await expect(entries(page).first()).toContainText(title);
  await drawer(page).getByRole('button', { name: `移除收藏：${title}`, exact: true }).click();
  await expect(entries(page)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: `收藏：${title}`, exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await openDrawer(page);
  await expect(entries(page)).toHaveCount(0);
});

test('clearing the recent trail leaves saved favorites intact', async ({ page }) => {
  await page.goto('/#/wander?mode=elsewhere');
  const title = await saveCurrent(page);
  await page.getByRole('button', { name: '下一站', exact: true }).click();
  await page.getByRole('button', { name: '足迹', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '清空足迹', exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('internet-wanderer:journey:v1')!).entries.length)).toBe(0);
  await page.keyboard.press('Escape');
  await openDrawer(page);
  await expect(entries(page)).toHaveCount(1);
  await expect(entries(page).first()).toContainText(title);
});

test('export/import round trip previews additions, deduplicates and preserves local records', async ({ page }) => {
  await page.goto('/#/wander?mode=elsewhere');
  const title = await saveCurrent(page);
  await openDrawer(page);
  const original = await exportBackup(page);
  expect(original.bookmarks).toHaveLength(1);
  expect(original.bookmarks[0].item.title).toBe(title);
  await drawer(page).getByRole('button', { name: `移除收藏：${title}`, exact: true }).click();
  await selectBackup(page, original);
  await expect(entries(page)).toHaveCount(0);
  await expect(confirmImport(page)).toHaveText('导入 1 条收藏');
  await confirmImport(page).click();
  await expect(entries(page)).toHaveCount(1);
  expect((await exportBackup(page)).bookmarks).toEqual(original.bookmarks);

  const duplicate = structuredClone(original.bookmarks[0]);
  duplicate.item.title = 'This duplicate must not replace the local title';
  duplicate.item.url = 'https://example.org/do-not-overwrite';
  const added = structuredClone(original.bookmarks[0]);
  added.id = 'imported-browser-test-site';
  added.item.id = added.id;
  added.item.title = 'An imported independent corner';
  added.item.url = 'https://example.org/imported-corner';
  await selectBackup(page, { ...original, bookmarks: [duplicate, added] });
  await expect(entries(page)).toHaveCount(1);
  await expect(confirmImport(page)).toHaveText('导入 1 条收藏');
  await expect(drawer(page).getByText(/重复\s*1|1\s*条重复|已存在\s*1/).first()).toBeVisible();
  await confirmImport(page).click();
  await expect(entries(page)).toHaveCount(2);
  const merged = await exportBackup(page);
  expect(merged.bookmarks.find((entry) => entry.id === original.bookmarks[0].id)).toEqual(original.bookmarks[0]);
  expect(merged.bookmarks.find((entry) => entry.id === added.id)?.item.title).toBe(added.item.title);
});

test('canceling an import preview leaves favorites and persistent storage unchanged', async ({ page }) => {
  await page.goto('/#/wander?mode=elsewhere');
  await saveCurrent(page);
  await openDrawer(page);
  const original = await exportBackup(page);
  const before = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  const imported = structuredClone(original.bookmarks[0]);
  imported.id = 'cancelled-import';
  imported.item.id = imported.id;
  imported.item.title = 'This entry is only a preview';
  imported.item.url = 'https://example.org/preview-only';
  await selectBackup(page, { ...original, bookmarks: [imported] });
  await expect(confirmImport(page)).toBeVisible();
  await expect(entries(page)).toHaveCount(1);
  await drawer(page).getByRole('button', { name: '取消导入', exact: true }).click();
  await expect(confirmImport(page)).toHaveCount(0);
  await expect(entries(page)).toHaveCount(1);
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(before);
});

test('a file containing an executable URL is rejected atomically', async ({ page }) => {
  await page.goto('/#/wander?mode=elsewhere');
  await saveCurrent(page);
  await openDrawer(page);
  const original = await exportBackup(page);
  const before = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  const valid = structuredClone(original.bookmarks[0]);
  valid.id = 'valid-part-of-rejected-file';
  valid.item.id = valid.id;
  valid.item.title = 'This valid sibling must not be partially imported';
  valid.item.url = 'https://example.org/valid';
  const unsafe = structuredClone(valid);
  unsafe.id = 'unsafe-part-of-rejected-file';
  unsafe.item.id = unsafe.id;
  unsafe.item.url = 'javascript:window.__unsafeBookmarkExecuted=true';
  await selectBackup(page, { ...original, bookmarks: [valid, unsafe] });
  await expect(drawer(page).getByRole('alert')).toBeVisible();
  await expect(confirmImport(page)).toHaveCount(0);
  await expect(entries(page)).toHaveCount(1);
  expect((await exportBackup(page)).bookmarks).toEqual(original.bookmarks);
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(before);
  expect(await page.evaluate(() => '__unsafeBookmarkExecuted' in window)).toBe(false);
});

test('expired saved news retains attribution and stays separate from Demo news and Surprise Me', async ({ page }) => {
  const original = newsSnapshot.items.find((entry) => entry.sourceId === 'global-voices')!;
  const currentTime = new Date(Date.parse(newsSnapshot.generatedAt!) + 8 * 24 * 60 * 60 * 1000);
  await page.clock.setFixedTime(currentTime);
  await page.goto('/#/wander?mode=news');
  await expect(page.getByTestId('wander-card')).toHaveCount(1);
  await expect(page.getByTestId('news-sample-note')).toContainText('样本');
  await openDrawer(page);
  const item = {
    ...original,
    id: 'archived-favorite-not-in-current-feed',
    title: 'A past story saved outside the current feed',
    url: 'https://globalvoices.org/2020/01/01/saved-story/',
    publishedAt: '2020-01-01T10:00:00.000Z',
  };
  await selectBackup(page, {
    app: 'internet-wanderer', schemaVersion: 1, exportedAt: currentTime.toISOString(),
    bookmarks: [{
      id: item.id, savedAt: currentTime.toISOString(), item,
      source: { id: 'global-voices', name: 'Global Voices', url: 'https://globalvoices.org/', publisherCountry: '荷兰 · 全球作者网络', publisherType: 'media', termsUrl: 'https://globalvoices.org/about/global-voices-attribution-policy/' },
    }],
  });
  await confirmImport(page).click();
  const entry = entries(page).first();
  await expect(entry).toContainText(item.title);
  await expect(entry).toContainText(item.author!);
  await expect(entry).toContainText('Global Voices');
  await expect(entry).toContainText('2020');
  await expect(entry).toContainText('已收藏的旧闻');
  await expect(entry.getByRole('link', { name: 'CC BY 3.0', exact: true })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/3.0/');
  const backup = await exportBackup(page);
  expect(backup.bookmarks[0].item.publishedAt).toBe('2020-01-01T10:00:00.000Z');
  await page.keyboard.press('Escape');
  // A saved ID cannot be restored into the active pool just by putting it in the trail.
  await page.evaluate((id) => {
    const key = 'internet-wanderer:journey:v1';
    const trail = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key, JSON.stringify({ ...trail, currentId: id, currentMode: 'news' }));
  }, item.id);
  await page.reload();
  await expect(page.getByTestId('wander-card')).toHaveCount(1);
  await expect(page.getByTestId('wander-card')).not.toContainText(item.title);
  await page.getByRole('button', { name: '下一站', exact: true }).click();
  await expect(page.getByTestId('wander-card')).not.toContainText(item.title);
  await page.getByRole('navigation', { name: '漫游模式', exact: true }).getByRole('link', { name: 'Surprise Me', exact: true }).click();
  await expect(page.getByTestId('wander-card')).toHaveCount(1);
  await expect(page.getByTestId('wander-card')).not.toContainText(item.title);
});

test('blocked storage keeps a usable memory collection, a warning and a JSON export', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('Storage disabled'); } }));
  await page.goto('/#/wander?mode=elsewhere');
  const title = await saveCurrent(page);
  await openDrawer(page);
  await expect(entries(page)).toHaveCount(1);
  await expect(drawer(page).getByText(/仅暂存本次页面/).first()).toBeVisible();
  expect((await exportBackup(page)).bookmarks[0].item.title).toBe(title);
});

test('corrupt stored favorites stay intact while new memories can still be exported', async ({ page }) => {
  const corrupt = '{not valid JSON; preserve this original';
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: STORAGE_KEY, value: corrupt });
  await page.goto('/#/wander?mode=elsewhere');
  const title = await saveCurrent(page);
  await openDrawer(page);
  await expect(drawer(page).getByText(/仅暂存本次页面/).first()).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(corrupt);
  expect((await exportBackup(page)).bookmarks[0].item.title).toBe(title);
});

test('corruption from a second tab does not overwrite the file or discard this tab’s collection', async ({ page, context }) => {
  await page.goto('/#/wander?mode=elsewhere');
  const first = await saveCurrent(page);
  const otherTab = await context.newPage();
  await otherTab.goto('/');
  const corrupt = '{a second tab wrote an unreadable value';
  await otherTab.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: STORAGE_KEY, value: corrupt });
  await page.bringToFront();
  await openDrawer(page);
  await expect(drawer(page).getByText(/仅暂存本次页面/).first()).toBeVisible();
  await expect(entries(page)).toHaveCount(1);
  await expect(entries(page).first()).toContainText(first);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '下一站', exact: true }).click();
  await saveCurrent(page);
  await openDrawer(page);
  await expect(entries(page)).toHaveCount(2);
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(corrupt);
  expect((await exportBackup(page)).bookmarks).toHaveLength(2);
});

test('mobile favorites fit the viewport, trap keyboard focus and close with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/wander?mode=elsewhere');
  await saveCurrent(page);
  await openDrawer(page);
  const modal = drawer(page);
  await expect(entries(page)).toHaveCount(1);
  const box = await modal.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(391);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  for (let i = 0; i < 10; i += 1) {
    await page.keyboard.press('Tab');
    expect(await modal.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  const closeButton = modal.getByRole('button', { name: '关闭收藏', exact: true });
  await closeButton.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(entries(page).last().getByRole('link', { name: /^打开收藏：/ })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(closeButton).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(modal).not.toBeVisible();
  await expect(page.getByRole('button', { name: '打开收藏', exact: true })).toBeFocused();
});
