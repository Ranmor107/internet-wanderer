import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import news from '../../data/news.snapshot.json' with { type: 'json' };
import type { WanderItem } from '../../src/domain/item-schema';
import { newsInTopic, topicsForItem } from '../../src/domain/news-topics';
import { NEWS_REGIONS } from '../../src/ui/globe/geography';

const items = news.items as WanderItem[];
const topicIds = ['entertainment', 'military', 'technology', 'humanities', 'society', 'environment', 'business', 'sports'] as const;
type Topic = typeof topicIds[number];

test.beforeEach(async ({ context }) => {
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    const path = resolve('dist', `.${url.pathname === '/' ? '/index.html' : url.pathname}`);
    if (url.hostname !== 'wanderer.test' || !path.startsWith(resolve('dist') + sep)) return route.abort();
    await route.fulfill({ body: await readFile(path), contentType: ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png' } as Record<string, string>)[extname(path)] ?? 'application/octet-stream' });
  });
});

function regionsFor(topic: Topic) {
  const eligible = new Set(newsInTopic(items, topic).map(item => item.id));
  return NEWS_REGIONS.map(region => ({ ...region, items: region.items.filter(item => eligible.has(item.id)) })).filter(region => region.items.length);
}

async function ready(page: Page) {
  await page.goto('/#/wander?mode=news');
  await expect(page.getByTestId('earth-viewport')).toHaveAttribute('data-renderer', 'ready', { timeout: 20000 });
}

async function pickRegion(page: Page, name: string) {
  await page.getByRole('button', { name: '地区信号', exact: true }).click();
  await page.locator('.region-signal-list > div').getByRole('button', { name: new RegExp(`^${name}\\s`) }).click();
  await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-phase', 'ready');
}

async function report(page: Page) {
  const title = await page.getByTestId('wander-card').getByRole('heading').innerText();
  const item = items.find(item => item.title === title);
  expect(item, `The displayed report must be a saved, attributable news item: ${title}`).toBeTruthy();
  return item!;
}

test('all eight topics filter the real region signals and publishers without rebuilding the globe', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  const canvas = page.locator('.earth-canvas-host canvas');
  await canvas.evaluate(node => node.setAttribute('data-original-canvas', 'yes'));
  const category = page.getByRole('combobox', { name: '新闻类别', exact: true });
  for (const topic of topicIds) {
    await category.selectOption(topic);
    await expect(canvas).toHaveAttribute('data-original-canvas', 'yes');
    await expect(page.getByTestId('wander-card')).toHaveCount(0);
    const expected = regionsFor(topic);
    expect(expected.length, `${topic} needs more than one destination`).toBeGreaterThanOrEqual(3);
    await expect.poll(() => page.locator('.earth-pin').evaluateAll(nodes => nodes.map(node => (node as HTMLElement).dataset.region).sort())).toEqual(expected.map(region => region.id).sort());
    await page.getByRole('button', { name: '地区信号', exact: true }).click();
    const regionButtons = page.locator('.region-signal-list > div > button');
    await expect(regionButtons).toHaveCount(expected.length);
    for (const region of expected) await expect(page.locator('.region-signal-list > div').getByRole('button', { name: new RegExp(`^${region.name}\\s`) })).toContainText(`${region.items.length} 则`);
    const sourceIds = [...new Set(newsInTopic(items, topic).map(item => item.sourceId))].sort();
    const sourceOptions = page.getByRole('combobox', { name: '新闻来源', exact: true }).locator('option');
    expect(await sourceOptions.evaluateAll(options => options.map(option => (option as HTMLOptionElement).value).filter(Boolean).sort())).toEqual(sourceIds);
    await page.getByRole('button', { name: '关闭地区列表', exact: true }).click();
  }
  await category.selectOption('all');
  await expect.poll(() => page.locator('.earth-pin').count()).toBe(NEWS_REGIONS.length);
  await expect(canvas).toHaveAttribute('data-original-canvas', 'yes');
});

test('topic exploration, local story changes and random drift stay inside the selected subject', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  await page.getByRole('combobox', { name: '新闻类别', exact: true }).selectOption('entertainment');
  const region = regionsFor('entertainment').find(region => region.items.length > 1)!;
  expect(region).toBeTruthy();
  await pickRegion(page, region.name);
  const first = await report(page);
  expect(topicsForItem(first)).toContain('entertainment');
  expect(region.items.map(item => item.id)).toContain(first.id);
  await expect(page.locator('.dispatch-topics')).toContainText('娱乐');
  const alternatives = page.locator('.region-stories button');
  for (const title of await alternatives.allTextContents()) expect(region.items.map(item => item.title)).toContain(title.trim());
  const position = await page.locator('.earth-canvas-host').getAttribute('data-longitude');
  const nextTitle = await alternatives.first().innerText();
  await alternatives.first().click();
  await expect(page.getByTestId('wander-card').getByRole('heading')).toHaveText(nextTitle);
  await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-phase', 'ready');
  await expect(page.locator('.earth-canvas-host')).toHaveAttribute('data-longitude', position!);
  expect(topicsForItem(await report(page))).toContain('entertainment');
  for (let index = 0; index < 3; index++) {
    const previousRegion = await page.getByTestId('signal-tuner').getAttribute('data-region');
    await page.getByRole('button', { name: /^下一站/ }).click();
    await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-phase', 'ready');
    expect(topicsForItem(await report(page))).toContain('entertainment');
    await expect(page.getByTestId('signal-tuner')).not.toHaveAttribute('data-region', previousRegion!);
  }
});

test('publisher browsing respects the topic and keeps publisher location distinct from report location', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  await page.getByRole('combobox', { name: '新闻类别', exact: true }).selectOption('technology');
  await page.getByRole('button', { name: '地区信号', exact: true }).click();
  await page.getByRole('combobox', { name: '新闻来源', exact: true }).selectOption('nasa');
  await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-phase', 'ready');
  const selected = await report(page);
  expect(selected.sourceId).toBe('nasa');
  expect(topicsForItem(selected)).toContain('technology');
  await expect(page.getByTestId('earth-dispatch')).toContainText('发布机构所在地');
  await expect(page.getByRole('link', { name: `打开这一站：${selected.title}` })).toHaveAttribute('href', selected.url);
  await page.getByRole('combobox', { name: '新闻类别', exact: true }).selectOption('all');
  await page.getByRole('combobox', { name: '新闻类别', exact: true }).selectOption('technology');
  await page.getByRole('button', { name: '地区信号', exact: true }).click();
  const source = page.getByRole('combobox', { name: '新闻来源', exact: true });
  await expect(source).toHaveValue('');
  await source.selectOption('nasa');
  await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-phase', 'ready');
  expect((await report(page)).sourceId).toBe('nasa');
});

test('the focused publisher selector stays reachable above the arriving mobile dispatch', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  await page.getByRole('combobox', { name: '新闻类别', exact: true }).selectOption('technology');
  await page.getByRole('button', { name: '地区信号', exact: true }).click();
  const source = page.getByRole('combobox', { name: '新闻来源', exact: true });
  await source.focus(); await source.selectOption('nasa');
  await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-phase', 'ready');
  await expect(source).toBeFocused();
  await expect.poll(() => source.evaluate(node => {
    const box = node.getBoundingClientRect();
    return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) === node;
  })).toBe(true);
  await source.selectOption('ecb');
  await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-phase', 'ready');
  expect((await report(page)).sourceId).toBe('ecb');
  await page.getByRole('button', { name: '关闭地区列表', exact: true }).click();
  await page.getByRole('button', { name: '展开消息与来源', exact: true }).click();
  const zoomOut = page.getByRole('button', { name: '缩小地球', exact: true });
  expect(await zoomOut.evaluate(node => {
    const box = node.getBoundingClientRect();
    return node.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
  })).toBe(true);
});

test('changing subject during a flight cancels its pending article and keeps the current camera', async ({ page }) => {
  await ready(page);
  const category = page.getByRole('combobox', { name: '新闻类别', exact: true });
  await category.selectOption('military');
  const region = regionsFor('military').find(region => region.id === 'BR') ?? regionsFor('military')[0];
  await page.getByRole('button', { name: '地区信号', exact: true }).click();
  await page.locator('.region-signal-list > div').getByRole('button', { name: new RegExp(region.name) }).click();
  await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-phase', 'flying');
  const host = page.locator('.earth-canvas-host');
  await host.locator('canvas').evaluate(node => node.setAttribute('data-original-canvas', 'yes'));
  await category.selectOption('sports');
  await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-phase', 'exploring');
  const stoppedAt = await host.getAttribute('data-longitude');
  // Wait beyond the cancelled flight's maximum duration to catch a late commit.
  await page.waitForTimeout(2400);
  await expect(page.getByTestId('wander-card')).toHaveCount(0);
  await expect(host).toHaveAttribute('data-longitude', stoppedAt!);
  await expect(host.locator('canvas')).toHaveAttribute('data-original-canvas', 'yes');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('internet-wanderer:journey:v1')!).entries.length)).toBe(0);
  await page.getByRole('button', { name: /^下一站/ }).click();
  await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-phase', 'ready');
  expect(topicsForItem(await report(page))).toContain('sports');
});

test('clicking a country without the chosen topic shows an empty result instead of another subject', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  await pickRegion(page, '法国');
  const france = page.locator('.earth-pin[data-region="FR"]');
  const point = (await france.boundingBox())!;
  const entriesBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('internet-wanderer:journey:v1')!).entries.length);
  expect(regionsFor('military').some(region => region.id === 'FR')).toBe(false);
  await page.getByRole('combobox', { name: '新闻类别', exact: true }).selectOption('military');
  await page.getByRole('button', { name: '显示地区信号' }).click();
  // The camera stays over France after filtering; pick the actual country
  // surface at its former signal position, with all HTML signals hidden.
  await page.mouse.click(point.x + point.width / 2, point.y + point.height / 2);
  await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-region', 'FR');
  await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-phase', 'ready');
  await expect(page.getByTestId('earth-dispatch')).toContainText('这个地区没有已归类的军事消息');
  await expect(page.getByTestId('wander-card')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('internet-wanderer:journey:v1')!).entries.length)).toBe(entriesBefore);
  await page.getByRole('button', { name: '查看全部新闻', exact: true }).click();
  await expect(page.getByRole('combobox', { name: '新闻类别', exact: true })).toHaveValue('all');
  await expect(page.getByTestId('earth-dispatch')).toHaveCount(0);
});

test('topic changes preserve hidden signals and the existing globe canvas', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  const canvas = page.locator('.earth-canvas-host canvas');
  await canvas.evaluate(node => node.setAttribute('data-original-canvas', 'yes'));
  const visibility = page.getByRole('button', { name: '显示地区信号' });
  await visibility.click();
  await expect(visibility).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.earth-pin:visible')).toHaveCount(0);
  for (const topic of ['technology', 'military', 'all'] as const) {
    await page.getByRole('combobox', { name: '新闻类别', exact: true }).selectOption(topic);
    await expect.poll(() => page.locator('.earth-pin').count()).toBe(topic === 'all' ? NEWS_REGIONS.length : regionsFor(topic).length);
    await expect(page.locator('.earth-pin:visible')).toHaveCount(0);
    await expect(visibility).toHaveAttribute('aria-pressed', 'false');
    await expect(canvas).toHaveAttribute('data-original-canvas', 'yes');
  }
});

for (const width of [320, 390]) test(`topic selection remains keyboard accessible without overflowing a ${width}px screen`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  const category = page.getByRole('combobox', { name: '新闻类别', exact: true });
  await category.focus();
  await category.press('End');
  await category.press('Enter');
  await expect(category).toHaveValue('sports');
  await expect(category).toBeFocused();
  const box = (await category.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width);
  await pickRegion(page, regionsFor('sports')[0].name);
  expect(topicsForItem(await report(page))).toContain('sports');
  await expect(category).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath(`news-topics-${width}.png`), animations: 'disabled' });
});

test('topic filtering remains usable when WebGL is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
      if (kind.startsWith('webgl')) return null;
      return original.apply(this, [kind, ...args] as Parameters<typeof original>);
    } as typeof original;
  });
  await page.goto('/#/wander?mode=news');
  await expect(page.getByTestId('earth-viewport')).toHaveAttribute('data-renderer', 'unavailable');
  await page.getByRole('combobox', { name: '新闻类别', exact: true }).selectOption('humanities');
  await pickRegion(page, regionsFor('humanities')[0].name);
  expect(topicsForItem(await report(page))).toContain('humanities');
  await page.getByRole('button', { name: /^下一站/ }).click();
  await expect(page.getByTestId('signal-tuner')).toHaveAttribute('data-phase', 'ready');
  expect(topicsForItem(await report(page))).toContain('humanities');
  await expect(page.getByTestId('earth-viewport')).toHaveAttribute('data-renderer', 'unavailable');
});
