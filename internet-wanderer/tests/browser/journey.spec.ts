import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import newsSnapshot from '../../data/news.snapshot.json' with { type: 'json' };
import sites from '../../data/sites.json' with { type: 'json' };

const nonEnglishSites = sites.items.filter((item) => item.enabled !== false && item.language !== 'en' && item.language !== 'und');
const languageLabels: Record<string, string> = { zh: '中文', 'zh-Hant': '中文（繁体）', ja: '日语', es: '西班牙语' };

// Serve the actual production build through intercepted requests: deterministic,
// offline browser checks, without external sites or a separate local server.
test.beforeEach(async ({ context }) => {
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'wanderer.test') return route.abort();
    const path = resolve('dist', `.${url.pathname === '/' ? '/index.html' : url.pathname}`);
    if (!path.startsWith(`${resolve('dist')}${sep}`)) return route.abort();
    try {
      const contentType = ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' } as Record<string, string>)[extname(path)] ?? 'application/octet-stream';
      await route.fulfill({ body: await readFile(path), contentType });
    } catch { await route.fulfill({ status: 404, body: 'Not found' }); }
  });
});

async function expectExperience(page: Page, mode: string, year?: string) {
  const main = page.locator('main');
  await expect(main).toHaveAttribute('data-mode', mode);
  const cards = page.getByTestId('wander-card');
  await expect(cards).toHaveCount(mode === 'time' ? 3 : 1);
  if (mode === 'news') await expect(cards).toHaveClass(/kind-news/);
  if (mode === 'elsewhere') await expect(cards).toHaveClass(/kind-website/);
  if (mode === 'time' || mode === 'news' || mode === 'elsewhere') {
    const era = mode === 'time' ? year! : 'modern';
    await expect(main).toHaveAttribute('data-era', era);
    await expect.poll(() => cards.evaluateAll((items) => items.map((item) => {
      const frame = item.matches('[data-era]') ? item : item.querySelector('[data-era]');
      return frame?.getAttribute('data-era');
    }))).toEqual(Array(mode === 'time' ? 3 : 1).fill(era));
  }
}

test('home leads directly to a useful surprise, with a safe external link', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Get lost on the Internet again.' })).toBeVisible();
  await page.getByTestId('home-surprise-cta').click();
  await expect(page.getByTestId('wander-card')).toHaveCount(1);
  const outgoing = page.getByRole('link', { name: /^打开这一站/ });
  await expect(outgoing).toHaveAttribute('target', '_blank');
  await expect(outgoing).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(outgoing).toHaveAttribute('href', /^https?:\/\//);
  expect(errors).toEqual([]);
});

test('twenty Elsewhere encounters stay distinct and the last result survives reload', async ({ page }) => {
  await page.goto('/#/wander?mode=elsewhere');
  const titles: string[] = [];
  for (let i = 0; i < 20; i += 1) {
    titles.push(await page.getByTestId('wander-card').getByRole('heading').innerText());
    if (i < 19) await page.getByRole('button', { name: '下一站', exact: true }).click();
  }
  expect(new Set(titles).size).toBe(20);
  await page.reload();
  await expect(page.getByTestId('wander-card').getByRole('heading')).toHaveText(titles[19]);
});

test('reviewed non-English destinations cover Chinese, Japanese and Spanish content', () => {
  expect(nonEnglishSites.map((item) => item.id)).toEqual(expect.arrayContaining(['site-digital-dunhuang', 'site-npm-digital-archive', 'site-cas-kepu']));
  expect(nonEnglishSites.map((item) => item.language)).toEqual(expect.arrayContaining(['zh', 'zh-Hant', 'ja', 'es']));
});

for (const item of nonEnglishSites) {
  test(`non-English destination ${item.id} keeps its language and original content after saving`, async ({ page }, testInfo) => {
    await page.addInitScript((id) => localStorage.setItem('internet-wanderer:journey:v1', JSON.stringify({ version: 1, entries: [], currentId: id, currentMode: 'elsewhere' })), item.id);
    await page.goto('/#/wander?mode=elsewhere');
    const card = page.getByTestId('wander-card');
    await expect(card.getByRole('heading')).toHaveText(item.title);
    await expect(card.getByRole('heading')).toHaveAttribute('lang', item.language);
    expect(item.blurb).toMatch(/\p{Script=Han}/u);
    await expect(card.getByText(item.blurb, { exact: true })).toBeVisible();
    await expect(card.getByText(languageLabels[item.language], { exact: true })).toBeVisible();
    await expect(card.getByRole('link', { name: `打开这一站：${item.title}`, exact: true })).toHaveAttribute('href', item.url);
    await page.screenshot({ path: testInfo.outputPath(`${item.id}.png`), fullPage: true, animations: 'disabled' });
    await card.getByRole('button', { name: `收藏：${item.title}`, exact: true }).click();
    await page.reload();
    await expect(card.getByRole('heading')).toHaveText(item.title);
    await expect(card.getByRole('heading')).toHaveAttribute('lang', item.language);
    await expect(card.getByRole('button', { name: `取消收藏：${item.title}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: '打开收藏', exact: true }).click();
    const drawer = page.getByRole('dialog', { name: '我的收藏', exact: true });
    const entry = drawer.getByTestId('bookmark-entry');
    await expect(entry).toHaveCount(1);
    await expect(entry.getByRole('heading')).toHaveText(item.title);
    await expect(entry.getByRole('link', { name: `打开收藏：${item.title}`, exact: true })).toHaveAttribute('href', item.url);
    const saved = await page.evaluate((id) => JSON.parse(localStorage.getItem('internet-wanderer:bookmarks:v1')!).bookmarks.find((bookmark: { id: string }) => bookmark.id === id), item.id);
    expect(saved.item).toMatchObject({ id: item.id, title: item.title, blurb: item.blurb, url: item.url, language: item.language, sourceId: item.sourceId });
  });
}

test('previous encounter then next then reload restores the current card, not old route state', async ({ page }) => {
  await page.goto('/#/wander?mode=elsewhere');
  const first = await page.getByTestId('wander-card').getByRole('heading').innerText();
  await page.getByRole('button', { name: '下一站', exact: true }).click();
  await page.getByRole('button', { name: '上一站', exact: true }).click();
  await expect(page.getByTestId('wander-card').getByRole('heading')).toHaveText(first);
  await page.getByRole('button', { name: '下一站', exact: true }).click();
  const current = await page.getByTestId('wander-card').getByRole('heading').innerText();
  await page.reload();
  await expect(page.getByTestId('wander-card').getByRole('heading')).toHaveText(current);
});

test('year navigation produces three cards and records all of them in local history', async ({ page }) => {
  await page.goto('/#/wander?mode=time&year=2007');
  await expect(page.getByTestId('wander-card')).toHaveCount(3);
  await expect(page.locator('main')).toHaveAttribute('data-era', '2007');
  await page.getByRole('link', { name: '1999', exact: true }).click();
  await expect(page.locator('main')).toHaveAttribute('data-era', '1999');
  await expect(page.getByTestId('wander-card')).toHaveCount(3);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('internet-wanderer:journey:v1')!).entries.length)).toBe(6);
  await page.reload();
  await expect(page.locator('main')).toHaveAttribute('data-era', '1999');
  await expect(page.getByTestId('wander-card')).toHaveCount(3);
});

test('local history drawer can restore a card and clear its stored trail', async ({ page }) => {
  await page.goto('/#/wander?mode=elsewhere');
  await page.getByRole('button', { name: '下一站', exact: true }).click();
  await page.getByRole('button', { name: '足迹', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('li')).toHaveCount(2);
  await dialog.getByRole('button', { name: '清空足迹', exact: true }).click();
  await expect(dialog.getByText('还没有足迹。')).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('internet-wanderer:journey:v1')!).entries.length)).toBe(0);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});

test('news keeps author, publication date and licensing attribution', async ({ page }) => {
  const item = newsSnapshot.items.find((entry) => entry.sourceId === 'global-voices')!;
  await page.clock.setFixedTime(new Date(newsSnapshot.generatedAt!));
  await page.addInitScript((id) => localStorage.setItem('internet-wanderer:journey:v1', JSON.stringify({ version: 1, entries: [], currentId: id, currentMode: 'news' })), item.id);
  await page.goto('/#/wander?mode=news');
  const card = page.getByTestId('wander-card');
  await expect(card.getByRole('heading')).toHaveText(item.title);
  await expect(card.getByText(`作者：${item.author}`)).toBeVisible();
  await expect(card.getByRole('link', { name: 'CC BY 3.0' })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/3.0/');
  await expect(card.getByText(/^发表于/)).toBeVisible();
});

test('Demo news remains browsable in the future and clearly identifies its dated sample', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2099-01-01T00:00:00.000Z'));
  await page.goto('/#/wander?mode=news');
  await expect(page.getByTestId('wander-card')).toHaveCount(1);
  await expect(page.getByTestId('wander-card')).toHaveClass(/kind-news/);
  const note = page.getByTestId('news-sample-note');
  await expect(note).toHaveCount(1);
  await expect(note).toContainText('样本');
  const [year, month, day] = newsSnapshot.generatedAt!.slice(0, 10).split('-').map(Number);
  await expect(note).toContainText(new RegExp(`${year}\\D+0?${month}\\D+0?${day}`));
  const first = await page.getByTestId('wander-card').getByRole('heading').innerText();
  await page.getByRole('button', { name: '下一站', exact: true }).click();
  await expect(page.getByTestId('wander-card').getByRole('heading')).not.toHaveText(first);
  await page.reload();
  await expect(page.getByTestId('wander-card')).toHaveCount(1);
  await expect(page.getByTestId('news-sample-note')).toContainText('样本');
});

test('all four modes stay reachable and the three year tabs apply their era to the page and windows', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('home-surprise-cta').click();
  const main = page.locator('main');
  await expect(main).toHaveAttribute('data-mode', 'surprise');
  await expect(page.getByTestId('wander-card')).toHaveCount(1);
  const modes = page.getByRole('navigation', { name: '漫游模式', exact: true });
  for (const [label, mode, count] of [
    ['Elsewhere', 'elsewhere', 1],
    ['News Drift', 'news', 1],
    ['Time Machine', 'time', 3],
    ['Surprise Me', 'surprise', 1],
  ] as const) {
    const link = modes.getByRole('link', { name: label, exact: true });
    await link.click();
    await expect(link).toHaveAttribute('aria-current', 'page');
    await expect(main).toHaveAttribute('data-mode', mode);
    await expect(page.getByTestId('wander-card')).toHaveCount(count);
    if (mode === 'elsewhere' || mode === 'news') await expect(main).toHaveAttribute('data-era', 'modern');
    if (mode === 'surprise') {
      const era = await page.getByTestId('wander-card').locator('[data-era]').first().getAttribute('data-era');
      await expect(main).toHaveAttribute('data-era', era!);
    }
  }
  await modes.getByRole('link', { name: 'Time Machine', exact: true }).click();
  for (const year of ['1999', '2007', '2012']) {
    const tab = page.getByRole('link', { name: year, exact: true });
    await tab.click();
    await expect(main).toHaveAttribute('data-era', year);
    await expect(tab).toHaveAttribute('aria-current', 'date');
    await expect(page.getByTestId('wander-card')).toHaveCount(3);
    // Browser frames within the content inherit the actual selected era.
    expect(await page.getByTestId('wander-card').evaluateAll((cards, selectedYear) => cards.every((card) => {
      const frame = card.matches('[data-era]') ? card : card.querySelector('[data-era]');
      return frame?.getAttribute('data-era') === selectedYear;
    }), year)).toBe(true);
  }
});

test('direct same-document hash navigation replaces the previous mode and year presentation', async ({ page }) => {
  await page.goto('/#/wander?mode=elsewhere');
  await expectExperience(page, 'elsewhere');
  // Unlike Link navigation, browser/hash navigation can reuse the default route key.
  // Preserve the same document and a nonempty local trail throughout this sequence.
  await page.evaluate(() => Object.defineProperty(window, '__sameDocumentMarker', { value: 'unchanged' }));
  for (const [mode, year] of [
    ['news', undefined],
    ['time', '1999'],
    ['time', '2007'],
    ['time', '2012'],
    ['elsewhere', undefined],
  ] as const) {
    await page.goto(`/#/wander?mode=${mode}${year ? `&year=${year}` : ''}`);
    await expectExperience(page, mode, year);
    expect(await page.evaluate(() => Reflect.get(window, '__sameDocumentMarker'))).toBe('unchanged');
  }
});

test('reduced motion keeps navigation functional without long-running interface animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await page.getByTestId('home-surprise-cta').click();
  await page.getByRole('navigation', { name: '漫游模式', exact: true }).getByRole('link', { name: 'Elsewhere', exact: true }).click();
  const first = await page.getByTestId('wander-card').getByRole('heading').innerText();
  await page.getByRole('button', { name: '下一站', exact: true }).click();
  await expect(page.getByTestId('wander-card').getByRole('heading')).not.toHaveText(first);
  const animated = await page.locator('main').evaluate((main) => {
    const milliseconds = (list: string) => list.split(',').map((value) => value.trim().endsWith('ms') ? parseFloat(value) : parseFloat(value) * 1000);
    return [main, ...main.querySelectorAll('*')].filter((element) => {
      const styles = getComputedStyle(element);
      return (styles.animationName !== 'none' && milliseconds(styles.animationDuration).some((time) => time > 1))
        || (styles.transitionProperty !== 'none' && milliseconds(styles.transitionDuration).some((time) => time > 1));
    }).map((element) => element.className);
  });
  expect(animated).toEqual([]);
});

test('blocked localStorage still permits continuous wandering', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('Storage disabled'); } }));
  await page.goto('/#/wander?mode=elsewhere');
  const first = await page.getByTestId('wander-card').getByRole('heading').innerText();
  await page.getByRole('button', { name: '下一站', exact: true }).click();
  await expect(page.getByTestId('wander-card').getByRole('heading')).not.toHaveText(first);
});

test('320px and 390px layouts keep every mode inside the viewport and the home CTA above the fold', async ({ page }) => {
  for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const path of ['/', '/#/wander?mode=surprise', '/#/wander?mode=elsewhere', '/#/wander?mode=news', '/#/wander?mode=time&year=1999', '/#/wander?mode=time&year=2007', '/#/wander?mode=time&year=2012', '/#/about']) {
      await page.goto(path);
      await expect(page.locator('main')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${viewport.width}px ${path}`).toBe(true);
      if (path === '/') {
        const cta = page.getByTestId('home-surprise-cta');
        await expect(cta).toBeVisible();
        const box = await cta.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.y + box!.height, `${viewport.width}px home CTA should fit in the first screen`).toBeLessThanOrEqual(viewport.height);
      }
    }
  }
});

test('capture desktop and mobile product views', async ({ page }, testInfo) => {
  for (const [name, route] of [
    ['home', '/'],
    ['elsewhere', '/#/wander?mode=elsewhere'],
    ['news', '/#/wander?mode=news'],
    ['time-1999', '/#/wander?mode=time&year=1999'],
    ['time-2007', '/#/wander?mode=time&year=2007'],
    ['time-2012', '/#/wander?mode=time&year=2012'],
  ]) {
    await page.goto(route);
    if (name === 'home') await expect(page.getByTestId('home-surprise-cta')).toBeVisible();
    else {
      const params = new URLSearchParams(route.split('?')[1]);
      await expectExperience(page, params.get('mode')!, params.get('year') ?? undefined);
    }
    await page.screenshot({ path: testInfo.outputPath(`${name}-desktop.png`), fullPage: true, animations: 'disabled' });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.screenshot({ path: testInfo.outputPath('home-mobile.png'), fullPage: true, animations: 'disabled' });
  await page.goto('/#/wander?mode=time&year=1999');
  await expectExperience(page, 'time', '1999');
  await page.screenshot({ path: testInfo.outputPath('time-1999-mobile.png'), fullPage: true, animations: 'disabled' });
  await page.goto('/#/wander?mode=elsewhere');
  await expectExperience(page, 'elsewhere');
  await page.screenshot({ path: testInfo.outputPath('elsewhere-mobile.png'), animations: 'disabled' });
  await page.goto('/#/wander?mode=news');
  await expectExperience(page, 'news');
  await page.screenshot({ path: testInfo.outputPath('news-mobile.png'), animations: 'disabled' });
});

test('browser back and forward restore the presentation belonging to each history entry', async ({ page }) => {
  await page.goto('/#/wander?mode=elsewhere');
  await page.getByRole('button', { name: '下一站', exact: true }).click();
  const title = await page.getByTestId('wander-card').getByRole('heading').innerText();
  await page.getByRole('navigation', { name: '漫游模式' }).getByRole('link', { name: 'News Drift', exact: true }).click();
  await expectExperience(page, 'news');
  const news = await page.getByTestId('wander-card').getByRole('heading').innerText();
  await page.goBack();
  await expect(page.locator('main')).toHaveAttribute('data-mode', 'elsewhere');
  await expect(page.getByTestId('wander-card').getByRole('heading')).toHaveText(title);
  await page.goForward();
  await expect(page.locator('main')).toHaveAttribute('data-mode', 'news');
  await expect(page.getByTestId('wander-card').getByRole('heading')).toHaveText(news);
});

test('previous restores the entire Time Machine pack and keeps it after reload', async ({ page }) => {
  await page.goto('/#/wander?mode=time&year=1999');
  const headings = page.getByTestId('wander-card').getByRole('heading');
  await expect(headings).toHaveCount(3);
  const first = await headings.allTextContents();
  await page.getByRole('button', { name: '再逛这个年份', exact: true }).click();
  await expect.poll(() => headings.allTextContents()).not.toEqual(first);
  await page.getByRole('button', { name: '上一站', exact: true }).click();
  await expect(headings).toHaveText(first);
  await page.reload();
  await expect(headings).toHaveText(first);
});

test('a fresh Surprise departure differs from the saved encounter and reports arrival', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('home-surprise-cta').click();
  const first = await page.getByTestId('wander-card').getByRole('heading').innerText();
  await page.getByRole('link', { name: 'Internet Wanderer 首页' }).click();
  await page.getByTestId('home-surprise-cta').click();
  await expect(page.getByTestId('wander-card').getByRole('heading')).not.toHaveText(first);
  await expect(page.getByTestId('arrival-note')).toContainText('JUST LANDED');
});

test('mobile action bar stays usable after scrolling and synchronizes card favorites', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/wander?mode=elsewhere');
  const controls = page.getByTestId('journey-controls');
  await expect(controls).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const box = await controls.boundingBox();
  expect(box!.y).toBeGreaterThan(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  const title = await page.getByTestId('wander-card').getByRole('heading').innerText();
  await controls.getByRole('button', { name: '收藏当前站', exact: true }).click();
  await expect(page.getByRole('button', { name: `取消收藏：${title}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await controls.getByRole('button', { name: '下一站', exact: true }).click();
  await expect(page.getByTestId('wander-card').getByRole('heading')).not.toHaveText(title);
  await controls.getByRole('button', { name: '上一站', exact: true }).click();
  await expect(page.getByTestId('wander-card').getByRole('heading')).toHaveText(title);
  await expect(controls.getByRole('button', { name: '取消收藏当前站', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('keyboard next keeps focus on the persistent action instead of a removed result', async ({ page }) => {
  await page.goto('/#/wander?mode=elsewhere');
  const next = page.getByRole('button', { name: '下一站', exact: true });
  await next.focus();
  const title = await page.getByTestId('wander-card').getByRole('heading').innerText();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('wander-card').getByRole('heading')).not.toHaveText(title);
  await expect(next).toBeFocused();
});
